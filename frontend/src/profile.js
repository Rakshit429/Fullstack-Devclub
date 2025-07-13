import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext'; // Import our context hook

// This component is designed to be placed anywhere in your app where
// a logged-in user can edit their profile.
export default function ProfileEditForm({onBack}) {
	const { mongoUser, updateUserProfile } = useAuth(); // Get user data and the update function from context

	// State for the form fields, initialized with the current user's data
	const [username, setUsername] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState(''); // For entering a new password

	// State for UI feedback
	const [message, setMessage] = useState('');
	const [loading, setLoading] = useState(false);

	// When the component loads or the mongoUser from context changes,
	// update the form fields.
	useEffect(() => {
		if (mongoUser) {
			setUsername(mongoUser.username);
			setEmail(mongoUser.email);
		}
	}, [mongoUser]);

	const handleUpdate = async (e) => {
		e.preventDefault();
		setLoading(true);
		setMessage('');

		// Prepare the data payload to send to the backend
		const userID = mongoUser._id; // Get the user ID from the context
		const payload = { username, email, userID };
		if (password) {
			// Only include the password in the payload if the user entered one
			payload.password = password;
		}

		try {
			await updateUserProfile(payload);
			setLoading(false);
			setMessage('Profile Updated Successfully!');
			setPassword(''); // Clear the password field after update
		} catch (error) {
			setLoading(false);
			// Display the error message from the backend
			console.error('Error updating profile:', error);
			setMessage(error.response?.data?.message || 'Error updating profile');
		}
	};

	// Don't render the form if we don't have user data yet
	if (!mongoUser) {
		return <div>Loading profile...</div>;
	}

	return (
		<div className="profile-section" style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', maxWidth: '500px', margin: '20px auto' }}>
			<button className="back-btn" onClick={onBack}>←</button>
			<h2>Edit Your Profile</h2>
			{message && <p className="message" style={{ color: message.includes('Success') ? 'green' : 'red' }}>{message}</p>}
			<form onSubmit={handleUpdate}>
				<div style={{ marginBottom: '15px' }}>
					<label>Username</label>
					<input
						type="text"
						value={username}
						onChange={(e) => setUsername(e.target.value)}
						required
						style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
					/>
				</div>
				<div style={{ marginBottom: '15px' }}>
					<label>Email</label>
					<input
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
						style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
					/>
				</div>
				<div style={{ marginBottom: '15px' }}>
					<label>New Password (leave blank to keep current)</label>
					<input
						type="password"
						placeholder="Enter new password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
					/>
				</div>
				<button type="submit" disabled={loading} style={{ padding: '10px 15px', cursor: 'pointer' }}>
					{loading ? 'Updating...' : 'Update Profile'}
				</button>
			</form>
		</div>
	);
}