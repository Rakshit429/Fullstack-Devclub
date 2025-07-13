import React, { useState, useEffect } from 'react';
// Import the query functions from Firebase
import { database } from './firebase';
import { ref, onValue, query, orderByChild, equalTo, get ,update} from 'firebase/database';
import { useAuth } from './context/AuthContext';
import NotificationBell from './NotificationBell';
import DOMPurify from 'dompurify';

export default function SideBar({ onSelectChat, onShowProfile, onShowCallHistory, selectedChat }) {
    const { firebaseUser, mongoUser, logout } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    const [isAddingNewChat, setIsAddingNewChat] = useState(false);
    const [newChatEmail, setNewChatEmail] = useState('');
    const [searchError, setSearchError] = useState(null);
    const [searchLoading, setSearchLoading] = useState(false);

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

    useEffect(() => {
        const usersStatusRef = ref(database, 'ChatUsers/Users');
        const unsubscribe = onValue(usersStatusRef, (snapshot) => {
            const online = new Set();
            if (snapshot.exists()) {
                snapshot.forEach(childSnapshot => {
                    const userData = childSnapshot.val();
                    if (userData.status === 'online') {
                        online.add(userData.uid);
                    }
                });
            }
            setOnlineUsers(online);
        });

        return () => unsubscribe();
    }, []);


    const handleSelectAndClear = async (convo) => {
        onSelectChat(convo);
        // First, clear the unread count in Firebase for the selected chat
        if (convo.unreadCount > 0) {
            const chatUnreadRef = ref(database, `Chatlist/${firebaseUser.uid}/${convo.uid}`);
            await update(chatUnreadRef, {
                unreadCount: 0
            });
        }
        // Then, proceed to select the chat
    };

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

    const handleNotificationClick = (notification) => {
        // Find the chat partner related to the notification
        const chatPartner = users.find(u => u.uid === notification.fromUserId);
        if (chatPartner) {
            onSelectChat(chatPartner);
        }
        // You can add more logic here, e.g., for missed calls
    };
    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <h3 dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(mongoUser?.username) }} />
                {/* NEW: Group actions for better styling */}
                <div className="sidebar-header-actions">
                    <button onClick={onShowCallHistory} className="header-btn" title="Call History">🕒</button>
                    <button onClick={onShowProfile} className="header-btn" title="Edit Profile">⚙️</button>
                    <button onClick={logout} className="logout-btn">Logout</button>
                </div>
            </div>

            {/* This UI for adding a new chat can be improved, but let's keep it simple for now */}
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-color)' }}>
                <button onClick={() => setIsAddingNewChat(!isAddingNewChat)} style={{ width: '100%', padding: '10px', cursor: 'pointer', border: 'none', borderRadius: '8px', backgroundColor: '#f1f3f5' }}>
                    {isAddingNewChat ? 'Cancel' : '+ New Chat'}
                </button>
                {isAddingNewChat && (
                    <form onSubmit={handleStartNewChat} style={{ marginTop: '10px', display: 'flex', gap: '5px' }}>
                        <input
                            type="email"
                            placeholder="Enter user's email"
                            value={newChatEmail}
                            onChange={(e) => setNewChatEmail(e.target.value)}
                            required
                            style={{ flex: 1, padding: '8px', borderRadius: '5px', border: '1px solid #ccc' }}
                        />
                        <button type="submit" disabled={searchLoading} style={{ padding: '8px 12px', border: 'none', borderRadius: '5px', background: 'var(--accent-primary)', color: 'white', cursor: 'pointer' }}>
                            {searchLoading ? '...' : 'Go'}
                        </button>
                        {searchError && <p style={{ color: 'red', fontSize: '0.8em', width: '100%' }}>{searchError}</p>}
                    </form>
                )}
            </div>

            <div className="sidebar-chat-list">
                {loading && <div style={{ textAlign: 'center', padding: '20px' }}>Loading chats...</div>}
                {users.map(convo => (
                    <div
                        key={convo.uid}
                        className={`chat-list-item ${selectedChat?.uid === convo.uid ? 'selected' : ''}`}
                        // 5. UPDATED onClick to use the new handler function
                        onClick={() => handleSelectAndClear(convo)}
                    >
                        <div className="avatar-container">
                            <img src={`https://i.pravatar.cc/150?u=${convo.email || convo.uid}`} alt="avatar" className="avatar" />
                            {/* Online indicator here */}
                        </div>
                        <div className="chat-info">
                            <span className="chat-name">{convo.username}</span>
                            <span className="chat-preview" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(convo.lastMessage || "") }}></span>
                        </div>
                        {/* 6. This JSX now works because the data is being updated */}
                        {convo.unreadCount > 0 && <span className="unread-badge">{convo.unreadCount}</span>}
                    </div>
                ))}
            </div>
        </div>
    );
}