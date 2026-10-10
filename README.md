# GymSlot

GymSlot is a full-stack gym session booking system built for the BYTE Society Web Development recruitment task.

Members can browse gym sessions, book and cancel slots, join waitlists for full sessions, and view their check-in codes.

Admins can create sessions, view bookings for a session, and mark attendance using member check-in codes.

---

## Features

### Member

- Register with name, email and password
- Login using token-based authentication
- Browse upcoming gym sessions
- Filter sessions by date
- View seats remaining
- Book an available session
- Cancel before the session starts
- Rebook a cancelled session if seats remain
- Join and leave waitlists for full sessions
- Automatic FIFO promotion when a confirmed booking is cancelled
- View personal bookings
- View unique check-in codes
- Receive live session updates while the page is open

New registrations also use email verification before login.

### Admin

- Login using an admin account created directly in the database
- Create one-hour sessions starting exactly on the hour
- Fixed session capacity of 20
- View sessions
- View all bookings for a selected session
- View member details
- Enter a check-in code to mark attendance
- View attendance status

---

## Tech Stack

### Frontend

- React
- Vite
- React Router
- JavaScript
- CSS

### Backend

- FastAPI
- SQLAlchemy
- Alembic
- Pydantic
- JWT authentication
- pwdlib password hashing
- WebSockets
- Brevo transactional email API

### Database

- PostgreSQL

### Deployment

- Vercel — frontend
- Render — backend
- Neon — PostgreSQL database

---

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/sam-tc/gym-slot-booking
cd gym-slot-booking
```

### 2. Backend setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
python -m pip install -r requirements.txt
```

On Windows:

```bash
venv\Scripts\activate
```

### 3. Environment variables

Copy:

```text
backend/.env.example
```

to:

```text
backend/.env
```

Example:

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

Real secrets must be stored only in environment variables and must not be committed to Git.

### 4. Run migrations

```bash
alembic upgrade head
```

### 5. Seed test data

```bash
python seed.py
```

The seed creates:

- one admin account
- three main member accounts
- sessions across multiple days
- available and full sessions
- confirmed and cancelled bookings
- waitlist entries

The seeded demo accounts are already email-verified because their `example.com` email addresses are fictional.

### 6. Start the backend

```bash
uvicorn main:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

Swagger:

```text
http://127.0.0.1:8000/docs
```

### 7. Frontend setup

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

## Demo Credentials

All credentials below are fictional test accounts.

### Admin

```text
Name: Riya Malhotra
Email: riya.admin@example.com
Password: RiyaAdmin#27
```

### Member 1

```text
Name: Aarav Mehta
Email: aarav.mehta@example.com
Password: AaravGym#41
```

### Member 2

```text
Name: Naina Kapoor
Email: naina.kapoor@example.com
Password: NainaFit#52
```

### Member 3

```text
Name: Ishita Verma
Email: ishita.verma@example.com
Password: IshitaGym#63
```

The seeded data includes sessions across several days, including full sessions for testing waitlist behaviour.

---

## Assumptions

- The gym operates in the `Asia/Kolkata` timezone.
- Every session lasts exactly one hour.
- Every session has a capacity of exactly 20 members.
- Sessions must start on an exact clock hour.
- Admin accounts are created directly in the database.
- Members may cancel only before a session starts.
- Waitlist promotion follows FIFO order.
- Check-in is performed by an admin during the session's one-hour window.
- Seeded demo accounts are pre-verified because their email addresses are fictional.

---

## Design Note

GymSlot uses React for the frontend and FastAPI for the backend.
PostgreSQL stores users, sessions, bookings and waitlist entries.
Users have member or admin roles and passwords are stored only as hashes.
JWT tokens authenticate protected API requests.
Sessions have unique start times and a fixed capacity of 20.
Bookings relate members to sessions and database constraints protect uniqueness.
Row locking prevents concurrent requests from overbooking the final seat.
Waitlist entries are ordered so cancellation can promote the first member.
Each confirmed booking receives an unpredictable check-in code.
Alembic manages database schema changes.

---

## Deployment

Frontend:

```text
https://gym-slot-booking-web.vercel.app
```

Backend:

```text
https://gym-slot-booking-api-jynx.onrender.com
```

API documentation:

```text
https://gym-slot-booking-api-jynx.onrender.com/docs
```

---

## Author

Saumya

Built for the BYTE Society Web Development recruitment task.