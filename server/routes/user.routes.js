const express = require('express');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/me', requireAuth, (req, res) => {
    res.json({
        user: req.user,
    });
});

module.exports = router;