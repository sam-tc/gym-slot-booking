const express = require('express');
const crypto = require('crypto');

const { getDb } = require('../db');
const {
    requireAuth,
    requireAdmin,
} = require('../middleware/auth.middleware');

const router = express.Router();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function generateCheckInCode(bookingId) {
    const secret = process.env.CHECK_IN_SECRET || process.env.JWT_SECRET;

    if (!secret) {
        throw new Error('CHECK_IN_SECRET or JWT_SECRET is required');
    }

    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const digest = crypto
        .createHmac('sha256', secret)
        .update(bookingId)
        .digest();

    return Array.from(digest.subarray(0, 6), (byte) =>
        alphabet[byte % alphabet.length]
    ).join('');
}

function hashCheckInCode(code) {
    return crypto
        .createHash('sha256')
        .update(code)
        .digest('hex');
}


/*
 * POST /api/bookings
 */
router.post(
    '/',
    requireAuth,
    async (req, res, next) => {
        try {
            const { sessionId } = req.body;

            if (typeof sessionId !== 'string' || !UUID_RE.test(sessionId)) {
                return res.status(400).json({
                    error: 'sessionId is required',
                });
            }

            if (req.user.role !== 'MEMBER') {
                return res.status(403).json({
                    error: 'Only members can create bookings',
                });
            }

            const db = await getDb();

            const result = await db.transaction(async (tx) => {
                const plan = db.raw.sql`
                    SELECT "id"
                    FROM "Session"
                    WHERE "id" = ${sessionId}
                    FOR UPDATE
                `.returnsRow({
                    id: 'pg/uuid@1',
                }).build();

                const lockedRows = await tx.query(plan);

                if (lockedRows.length === 0) {
                    return {
                        error: 'Session not found',
                        status: 404,
                    };
                }

                const sessions =
                    await tx.orm.public.Session.all();

                const session = sessions.find(
                    (existingSession) =>
                        existingSession.id === sessionId
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
                        error:
                            'Cannot book a session that has already started',
                        status: 409,
                    };
                }

                const bookings =
                    await tx.orm.public.Booking.all();

                const existingBooking = bookings.find(
                    (booking) =>
                        booking.userId === req.user.userId &&
                        booking.sessionId === sessionId &&
                        booking.status === 'BOOKED'
                );

                if (existingBooking) {
                    return {
                        error:
                            'You already have a booking for this session',
                        status: 409,
                    };
                }

                const bookedCount = bookings.filter(
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

                const booking =
                    await tx.orm.public.Booking.create({
                        userId: req.user.userId,
                        sessionId,
                        status: 'BOOKED',
                    });

                const checkInCode =
                    generateCheckInCode(booking.id);

                await tx.orm.public.Booking
                    .where({ id: booking.id })
                    .update({
                        checkInCodeHash:
                            hashCheckInCode(checkInCode),
                    });

                return {
                    booking: {
                        id: booking.id,
                        userId: booking.userId,
                        sessionId: booking.sessionId,
                        status: booking.status,
                        createdAt:
                            booking.createdAt.toString(),
                        checkInCode,
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
    }
);


/*
 * DELETE /api/bookings/:bookingId
 */
router.delete(
    '/:bookingId',
    requireAuth,
    async (req, res, next) => {
        try {
            const { bookingId } = req.params;

            if (typeof bookingId !== 'string' || !UUID_RE.test(bookingId)) {
                return res.status(400).json({
                    error: 'bookingId is required',
                });
            }

            const db = await getDb();

            const result = await db.transaction(async (tx) => {
                const bookings =
                    await tx.orm.public.Booking.all();

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

                if (
                    booking.userId !== req.user.userId
                ) {
                    return {
                        error:
                            'You can only cancel your own booking',
                        status: 403,
                    };
                }

                if (booking.status !== 'BOOKED') {
                    return {
                        error: 'Booking is already cancelled',
                        status: 409,
                    };
                }

                const sessions =
                    await tx.orm.public.Session.all();

                const session = sessions.find(
                    (existingSession) =>
                        existingSession.id ===
                        booking.sessionId
                );

                if (!session) {
                    return {
                        error: 'Session not found',
                        status: 404,
                    };
                }

                const lockSession = db.raw.sql`
                    SELECT "id"
                    FROM "Session"
                    WHERE "id" = ${session.id}
                    FOR UPDATE
                `.returnsRow({
                    id: 'pg/uuid@1',
                }).build();

                await tx.query(lockSession);

                if (
                    Temporal.Instant.compare(
                        Temporal.Now.instant(),
                        session.startTime
                    ) >= 0
                ) {
                    return {
                        error:
                            'Booking can only be cancelled before the session starts',
                        status: 409,
                    };
                }

                const cancelledBooking =
                    await tx.orm.public.Booking
                        .where({ id: booking.id })
                        .update({
                            status: 'CANCELLED',
                        });

                const waitlists =
                    await tx.orm.public.Waitlist.all();

                const sessionWaitlists =
                    waitlists
                        .filter(
                            (waitlist) =>
                                waitlist.sessionId ===
                                session.id
                        )
                        .sort(
                            (a, b) =>
                                a.createdAt.epochMilliseconds -
                                b.createdAt.epochMilliseconds
                        );

                let promotedBooking = null;

                if (sessionWaitlists.length > 0) {
                    const firstWaitlist =
                        sessionWaitlists[0];

                    const alreadyBooked =
                        bookings.find(
                            (existingBooking) =>
                                existingBooking.userId ===
                                    firstWaitlist.userId &&
                                existingBooking.sessionId ===
                                    session.id &&
                                existingBooking.status ===
                                    'BOOKED'
                        );

                    if (!alreadyBooked) {
                        const promoted =
                            await tx.orm.public.Booking.create({
                                userId:
                                    firstWaitlist.userId,
                                sessionId:
                                    session.id,
                                status: 'BOOKED',
                            });

                        const promotedCheckInCode =
                            generateCheckInCode(promoted.id);

                        await tx.orm.public.Booking
                            .where({ id: promoted.id })
                            .update({
                                checkInCodeHash:
                                    hashCheckInCode(promotedCheckInCode),
                            });

                        promotedBooking = {
                            id: promoted.id,
                            userId: promoted.userId,
                            sessionId:
                                promoted.sessionId,
                            status: promoted.status,
                        };
                    }

                    /*
                     * The waitlist position has been consumed
                     * whether the member was newly promoted or
                     * already had an active booking.
                     */
                    const deleteWaitlist =
                        db.raw.sql`
                            DELETE FROM "Waitlist"
                            WHERE "id" = ${firstWaitlist.id}
                        `.build();

                    await tx.query(deleteWaitlist);
                }

                return {
                    booking: {
                        id: cancelledBooking.id,
                        userId:
                            cancelledBooking.userId,
                        sessionId:
                            cancelledBooking.sessionId,
                        status:
                            cancelledBooking.status,
                    },
                    promotedBooking,
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
                promotedBooking:
                    result.promotedBooking,
            });
        } catch (error) {
            next(error);
        }
    }
);


/*
 * GET /api/bookings/mine
 */
router.get(
    '/mine',
    requireAuth,
    async (req, res, next) => {
        try {
            const db = await getDb();

            const bookings =
                await db.orm.public.Booking
                    .where({
                        userId: req.user.userId,
                    })
                    .all();

            const sessions =
                await db.orm.public.Session.all();

            const result = [];

            for (const booking of bookings) {
                const session = sessions.find(
                    (existingSession) =>
                        existingSession.id ===
                        booking.sessionId
                );

                let checkInCode = null;

                if (booking.status === 'BOOKED') {
                    checkInCode =
                        generateCheckInCode(booking.id);

                    const expectedHash =
                        hashCheckInCode(checkInCode);

                    if (booking.checkInCodeHash !== expectedHash) {
                        await db.orm.public.Booking
                            .where({ id: booking.id })
                            .update({
                                checkInCodeHash: expectedHash,
                            });
                    }
                }

                result.push({
                    id: booking.id,
                    sessionId:
                        booking.sessionId,
                    status: booking.status,
                    createdAt:
                        booking.createdAt.toString(),
                    checkedInAt:
                        booking.checkedInAt
                            ? booking.checkedInAt.toString()
                            : null,
                    checkInCode,
                    session: session
                        ? {
                            id: session.id,
                            startTime:
                                session.startTime.toString(),
                            capacity:
                                session.capacity,
                        }
                        : null,
                });
            }

            res.status(200).json({
                bookings: result,
            });
        } catch (error) {
            next(error);
        }
    }
);


/*
 * GET /api/bookings/session/:sessionId
 */
router.get(
    '/session/:sessionId',
    requireAuth,
    requireAdmin,
    async (req, res, next) => {
        try {
            const { sessionId } = req.params;

            if (typeof sessionId !== 'string' || !UUID_RE.test(sessionId)) {
                return res.status(400).json({
                    error: 'sessionId is required',
                });
            }

            const db = await getDb();

            const sessions =
                await db.orm.public.Session.all();

            const session = sessions.find(
                (existingSession) =>
                    existingSession.id === sessionId
            );

            if (!session) {
                return res.status(404).json({
                    error: 'Session not found',
                });
            }

            const bookings =
                await db.orm.public.Booking
                    .where({
                        sessionId,
                    })
                    .all();

            const users =
                await db.orm.public.User.all();

            const result = bookings.map((booking) => {
                const user = users.find(
                    (existingUser) =>
                        existingUser.id ===
                        booking.userId
                );

                return {
                    id: booking.id,
                    userId: booking.userId,
                    sessionId:
                        booking.sessionId,
                    status: booking.status,
                    createdAt:
                        booking.createdAt.toString(),
                    checkedInAt:
                        booking.checkedInAt
                            ? booking.checkedInAt.toString()
                            : null,
                    user: user
                        ? {
                            id: user.id,
                            name: user.name,
                            email: user.email,
                        }
                        : null,
                };
            });

            res.status(200).json({
                session: {
                    id: session.id,
                    startTime:
                        session.startTime.toString(),
                    capacity:
                        session.capacity,
                },
                bookings: result,
            });
        } catch (error) {
            next(error);
        }
    }
);


/*
 * POST /api/bookings/check-in
 */
router.post(
    '/check-in',
    requireAuth,
    requireAdmin,
    async (req, res, next) => {
        try {
            const { code } = req.body;

            if (!code) {
                return res.status(400).json({
                    error: 'code is required',
                });
            }

            if (
                typeof code !== 'string' ||
                code.trim().length !== 6 ||
                !/^[A-Z0-9]+$/i.test(code.trim())
            ) {
                return res.status(422).json({
                    error:
                        'code must be a 6-character check-in code',
                });
            }

            const normalizedCode =
                code.trim().toUpperCase();

            const codeHash =
                hashCheckInCode(normalizedCode);

            const db = await getDb();

            const result = await db.transaction(
                async (tx) => {
                    const bookings =
                        await tx.orm.public.Booking.all();

                    const booking =
                        bookings.find(
                            (existingBooking) =>
                                existingBooking
                                    .checkInCodeHash ===
                                codeHash
                        );

                    if (!booking) {
                        return {
                            error:
                                'Invalid check-in code',
                            status: 404,
                        };
                    }

                    if (
                        booking.status !== 'BOOKED'
                    ) {
                        return {
                            error:
                                'This booking is not active',
                            status: 409,
                        };
                    }

                    if (booking.checkedInAt) {
                        return {
                            error:
                                'This check-in code has already been used',
                            status: 409,
                        };
                    }

                    const sessions =
                        await tx.orm.public.Session.all();

                    const session =
                        sessions.find(
                            (existingSession) =>
                                existingSession.id ===
                                booking.sessionId
                        );

                    if (!session) {
                        return {
                            error:
                                'Session not found',
                            status: 404,
                        };
                    }

                    const plan = db.raw.sql`
                        SELECT "id"
                        FROM "Session"
                        WHERE "id" = ${session.id}
                        FOR UPDATE
                    `.returnsRow({
                        id: 'pg/uuid@1',
                    }).build();

                    await tx.query(plan);

                    const now =
                        Temporal.Now.instant();

                    const sessionEnd =
                        session.startTime.add({
                            hours: 1,
                        });

                    if (
                        Temporal.Instant.compare(
                            now,
                            session.startTime
                        ) < 0 ||
                        Temporal.Instant.compare(
                            now,
                            sessionEnd
                        ) >= 0
                    ) {
                        return {
                            error:
                                'Check-in is only allowed during the session hour',
                            status: 409,
                        };
                    }

                    const checkedInAt = now;

                    const updatedBooking =
                        await tx.orm.public.Booking
                            .where({
                                id: booking.id,
                            })
                            .update({
                                checkedInAt,
                            });

                    const users =
                        await tx.orm.public.User.all();

                    const user = users.find(
                        (existingUser) =>
                            existingUser.id ===
                            booking.userId
                    );

                    return {
                        booking: {
                            id:
                                updatedBooking.id,
                            userId:
                                updatedBooking.userId,
                            sessionId:
                                updatedBooking.sessionId,
                            status:
                                updatedBooking.status,
                            checkedInAt:
                                updatedBooking
                                    .checkedInAt
                                    .toString(),
                            user: user
                                ? {
                                    id: user.id,
                                    name: user.name,
                                    email: user.email,
                                }
                                : null,
                            session: {
                                id: session.id,
                                startTime:
                                    session.startTime
                                        .toString(),
                            },
                        },
                    };
                }
            );

            if (result.error) {
                return res.status(result.status).json({
                    error: result.error,
                });
            }

            res.status(200).json({
                message: 'Check-in successful',
                booking: result.booking,
            });
        } catch (error) {
            next(error);
        }
    }
);


module.exports = router;