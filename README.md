# Homestock

Know what you have at home, and cook from it.

Homestock tracks what is in your kitchen and, with one click, asks an AI what
you could make from it right now. Every purchase, every thing used up, every
thing thrown away is one tap — and because those taps are stored as an
append-only log, the same data answers *what do I have*, *what do I need to
buy* and *what am I spending* without a second system keeping score.

It is **local-first**. The browser holds the whole dataset and reads and writes
it directly, so the app is just as fast — and just as usable — with the server
switched off. Changes queue up and sync when it comes back, and every device
that has opened the app is quietly holding a full copy of your data.

## What v1 does

| | |
|---|---|
| **Pantry** | Everything you own, with `+` and `−` on every card. One tap records a purchase or a use; there is no dialog and no quantity field, because anything slower and the pantry stops matching the kitchen. Search, categories, and a *low* badge when something drops to the level you set. |
| **Meals** | One button. It reads the pantry and comes back with things you could actually cook, each one naming any ingredient you would still need rather than quietly assuming it. |
| **Shopping** | Whatever has run low, automatically. Tick it off with the amount and what you paid, and it goes straight back into the pantry. Something you do not own yet gets onto the list by being added with no stock. |
| **Settings** | This month's spending, broken down by category. A one-click backup of everything as plain JSON, and a restore that merges rather than overwrites. Light/dark/system. |
| **Offline** | All of the above except the meal suggestions, which need the server to do the thinking. |

## The one idea

There is no inventory table and no spending table. There is a catalogue of
**items**, and an append-only log of **events** — `PURCHASE`, `CONSUME`,
`DISCARD`, `SELL`, `ADJUST` — each carrying a signed change in quantity and,
where money moved, what it cost.

Everything else is derived from that log:

- **how much you have** is the sum of an item's deltas,
- **what you spend** is the sum of the prices on the purchases,
- **what you need** is whatever has fallen to its threshold,
- and **offline sync is conflict-free**, because events are only ever created,
  never edited, and each carries an id minted by the device that made it. The
  server can therefore accept the same event twice and nothing happens.

The invariant that holds it together: *an item's quantity is exactly the sum of
its deltas*. Using more than you have trims the **delta**, never the total —
clamping the total would depend on the order events arrived in, and two devices
replaying the same afternoon would settle on different numbers.

## Stack

- **backend/** — Spring Boot 4 (Java 24), JPA, Flyway, PostgreSQL 16, JWT auth
  with a rotating refresh cookie
- **frontend/** — Next.js 16 (App Router), React 19, TypeScript, Tailwind 4,
  IndexedDB, installable as a PWA
- **compose.yml** — the local stack; **deploy/** — the production stack and
  every secret it needs

Nothing is encrypted at rest, deliberately: a `pg_dump` is therefore a real,
restorable backup with no key that can be lost along with it.

## Run it

```bash
cp .env.example .env     # fill POSTGRES_PASSWORD and JWT_SECRET
docker compose up --build
```

Open http://localhost:3005 and register. Only the frontend port is published —
the API is reached through it at `/api/*`, which is why there is no CORS
configuration anywhere in the project.

Meal suggestions need a Gemini API key in `.env`
([free tier](https://aistudio.google.com/apikey) is plenty). Leave it blank and
everything else works; the Meals screen just says it is switched off.

## Backups

Two of them, doing different jobs:

- **Settings → Download a backup** writes one JSON file with every item and
  everything that has ever happened to it. Restoring merges by id, so importing
  the same file twice is harmless.
- **The VM** runs a `pg_dump` every night into `/opt/homestock/backups`,
  keeping a fortnight. See `deploy/README.md`.

And implicitly, a third: every phone or laptop that has opened the app holds
the full history in its own database.
