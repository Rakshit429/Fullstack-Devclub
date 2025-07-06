import React, { useState, useEffect } from 'react';
import axios from 'axios';

// This is a new, focused component just for the Edit Form.
// It manages its own state for the form fields.
function ProfileEditForm({ userInfo, onProfileUpdate }) {
  // Initialize form state with the user's current info
  const [username, setUsername] = useState(userInfo.username);
  const [email, setEmail] = useState(userInfo.email);
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
        Authorization: `Bearer ${userInfo.token}`,
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
      onProfileUpdate(data); // Notify the parent App component of the change

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


// This is the main component that will be exported.
// Its job is to welcome the user and render the edit form.
export default function MainApplication({ userInfo, onLogout, onProfileUpdate }) {
  return (
    <div className="App-header">
      {/* The welcome message uses the userInfo prop directly */}
      <h1>Welcome, {userInfo.username}!</h1>
      <button onClick={onLogout}>Logout</button>
      <hr />
      
      {/* We render the new form component, passing down the necessary props */}
      <ProfileEditForm userInfo={userInfo} onProfileUpdate={onProfileUpdate} />
      
      {/* The Delete button will go here in the next step */}
    </div>
  );
}