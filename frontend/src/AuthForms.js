import React, { useState } from 'react';
import axios from 'axios';

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

    try {
      const response = await axios.post(`http://localhost:5000${endpoint}`, payload);
      setLoading(false);

      if (isLoginView) {
        setSuccess('Login successful! Reloading...');
        localStorage.setItem('userInfo', JSON.stringify(response.data));
        window.location.reload(); // Reload to trigger the main App component's state change
      } else {
        setSuccess('Registration successful! Please log in.');
        setIsLoginView(true);
      }
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || 'An unexpected error occurred.');
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