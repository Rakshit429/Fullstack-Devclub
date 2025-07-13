import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './context/AuthContext';
import { format, isToday, isYesterday } from 'date-fns';
import { database } from './firebase';
import { ref, query, orderByChild, equalTo, get } from 'firebase/database';

// Helper function to format the date
const formatDate = (date) => {
    const d = new Date(date);
    if (isToday(d)) {
        return `Today, ${format(d, 'p')}`; // e.g., "Today, 4:30 PM"
    }
    if (isYesterday(d)) {
        return `Yesterday, ${format(d, 'p')}`; // e.g., "Yesterday, 10:15 AM"
    }
    return format(d, 'MMM d, yyyy, p'); // e.g., "Jul 20, 2024, 3:00 PM"
};

// Helper to format call duration
const formatDuration = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
};

export default function CallHistory({onBack}) {
    const { mongoUser, startCall } = useAuth();
    const [callLogs, setCallLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const { data } = await axios.get('/api/calls');
                setCallLogs(data);
            } catch (err) {
                setError('Failed to fetch call history.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    const handleCallBack = async (otherParticipant) => {
        if (!otherParticipant) return;
        
        try {
            // Find the user in Firebase using their email to get their Firebase UID
            const usersRef = ref(database, 'ChatUsers/Users');
            const emailQuery = query(usersRef, orderByChild('email'), equalTo(otherParticipant.email));
            const snapshot = await get(emailQuery);

            if (snapshot.exists()) {
                const foundUsers = snapshot.val();
                const userKey = Object.keys(foundUsers)[0];
                const userData = foundUsers[userKey];
                
                // Now we have the full user object with the Firebase UID, so we can start the call
                startCall(userData);
            } else {
                alert("Could not start call. User data not found.");
            }
        } catch (err) {
            console.error("Error finding user for callback:", err);
            alert("An error occurred while trying to call back.");
        }
    };

    if (loading) return <div className="welcome-screen"><h2>Loading Call History...</h2></div>;
    if (error) return <div className="welcome-screen"><h2>{error}</h2></div>;

    return (
        <div className="call-history-container" style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <button className="back-btn" onClick={onBack}>←</button>
            <h2 style={{ marginBottom: '20px', color: '#333' }}>Call History</h2>
            <div className="call-history-list" style={{ flex: 1, overflowY: 'auto' }}>
                {callLogs.length === 0 ? (
                    <p>No call history found.</p>
                ) : (
                    callLogs.map((log, index) => {
                        const otherParticipant = log.participants.find(p => p._id !== mongoUser._id);
                        if (!otherParticipant) return null;

                        const isInitiator = log.initiator._id === mongoUser._id;
                        let icon = '📞';
                        let statusText = log.status.charAt(0).toUpperCase() + log.status.slice(1);
                        let statusColor = '#667781';

                        if (log.status === 'completed') {
                            icon = isInitiator ? '↗️' : '↙️';
                            statusColor = '#00a884';
                        
                        // 2. FIXED the typo from `log.gstatus` to `log.status`
                        } else if (log.status === 'missed' || log.status === 'declined' || log.status === 'cancelled') {
                            statusText = isInitiator ? "Cancelled" : "Missed";
                            icon = '↘️';
                            statusColor = '#f15c6d';
                        }

                        return (
                            // 3. Using `log._id` or `index` as a key
                            <div key={log._id || index} className="call-log-item" style={{ display: 'flex', alignItems: 'center', padding: '12px 8px', borderBottom: '1px solid #f0f2f5' }}>
                                <div className="call-icon" style={{ fontSize: '1.5em', marginRight: '15px', color: statusColor }}>{icon}</div>
                                <div className="call-details" style={{ flex: 1 }}>
                                    <h4 style={{ margin: 0 }}>{otherParticipant.username}</h4>
                                    <p style={{ margin: '4px 0 0', color: '#667781', fontSize: '0.9em' }}>
                                        {statusText}
                                        {log.status === 'completed' && ` • ${formatDuration(log.duration)}`}
                                    </p>
                                </div>
                                <div className="call-time" style={{ color: '#667781', fontSize: '0.8em', marginRight: '15px' }}>
                                    {formatDate(log.startTime)}
                                </div>
                                <button className="call-back-btn" style={{ background: 'none', border: 'none', fontSize: '1.5em', cursor: 'pointer' }} onClick={() => handleCallBack(otherParticipant)}>
                                    📞
                                </button>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}