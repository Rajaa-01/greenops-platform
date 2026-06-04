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
const PORT = parseInt(process.env.APP_PORT) || 5000;

// Initialisation de la table users
(async() => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE,
            password_hash TEXT,
            role TEXT DEFAULT 'user'
        )
    `);

    // Ajouter la colonne role si elle n'existe pas (migration)
    await pool.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'
    `);

    // Insert demo user
    const hashDemo = await bcrypt.hash('demo123', 10);
    await pool.query(
        'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', ['demo', hashDemo, 'user']
    );

    // Insert admin user
    const hashAdmin = await bcrypt.hash('admin123', 10);
    await pool.query(
        'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) ON CONFLICT (username) DO UPDATE SET password_hash = $2, role = $3', ['admin', hashAdmin, 'admin']
    );
})();

app.post('/login', async(req, res) => {
    const start = Date.now();
    const { username, password } = req.body;

    try {
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

        const token = jwt.sign({
                userId: result.rows[0].id,
                username,
                role: result.rows[0].role || 'user'
            },
            JWT_SECRET, { expiresIn: '1h' }
        );

        httpRequestDuration.labels('POST', '/login', 200).observe(Date.now() - start);
        res.json({ token });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
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

app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Auth service running on port ${PORT}`);
});