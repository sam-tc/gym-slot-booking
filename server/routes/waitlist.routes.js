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

            if (
                Temporal.Instant.compare(
                    Temporal.Now.instant(),
                    session.startTime
                ) >= 0
            ) {
                return {
                    error: 'Cannot join the waitlist after the session has started',
                    status: 409,
                };
            }

            const bookings = await tx.orm.public.Booking.all();

            const activeBooking = bookings.find(
                (booking) =>
                    booking.userId === req.user.userId &&
                    booking.sessionId === sessionId &&
                    booking.status === 'BOOKED'
            );

            if (activeBooking) {
                return {
                    error: 'You already have a booking for this session',
                    status: 409,
                };
            }

            const bookedCount = bookings.filter(
                (booking) =>
                    booking.sessionId === sessionId &&
                    booking.status === 'BOOKED'
            ).length;

            if (bookedCount < session.capacity) {
                return {
                    error: 'Session still has available seats',
                    status: 409,
                };
            }

            const waitlists = await tx.orm.public.Waitlist.all();

            const existingWaitlist = waitlists.find(
                (waitlist) =>
                    waitlist.userId === req.user.userId &&
                    waitlist.sessionId === sessionId
            );

            if (existingWaitlist) {
                return {
                    error: 'You are already on the waitlist for this session',
                    status: 409,
                };
            }

            const waitlist = await tx.orm.public.Waitlist.create({
                userId: req.user.userId,
                sessionId,
            });

            return {
                waitlist: {
                    id: waitlist.id,
                    userId: waitlist.userId,
                    sessionId: waitlist.sessionId,
                    createdAt: waitlist.createdAt.toString(),
                },
            };
        });

        if (result.error) {
            return res.status(result.status).json({
                error: result.error,
            });
        }

        res.status(201).json({
            message: 'Added to waitlist',
            waitlist: result.waitlist,
        });
    } catch (error) {
        next(error);
    }
});

router.delete('/:waitlistId', requireAuth, async (req, res, next) => {
    try {
        const { waitlistId } = req.params;

        if (!waitlistId) {
            return res.status(400).json({
                error: 'waitlistId is required',
            });
        }

        const db = await getDb();

        const waitlists = await db.orm.public.Waitlist.all();

        const waitlist = waitlists.find(
            (existingWaitlist) =>
                existingWaitlist.id === waitlistId
        );

        if (!waitlist) {
            return res.status(404).json({
                error: 'Waitlist entry not found',
            });
        }

        if (waitlist.userId !== req.user.userId) {
            return res.status(403).json({
                error: 'You can only leave your own waitlist entry',
            });
        }

        await db.orm.public.Waitlist
            .where({ id: waitlistId })
            .delete();

        res.json({
            message: 'Removed from waitlist',
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;