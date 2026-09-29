# Gym Slot Booking

A small gym scheduling app with member booking, cancellation, waitlists, one-time check-in codes, and an admin dashboard. The Express server serves both the static client and `/api`, so the app runs on one origin.

## Stack

- Node.js and Express 5
- PostgreSQL with the Prisma 8 contract-based Postgres ORM
- Plain HTML, CSS, and browser JavaScript
- JWT bearer authentication and bcrypt password hashes

## Design note

Stack: Express + PostgreSQL/Prisma + plain HTML/CSS/JS; JWT authenticates members and admins, while passwords are bcrypt hashes.
Data model: User has many Bookings; Session has many Bookings; Waitlist links User and Session; Booking stores a one-time check-in hash and optional check-in time.
The API enforces auth, role checks, ownership, server-side validation, capacity, cancellation, waitlist promotion, and check-in rules.
The frontend uses protected pages, responsive cards, live status regions, optimistic booking with rollback, and 10-second seat refreshes.
Accessibility: labelled inputs, keyboard-visible focus, readable text errors, native controls, and disabled buttons while requests are active.
Assumptions: sessions are exactly one hour, start at minute 00, capacity is always 20, and a member may have one active booking per session.

## Run locally

Requirements: Node.js 24, npm, and PostgreSQL. The server loads a Temporal polyfill for runtimes that do not provide the API globally.

1. Create a PostgreSQL database, then configure `server/.env` from `server/.env.example`:

   ```sh
   cd server
   cp .env.example .env
   # Set DATABASE_URL and a long, random JWT_SECRET in .env.
   ```

2. Install dependencies and initialize a fresh local database from the current contract:

   ```sh
   npm ci
   npx prisma db init --db "$DATABASE_URL"
   ```

   For a database that already has the schema and migration marker, review and apply the committed migration graph with `npx prisma db migrate --show --db "$DATABASE_URL"`, then `npx prisma db migrate --db "$DATABASE_URL"`.

3. Start the server:

   ```sh
   npm start
   ```

   It listens on `PORT` when provided, otherwise port `3000`. Open `http://localhost:3000` (or the configured port).

The supported demo bootstrap creates one admin, 21 demo members, sessions across four upcoming days, one full session, two bookings on a partial session, and a waitlisted member. It is intended only for a disposable development/demo database.

## Demo credentials

These credentials are **development/demo credentials only** and must not be reused for production:

- Admin: `admin@example.com` / `demo-admin-password-123`
- Member: `member1@example.com` / `demo-member-password-123`

Run `npm run bootstrap:demo` after copying `server/.env.example` to `server/.env` and keeping the demo-only values for `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `MEMBER_PASSWORD`. Change them before using the app outside a disposable demo database.

## Deploy a demo on Vercel

The app is configured for Vercel's Express support. The static website is in `server/public`, and `server/index.js` exports the Express app for Vercel Functions while still supporting `npm start` locally. In Vercel, import this GitHub repository and set **Root Directory** to `server`. Vercel serves `public/` through its CDN; Express serves the API. See [Vercel's Express guide](https://vercel.com/docs/frameworks/backend/express).

The app needs a PostgreSQL database hosted separately. Create one with a provider such as [Neon](https://neon.tech/), then copy its pooled PostgreSQL connection string into Vercel as `DATABASE_URL`. Add `JWT_SECRET` and `CHECK_IN_SECRET` as long random secrets. Keep all three values private.

Vercel runs `prisma db init` during each deployment, which initializes a new database before the app receives requests. It is deliberately a build step instead of a server-start step, because Vercel functions can start more than once. After deploying, open the Vercel URL and check `/health/db` to confirm the API can reach the database.

To create the administrator, demo members, and sample sessions, run this once from a trusted computer with access to the same database. In `server/`, copy `.env.example` to `.env`, set `DATABASE_URL`, `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `MEMBER_PASSWORD`, then run `npm run bootstrap:demo`. Keep `.env` private; it is ignored by Git.

## Main flows

- Register and log in as a member; the app stores a one-hour JWT in browser local storage.
- Browse future hourly sessions, filter by the browser's local date, book available capacity, or join a full session's waitlist.
- Cancel a booking before its session starts. The earliest waitlisted member is promoted when a place opens.
- View booking history and the stable, booking-specific six-character check-in code.
- Admins can create future sessions on the hour, view session bookings, and check in a booked member during the session hour using the six-character code.

## API overview

All routes are prefixed by `/api`.

| Area | Routes | Access |
| --- | --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login` | Public |
| Users | `GET /users/me` | Signed-in user |
| Sessions | `GET /sessions`, `POST /sessions` | Signed-in user; create is admin-only |
| Bookings | `POST /bookings`, `GET /bookings/mine`, `DELETE /bookings/:bookingId` | Signed-in member |
| Admin bookings | `GET /bookings/session/:sessionId`, `POST /bookings/check-in` | Admin |
| Waitlist | `POST /waitlist`, `GET /waitlist/mine`, `DELETE /waitlist/:waitlistId` | Signed-in user |
| Health | `GET /health/db` | Public |

Protected routes accept `Authorization: Bearer <token>`. The server returns JSON errors with HTTP status codes; malformed JSON bodies return 400.

## Data model and migrations

The PostgreSQL data contract is `server/prisma/contract.prisma`; `contract.json` and `contract.d.ts` are generated artifacts. The checked-in migration graph is under `server/migrations/app`. For a contract change, emit artifacts and plan a migration from `server/`:

```sh
npx prisma contract emit
npx prisma migration plan --name describe_the_change
npx prisma migration check
npx prisma db migrate --show --db "$DATABASE_URL"
npx prisma db migrate --db "$DATABASE_URL"
```

Review the generated migration files before applying them to a shared database.

## Verification

Run the API and check-in regression tests with `cd server && npm test`. They exercise the HTTP routes with an isolated in-memory database fixture and do not write to PostgreSQL. A basic source check is `node --check` on the changed client and server JavaScript files; `npx prisma migration check` validates the committed migration graph without a database connection.

## Assumptions

- Sessions are exactly one hour and always start on the hour.
- Capacity is fixed at 20; members can hold one active booking per session.
- Admin accounts are provisioned directly in the database/demo bootstrap, never through public registration.
- Check-in codes are valid only during their session hour and only once.
