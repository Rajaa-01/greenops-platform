const express = require('express');
const redis = require('redis');
const client = require('prom-client');

const app = express();
const PORT = process.env.METRICS_SERVICE_PORT || 5001;
const redisClient = redis.createClient({ url: process.env.REDIS_URL });
redisClient.connect();

const register = new client.Registry();
client.collectDefaultMetrics({ register });
const counter = new client.Counter({ name: 'energy_requests_total', help: 'Total requests', registers: [register] });

app.get('/energy', async (req, res) => {
  counter.inc();
  const timestamp = new Date().toISOString();
  const consumption = Math.random() * 100 + 50;
  const data = { timestamp, consumption };
  await redisClient.lPush('energy_metrics', JSON.stringify(data));
  await redisClient.lTrim('energy_metrics', 0, 99);
  const all = await redisClient.lRange('energy_metrics', 0, -1);
  const metrics = all.map(m => JSON.parse(m)).reverse();
  res.json(metrics);
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.listen(PORT, () => console.log(`Metrics service on ${PORT}`));