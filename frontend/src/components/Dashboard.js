import React, { useEffect, useState } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid
} from 'recharts';
import axios from 'axios';

const Dashboard = ({ token }) => {
    const [metrics, setMetrics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);

    const [systemStatus, setSystemStatus] = useState({
        api: 'UNKNOWN',
        auth: 'UNKNOWN',
        metrics: 'UNKNOWN'
    });

    // =========================
    // FETCH ENERGY METRICS
    // =========================
    const fetchMetrics = async() => {
        try {
            const res = await axios.get('/api/metrics/energy', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            setMetrics(res.data || []);
            setLastUpdate(new Date().toLocaleTimeString());
            setError(null);

            // simulate system health OK if API responds
            setSystemStatus({
                api: 'UP',
                auth: 'UP',
                metrics: 'UP'
            });

        } catch (err) {
            console.error(err);

            setError(
                'Impossible de charger les données. Vérifiez API Gateway / services.'
            );

            setSystemStatus({
                api: 'DOWN',
                auth: 'UNKNOWN',
                metrics: 'UNKNOWN'
            });
        } finally {
            setLoading(false);
        }
    };

    // =========================
    // INIT + INTERVAL
    // =========================
    useEffect(() => {
        fetchMetrics();

        const interval = setInterval(fetchMetrics, 5000);
        return () => clearInterval(interval);
    }, [token]);

    // =========================
    // LOADING STATE
    // =========================
    if (loading) {
        return (
            <div style={{ padding: 20 }}>⏳Chargement des métriques...</div>
        );
    }

    // =========================
    // ERROR STATE
    // =========================
    if (error) {
        return (
            <div style={{ padding: 20, color: 'red' }}>❌{error}</div>
        );
    }

    // =========================
    // STATUS COLOR HELPER
    // =========================
    const statusColor = (status) => {
        switch (status) {
            case 'UP':
                return 'green';
            case 'DOWN':
                return 'red';
            default:
                return 'gray';
        }
    };

    // =========================
    // UI
    // =========================
    return (
        <div style={{ padding: 20, fontFamily: 'Arial' }}>
            <h1>📊GreenOps Platform Dashboard</h1>

            {/* LAST UPDATE */}
            <p>🕒Dernière mise à jour: {lastUpdate}</p>

            {/* SYSTEM STATUS */}
            <div style={{ marginBottom: 20 }}>
                <h3>🧠Microservices Status</h3>

                <p>
                    API Gateway: {' '}
                    <span style={{ color: statusColor(systemStatus.api) }}>{systemStatus.api}</span>
                </p>

                <p>
                    Auth Service: {' '}
                    <span style={{ color: statusColor(systemStatus.auth) }}>{systemStatus.auth}</span>
                </p>

                <p>
                    Metrics Service: {' '}
                    <span style={{ color: statusColor(systemStatus.metrics) }}>{systemStatus.metrics}</span>
                </p>
            </div>

            {/* ENERGY CHART */}
            <h3>⚡Energy Consumption(Business Metric)</h3>

            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis
                        label={{ value: 'Consumption (kWh)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip />
                    <Line type="monotone" dataKey="consumption" stroke="#82ca9d" strokeWidth={2} />
                </LineChart>
            </ResponsiveContainer>

            {/* FOOTER */}
            <p style={{ fontSize: '0.8rem', color: '#666', marginTop: 10 }}>
                ⚡Real - time business metrics + microservices monitoring
            </p>
        </div>
    );
};

export default Dashboard;