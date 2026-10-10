# GymSlot

GymSlot is a full-stack gym session booking system built for the BYTE Society Web Development recruitment task.

Members can register, verify their email address, browse gym sessions, book available slots, cancel bookings, join waitlists for full sessions, and receive unique check-in codes.

Admins can create sessions, inspect session bookings, and check members in using their booking codes.

The application also uses WebSockets for real-time booking updates.

---

## Features

### Member

- Register with name, email and password
- Verify email ownership through a time-limited verification link
- Resend the verification email when required
- Login using JWT authentication after email verification
- Browse upcoming gym sessions
- Filter sessions by date
- View remaining seats
- Book available sessions
- Cancel a booking before the session starts
- Rebook a cancelled session if seats remain
- Join the waitlist when a session is full
- Leave the waitlist
- Automatic FIFO promotion when a seat becomes available
- View personal booking history
- View unique check-in codes
- Server-synchronised session/check-in status
- Real-time session updates

### Admin

- Login using an admin account created directly in the database
- Create one-hour gym sessions
- Sessions always start exactly on the hour
- Fixed capacity of 20 members per session
- View current, future and historical sessions
- View all bookings for a selected session
- View member names and emails
- Check members in using booking codes
- See attendance status
- Receive real-time booking updates

---

## Tech Stack

### Frontend

- React
- Vite
- React Router
- JavaScript
- CSS
- WebSocket API

### Backend

- FastAPI
- SQLAlchemy
- Alembic
- Pydantic
- JWT authentication
- pwdlib password hashing
- Brevo transactional email API
- WebSockets

### Database

- PostgreSQL

### Deployment

- Vercel — frontend
- Render — backend
- Neon — production PostgreSQL

---

## Project Structure

```text
gym-slot-booking/
│
├── backend/
│   ├── migrations/
│   ├── routers/
│   ├── .env.example
│   ├── alembic.ini
│   ├── database.py
│   ├── dependencies.py
│   ├── email_service.py
│   ├── errors.py
│   ├── main.py
│   ├── models.py
│   ├── realtime.py
│   ├── requirements.txt
│   ├── schemas.py
│   ├── security.py
│   └── seed.py
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── pages/
│   │   └── services/
│   ├── .env.example
│   ├── package.json
│   ├── vercel.json
│   └── vite.config.js
│
├── .gitignore
└── README.md
```

---

# Local Setup

## 1. Clone the repository

Clone this repository and enter the project directory:

```bash
git clone <repository-url>
cd gym-slot-booking
```

---

## 2. PostgreSQL setup

Make sure PostgreSQL is installed and running.

Create a PostgreSQL database:

```text
gym_slot_booking
```

The application can use a dedicated PostgreSQL role such as:

```text
gym_app
```

Configure the database credentials through the backend environment file.

---

## 3. Backend setup

Enter the backend directory:

```bash
cd backend
```

Create a Python virtual environment:

```bash
python3 -m venv venv
```

Activate it.

### macOS / Linux

```bash
source venv/bin/activate
```

### Windows

```bash
venv\Scripts\activate
```

Install dependencies:

```bash
python -m pip install -r requirements.txt
```

---

## 4. Environment variables

### Backend

Copy:

```text
backend/.env.example
```

to:

```text
backend/.env
```

Configure:

```env
DATABASE_URL=postgresql+psycopg://gym_app:YOUR_PASSWORD@localhost:5432/gym_slot_booking

JWT_SECRET=replace-with-a-long-random-secret
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60

FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
FRONTEND_URL=http://localhost:5173

BREVO_API_KEY=replace-with-brevo-api-key
BREVO_SENDER_EMAIL=verified-sender@example.com
BREVO_SENDER_NAME=GymSlot
```

`DATABASE_URL` contains the PostgreSQL connection details.

`JWT_SECRET` is used to sign authentication and email-verification tokens.

`FRONTEND_ORIGINS` accepts comma-separated frontend origins that are allowed by CORS.

`FRONTEND_URL` is used when creating links inside verification emails.

`BREVO_API_KEY` is used by the backend to call the Brevo transactional email API.

`BREVO_SENDER_EMAIL` must be an email address authorised as a sender in the Brevo account.

`BREVO_SENDER_NAME` controls the display name shown on verification emails.

The real `backend/.env` file must never be committed to Git.

### Frontend

The frontend reads the backend address from:

```env
VITE_API_URL
```

For local development it automatically falls back to:

```text
http://127.0.0.1:8000
```

A sample configuration is included in:

```text
frontend/.env.example
```

For production:

```env
VITE_API_URL=https://gym-slot-booking-api-jynx.onrender.com
```

The WebSocket URL is derived automatically from the same API URL.

---

## 5. Run database migrations

From the `backend` directory:

```bash
alembic upgrade head
```

This creates the required PostgreSQL tables, columns, indexes and constraints.

---

## 6. Seed demo data

Run:

```bash
python seed.py
```

The seed script removes existing development data and creates clean demonstration data including:

- one admin account
- three main demo member accounts
- realistic fictional member names and emails
- sessions across several days
- confirmed bookings
- cancelled/rebookable bookings
- an available session
- a full session where demo members are already waitlisted
- another full session that demo members can join

Each main demo member can therefore demonstrate the important member states:

```text
Booked
Cancelled / rebookable
Book session
Leave waitlist
Join waitlist
```

Additional fictional members are created internally so the full sessions contain legitimate 20/20 confirmed bookings.

All seeded sessions start exactly on the hour.

All seeded admin and member accounts are marked as email-verified so the fictional `example.com` demo credentials can be used immediately by evaluators.

---

## 7. Start the backend

```bash
uvicorn main:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

Swagger API documentation:

```text
http://127.0.0.1:8000/docs
```

---

## 8. Frontend setup

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

# Demo Credentials

All accounts below are fictional test accounts.

Each demo member has seeded examples of the major member states, including a confirmed booking, a cancelled/rebookable booking, an available session, a waitlisted session, and another full session whose waitlist can be joined.

Seeded demo accounts are already marked as email-verified because the `example.com` email addresses are fictional and cannot receive real verification messages.

## Admin

```text
Name: Riya Malhotra
Email: riya.admin@example.com
Password: RiyaAdmin#27
```

## Member 1

```text
Name: Aarav Mehta
Email: aarav.mehta@example.com
Password: AaravGym#41
```

## Member 2

```text
Name: Naina Kapoor
Email: naina.kapoor@example.com
Password: NainaFit#52
```

## Member 3

```text
Name: Ishita Verma
Email: ishita.verma@example.com
Password: IshitaGym#63
```

Additional fictional members are seeded internally to create legitimate 20/20 full sessions.

---

# Authentication

Passwords are never stored directly.

They are hashed using `pwdlib` before being stored in PostgreSQL.

Public registration creates member accounts only.

A newly registered member begins with:

```text
email_verified = false
```

The member must verify ownership of the email address before logging in.

After a verified user successfully logs in, the backend issues a JWT access token.

Protected HTTP endpoints validate the token and determine the authenticated user's role.

The application has two roles:

```text
member
admin
```

Admin accounts cannot be created using public registration.

Frontend route protection improves the user experience, but actual authentication and role checks are always enforced by the backend.

---

# Email Verification

New member registrations require email verification before login.

The backend creates a signed, time-limited verification token containing the user's identifier and a verification-specific purpose.

The verification token is sent to the member using the Brevo transactional email API.

The email contains a link similar to:

```text
http://localhost:5173/verify-email?token=<verification-token>
```

In production, the link uses:

```text
https://gym-slot-booking-web.vercel.app/verify-email?token=<verification-token>
```

The frontend `/verify-email` page reads the token from the URL and submits it to:

```text
POST /auth/verify-email
```

The backend validates the token's signature, expiry and purpose.

After successful verification:

```text
email_verified = true
```

The member can then log in normally.

Invalid or expired verification tokens are rejected.

Unverified members can request another verification message through:

```text
POST /auth/resend-verification
```

The resend endpoint uses a generic response so it does not reveal whether a particular email address belongs to an account.

The Brevo API key and sender configuration are stored only in environment variables and are never committed to the repository.

Seeded demo accounts bypass the verification step by being created with `email_verified = true`.

---

# Session Rules

Each session:

- lasts exactly one hour
- starts exactly on the hour
- has a fixed capacity of 20
- has a unique start time

Example valid start times:

```text
07:00
08:00
18:00
19:00
```

A time such as:

```text
07:43
```

is rejected.

The database also enforces the capacity and unique session time constraints.

---

# Booking Safety

Booking capacity is enforced by the backend rather than only by the frontend.

When a member books a session, the backend locks the session row before checking availability.

This prevents two simultaneous requests from both taking the final available seat.

A member can have only one booking record for a particular session.

Cancelled booking rows are reused when the member later rebooks.

A confirmed booking is created only when:

- the session exists
- the session has not started
- capacity is still available
- the member does not already have an active booking for the session

The database and backend logic work together so a session cannot exceed its capacity even when booking requests arrive concurrently.

---

# Waitlist

Members can join the waitlist only when a session is full.

Waitlist entries are unique for each member and session.

When a confirmed booking is cancelled:

1. the booking is cancelled
2. the first member on the waitlist is selected
3. that member is promoted automatically
4. a fresh check-in code is generated
5. the waitlist entry is removed

Promotion follows FIFO ordering.

No member is promoted after the session has started.

Members can also leave a waitlist before being promoted.

---

# Check-In

Each confirmed booking receives an unpredictable check-in code.

Example:

```text
E9YH46
```

Members can view their code in **My Bookings**.

An admin enters the code from the Admin dashboard.

A code works only when:

- the booking is confirmed
- the session has already started
- the session's one-hour window has not ended
- the code has not previously been used

Therefore, for a session beginning at 6:00 PM:

```text
5:59 PM   → rejected
6:00 PM   → allowed
6:45 PM   → allowed
7:00 PM   → rejected
```

Successful attendance is recorded using a `checked_in_at` timestamp.

A cancelled booking cannot be checked in.

---

# Server-Synchronised Time

Time-sensitive UI behaviour does not rely only on the user's device clock.

The frontend synchronises with:

```text
GET /time
```

and calculates an offset between the browser and backend clocks.

The frontend then maintains the displayed time locally and periodically synchronises again.

This allows the interface to display states such as:

```text
Check-in opens at 6:00 PM
Check-in available now
Session ended
```

The backend remains authoritative for all actual booking, cancellation and check-in rules.

---

# Real-Time Updates

GymSlot uses WebSockets for real-time notifications.

Authenticated clients connect to:

```text
/ws
```

using their authentication token.

When relevant data changes, the backend broadcasts a small event such as:

```json
{
  "type": "session_changed",
  "session_id": 12
}
```

The event intentionally contains no private member data.

After receiving an event, the frontend fetches the authorised data again through the normal REST API.

This keeps:

```text
WebSocket → notification channel
REST API  → authorised application data
PostgreSQL → source of truth
```

The Sessions page also retains polling as a fallback if the WebSocket connection is temporarily unavailable.

---

# Error Handling

The backend uses consistent JSON error responses.

Example:

```json
{
  "error": {
    "code": "unauthorized",
    "message": "Authentication required",
    "details": null
  }
}
```

The application handles:

- authentication failures
- authorization failures
- unverified login attempts
- invalid or expired email-verification links
- validation errors
- duplicate accounts
- duplicate bookings
- duplicate waitlist entries
- full sessions
- invalid check-in codes
- expired check-in periods
- duplicate session times
- transactional email delivery failures

Unhandled server stack traces are not exposed to the client.

---

# Frontend Behaviour

The frontend includes:

- protected routes
- admin-only routing
- a public email-verification route
- verification success and failure states
- resend-verification support for unverified accounts
- loading states
- error states
- empty states
- success messages
- disabled buttons while requests are running
- inline form validation
- server-side validation
- responsive layouts
- labelled form inputs
- keyboard-accessible native controls

Booking uses optimistic UI updates so seat counts change immediately.

If the backend rejects the booking, the local change is rolled back.

The Sessions page receives real-time updates through WebSockets and also uses polling as a fallback.

The verification page automatically reads the token from the URL and asks the backend to verify it, so users do not need to manually copy verification tokens.

---

# API Overview

The backend exposes routes for authentication, sessions, bookings, waitlists, administration, server time and WebSocket updates.

Important authentication routes include:

```text
POST /auth/register
POST /auth/login
POST /auth/verify-email
POST /auth/resend-verification
GET  /auth/me
```

Session and booking operations require authentication.

Administrative operations additionally require the authenticated user to have the `admin` role.

Interactive API documentation is available through Swagger when the backend is running.

---

# Assumptions

- The gym operates in the `Asia/Kolkata` timezone.
- Every session lasts exactly one hour.
- Every session has a capacity of exactly 20 members.
- Sessions must begin on an exact clock hour.
- Admin accounts are created directly in the database.
- A confirmed booking owns one active check-in code.
- Check-in is performed by gym staff/admin rather than by the member.
- New public member registrations require email verification before login.
- Seeded demo accounts are pre-verified because their `example.com` addresses are fictional.
- Seeded accounts and emails are fictional demonstration data.

---

# Design Note

GymSlot uses React for the client and FastAPI for the API.
PostgreSQL is the source of truth for users, sessions and bookings.
JWT tokens secure authenticated API access.
Role checks are enforced on the backend, not only in React.
Database constraints protect uniqueness and session capacity rules.
Row locking protects the final seat during concurrent bookings.
Waitlist promotion occurs in the same transaction as cancellation.
WebSockets notify clients when shared session state changes.
REST endpoints are re-fetched after events to preserve authorization.
Server time remains authoritative for cancellation and check-in rules.

---

# Deployment

```text
Frontend: https://gym-slot-booking-web.vercel.app
Backend:  https://gym-slot-booking-api-jynx.onrender.com
```

The frontend is deployed on Vercel.

The FastAPI backend is deployed on Render.

The production PostgreSQL database is hosted on Neon.

## Frontend production environment

```env
VITE_API_URL=https://gym-slot-booking-api-jynx.onrender.com
```

## Backend production environment

```env
DATABASE_URL=<production-postgresql-url>

JWT_SECRET=<secure-random-secret>
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60

FRONTEND_ORIGINS=https://gym-slot-booking-web.vercel.app
FRONTEND_URL=https://gym-slot-booking-web.vercel.app

BREVO_API_KEY=<brevo-api-key>
BREVO_SENDER_EMAIL=<verified-brevo-sender-email>
BREVO_SENDER_NAME=GymSlot
```

Production secrets and database credentials must be configured through the hosting provider's environment-variable settings and must never be committed to the repository.

Database migrations must be applied to the production PostgreSQL database before running application code that depends on new schema changes.

Production communication uses:

```text
HTTPS      → https://
WebSockets → wss://
```

---

# API Documentation

When the backend is running locally, interactive FastAPI documentation is available at:

```text
http://127.0.0.1:8000/docs
```

The deployed backend also exposes FastAPI documentation at:

```text
https://gym-slot-booking-api-jynx.onrender.com/docs
```

---

# Security Notes

- Passwords are stored only as password hashes.
- JWT secrets are supplied through environment variables.
- Brevo API credentials are supplied through environment variables.
- Real `.env` files are excluded from Git.
- Admin privileges are enforced by the backend.
- Email verification is required for newly registered public member accounts.
- Verification tokens are signed and expire after a limited period.
- Check-in codes are generated using cryptographically secure randomness.
- Booking capacity is protected using database transactions and row locking.
- WebSocket events do not contain private member information.
- Database constraints enforce important uniqueness rules.

---

# Author

Saumya  
Built for the BYTE Society Web Development recruitment task.