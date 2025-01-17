const authMiddleware = (req, res, next) => {
    const token = req.headers['authorization'];
    const validToken = 'STATIC_API_TOKEN';

    if (!token || token !== validToken) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    next();
};

export default authMiddleware;
