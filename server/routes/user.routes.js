const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/me', requireAuth, (req, res) => {
    res.json({
        user: req.user,
    });
});

router.get('/admin-test', requireAuth, requireAdmin, (req, res) => {
    res.json({
        message: 'Welcome, admin!',
    });
});

module.exports = router;