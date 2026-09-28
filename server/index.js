const express = require('express');
const { getDb } = require('./db');
const authRoutes = require('./routes/auth.routes');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use('/api/auth', authRoutes);

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

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});