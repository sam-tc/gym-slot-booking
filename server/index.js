const express = require('express');
const path = require('path');const { getDb } = require('./db');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const sessionRoutes = require('./routes/session.routes');
const bookingRoutes = require('./routes/booking.routes');
const waitlistRoutes = require('./routes/waitlist.routes');

const app = express();
const PORT = 3000;

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/waitlist', waitlistRoutes);

app.use(express.static(path.join(__dirname, '../client')));

app.get('/', (req, res) => {
    res.json({ message: 'Gym Slot Booking API is running' });
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
    console.error(error);

    if (res.headersSent) {
        return next(error);
    }

    res.status(500).json({
        error: 'Internal server error',
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});