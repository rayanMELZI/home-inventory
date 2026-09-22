# Deploying Homestock to the VM

The source of truth for every secret and variable this app needs.

Same shape as fromNowToSuccess: CI builds images, pushes them to GHCR, then
SSHes to the Proxmox VM through a Cloudflare tunnel and restarts the stack.
You never edit files on the VM by hand — CI renders `.env` and copies
`compose.prod.yml` on every deploy.

## One-time VM setup

```bash
sudo mkdir -p /opt/homestock/backups
sudo chown deploy:deploy /opt/homestock /opt/homestock/backups
```

The frontend binds to `127.0.0.1:3005` (VM convention: one localhost-only
`300X` port per app — 3000 is wisdom-from-quran, 3004 is fnts). Point a
Cloudflare tunnel hostname at it. **Check 3005 is actually free before the
first deploy:** `ss -ltnp | grep 3005`.

## Repository secrets

| Secret | What it is |
|---|---|
| `POSTGRES_PASSWORD` | Database password. |
| `JWT_SECRET` | Signs access tokens. `openssl rand -base64 48` |
| `DEPLOY_HOST` | The VM's tunnel hostname. |
| `DEPLOY_USER` | The CI user on the VM (`deploy`). |
| `DEPLOY_KEY` | That user's private SSH key. |
| `CF_ACCESS_CLIENT_ID` | Cloudflare Access service token id. |
| `CF_ACCESS_CLIENT_SECRET` | Cloudflare Access service token secret. |

## Repository variables

| Variable | Default | What it is |
|---|---|---|
| `SECURE_COOKIES` | `true` | Must be `true` when served over HTTPS. |

## Things that will bite you

- **Setting a secret does not redeploy.** The VM keeps its old rendered `.env`
  until a deploy runs. To apply a new value: re-run the latest CI deploy
  (Actions -> CI -> Re-run) or push to `main`.
- Roll back by re-running an older successful deploy job — it pins
  `IMAGE_TAG=sha-<short>`, so the exact previous build comes back.

## Backups

Nothing in this app is encrypted at rest, which is deliberate: a `pg_dump` is a
complete, directly restorable backup with no key to lose. (This is the one
thing Homestock does differently from fnts, where `DATA_ENCRYPTION_KEY` makes a
raw dump unreadable on its own.)

Automated dumps and the in-app JSON export land in a later branch. Until then,
by hand:

```bash
cd /opt/homestock
docker compose -f compose.prod.yml exec -T db \
  sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > backups/homestock-$(date +%F).sql.gz
```
