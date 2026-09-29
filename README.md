# Gym Slot Booking

A small gym scheduling app with member booking, cancellation, waitlists, one-time check-in codes, and an admin dashboard. The Express server serves both the static client and `/api`, so the app runs on one origin.

## Stack

- Node.js and Express 5
- PostgreSQL with the Prisma 8 contract-based Postgres ORM
- Plain HTML, CSS, and browser JavaScript
- JWT bearer authentication and bcrypt password hashes

## Run locally

Requirements: Node.js with the Temporal API, npm, and PostgreSQL.

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

The optional `seed/seed.js` script creates a demo admin, 21 demo members, two sessions, and sample bookings using fixed credentials. It has no npm script and should only be used against a disposable development database; do not use these credentials in a shared or production environment.

## Deploy a temporary demo on Render

The root `render.yaml` defines a Render web service and PostgreSQL database. In Render, create a Blueprint from this GitHub repository and review the resource plan before applying it. During setup, provide `ADMIN_NAME`, `ADMIN_EMAIL`, and a unique `ADMIN_PASSWORD` of at least 12 characters in Render's secret prompts. The service initializes the contract and creates that admin plus two upcoming sessions; it does not run the fixed-credential seed script.

This Blueprint uses free plans for a quick demo. Render's free web service can spin down when idle, and its free PostgreSQL database expires after 30 days; use only disposable test accounts and data. Upgrade the database to a paid plan before relying on it for persistent use. See [Render's free-instance limits](https://render.com/docs/free).

## Main flows

- Register and log in as a member; the app stores a one-hour JWT in browser local storage.
- Browse future hourly sessions, filter by the browser's local date, book available capacity, or join a full session's waitlist.
- Cancel a booking before its session starts. The earliest waitlisted member is promoted when a place opens.
- View booking history and the one-time check-in code shown after booking.
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
