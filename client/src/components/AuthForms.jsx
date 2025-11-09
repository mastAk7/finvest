import React, { useState } from 'react';

const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export function LoginForm({ onSuccess, onClose }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const r = await fetch(apiBase + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      const data = await r.json();
      if (!r.ok) throw data;
      onSuccess && onSuccess(data);
      onClose && onClose();
    } catch (err) {
      setError(err?.error || err?.message || 'Login failed');
    }
  };

  return (
    <form className="auth-form" onSubmit={submit}>
      <h3>Sign in</h3>
      <label>
        Email
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
      </label>
      <label>
        Password
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
      </label>
      {error && <div className="error-text">{error}</div>}
      <div className="auth-actions">
        <button type="submit" className="primary-btn">Sign in</button>
        <button type="button" className="ghost-btn" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}

export function RegisterForm({ onSuccess, onClose }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const r = await fetch(apiBase + '/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, name })
      });
      const data = await r.json();
      if (!r.ok) throw data;
      onSuccess && onSuccess(data);
      onClose && onClose();
    } catch (err) {
      setError(err?.error || err?.message || 'Registration failed');
    }
  };

  return (
    <form className="auth-form" onSubmit={submit}>
      <h3>Create account</h3>
      <label>
        Full name
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        Email
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
      </label>
      <label>
        Password
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
      </label>
      {error && <div className="error-text">{error}</div>}
      <div className="auth-actions">
        <button type="submit" className="primary-btn">Create account</button>
        <button type="button" className="ghost-btn" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}

export default null;
