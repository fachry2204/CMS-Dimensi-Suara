import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const bearerToken = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    const cookieToken = req.cookies && req.cookies['auth_token'];
    const SESSION_EXPIRES_IN = '24h';
    const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

    if (!bearerToken && !cookieToken) return res.sendStatus(401);

    let user = null;
    try {
        if (bearerToken) user = jwt.verify(bearerToken, JWT_SECRET);
    } catch {}

    if (!user) {
        try {
            if (cookieToken) user = jwt.verify(cookieToken, JWT_SECRET);
        } catch {}
    }

    if (!user) return res.sendStatus(403);

    req.user = user;

    const payload = { id: user.id, role: user.role };
    if (user.impersonated_by) payload.impersonated_by = user.impersonated_by;
    const newToken = jwt.sign(payload, JWT_SECRET, { expiresIn: SESSION_EXPIRES_IN });
    const secure = req.secure || (req.headers['x-forwarded-proto'] === 'https');
    res.cookie('auth_token', newToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure,
        maxAge: SESSION_MAX_AGE_MS
    });

    next();
};
