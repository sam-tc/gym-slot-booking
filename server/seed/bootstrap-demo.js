require('dotenv/config');
require('../temporal');

const bcrypt = require('bcryptjs');
const { getDb } = require('../db');

async function ensureAdmin(db) {
    const name = process.env.ADMIN_NAME?.trim() || 'Gym Admin';
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password || password.length < 12) {
        throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters) to bootstrap the demo admin.');
    }

    const users = await db.orm.public.User.all();
    const existing = users.find((user) => user.email === email);
    if (existing?.role === 'ADMIN') return;

    const passwordHash = await bcrypt.hash(password, 12);
    if (existing) {
        await db.orm.public.User.where({ id: existing.id }).update({
            name,
            passwordHash,
            role: 'ADMIN',
        });
        return;
    }

    await db.orm.public.User.create({
        name,
        email,
        passwordHash,
        role: 'ADMIN',
    });
}

async function ensureDemoSessions(db) {
    const sessions = await db.orm.public.Session.all();
    const now = Temporal.Now.instant();
    const upcoming = sessions.filter((session) =>
        Temporal.Instant.compare(session.startTime, now) > 0
    );
    if (upcoming.length >= 2) return;

    const nextHour = Temporal.Now.zonedDateTimeISO('UTC')
        .with({ minute: 0, second: 0, millisecond: 0, microsecond: 0, nanosecond: 0 })
        .add({ hours: 2 })
        .toInstant();

    for (let hour = 0; upcoming.length < 2; hour += 1) {
        const startTime = nextHour.add({ hours: hour });
        const alreadyExists = sessions.some((session) =>
            Temporal.Instant.compare(session.startTime, startTime) === 0
        );
        if (alreadyExists) continue;

        const session = await db.orm.public.Session.create({
            startTime,
            capacity: 20,
        });
        sessions.push(session);
        upcoming.push(session);
    }
}

async function bootstrapDemo() {
    const db = await getDb();
    await ensureAdmin(db);
    await ensureDemoSessions(db);
    console.log('Demo admin and upcoming sessions are ready.');
}

bootstrapDemo().catch((error) => {
    console.error(error);
    process.exit(1);
});
