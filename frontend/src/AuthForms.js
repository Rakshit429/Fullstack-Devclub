import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';

// This component now manages its own state for the forms.
export default function AuthForms() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });

  const [isLoginView, setIsLoginView] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const { login , register } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const endpoint = isLoginView ? '/api/auth/login' : '/api/auth/register';
    const payload = isLoginView
      ? { email: formData.email, password: formData.password }
      : formData;

    if (isLoginView) {
      try {
        await login(formData.email, formData.password);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to log in.');
      } finally {
        setLoading(false);
      }
    } else {
      try {
        await register(formData.username, formData.email, formData.password);
        setSuccess('Registration successful! Please log in.');
        setIsLoginView(true);
      } catch (err) {
        console.error('Registration error:', err);
        setError(err.response?.data?.message || 'Failed to register.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <header className="App-header">
      <h1>{isLoginView ? 'Login' : 'Register'}</h1>
      <form onSubmit={handleSubmit}>
        {!isLoginView && (
          <div>
            <label htmlFor="username">Username:</label>
            <input type="text" id="username" name="username" value={formData.username} onChange={handleChange} required />
          </div>
        )}
        <div>
          <label htmlFor="email">Email:</label>
          <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required />
        </div>
        <div>
          <label htmlFor="password">Password:</label>
          <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} required />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? (isLoginView ? 'Logging in...' : 'Registering...') : (isLoginView ? 'Login' : 'Register')}
        </button>
      </form>
      {success && <p style={{ color: 'green' }}>{success}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button onClick={() => setIsLoginView(!isLoginView)}>
        {isLoginView ? 'Need an account? Register' : 'Have an account? Login'}
      </button>
    </header>
  );
}