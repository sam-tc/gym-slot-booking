const express = require('express');
const { getDb } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const { startTime } = req.body;

        if (!startTime) {
            return res.status(400).json({
                error: 'startTime is required',
            });
        }

        const start = Temporal.Instant.from(startTime);

        if (
            Temporal.Instant.compare(
                start,
                Temporal.Now.instant()
            ) <= 0
        ) {
            return res.status(422).json({
                error: 'Session must start in the future',
            });
        }

        if (
            start.toString().slice(14, 16) !== '00' ||
            start.toString().slice(17, 19) !== '00'
        ) {
            return res.status(422).json({
                error: 'Session must start on the hour',
            });
        }

        const db = await getDb();

        const existingSessions = await db.orm.public.Session.all();

        const existingSession = existingSessions.find(
            (session) =>
                session.startTime.toString() === startTime
        );

        if (existingSession) {
            return res.status(409).json({
                error: 'A session already exists at this start time',
            });
        }

        const session = await db.orm.public.Session.create({
            startTime: Temporal.Instant.from(startTime),
            capacity: 20,
        });

        res.status(201).json({
            session,
        });
    } catch (error) {
        next(error);
    }
});

router.get('/', requireAuth, async (req, res, next) => {
    try {
        const db = await getDb();

        const { date } = req.query;

        const sessions = await db.orm.public.Session
            .include('bookings')
            .all();

        const filteredSessions = date
            ? sessions.filter((session) => session.startTime.toString().startsWith(date))
            : sessions;

        const result = filteredSessions.map((session) => {
            const bookedCount = session.bookings.filter(
                (booking) => booking.status === 'BOOKED'
            ).length;

            return {
                id: session.id,
                startTime: session.startTime.toString(),
                capacity: session.capacity,
                seatsRemaining: session.capacity - bookedCount,
            };
        });

        res.status(200).json({
            sessions: result,
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;