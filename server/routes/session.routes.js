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

        const db = await getDb();

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

        const sessions = await db.orm.public.Session
            .include('bookings')
            .all();

        const result = sessions.map((session) => {
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