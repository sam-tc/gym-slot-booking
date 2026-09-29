const express = require('express');
const { getDb } = require('../db');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/', requireAuth, async (req, res, next) => {
    try {
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({
                error: 'sessionId is required',
            });
        }

        const db = await getDb();

        const result = await db.transaction(async (tx) => {
            const sessionLockPlan = db.raw.sql`
                SELECT "id"
                FROM "Session"
                WHERE "id" = ${sessionId}
                FOR UPDATE
            `.returnsRow({
                id: 'pg/uuid@1',
            }).build();

            const lockedSessionRows = await tx.query(sessionLockPlan);

            if (lockedSessionRows.length === 0) {
                return {
                    error: 'Session not found',
                    status: 404,
                };
            }

            const sessions = await tx.orm.public.Session.all();

            const session = sessions.find(
                (existingSession) => existingSession.id === sessionId
            );

            if (!session) {
                return {
                    error: 'Session not found',
                    status: 404,
                };
            }

            const dbBookings = await tx.orm.public.Booking.all();

            const existingBooking = dbBookings.find(
                (booking) =>
                    booking.userId === req.user.userId &&
                    booking.sessionId === sessionId &&
                    booking.status === 'BOOKED'
            );

            if (existingBooking) {
                return {
                    error: 'You already have an active booking for this session',
                    status: 409,
                };
            }

            const bookedCount = dbBookings.filter(
                (booking) =>
                    booking.sessionId === sessionId &&
                    booking.status === 'BOOKED'
            ).length;

            if (bookedCount >= session.capacity) {
                return {
                    error: 'Session is full',
                    status: 409,
                };
            }

            const booking = await tx.orm.public.Booking.create({
                userId: req.user.userId,
                sessionId: session.id,
                status: 'BOOKED',
            });

            return {
                booking: {
                    id: booking.id,
                    userId: booking.userId,
                    sessionId: booking.sessionId,
                    status: booking.status,
                },
            };
        });

        if (result.error) {
            return res.status(result.status).json({
                error: result.error,
            });
        }

        res.status(201).json({
            message: 'Booking created',
            booking: result.booking,
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;