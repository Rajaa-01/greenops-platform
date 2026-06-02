import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import axios from 'axios';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [error, setError] = useState('');

  const login = async () => {
    try {
      const res = await axios.post('/api/auth/login', {
        username: 'demo',
        password: 'demo123'
      });
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      setError('');
    } catch (err) {
      setError('Login failed');
    }
  };

  if (!token) {
    return (
      <div style={{ padding: 20 }}>
        <h1>GreenOps Platform</h1>
        <button onClick={login}>Login (demo)</button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </div>
    );
  }

  return <Dashboard token={token} />;
}

export default App;
