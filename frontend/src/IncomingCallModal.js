import React from 'react';
import { useAuth } from './context/AuthContext';
import './chat.css';
export default function IncomingCallModal() {
    const { callRequest, acceptCall, declineCall } = useAuth();
    if (!callRequest) return null;
    return (
        <div className="call-modal-overlay">
            <div className="call-modal-content">
                <h3>Incoming Call From</h3>
                <h2>{callRequest.callerName}</h2>
                <div className="call-modal-actions">
                    <button onClick={acceptCall} className="accept-btn">Accept</button>
                    <button onClick={declineCall} className="decline-btn">Decline</button>
                </div>
            </div>
        </div>
    );
}