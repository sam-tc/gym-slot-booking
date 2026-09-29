const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { once } = require('node:events');
const test = require('node:test');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-only-secret';

const checkInCode = 'AB12CD';
const booking = {
    id: 'booking-test',
    userId: 'member-test',
    sessionId: 'session-test',
    status: 'BOOKED',
    checkInCodeHash: crypto
        .createHash('sha256')
        .update(checkInCode)
        .digest('hex'),
    checkedInAt: null,
};
const session = {
    id: booking.sessionId,
    startTime: Temporal.Now.instant().subtract({ minutes: 30 }),
    capacity: 20,
};
const sessions = [session];
const fakeDb = {
    orm: {
        public: {
            Booking: {
                all: async () => [booking],
                where: () => ({
                    update: async (values) => Object.assign(booking, values),
                }),
            },
            Session: {
                all: async () => sessions,
                create: async (values) => {
                    const created = { id: 'session-created', ...values };
                    sessions.push(created);
                    return created;
                },
            },
            User: {
                all: async () => [{
                    id: booking.userId,
                    name: 'Test Member',
                    email: 'member@example.test',
                }],
            },
        },
    },
    raw: {
        sql: () => ({
            returnsRow() { return this; },
            build() { return {}; },
        }),
    },
    query: async () => [{ id: session.id }],
    transaction: async (work) => work(fakeDb),
};

require('../db').getDb = async () => fakeDb;
const app = require('../index');

const adminToken = jwt.sign(
    { userId: 'admin-test', role: 'ADMIN' },
    process.env.JWT_SECRET,
    { expiresIn: '5m' }
);
const memberToken = jwt.sign(
    { userId: booking.userId, role: 'MEMBER' },
    process.env.JWT_SECRET,
    { expiresIn: '5m' }
);
let server;
let baseUrl;

test.before(async () => {
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
    if (server?.listening) {
        server.close();
        await once(server, 'close');
    }
});

async function request(path, { token, ...options } = {}) {
    const headers = { ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
    return { response, body: await response.json() };
}

function jsonBody(value) {
    return {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(value),
        method: 'POST',
    };
}

test('protected endpoints reject missing authentication', async () => {
    const profile = await request('/api/users/me');
    const sessions = await request('/api/sessions');

    assert.equal(profile.response.status, 401);
    assert.equal(sessions.response.status, 401);
});

test('session creation returns client errors for invalid input', async () => {
    const missing = await request('/api/sessions', {
        token: adminToken,
        ...jsonBody({}),
    });
    const invalid = await request('/api/sessions', {
        token: adminToken,
        ...jsonBody({ startTime: 'tomorrow' }),
    });

    assert.equal(missing.response.status, 400);
    assert.equal(invalid.response.status, 422);
});

test('session creation accepts a local hourly time with a half-hour offset', async () => {
    const tomorrow = Temporal.Now.zonedDateTimeISO('Asia/Kolkata')
        .add({ days: 1 })
        .with({ hour: 9, minute: 0, second: 0, millisecond: 0, microsecond: 0, nanosecond: 0 });
    const startTime = `${tomorrow.toPlainDate()}T09:00:00+05:30`;
    const { response, body } = await request('/api/sessions', {
        token: adminToken,
        ...jsonBody({ startTime }),
    });

    assert.equal(response.status, 201, JSON.stringify(body));
    assert.equal(body.session.capacity, 20);
});

test('check-in enforces admin role and validates code shape', async () => {
    const denied = await request('/api/bookings/check-in', {
        token: memberToken,
        ...jsonBody({ code: checkInCode }),
    });
    const missing = await request('/api/bookings/check-in', {
        token: adminToken,
        ...jsonBody({}),
    });
    const malformed = await request('/api/bookings/check-in', {
        token: adminToken,
        ...jsonBody({ code: 'bad' }),
    });

    assert.equal(denied.response.status, 403);
    assert.equal(missing.response.status, 400);
    assert.equal(malformed.response.status, 422);
});

test('malformed JSON receives a 400 JSON response', async () => {
    const { response, body } = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{',
    });

    assert.equal(response.status, 400);
    assert.deepEqual(body, { error: 'Invalid request body' });
});

test('check-in succeeds once and rejects reused or unknown codes', async () => {
    const successful = await request('/api/bookings/check-in', {
        token: adminToken,
        ...jsonBody({ code: checkInCode }),
    });

    assert.equal(successful.response.status, 200);
    assert.equal(successful.body.booking.user.email, 'member@example.test');
    assert.ok(successful.body.booking.checkedInAt);

    const reused = await request('/api/bookings/check-in', {
        token: adminToken,
        ...jsonBody({ code: checkInCode }),
    });
    const unknown = await request('/api/bookings/check-in', {
        token: adminToken,
        ...jsonBody({ code: 'ZZ99ZZ' }),
    });

    assert.equal(reused.response.status, 409);
    assert.equal(unknown.response.status, 404);
});
