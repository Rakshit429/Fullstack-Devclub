import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';

export default function AuthForms() {
    const [formData, setFormData] = useState({ username: '', email: '', password: '' });
    const [isLoginView, setIsLoginView] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const { login, register } = useAuth();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const clearMessages = () => {
        setError(null);
        setSuccess(null);
    };

    const toggleView = () => {
        setIsLoginView(!isLoginView);
        clearMessages();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        clearMessages();

        if (isLoginView) {
            try {
                await login(formData.email, formData.password);
            } catch (err) {
                setError(err.response?.data?.message || err.message || 'Failed to log in.');
            } finally {
                setLoading(false);
            }
        } else {
            try {
                await register(formData.username, formData.email, formData.password);
                setSuccess('Registration successful! Please check your email for a verification link.');
                setFormData({ username: '', email: '', password: '' });
            } catch (err) {
                setError(err.response?.data?.message || err.message || 'Failed to register.');
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="auth-container">
            <div className={`auth-box ${!isLoginView ? 'right-panel-active' : ''}`}>
                <div className="auth-forms">
                    <form onSubmit={handleSubmit}>
                        <h1>{isLoginView ? 'Login' : 'Create Account'}</h1>
                        
                        {!isLoginView && (
                            <input type="text" name="username" placeholder="Username" value={formData.username} onChange={handleChange} required />
                        )}
                        <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required />
                        <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} required />
                        
                        <button type="submit" disabled={loading}>
                            {loading ? 'Processing...' : (isLoginView ? 'Login' : 'Register')}
                        </button>

                        {success && <p style={{ color: 'green', textAlign: 'center' }}>{success}</p>}
                        {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

                        <button type="button" className="auth-toggle-button" onClick={toggleView}>
                            {isLoginView ? 'Need an account? Register' : 'Have an account? Login'}
                        </button>
                    </form>
                </div>
                <div className="auth-panel">
                    <h1>Welcome Back!</h1>
                    <p>Enter your personal details to start your journey with us.</p>
                </div>
            </div>
        </div>
    );
}