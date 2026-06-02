const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const redis = require('redis');
const client = require('prom-client');

const app = express();
app.use(express.json());

// Prometheus metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });
const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_ms',
    help: 'Duration of HTTP requests in ms',
    labelNames: ['method', 'route', 'status'],
    registers: [register]
});

// PostgreSQL
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Redis (blacklist JWT)
const redisClient = redis.createClient({ url: process.env.REDIS_URL });
redisClient.connect();

const JWT_SECRET = process.env.JWT_SECRET;
const PORT = process.env.AUTH_SERVICE_PORT || 5000;

// Initialisation de la table users
(async() => {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE,
      password_hash TEXT
    )
  `);
    // Insert demo user
    const hash = await bcrypt.hash('demo123', 10);
    await pool.query('INSERT INTO users (username, password_hash) VALUES ($1, $2) ON CONFLICT DO NOTHING', ['demo', hash]);
})();

app.post('/login', async(req, res) => {
    const start = Date.now();
    const { username, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
        httpRequestDuration.labels('POST', '/login', 401).observe(Date.now() - start);
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    const valid = await bcrypt.compare(password, result.rows[0].password_hash);
    if (!valid) {
        httpRequestDuration.labels('POST', '/login', 401).observe(Date.now() - start);
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: result.rows[0].id, username }, JWT_SECRET, { expiresIn: '1h' });
    httpRequestDuration.labels('POST', '/login', 200).observe(Date.now() - start);
    res.json({ token });
});

app.post('/logout', async(req, res) => {
    const token = req.headers.authorization ? req.headers.authorization.split(' ')[1] : null;
    if (token) await redisClient.set(`blacklist:${token}`, 'true', { EX: 3600 });
    res.json({ message: 'Logged out' });
});

app.get('/metrics', async(req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});

app.listen(PORT, () => console.log(`Auth service on ${PORT}`));