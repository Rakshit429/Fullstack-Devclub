import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import './NotificationBell.css'; // We will create this CSS file next

export default function NotificationBell({ onNotificationClick }) {
    const { notifications, unreadCount, markNotificationsAsRead } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    const handleToggle = () => {
        const currentlyOpen = isOpen;
        setIsOpen(!currentlyOpen);
        // If we are opening the dropdown and there are unread items, mark them as read.
        if (!currentlyOpen && unreadCount > 0) {
            markNotificationsAsRead();
        }
    };

    return (
        <div className="notification-bell">
            <button onClick={handleToggle} className="bell-button">
                🔔
                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
            </button>

            {isOpen && (
                <div className="notifications-dropdown">
                    <div className="dropdown-header">
                        <h3>Notifications</h3>
                    </div>
                    <div className="dropdown-list">
                        {notifications.length > 0 ? (
                            notifications.map(notif => (
                                <div
                                    key={notif.id}
                                    className={`notification-item ${notif.isRead ? 'read' : 'unread'}`}
                                    onClick={() => {
                                        onNotificationClick(notif);
                                        setIsOpen(false); // Close dropdown after click
                                    }}
                                >
                                    <strong>{notif.title}</strong>
                                    <p>{notif.message}</p>
                                </div>
                            ))
                        ) : (
                            <div className="notification-item">No new notifications.</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}