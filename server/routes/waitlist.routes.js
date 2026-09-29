const express = require('express');
const { getDb } = require('../db');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

router.post('/', requireAuth, async (req, res, next) => {
    try {
        const { sessionId } = req.body;

        if (typeof sessionId !== 'string' || !UUID_RE.test(sessionId)) {
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


router.get('/mine', requireAuth, async (req, res, next) => {
    try {
        const db = await getDb();

        const waitlists = await db.orm.public.Waitlist
            .where({
                userId: req.user.userId,
            })
            .all();

        const sessions = await db.orm.public.Session.all();

        const result = waitlists.map((waitlist) => {
            const session = sessions.find(
                (existingSession) =>
                    existingSession.id === waitlist.sessionId
            );

            return {
                id: waitlist.id,
                sessionId: waitlist.sessionId,
                createdAt: waitlist.createdAt.toString(),
                session: session
                    ? {
                        id: session.id,
                        startTime: session.startTime.toString(),
                        capacity: session.capacity,
                    }
                    : null,
            };
        });

        res.status(200).json({
            waitlists: result,
        });
    } catch (error) {
        next(error);
    }
});


router.delete('/:waitlistId', requireAuth, async (req, res, next) => {
    try {
        const { waitlistId } = req.params;

        if (typeof waitlistId !== 'string' || !UUID_RE.test(waitlistId)) {
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