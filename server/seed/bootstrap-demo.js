require('dotenv/config');
require('../temporal');

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db');

function demoCodeHash(code) {
    return crypto.createHash('sha256').update(code).digest('hex');
}

async function ensureUser(db, { name, email, password, role = 'MEMBER' }) {
    const users = await db.orm.public.User.all();
    const existing = users.find((user) => user.email === email);

    if (existing) {
        return existing;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    return db.orm.public.User.create({
        name,
        email,
        passwordHash,
        role,
    });
}

async function ensureAdmin(db) {
    const name = process.env.ADMIN_NAME?.trim() || 'Gym Admin';
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password || password.length < 12) {
        throw new Error(
            'Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters) to bootstrap the demo admin.'
        );
    }

    const users = await db.orm.public.User.all();
    const existing = users.find((user) => user.email === email);

    if (existing?.role === 'ADMIN') {
        return existing;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    if (existing) {
        return db.orm.public.User
            .where({ id: existing.id })
            .update({
                name,
                passwordHash,
                role: 'ADMIN',
            });
    }

    return db.orm.public.User.create({
        name,
        email,
        passwordHash,
        role: 'ADMIN',
    });
}

async function ensureDemoMembers(db) {
    const password = process.env.MEMBER_PASSWORD;

    if (!password || password.length < 8) {
        throw new Error(
            'Set MEMBER_PASSWORD (at least 8 characters) to bootstrap demo members.'
        );
    }

    const members = [];

    for (let number = 1; number <= 21; number += 1) {
        const member = await ensureUser(db, {
            name: `Demo Member ${number}`,
            email: `member${number}@example.com`,
            password,
        });

        members.push(member);
    }

    return members;
}

function demoStartTime(daysFromNow) {
    return Temporal.Now.zonedDateTimeISO('UTC')
        .with({
            hour: 10,
            minute: 0,
            second: 0,
            millisecond: 0,
            microsecond: 0,
            nanosecond: 0,
        })
        .add({ days: daysFromNow })
        .toInstant();
}

async function ensureSession(db, startTime) {
    const sessions = await db.orm.public.Session.all();
    const existing = sessions.find(
        (session) =>
            Temporal.Instant.compare(session.startTime, startTime) === 0
    );

    if (existing) {
        return existing;
    }

    return db.orm.public.Session.create({
        startTime,
        capacity: 20,
    });
}

async function ensureBooking(db, { userId, sessionId, checkInCode }) {
    const bookings = await db.orm.public.Booking.all();

    const existing = bookings.find(
        (booking) =>
            booking.userId === userId &&
            booking.sessionId === sessionId &&
            booking.status === 'BOOKED'
    );

    if (existing) {
        return existing;
    }

    return db.orm.public.Booking.create({
        userId,
        sessionId,
        status: 'BOOKED',
        ...(checkInCode
            ? { checkInCodeHash: demoCodeHash(checkInCode) }
            : {}),
    });
}

async function ensureWaitlist(db, { userId, sessionId }) {
    const waitlists = await db.orm.public.Waitlist.all();

    const existing = waitlists.find(
        (waitlist) =>
            waitlist.userId === userId &&
            waitlist.sessionId === sessionId
    );

    if (existing) {
        return existing;
    }

    return db.orm.public.Waitlist.create({
        userId,
        sessionId,
    });
}

async function bootstrapDemo() {
    const db = await getDb();

    await ensureAdmin(db);
    const members = await ensureDemoMembers(db);

    const sessions = {
        available: await ensureSession(db, demoStartTime(1)),
        partial: await ensureSession(db, demoStartTime(2)),
        full: await ensureSession(db, demoStartTime(3)),
        extra: await ensureSession(db, demoStartTime(4)),
    };

    await ensureBooking(db, {
        userId: members[0].id,
        sessionId: sessions.partial.id,
        checkInCode: 'DEMO01',
    });

    await ensureBooking(db, {
        userId: members[1].id,
        sessionId: sessions.partial.id,
    });

    for (let index = 0; index < 20; index += 1) {
        await ensureBooking(db, {
            userId: members[index].id,
            sessionId: sessions.full.id,
        });
    }

    await ensureWaitlist(db, {
        userId: members[20].id,
        sessionId: sessions.full.id,
    });

    console.log('Demo data is ready.');
    console.log('Admin:', process.env.ADMIN_EMAIL);
    console.log('Member: member1@example.com');
    console.log('Demo check-in code for member1: DEMO01');
}

bootstrapDemo().catch((error) => {
    console.error(error);
    process.exit(1);
});
