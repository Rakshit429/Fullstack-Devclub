import React, { useState, useEffect } from 'react';
import { database } from './firebase'; // Import our Firebase database instance
import { ref, onValue } from 'firebase/database'; // Import real-time functions
import { useAuth } from './context/AuthContext';

export default function ChatNavbar({ selectedChat }) {
    // State to hold the real-time status of the person we are chatting with
    const [partnerStatus, setPartnerStatus] = useState('offline');
    const { startCall } = useAuth();

    const handleStartCall = () => {
        if (selectedChat) {
            startCall(selectedChat); // Call the function with the user we want to call
        }
    };
    // This useEffect hook sets up a listener for our chat partner's status
    useEffect(() => {
        // If no chat is selected, do nothing.
        if (!selectedChat) return;

        // 1. Create a reference to the specific user's status field in the database.
        const statusRef = ref(database, `ChatUsers/Users/${selectedChat.uid}/status`);

        // 2. onValue creates a LIVE subscription to that status field.
        const unsubscribe = onValue(statusRef, (snapshot) => {
            const status = snapshot.val();
            if (status) {
                setPartnerStatus(status);
            } else {
                setPartnerStatus('offline'); // Default to offline if status is not set
            }
        });

        // 3. Cleanup: When the component unmounts or we select a new chat partner,
        // this will cancel the subscription to the old partner's status.
        return () => unsubscribe();

    }, [selectedChat]); // The dependency array ensures this effect re-runs when 'selectedChat' changes.

    // If no chat is selected, we can render nothing or a placeholder
    if (!selectedChat) {
        return <div className="chat-header"></div>;
    }

    return (
        <div className="chat-header">
            <div className="chat-header-profile">
                <img src={`https://i.pravatar.cc/150?u=${selectedChat.email}`} alt="avatar" className="avatar" />
                <div className="chat-header-info">
                    <span className="chat-name">{selectedChat.username}</span>
                    <span className="chat-status">{partnerStatus}</span>
                </div>
            </div>
            <div className="chat-header-actions">
                {/* We will add the video call button here later */}
                <button onClick={handleStartCall} className="action-btn">📞</button>
                <button className="action-btn">...</button>
            </div>
        </div>
    );
}