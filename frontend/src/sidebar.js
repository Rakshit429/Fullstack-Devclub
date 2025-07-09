import React, { useState, useEffect } from 'react';
// Import the query functions from Firebase
import { database } from './firebase';
import { ref, onValue, query, orderByChild, equalTo, get } from 'firebase/database';
import { useAuth } from './context/AuthContext';

export default function SideBar({ onSelectChat }) {
    const { firebaseUser, mongoUser, logout } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // State for the new chat functionality
    const [isAddingNewChat, setIsAddingNewChat] = useState(false);
    const [newChatEmail, setNewChatEmail] = useState('');
    const [searchError, setSearchError] = useState(null);
    const [searchLoading, setSearchLoading] = useState(false);

    // We can refactor this later to use your /Chatlist for better performance
    useEffect(() => {
        if (!firebaseUser) return;

        // 1. Create a reference to the current user's chat list
        const chatlistRef = ref(database, `Chatlist/${firebaseUser.uid}`);

        // 2. Set up the live listener
        const unsubscribe = onValue(chatlistRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // Convert the object of chats into an array
                const chatList = Object.values(data);
                // Sort the chats by timestamp to show the most recent ones first
                chatList.sort((a, b) => b.timestamp - a.timestamp);
                setUsers(chatList); // We re-use the 'users' state to hold our chat partners
            } else {
                setUsers([]); // If no chats, the list is empty
            }
            setLoading(false);
        });

        // Cleanup the listener when the component unmounts
        return () => unsubscribe();
    }, [firebaseUser]);


    // --- NEW FUNCTION: Handle finding and starting a new chat ---
    const handleStartNewChat = async (e) => {
        e.preventDefault();
        if (newChatEmail.trim() === '' || newChatEmail.toLowerCase() === mongoUser.email.toLowerCase()) {
            setSearchError("Please enter a valid email address you don't own.");
            return;
        }

        setSearchLoading(true);
        setSearchError(null);

        try {
            // 1. Create a reference and a query to find the user by email
            const usersRef = ref(database, 'ChatUsers/Users');
            const emailQuery = query(usersRef, orderByChild('email'), equalTo(newChatEmail.toLowerCase()));

            // 2. Execute the query to get the snapshot
            const snapshot = await get(emailQuery);

            if (snapshot.exists()) {
                // 3. Extract the user data
                const foundUsers = snapshot.val();
                console.log("Found users:", foundUsers);
                const userKey = Object.keys(foundUsers)[0]; // Get the first (and only) key
                console.log("User key:", userKey);
                const userData = foundUsers[userKey];
                console.log("User data:", userData);
                // 4. Select the chat and reset the form
                onSelectChat(userData);
                setIsAddingNewChat(false);
                setNewChatEmail('');
            } else {
                // 5. Handle case where no user is found
                setSearchError('User with this email not found.');
            }
        } catch (err) {
            console.error("Error searching for user:", err);
            setSearchError('An error occurred while searching.');
        } finally {
            setSearchLoading(false);
        }
    };


    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <h3>{mongoUser?.username}</h3>
                <button onClick={logout} className="logout-btn">Logout</button>
            </div>

            {/* --- NEW UI: The "New Chat" button and form --- */}
            <div className="new-chat-section">
                {!isAddingNewChat ? (
                    <button onClick={() => setIsAddingNewChat(true)} className="new-chat-btn">
                        + New Chat
                    </button>
                ) : (
                    <form onSubmit={handleStartNewChat} className="new-chat-form">
                        <input
                            type="email"
                            placeholder="Enter user's email"
                            value={newChatEmail}
                            onChange={(e) => setNewChatEmail(e.target.value)}
                            required
                        />
                        <button type="submit" disabled={searchLoading}>
                            {searchLoading ? '...' : 'Go'}
                        </button>
                        <button type="button" onClick={() => setIsAddingNewChat(false)}>
                            Cancel
                        </button>
                        {searchError && <p className="search-error">{searchError}</p>}
                    </form>
                )}
            </div>

            <div className="sidebar-chat-list">
                {loading && <div className="loading-text">Loading users...</div>}
                {users.map(user => (
                    <div key={user.uid} className="chat-list-item" onClick={() => onSelectChat(user)}>
                        <img src={`https://i.pravatar.cc/150?u=${user.email}`} alt="avatar" className="avatar" />
                        <div className="chat-info">
                            <span className="chat-name">{user.username}</span>
                            {/* NEW: Show the last message */}
                            <span className="chat-preview">{user.lastMessage}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}