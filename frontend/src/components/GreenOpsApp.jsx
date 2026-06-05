import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import axios from 'axios';

// ─────────────────────────────────────────────
// AUTH CONTEXT
// ─────────────────────────────────────────────
const AuthContext = createContext(null);

const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('greenops_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 > Date.now()) {
          setUser({ username: payload.sub || payload.username, role: payload.role || 'user' });
        } else {
          localStorage.removeItem('greenops_token');
          setToken(null);
        }
      } catch {
        localStorage.removeItem('greenops_token');
        setToken(null);
      }
    }
    setLoading(false);
  }, [token]);

  const login = async (username, password) => {
    try {
      const res = await axios.post('/api/auth/login', { username, password });
      const newToken = res.data.token;
      localStorage.setItem('greenops_token', newToken);
      setToken(newToken);
      const payload = JSON.parse(atob(newToken.split('.')[1]));
      const userObj = { username: payload.sub || payload.username || username, role: payload.role || 'user' };
      setUser(userObj);
      return { success: true, role: userObj.role };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Identifiants invalides' };
    }
  };

  const logout = () => {
    localStorage.removeItem('greenops_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// ─────────────────────────────────────────────
// ROUTER (minimal, no react-router-dom needed beyond v6)
// ─────────────────────────────────────────────
const RouterContext = createContext(null);
const useRouter = () => useContext(RouterContext);

const Router = ({ children }) => {
  const [currentPath, setCurrentPath] = useState(window.location.hash.replace('#', '') || '/');

  useEffect(() => {
    const handler = () => setCurrentPath(window.location.hash.replace('#', '') || '/');
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const navigate = (path) => {
    window.location.hash = path;
    setCurrentPath(path);
  };

  return (
    <RouterContext.Provider value={{ currentPath, navigate }}>
      {children}
    </RouterContext.Provider>
  );
};

// ─────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────
const colors = {
  bg: '#0d1117',
  bgCard: '#161b22',
  bgCardHover: '#1c2128',
  border: '#21262d',
  borderLight: '#30363d',
  green: '#3fb950',
  greenDim: '#2ea043',
  greenGlow: 'rgba(63,185,80,0.15)',
  blue: '#58a6ff',
  blueDim: '#388bfd',
  yellow: '#d29922',
  red: '#f85149',
  text: '#e6edf3',
  textMuted: '#8b949e',
  textDim: '#6e7681',
  purple: '#bc8cff',
};

const styles = {
  app: {
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    background: colors.bg,
    color: colors.text,
    minHeight: '100vh',
    fontSize: '13px',
  },
  card: {
    background: colors.bgCard,
    border: `1px solid ${colors.border}`,
    borderRadius: '6px',
    padding: '16px',
  },
  badge: (color) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 600,
    background: color === 'green' ? 'rgba(63,185,80,0.15)' : color === 'red' ? 'rgba(248,81,73,0.15)' : 'rgba(88,166,255,0.15)',
    color: color === 'green' ? colors.green : color === 'red' ? colors.red : colors.blue,
    border: `1px solid ${color === 'green' ? 'rgba(63,185,80,0.3)' : color === 'red' ? 'rgba(248,81,73,0.3)' : 'rgba(88,166,255,0.3)'}`,
  }),
};

// ─────────────────────────────────────────────
// LOGIN PAGE
// ─────────────────────────────────────────────
const LoginPage = () => {
  const { login } = useAuth();
  const { navigate } = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) { setError('Veuillez remplir tous les champs'); return; }
    setLoading(true);
    setError('');
    const result = await login(username, password);
    setLoading(false);
    if (result.success) {
      navigate(result.role === 'admin' ? '/admin' : '/dashboard');
    } else {
      setError(result.error);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: colors.bg, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: '20px',
      fontFamily: styles.app.fontFamily,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:-webkit-autofill { -webkit-box-shadow: 0 0 0px 1000px ${colors.bgCard} inset !important; -webkit-text-fill-color: ${colors.text} !important; }
        .btn-primary { transition: all 0.15s; }
        .btn-primary:hover:not(:disabled) { background: ${colors.greenDim} !important; transform: translateY(-1px); }
        .btn-primary:active:not(:disabled) { transform: translateY(0); }
        .input-field { transition: border-color 0.15s, box-shadow 0.15s; }
        .input-field:focus { border-color: ${colors.green} !important; box-shadow: 0 0 0 3px rgba(63,185,80,0.1) !important; outline: none; }
        .demo-btn { transition: all 0.15s; cursor: pointer; }
        .demo-btn:hover { background: rgba(88,166,255,0.1) !important; border-color: ${colors.blue} !important; }
      `}</style>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{
              width: '36px', height: '36px', background: colors.greenGlow,
              border: `1px solid ${colors.green}`, borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px',
            }}>⚡</div>
            <span style={{ fontSize: '20px', fontWeight: 600, color: colors.text, letterSpacing: '-0.5px' }}>GreenOps</span>
          </div>
          <p style={{ color: colors.textMuted, fontSize: '12px' }}>Energy monitoring platform</p>
        </div>

        <div style={{ ...styles.card, padding: '28px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, marginBottom: '20px', color: colors.text }}>
            Connexion
          </h2>

          {error && (
            <div style={{
              background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.3)',
              borderRadius: '6px', padding: '10px 12px', marginBottom: '16px',
              color: colors.red, fontSize: '12px',
            }}>
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: colors.textMuted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Identifiant
              </label>
              <input
                className="input-field"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="username"
                style={{
                  width: '100%', padding: '9px 12px',
                  background: colors.bg, border: `1px solid ${colors.border}`,
                  borderRadius: '6px', color: colors.text, fontSize: '13px',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: colors.textMuted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Mot de passe
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input-field"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%', padding: '9px 36px 9px 12px',
                    background: colors.bg, border: `1px solid ${colors.border}`,
                    borderRadius: '6px', color: colors.text, fontSize: '13px',
                    fontFamily: 'inherit',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: colors.textDim, fontSize: '12px',
                  }}
                >{showPass ? '🙈' : '👁'}</button>
              </div>
            </div>

            <button
              className="btn-primary"
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '10px',
                background: loading ? colors.greenDim : colors.green,
                border: 'none', borderRadius: '6px',
                color: '#0d1117', fontSize: '13px', fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {loading ? '⟳ Connexion...' : '→ Se connecter'}
            </button>
          </form>

          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: `1px solid ${colors.border}` }}>
            <p style={{ fontSize: '11px', color: colors.textDim, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Comptes de démo
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { label: '👤 User', u: 'demo', p: 'demo123' },
                { label: '🛡 Admin', u: 'admin', p: 'admin123' },
              ].map(d => (
                <button
                  key={d.u}
                  className="demo-btn"
                  onClick={() => { setUsername(d.u); setPassword(d.p); }}
                  style={{
                    padding: '8px', background: 'transparent',
                    border: `1px solid ${colors.border}`, borderRadius: '6px',
                    color: colors.textMuted, fontSize: '11px', fontFamily: 'inherit',
                  }}
                >
                  {d.label}<br />
                  <span style={{ color: colors.textDim }}>{d.u} / {d.p}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: '11px', color: colors.textDim, marginTop: '16px' }}>
          Sécurisé par JWT · Architecture microservices
        </p>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// SHARED LAYOUT (Sidebar + Navbar)
// ─────────────────────────────────────────────
const Sidebar = ({ navItems, activeSection, onNav, collapsed, setCollapsed }) => {
  const { user, logout } = useAuth();
  const { navigate } = useRouter();

  return (
    <div style={{
      width: collapsed ? '52px' : '220px',
      minHeight: '100vh', background: colors.bgCard,
      borderRight: `1px solid ${colors.border}`,
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.2s ease', overflow: 'hidden', flexShrink: 0,
    }}>
      <div style={{
        padding: collapsed ? '16px 14px' : '16px',
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex', alignItems: 'center', gap: '10px',
        justifyContent: collapsed ? 'center' : 'space-between',
      }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>⚡</span>
            <span style={{ fontWeight: 600, fontSize: '14px', color: colors.green }}>GreenOps</span>
          </div>
        )}
        {collapsed && <span style={{ fontSize: '16px' }}>⚡</span>}
        {!collapsed && (
          <button onClick={() => setCollapsed(true)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: colors.textDim, fontSize: '14px', lineHeight: 1,
          }}>←</button>
        )}
      </div>

      {collapsed && (
        <button onClick={() => setCollapsed(false)} style={{
          margin: '8px auto', display: 'block', background: 'none',
          border: 'none', cursor: 'pointer', color: colors.textDim, fontSize: '14px',
        }}>→</button>
      )}

      <nav style={{ flex: 1, padding: '8px' }}>
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => onNav(item.id)}
            title={collapsed ? item.label : ''}
            style={{
              width: '100%', display: 'flex', alignItems: 'center',
              gap: '10px', padding: collapsed ? '9px' : '9px 12px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              background: activeSection === item.id ? colors.greenGlow : 'transparent',
              border: activeSection === item.id ? `1px solid rgba(63,185,80,0.2)` : '1px solid transparent',
              borderRadius: '6px', cursor: 'pointer', marginBottom: '2px',
              color: activeSection === item.id ? colors.green : colors.textMuted,
              fontSize: '12px', fontFamily: 'inherit', transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: '14px', flexShrink: 0 }}>{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      <div style={{ padding: '12px 8px', borderTop: `1px solid ${colors.border}` }}>
        {!collapsed && (
          <div style={{ padding: '8px 12px', marginBottom: '4px' }}>
            <p style={{ fontSize: '11px', color: colors.textMuted, fontWeight: 500 }}>{user?.username}</p>
            <p style={{ fontSize: '10px', color: colors.textDim }}>{user?.role}</p>
          </div>
        )}
        <button
          onClick={() => { logout(); navigate('/'); }}
          title={collapsed ? 'Déconnexion' : ''}
          style={{
            width: '100%', display: 'flex', alignItems: 'center',
            gap: '10px', padding: collapsed ? '9px' : '9px 12px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            background: 'transparent', border: '1px solid transparent',
            borderRadius: '6px', cursor: 'pointer',
            color: colors.red, fontSize: '12px', fontFamily: 'inherit',
          }}
        >
          <span style={{ fontSize: '14px' }}>⬡</span>
          {!collapsed && <span>Déconnexion</span>}
        </button>
      </div>
    </div>
  );
};

const TopBar = ({ title, lastUpdate, onRefresh }) => (
  <div style={{
    padding: '12px 20px', borderBottom: `1px solid ${colors.border}`,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: colors.bgCard, flexShrink: 0,
  }}>
    <h1 style={{ fontSize: '14px', fontWeight: 500, color: colors.text }}>{title}</h1>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      {lastUpdate && (
        <span style={{ fontSize: '11px', color: colors.textDim }}>
          🕒 {lastUpdate}
        </span>
      )}
      {onRefresh && (
        <button
          onClick={onRefresh}
          style={{
            background: 'transparent', border: `1px solid ${colors.border}`,
            borderRadius: '6px', padding: '5px 10px', color: colors.textMuted,
            cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit',
          }}
        >⟳ Refresh</button>
      )}
    </div>
  </div>
);

// ─────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────
const StatCard = ({ label, value, unit, trend, icon, color }) => (
  <div style={{
    ...styles.card, display: 'flex', flexDirection: 'column', gap: '8px',
    transition: 'border-color 0.15s',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
      <span style={{ fontSize: '16px' }}>{icon}</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
      <span style={{ fontSize: '24px', fontWeight: 600, color: color || colors.text }}>{value}</span>
      {unit && <span style={{ fontSize: '12px', color: colors.textMuted }}>{unit}</span>}
    </div>
    {trend !== undefined && (
      <span style={{ fontSize: '11px', color: trend >= 0 ? colors.green : colors.red }}>
        {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs hier
      </span>
    )}
  </div>
);

// ─────────────────────────────────────────────
// SERVICE STATUS
// ─────────────────────────────────────────────
const ServiceStatus = ({ services }) => (
  <div style={styles.card}>
    <h3 style={{ fontSize: '12px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
      Microservices Status
    </h3>
    <div style={{ display: 'grid', gap: '8px' }}>
      {services.map(svc => (
        <div key={svc.name} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 0', borderBottom: `1px solid ${colors.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: svc.status === 'UP' ? colors.green : svc.status === 'DOWN' ? colors.red : colors.yellow,
              boxShadow: svc.status === 'UP' ? `0 0 6px ${colors.green}` : 'none',
              animation: svc.status === 'UP' ? 'pulse 2s infinite' : 'none',
            }} />
            <span style={{ fontSize: '12px', color: colors.text }}>{svc.name}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: colors.textDim }}>{svc.latency}ms</span>
            <span style={styles.badge(svc.status === 'UP' ? 'green' : svc.status === 'DOWN' ? 'red' : 'blue')}>
              {svc.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ─────────────────────────────────────────────
// USER DASHBOARD
// ─────────────────────────────────────────────
const UserDashboard = () => {
  const { token } = useAuth();
  const [metrics, setMetrics] = useState([]);
  const [section, setSection] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [alerts, setAlerts] = useState([
    { id: 1, level: 'warning', msg: 'Consommation > 120 kWh détectée à 14:53', time: '14:53' },
    { id: 2, level: 'info', msg: 'Metrics service rechargé avec succès', time: '14:51' },
  ]);

  const [services, setServices] = useState([
    { name: 'API Gateway', status: 'UP', latency: 12 },
    { name: 'Auth Service', status: 'UP', latency: 8 },
    { name: 'Metrics Service', status: 'UP', latency: 15 },
    { name: 'PostgreSQL', status: 'UP', latency: 3 },
    { name: 'Redis Cache', status: 'UP', latency: 1 },
    { name: 'Prometheus', status: 'UP', latency: 22 },
    { name: 'Grafana', status: 'UP', latency: 18 },
  ]);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await axios.get('/api/metrics/energy', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMetrics(res.data || []);
      setLastUpdate(new Date().toLocaleTimeString());
      setError(null);
    } catch {
      // Fallback: generate realistic demo data
      const now = Date.now();
      const demo = Array.from({ length: 20 }, (_, i) => ({
        timestamp: new Date(now - (20 - i) * 90000).toLocaleTimeString(),
        consumption: Math.round(60 + Math.random() * 80),
        baseline: 75,
        co2: Math.round((60 + Math.random() * 80) * 0.233),
      }));
      setMetrics(demo);
      setLastUpdate(new Date().toLocaleTimeString());
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchMetrics();
    const iv = setInterval(fetchMetrics, 5000);
    return () => clearInterval(iv);
  }, [fetchMetrics]);

  const navItems = [
    { id: 'overview', label: 'Vue générale', icon: '⊡' },
    { id: 'energy', label: 'Énergie', icon: '⚡' },
    { id: 'alerts', label: 'Alertes', icon: '🔔' },
    { id: 'services', label: 'Services', icon: '⬡' },
  ];

  const latest = metrics[metrics.length - 1];
  const avg = metrics.length ? Math.round(metrics.reduce((s, m) => s + m.consumption, 0) / metrics.length) : 0;
  const max = metrics.length ? Math.max(...metrics.map(m => m.consumption)) : 0;

  return (
    <div style={{ display: 'flex', height: '100vh', background: colors.bg, fontFamily: styles.app.fontFamily, color: colors.text, fontSize: '13px' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: ${colors.bg}; }
        ::-webkit-scrollbar-thumb { background: ${colors.border}; border-radius: 2px; }
      `}</style>

      <Sidebar navItems={navItems} activeSection={section} onNav={setSection} collapsed={collapsed} setCollapsed={setCollapsed} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar
          title={navItems.find(n => n.id === section)?.label}
          lastUpdate={lastUpdate}
          onRefresh={fetchMetrics}
        />

        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          {loading ? (
            <div style={{ color: colors.textMuted, padding: '40px', textAlign: 'center' }}>
              ⟳ Chargement des métriques...
            </div>
          ) : section === 'overview' ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
                <StatCard label="Consommation actuelle" value={latest?.consumption ?? '--'} unit="kWh" trend={-3.2} icon="⚡" color={colors.green} />
                <StatCard label="Moyenne (20 pts)" value={avg} unit="kWh" trend={1.1} icon="📊" />
                <StatCard label="Pic détecté" value={max} unit="kWh" trend={5.4} icon="▲" color={colors.yellow} />
                <StatCard label="CO₂ estimé" value={latest?.co2 ?? '--'} unit="kg" trend={-2.1} icon="🌱" color={colors.blue} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div style={styles.card}>
                  <p style={{ fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                    Consommation énergétique — Temps réel
                  </p>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={metrics}>
                      <defs>
                        <linearGradient id="consGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={colors.green} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={colors.green} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                      <XAxis dataKey="timestamp" tick={{ fill: colors.textDim, fontSize: 10 }} />
                      <YAxis tick={{ fill: colors.textDim, fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '6px', fontSize: '11px' }}
                        labelStyle={{ color: colors.textMuted }}
                      />
                      <Area type="monotone" dataKey="consumption" stroke={colors.green} strokeWidth={1.5} fill="url(#consGrad)" name="kWh" />
                      <Line type="monotone" dataKey="baseline" stroke={colors.yellow} strokeWidth={1} strokeDasharray="4 4" dot={false} name="Baseline" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <ServiceStatus services={services.slice(0, 4)} />
              </div>

              <div style={styles.card}>
                <p style={{ fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                  Alertes récentes
                </p>
                {alerts.map(a => (
                  <div key={a.id} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '8px 0', borderBottom: `1px solid ${colors.border}`,
                  }}>
                    <span style={{ fontSize: '14px' }}>{a.level === 'warning' ? '⚠' : 'ℹ'}</span>
                    <span style={{ flex: 1, fontSize: '12px', color: colors.text }}>{a.msg}</span>
                    <span style={{ fontSize: '11px', color: colors.textDim }}>{a.time}</span>
                  </div>
                ))}
              </div>
            </>
          ) : section === 'energy' ? (
            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={styles.card}>
                <p style={{ fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                  Historique complet — Consommation (kWh)
                </p>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={metrics}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                    <XAxis dataKey="timestamp" tick={{ fill: colors.textDim, fontSize: 10 }} />
                    <YAxis tick={{ fill: colors.textDim, fontSize: 10 }} label={{ value: 'kWh', angle: -90, position: 'insideLeft', fill: colors.textDim, fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '6px', fontSize: '11px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', color: colors.textMuted }} />
                    <Line type="monotone" dataKey="consumption" stroke={colors.green} strokeWidth={2} dot={false} name="Consommation" />
                    <Line type="monotone" dataKey="baseline" stroke={colors.yellow} strokeWidth={1} strokeDasharray="4 4" dot={false} name="Baseline" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div style={styles.card}>
                <p style={{ fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                  Émissions CO₂ estimées (kg)
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={metrics}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                    <XAxis dataKey="timestamp" tick={{ fill: colors.textDim, fontSize: 10 }} />
                    <YAxis tick={{ fill: colors.textDim, fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '6px', fontSize: '11px' }} />
                    <Bar dataKey="co2" fill={colors.blue} name="CO₂ kg" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : section === 'alerts' ? (
            <div style={styles.card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <p style={{ fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Historique des alertes
                </p>
                <button
                  onClick={() => setAlerts([])}
                  style={{ background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: '6px', padding: '4px 10px', color: colors.textMuted, cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit' }}
                >
                  Tout effacer
                </button>
              </div>
              {alerts.length === 0 ? (
                <p style={{ color: colors.textDim, fontSize: '12px', padding: '20px 0', textAlign: 'center' }}>
                  ✓ Aucune alerte active
                </p>
              ) : alerts.map(a => (
                <div key={a.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px', marginBottom: '8px',
                  background: a.level === 'warning' ? 'rgba(210,153,34,0.08)' : 'rgba(88,166,255,0.08)',
                  border: `1px solid ${a.level === 'warning' ? 'rgba(210,153,34,0.2)' : 'rgba(88,166,255,0.2)'}`,
                  borderRadius: '6px',
                }}>
                  <span style={{ fontSize: '16px' }}>{a.level === 'warning' ? '⚠' : 'ℹ'}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '12px', color: colors.text }}>{a.msg}</p>
                    <p style={{ fontSize: '11px', color: colors.textDim }}>{a.time}</p>
                  </div>
                  <button
                    onClick={() => setAlerts(prev => prev.filter(x => x.id !== a.id))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textDim, fontSize: '14px' }}
                  >✕</button>
                </div>
              ))}
            </div>
          ) : (
            <ServiceStatus services={services} />
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// ADMIN DASHBOARD
// ─────────────────────────────────────────────
const AdminDashboard = () => {
  const { token } = useAuth();
  const [section, setSection] = useState('overview');
  const [collapsed, setCollapsed] = useState(false);
  const [users, setUsers] = useState([
    { id: 1, username: 'demo', role: 'user', status: 'active', lastLogin: '2026-06-04 18:47', pods: 2 },
    { id: 2, username: 'admin', role: 'admin', status: 'active', lastLogin: '2026-06-04 18:45', pods: 0 },
    { id: 3, username: 'alice', role: 'user', status: 'active', lastLogin: '2026-06-03 09:12', pods: 3 },
    { id: 4, username: 'bob', role: 'user', status: 'inactive', lastLogin: '2026-05-28 14:00', pods: 0 },
  ]);

  const [k8sMetrics] = useState({
    pods: { running: 14, pending: 0, failed: 0 },
    nodes: 1,
    namespaces: ['greenops', 'monitoring', 'default'],
    hpa: [
      { name: 'auth-service', min: 1, max: 5, current: 2, cpu: '34%' },
      { name: 'metrics-service', min: 1, max: 5, current: 1, cpu: '12%' },
      { name: 'api-gateway', min: 1, max: 3, current: 1, cpu: '8%' },
    ],
  });

  const navItems = [
    { id: 'overview', label: 'Vue cluster', icon: '⊡' },
    { id: 'users', label: 'Utilisateurs', icon: '👤' },
    { id: 'k8s', label: 'Kubernetes', icon: '⬡' },
    { id: 'cicd', label: 'CI/CD', icon: '⚙' },
  ];

  const [lastUpdate] = useState(new Date().toLocaleTimeString());

  return (
    <div style={{ display: 'flex', height: '100vh', background: colors.bg, fontFamily: styles.app.fontFamily, color: colors.text, fontSize: '13px' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: ${colors.bg}; }
        ::-webkit-scrollbar-thumb { background: ${colors.border}; border-radius: 2px; }
        tr:hover td { background: rgba(255,255,255,0.02); }
      `}</style>

      <Sidebar navItems={navItems} activeSection={section} onNav={setSection} collapsed={collapsed} setCollapsed={setCollapsed} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar title={`Admin — ${navItems.find(n => n.id === section)?.label}`} lastUpdate={lastUpdate} />

        <div style={{
          margin: '0 20px',
          padding: '8px 12px',
          background: 'rgba(210,153,34,0.08)',
          border: '1px solid rgba(210,153,34,0.2)',
          borderRadius: '0 0 6px 6px',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <span style={{ fontSize: '12px' }}>🛡</span>
          <span style={{ fontSize: '11px', color: colors.yellow }}>Interface d'administration — accès restreint</span>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          {section === 'overview' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
                <StatCard label="Pods actifs" value={k8sMetrics.pods.running} unit="/ 14" icon="⬡" color={colors.green} />
                <StatCard label="Utilisateurs" value={users.filter(u => u.status === 'active').length} icon="👤" />
                <StatCard label="Namespace" value={k8sMetrics.namespaces.length} icon="📦" color={colors.blue} />
                <StatCard label="Pods en erreur" value={k8sMetrics.pods.failed} icon="⚠" color={colors.pods === 0 ? colors.green : colors.red} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={styles.card}>
                  <p style={{ fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                    HPA — Horizontal Pod Autoscaler
                  </p>
                  {k8sMetrics.hpa.map(h => (
                    <div key={h.name} style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', color: colors.text }}>{h.name}</span>
                        <span style={{ fontSize: '11px', color: colors.textDim }}>{h.current}/{h.max} replicas · CPU {h.cpu}</span>
                      </div>
                      <div style={{ height: '4px', background: colors.border, borderRadius: '2px' }}>
                        <div style={{
                          height: '100%', borderRadius: '2px',
                          width: `${(h.current / h.max) * 100}%`,
                          background: colors.green,
                        }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div style={styles.card}>
                  <p style={{ fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                    Architecture réseau
                  </p>
                  {[
                    { net: 'frontend-network', services: ['nginx', 'api-gateway', 'grafana'], color: colors.green },
                    { net: 'backend-network', services: ['auth-service', 'metrics-service', 'postgres', 'redis'], color: colors.blue },
                    { net: 'monitoring-network', services: ['prometheus', 'grafana'], color: colors.purple },
                  ].map(n => (
                    <div key={n.net} style={{ marginBottom: '10px' }}>
                      <p style={{ fontSize: '11px', color: n.color, marginBottom: '4px' }}>{n.net}</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {n.services.map(s => (
                          <span key={s} style={{
                            fontSize: '10px', padding: '2px 6px',
                            background: 'rgba(255,255,255,0.04)', border: `1px solid ${colors.border}`,
                            borderRadius: '4px', color: colors.textMuted,
                          }}>{s}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {section === 'users' && (
            <div style={styles.card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <p style={{ fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Gestion des utilisateurs ({users.length})
                </p>
                <button style={{
                  background: colors.greenGlow, border: `1px solid rgba(63,185,80,0.3)`,
                  borderRadius: '6px', padding: '5px 12px', color: colors.green,
                  cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit',
                }}>+ Nouvel utilisateur</button>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                    {['ID', 'Username', 'Rôle', 'Statut', 'Dernière connexion', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '8px 0', textAlign: 'left', fontSize: '11px', color: colors.textDim, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td style={{ padding: '10px 0', color: colors.textDim, fontSize: '11px' }}>#{u.id}</td>
                      <td style={{ padding: '10px 0', color: colors.text }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '24px', height: '24px', borderRadius: '50%',
                            background: u.role === 'admin' ? 'rgba(188,140,255,0.15)' : colors.greenGlow,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '10px', color: u.role === 'admin' ? colors.purple : colors.green,
                          }}>{u.username[0].toUpperCase()}</div>
                          {u.username}
                        </div>
                      </td>
                      <td style={{ padding: '10px 0' }}>
                        <span style={styles.badge(u.role === 'admin' ? 'blue' : 'green')}>{u.role}</span>
                      </td>
                      <td style={{ padding: '10px 0' }}>
                        <span style={styles.badge(u.status === 'active' ? 'green' : 'red')}>{u.status}</span>
                      </td>
                      <td style={{ padding: '10px 0', color: colors.textMuted, fontSize: '12px' }}>{u.lastLogin}</td>
                      <td style={{ padding: '10px 0' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => setUsers(prev => prev.map(x => x.id === u.id ? { ...x, status: x.status === 'active' ? 'inactive' : 'active' } : x))}
                            style={{
                              background: 'transparent', border: `1px solid ${colors.border}`,
                              borderRadius: '4px', padding: '3px 8px', color: colors.textMuted,
                              cursor: 'pointer', fontSize: '10px', fontFamily: 'inherit',
                            }}
                          >{u.status === 'active' ? 'Désactiver' : 'Activer'}</button>
                          <button
                            onClick={() => setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role: x.role === 'admin' ? 'user' : 'admin' } : x))}
                            style={{
                              background: 'transparent', border: `1px solid ${colors.border}`,
                              borderRadius: '4px', padding: '3px 8px', color: colors.blue,
                              cursor: 'pointer', fontSize: '10px', fontFamily: 'inherit',
                            }}
                          >Rôle ↕</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {section === 'k8s' && (
            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={styles.card}>
                <p style={{ fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                  Pods — Namespace greenops
                </p>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                      {['Pod', 'Service', 'Statut', 'Replicas', 'CPU', 'Mémoire'].map(h => (
                        <th key={h} style={{ padding: '8px 0', textAlign: 'left', fontSize: '11px', color: colors.textDim, fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { pod: 'frontend-7d9f4', svc: 'frontend', status: 'Running', rep: '1/1', cpu: '5m', mem: '48Mi' },
                      { pod: 'api-gateway-5b8c2', svc: 'api-gateway', status: 'Running', rep: '1/1', cpu: '8m', mem: '64Mi' },
                      { pod: 'auth-service-6f7d1', svc: 'auth-service', status: 'Running', rep: '2/2', cpu: '34m', mem: '128Mi' },
                      { pod: 'metrics-service-4a2b9', svc: 'metrics-service', status: 'Running', rep: '1/1', cpu: '12m', mem: '96Mi' },
                      { pod: 'postgres-0', svc: 'postgres', status: 'Running', rep: '1/1', cpu: '18m', mem: '256Mi' },
                      { pod: 'redis-0', svc: 'redis', status: 'Running', rep: '1/1', cpu: '2m', mem: '32Mi' },
                      { pod: 'prometheus-59d4c', svc: 'prometheus', status: 'Running', rep: '1/1', cpu: '22m', mem: '200Mi' },
                      { pod: 'grafana-3e6a7', svc: 'grafana', status: 'Running', rep: '1/1', cpu: '18m', mem: '180Mi' },
                    ].map(p => (
                      <tr key={p.pod}>
                        <td style={{ padding: '9px 0', fontFamily: 'monospace', fontSize: '11px', color: colors.textMuted }}>{p.pod}</td>
                        <td style={{ padding: '9px 0', color: colors.text, fontSize: '12px' }}>{p.svc}</td>
                        <td style={{ padding: '9px 0' }}>
                          <span style={styles.badge('green')}>{p.status}</span>
                        </td>
                        <td style={{ padding: '9px 0', color: colors.textMuted, fontSize: '12px' }}>{p.rep}</td>
                        <td style={{ padding: '9px 0', color: colors.blue, fontSize: '12px' }}>{p.cpu}</td>
                        <td style={{ padding: '9px 0', color: colors.purple, fontSize: '12px' }}>{p.mem}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={styles.card}>
                <p style={{ fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                  Commandes de débogage rapide
                </p>
                {[
                  'kubectl get pods -n greenops',
                  'kubectl get hpa -n greenops',
                  'kubectl logs -n greenops deploy/auth-service --tail=50',
                  'kubectl scale deployment auth-service -n greenops --replicas=4',
                  'kubectl delete pod -n greenops -l app=metrics-service',
                ].map(cmd => (
                  <div key={cmd} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', marginBottom: '6px',
                    background: colors.bg, border: `1px solid ${colors.border}`,
                    borderRadius: '4px',
                  }}>
                    <code style={{ fontSize: '11px', color: colors.green, fontFamily: 'monospace' }}>{cmd}</code>
                    <button
                      onClick={() => navigator.clipboard?.writeText(cmd)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textDim, fontSize: '12px' }}
                      title="Copier"
                    >⎘</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'cicd' && (
            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={styles.card}>
                <p style={{ fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>
                  Pipeline CI/CD — GitHub Actions
                </p>
                {[
                  { step: '1. Tests & Lint', desc: 'Push/PR vers main et develop', status: 'success', time: '1m 24s' },
                  { step: '2. Build & Push', desc: 'Images Docker → ghcr.io', status: 'success', time: '3m 12s' },
                  { step: '3. Security Scan', desc: 'Analyse vulnérabilités Trivy', status: 'success', time: '2m 08s' },
                  { step: '4. Deploy', desc: 'kubectl apply sur cluster distant', status: 'running', time: '—' },
                ].map((s, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '16px',
                    padding: '12px', marginBottom: '8px',
                    background: s.status === 'running' ? 'rgba(88,166,255,0.05)' : 'transparent',
                    border: `1px solid ${s.status === 'running' ? 'rgba(88,166,255,0.2)' : colors.border}`,
                    borderRadius: '6px',
                  }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: s.status === 'success' ? 'rgba(63,185,80,0.15)' : 'rgba(88,166,255,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px', flexShrink: 0,
                    }}>
                      {s.status === 'success' ? '✓' : s.status === 'running' ? '⟳' : '✕'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '12px', fontWeight: 500, color: colors.text }}>{s.step}</p>
                      <p style={{ fontSize: '11px', color: colors.textDim }}>{s.desc}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={styles.badge(s.status === 'success' ? 'green' : 'blue')}>
                        {s.status === 'running' ? 'En cours' : 'Succès'}
                      </span>
                      <p style={{ fontSize: '11px', color: colors.textDim, marginTop: '4px' }}>{s.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// PROTECTED ROUTE
// ─────────────────────────────────────────────
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();
  const { navigate } = useRouter();

  useEffect(() => {
    if (!loading && !user) navigate('/');
    if (!loading && user && requiredRole && user.role !== requiredRole) {
      navigate(user.role === 'admin' ? '/admin' : '/dashboard');
    }
  }, [user, loading, requiredRole, navigate]);

  if (loading) return (
    <div style={{ ...styles.app, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <span style={{ color: colors.green, fontFamily: 'monospace' }}>⟳ Initialisation...</span>
    </div>
  );

  if (!user) return null;
  if (requiredRole && user.role !== requiredRole) return null;

  return children;
};

// ─────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────
export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

const AppRoutes = () => {
  const { currentPath } = useRouter();
  const { user } = useAuth();

  if (currentPath === '/' || currentPath === '') {
    if (user) {
      window.location.hash = user.role === 'admin' ? '/admin' : '/dashboard';
      return null;
    }
    return <LoginPage />;
  }

  if (currentPath === '/dashboard') {
    return (
      <ProtectedRoute>
        <UserDashboard />
      </ProtectedRoute>
    );
  }

  if (currentPath === '/admin') {
    return (
      <ProtectedRoute requiredRole="admin">
        <AdminDashboard />
      </ProtectedRoute>
    );
  }

  return <LoginPage />;
};
