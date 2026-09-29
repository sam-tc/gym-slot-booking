const express = require('express');
const path = require('path');
require('./temporal');
const { getDb } = require('./db');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const sessionRoutes = require('./routes/session.routes');
const bookingRoutes = require('./routes/booking.routes');
const waitlistRoutes = require('./routes/waitlist.routes');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/waitlist', waitlistRoutes);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.json({ message: 'Gym Slot Booking API is running' });
});

app.use('/api', (req, res) => {
    res.status(404).json({
        error: 'API route not found',
    });
});

app.get('/health/db', async (req, res, next) => {
    try {
        const db = await getDb();
        const users = await db.orm.public.User.all();

        res.json({
            status: 'ok',
            database: 'connected',
            userCount: users.length,
        });
    } catch (error) {
        next(error);
    }
});

app.use((error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }

    const isUniqueViolation =
        error?.sqlState === '23505' ||
        error?.code === 'P2002';

    const status = isUniqueViolation
        ? 409
        : Number.isInteger(error.status) &&
            error.status >= 400 &&
            error.status < 600
            ? error.status
            : 500;

    if (status >= 500) {
        console.error(error);
    }

    res.status(status).json({
        error: isUniqueViolation
            ? 'A record with these details already exists'
            : status < 500
                ? 'Invalid request body'
                : 'Internal server error',
    });
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
    });
}

module.exports = app;
