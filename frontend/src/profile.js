import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from './context/AuthContext';

export default function ProfileEditForm() {
  const { mongoUser, updateProfile } = useAuth();
  const [username, setUsername] = useState(mongoUser.username);
  const [email, setEmail] = useState(mongoUser.email);
  const [password, setPassword] = useState('');
  
  // State for messages specifically within the form
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mongoUser.token}`,
      },
    };

    try {
      // Corrected 'payload' spelling
      const payload = { username, email };
      if (password) {
        payload.password = password;
      }

      const { data } = await axios.put('http://localhost:5000/api/auth/profile', payload, config);
      
      setLoading(false);
      setMessage('Profile Updated Successfully!');
      updateProfile(data);

    } catch (error) {
      setLoading(false);
      setMessage(error.response?.data?.message || 'Error updating profile');
    }
  };

  return (
    <div className="profile-section">
      <h2>Edit Your Profile</h2>
      {message && <p className="message">{message}</p>}
      <form onSubmit={handleUpdate}>
        <div>
          <label>Username</label>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <div>
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label>New Password (leave blank to keep current)</label>
          <input type="password" placeholder="New Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Updating...' : 'Update Profile'}
        </button>
      </form>
    </div>
  );
}