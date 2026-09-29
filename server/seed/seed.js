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
        {
            name: 'Member One',
            email: 'member1@example.com',
            passwordHash: memberPasswordHash,
            role: 'MEMBER',
        },
        {
            name: 'Member Two',
            email: 'member2@example.com',
            passwordHash: memberPasswordHash,
            role: 'MEMBER',
        },
    ];

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

    const existingSessions = await db.orm.public.Session.all();

    const existingSession = existingSessions.find(
        (session) =>
            session.startTime.toString() === '2026-10-01T10:00:00Z'
    );

    if (existingSession) {
        console.log('Session already exists: 2026-10-01T10:00:00Z');
    } else {
        const session = await db.orm.public.Session.create({
            startTime: Temporal.Instant.from('2026-10-01T10:00:00Z'),
            capacity: 20,
        });

        console.log(`Created session: ${session.id}`);
    }
}


seed().catch((error) => {
    console.error(error);
    process.exit(1);
});