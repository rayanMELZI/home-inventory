# Homestock

Know what you have at home, and cook from it.

Homestock tracks what is in your kitchen and, with one click, asks an AI what
you could cook from it right now. Every purchase, every thing consumed, every
thing thrown away is one tap — and because those taps are stored as an
append-only event log, the same data answers "what do I have", "what do I need
to buy" and "what am I spending" without a second system.

It is **local-first**: the app reads and writes an on-device database, so it
works with no connection and syncs when the server comes back. Every device
that has opened it holds a complete copy of your data.

## Stack

- **backend/** — Spring Boot 4 (Java 24), JPA, Flyway, PostgreSQL 16
- **frontend/** — Next.js 16 (App Router), React 19, TypeScript, Tailwind 4, PWA
- **compose.yml** — local stack; **deploy/** — production stack

## Run it locally

```bash
cp .env.example .env     # fill in the secrets it asks for
docker compose up --build
```

Then open http://localhost:3000. Only the frontend port is published: the API
is reached through it at `/api/*`, proxied to the backend.
