require('dotenv/config');

const bcrypt = require('bcryptjs');
const { getDb } = require('../db');

async function seed() {
    const db = await getDb();

    const hashPassword = (password) => bcrypt.hash(password, 12);

    const adminPasswordHash = await hashPassword('AdminPassword123');
    const memberPasswordHash = await hashPassword('MemberPassword123');

    const users = [
        {
            name: 'Gym Admin',
            email: 'admin@example.com',
            passwordHash: adminPasswordHash,
            role: 'ADMIN',
        },
    ];

    for (let i = 1; i <= 21; i++) {
        users.push({
            name: `Member ${i}`,
            email: `member${i}@example.com`,
            passwordHash: memberPasswordHash,
            role: 'MEMBER',
        });
    }

    for (const user of users) {
        const existingUsers = await db.orm.public.User.all();

        const existingUser = existingUsers.find(
            (existing) => existing.email === user.email
        );

        if (existingUser) {
            console.log(`User already exists: ${user.email}`);
            continue;
        }

        await db.orm.public.User.create(user);
        console.log(`Created user: ${user.email}`);
    }

    const sessionTimes = [
        '2026-10-01T10:00:00Z',
        '2026-10-02T10:00:00Z',
    ];

    for (const startTime of sessionTimes) {
        const existingSessions = await db.orm.public.Session.all();

        const existingSession = existingSessions.find(
            (session) => session.startTime.toString() === startTime
        );

        if (existingSession) {
            console.log(`Session already exists: ${startTime}`);
        } else {
            const session = await db.orm.public.Session.create({
                startTime: Temporal.Instant.from(startTime),
                capacity: 20,
            });

            console.log(`Created session: ${session.id}`);
        }
    }

    const sessions = await db.orm.public.Session.all();

    const fullSession = sessions.find(
        (session) =>
            session.startTime.toString() === '2026-10-02T10:00:00Z'
    );

    const allUsers = await db.orm.public.User.all();

    const members = allUsers.filter(
        (user) => user.role === 'MEMBER'
    );

    for (const member of members.slice(0, 20)) {
        const existingBookings = await db.orm.public.Booking.all();

        const existingBooking = existingBookings.find(
            (booking) =>
                booking.userId === member.id &&
                booking.sessionId === fullSession.id &&
                booking.status === 'BOOKED'
        );

        if (existingBooking) {
            continue;
        }

        await db.orm.public.Booking.create({
            userId: member.id,
            sessionId: fullSession.id,
            status: 'BOOKED',
        });

        console.log(
            `Created full-session booking for ${member.email}`
        );
    }

    console.log('Seed complete.');
}

seed().catch((error) => {
    console.error(error);
    process.exit(1);
});