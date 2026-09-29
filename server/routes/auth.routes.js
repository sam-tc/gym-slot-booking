const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db');

const router = express.Router();

router.post('/register', async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        if (
            typeof name !== 'string' ||
            typeof email !== 'string' ||
            typeof password !== 'string'
        ) {
            return res.status(400).json({
                error: 'Name, email and password are required',
            });
        }

        const trimmedName = name.trim();
        const normalizedEmail = email.trim().toLowerCase();

        if (!trimmedName || !normalizedEmail || !password) {
            return res.status(400).json({
                error: 'Name, email and password are required',
            });
        }

        if (!normalizedEmail.includes('@')) {
            return res.status(400).json({
                error: 'Please provide a valid email address',
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                error: 'Password must be at least 8 characters',
            });
        }

        const db = await getDb();

        const existingUsers = await db.orm.public.User.all();
        const existingUser = existingUsers.find(
            (user) => user.email === normalizedEmail
        );

        if (existingUser) {
            return res.status(409).json({
                error: 'Email is already registered',
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const user = await db.orm.public.User.create({
            name: trimmedName,
            email: normalizedEmail,
            passwordHash,
            role: 'MEMBER',
        });

        res.status(201).json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        next(error);
    }
});

router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== 'string' ||
            typeof password !== 'string'
        ) {
            return res.status(400).json({
                error: 'Email and password are required',
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedEmail || !password) {
            return res.status(400).json({
                error: 'Email and password are required',
            });
        }

        const db = await getDb();

        const users = await db.orm.public.User.all();
        const user = users.find(
            (existingUser) => existingUser.email === normalizedEmail
        );

        if (!user) {
            return res.status(401).json({
                error: 'Invalid email or password',
            });
        }

        const passwordMatches = await bcrypt.compare(
            password,
            user.passwordHash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                error: 'Invalid email or password',
            });
        }

        const token = jwt.sign(
            {
                userId: user.id,
                role: user.role,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '1h',
            }
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;