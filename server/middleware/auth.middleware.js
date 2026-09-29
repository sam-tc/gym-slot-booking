const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
    const authorization = req.headers.authorization;

    if (!authorization) {
        return res.status(401).json({
            error: 'Authentication required',
        });
    }

    const [scheme, token] = authorization.split(' ');

    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({
            error: 'Invalid authorization header',
        });
    }

    try {
        const payload = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = payload;

        next();
    } catch (error) {
        return res.status(401).json({
            error: 'Invalid or expired token',
        });
    }
}

function requireAdmin(req, res, next) {
    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({
            error: 'Admin access required',
        });
    }

    next();
}

module.exports = { requireAuth, requireAdmin };