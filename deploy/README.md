# Deploying Homestock

The source of truth for every secret and variable this app needs.

Same shape as fromNowToSuccess: CI builds images, pushes them to GHCR, then
SSHes to the Proxmox VM through a Cloudflare tunnel and restarts the stack.
You never edit files on the VM by hand — CI renders `.env` and copies
`compose.prod.yml` on every deploy.

```
push to main
   ↓
backend-test + frontend-check          (also run on every pull request)
   ↓
images          build both, push to ghcr.io/<you>/homestock-{backend,frontend}
   ↓                                    tagged :latest and :sha-<short>
deploy          render .env from secrets → scp to the VM → compose pull && up -d
   ↓
smoke test      the frontend serves, and reaches the backend through it
```

## First-time setup

### 1. On the VM (once)

```bash
sudo mkdir -p /opt/homestock/backups
sudo chown -R deploy:deploy /opt/homestock
```

`deploy` is the CI user and must be in the `docker` group. The frontend binds
`127.0.0.1:3005` — VM convention is one localhost-only `300X` port per app
(3000 is wisdom-from-quran, 3004 is fnts). **Check it is free first:**

```bash
ss -ltnp | grep 3005
```

Then point a Cloudflare tunnel hostname at `127.0.0.1:3005`.

### 2. Repository secrets

Settings → Secrets and variables → Actions → **Secrets**.

Secrets do not cross repositories, so every one of these has to be added to
this repo even where fromNowToSuccess already has the same thing. The right
column says whether the *value* can be copied across.

| Secret | What it is | Same value as fnts? |
|---|---|---|
| `POSTGRES_PASSWORD` | Database password. Pick it now — changing it later is awkward, see below. | No — different database, generate a new one |
| `JWT_SECRET` | Signs access tokens. `openssl rand -base64 48` | No — generate a new one |
| `DEPLOY_HOST` | The VM's tunnel hostname. | **Yes** — same VM |
| `DEPLOY_USER` | The CI user on the VM (`deploy`). | **Yes** |
| `DEPLOY_KEY` | That user's **private** SSH key, whole file including the header line. | **Yes** — the same key already authorised on the VM |
| `CF_ACCESS_CLIENT_ID` | Cloudflare Access service token id. Only needed if the SSH hostname is gated by an Access policy. | **Yes**, if you still have it — the secret half is shown once, so create a new service token if not |
| `CF_ACCESS_CLIENT_SECRET` | The other half of the above. | Same |
| `GEMINI_API_KEY` | Optional. Meal suggestions only — blank disables that one feature and nothing else. | **Yes** — one key is fine for both |

`POSTGRES_PASSWORD`, `JWT_SECRET`, `DEPLOY_HOST`, `DEPLOY_USER` and
`DEPLOY_KEY` are checked before anything is copied, so a missing one fails the
deploy immediately with a message naming it, rather than halfway through.

The two `CF_ACCESS_*` are deliberately **not** in that check: `cloudflared
access ssh` works without them when the hostname is not behind an Access
policy. Leave them unset if that is your setup, and the deploy still works.

**Nothing else from fnts is needed here.** `DATA_ENCRYPTION_KEY`, `VAPID_*`,
`MAIL_*`, `FEEDBACK_NOTIFY_TO`, `GH_ISSUES_TOKEN` and `FEEDBACK_ISSUES_REPO`
all belong to features this app does not have.

### 3. Repository variables

Same page, **Variables** tab. All optional — the defaults are sensible.

| Variable | Default | What it is |
|---|---|---|
| `SECURE_COOKIES` | `true` | Must be `true` when served over HTTPS. |
| `GEMINI_MODEL` | `gemini-flash-latest` | The `-latest` alias on purpose: a pinned name going new-user-gated would silently break suggestions. |
| `BACKUP_KEEP_DAYS` | `14` | How long nightly dumps are kept. |

### 4. The `production` environment

The deploy job declares `environment: production`. GitHub creates it on the
first run. If you want a manual approval before anything reaches the VM, add a
required reviewer under Settings → Environments → production.

### 5. Try it without deploying first

Open a pull request instead of pushing. The tests and **both image builds**
run on a PR; the deploy job does not. That exercises most of the pipeline —
including the Docker builds, which are where the surprises live — with nothing
touching the VM.

### 6. Push to main

That is the whole deploy. Watch it under Actions → CI.

The first run is the slow one: no build cache, and Maven fetches the world.
Expect roughly ten minutes.

## Things that will bite you

**Setting a secret does not redeploy.** The VM keeps its old rendered `.env`
until a deploy runs. To apply a new value: re-run the latest CI deploy
(Actions → CI → Re-run) or push to `main`.

**Changing `POSTGRES_PASSWORD` after the first deploy does not work by
itself.** Postgres only reads that variable when it first initialises the data
directory. Change the secret and the next deploy hands the backend a password
the database has never heard of, and it restart-loops on
`password authentication failed for user "homestock"`. To actually rotate it,
change it in the database too:

```bash
cd /opt/homestock
docker compose -f compose.prod.yml exec db \
  psql -U homestock -d homestock -c "ALTER USER homestock PASSWORD 'the-new-one';"
```

then update the secret and redeploy.

**Rolling back** is re-running an older successful deploy job — it pins
`IMAGE_TAG=sha-<short>`, so the exact previous build comes back.

**The images are private** on GHCR by default. The VM authenticates with the
Actions token during the deploy, so that is fine; you only need to change it if
you want to pull them by hand from somewhere else.

## Backups

Nothing in this app is encrypted at rest, which is deliberate: a `pg_dump` is a
complete, directly restorable backup with no key to lose. (This is the one
thing Homestock does differently from fnts, where `DATA_ENCRYPTION_KEY` makes a
raw dump unreadable on its own.)

There are three layers, and they fail in different ways, which is the point.

**1. The nightly dump.** A `backup` service in the stack writes
`/opt/homestock/backups/homestock-<date>.sql.gz` once a day and prunes anything
older than `BACKUP_KEEP_DAYS` — but only once the new dump is safely written,
so a run of failures cannot quietly delete every good backup you have.

Check it is working, and actually read the size:

```bash
ls -la /opt/homestock/backups
docker compose -f compose.prod.yml logs backup --tail 20
```

A healthy line looks like `[backup] wrote homestock-2026-09-25.sql.gz (2240 bytes)`.
A failure says `[backup] FAILED:` and the reason, and writes nothing.

Restore one into a scratch database before you ever need it in anger:

```bash
gunzip -c backups/homestock-2026-09-25.sql.gz \
  | docker compose -f compose.prod.yml exec -T db psql -U homestock -d homestock
```

**2. The in-app export.** Settings → *Download a backup* gives one JSON file
with every item and event. Restoring merges by id, so importing twice is
harmless, and quantities are recomputed from the events rather than trusted
from the file. This is the one that survives losing the VM entirely, because it
lives wherever you put it.

**3. Every device.** The app is local-first, so each browser that has opened it
holds the full history in IndexedDB. Not a backup you can administer, but it is
why an afternoon's shopping is not lost when the VM is down.

## Rehearsing the production stack locally

Worth doing before the first real deploy — it runs the exact
`compose.prod.yml`, including the backup service.

```bash
docker build -t ghcr.io/<you>/homestock-backend:sha-test ./backend
docker build -t ghcr.io/<you>/homestock-frontend:sha-test ./frontend

mkdir -p .prodtest/backups && cd .prodtest
cp ../deploy/compose.prod.yml .
cat > .env <<EOF
IMAGE_OWNER=<you>
IMAGE_TAG=sha-test
POSTGRES_DB=homestock
POSTGRES_USER=homestock
POSTGRES_PASSWORD=whatever
JWT_SECRET=$(openssl rand -base64 48)
SECURE_COOKIES=false
EOF

docker compose -f compose.prod.yml up -d
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3005/api/users/me   # expect 401
```

`.prodtest/` is gitignored. Tear it down with
`docker compose -f compose.prod.yml down -v`.
