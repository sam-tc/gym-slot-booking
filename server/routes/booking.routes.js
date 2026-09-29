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

router.delete('/:bookingId', requireAuth, async (req, res, next) => {
    try {
        const { bookingId } = req.params;

        if (!bookingId) {
            return res.status(400).json({
                error: 'bookingId is required',
            });
        }

        const db = await getDb();

        const result = await db.transaction(async (tx) => {
            const bookings = await tx.orm.public.Booking.all();

            const booking = bookings.find(
                (existingBooking) =>
                    existingBooking.id === bookingId
            );

            if (!booking) {
                return {
                    error: 'Booking not found',
                    status: 404,
                };
            }

            if (booking.userId !== req.user.userId) {
                return {
                    error: 'You can only cancel your own booking',
                    status: 403,
                };
            }

            if (booking.status !== 'BOOKED') {
                return {
                    error: 'Booking is already cancelled',
                    status: 409,
                };
            }

            const sessions = await tx.orm.public.Session.all();

            const session = sessions.find(
                (existingSession) =>
                    existingSession.id === booking.sessionId
            );

            if (!session) {
                return {
                    error: 'Session not found',
                    status: 404,
                };
            }

            if (Temporal.Instant.compare(
                Temporal.Now.instant(),
                session.startTime
            ) >= 0) {
                return {
                    error: 'Booking can only be cancelled before the session starts',
                    status: 409,
                };
            }

            const cancelledBooking = await tx.orm.public.Booking
                .where({ id: booking.id })
                .update({
                    status: 'CANCELLED',
                });

            return {
                booking: {
                    id: cancelledBooking.id,
                    userId: cancelledBooking.userId,
                    sessionId: cancelledBooking.sessionId,
                    status: cancelledBooking.status,
                },
            };
        });

        if (result.error) {
            return res.status(result.status).json({
                error: result.error,
            });
        }

        res.json({
            message: 'Booking cancelled',
            booking: result.booking,
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;