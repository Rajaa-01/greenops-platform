const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');
const client = require('prom-client');

const app = express();
const PORT = process.env.API_GATEWAY_PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';

// Prometheus metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Endpoint /metrics (exclu de l'authentification)
app.get('/metrics', async(req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});


// ⚠️ AVANT app.use(authMiddleware) ou équivalent
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// Middleware d'authentification (sauf pour /api/auth et /metrics)
const authenticate = (req, res, next) => {
    if (req.path.startsWith('/api/auth/') || req.path === '/metrics') return next();
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(403).json({ error: 'Invalid token' });
    }
};

app.use(authenticate);

// Proxies
app.use('/api/auth', createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL || 'http://auth-service:5000',
    changeOrigin: true,
    pathRewrite: { '^/api/auth': '' }
}));

app.use('/api/metrics', createProxyMiddleware({
    target: process.env.METRICS_SERVICE_URL || 'http://metrics-service:5001',
    changeOrigin: true,
    pathRewrite: { '^/api/metrics': '' }
}));

app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
});