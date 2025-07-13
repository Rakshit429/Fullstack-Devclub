// client/src/MainApplication.js
import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import SideBar from './sidebar';
import DialogBox from './dialogbox';
import ProfileEditForm from './profile';
import IncomingCallModal from './IncomingCallModal';
import VideoCall from './VideoCall';
import CallHistory from './CallHistory';
import './chat.css';

export default function MainApplication() {
    const { inCall, callRequest } = useAuth();
    const [selectedChat, setSelectedChat] = useState(null);
    const [rightPanelView, setRightPanelView] = useState('welcome');
    
    // NEW STATE: To control mobile view
    const [isChatVisible, setIsChatVisible] = useState(false);

    // Track window width to reset view on resize
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 768) {
                setIsChatVisible(true); // On desktop, both panels are always conceptually "visible"
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize(); // Run on initial load
        return () => window.removeEventListener('resize', handleResize);
    }, []);


    const handleSelectChat = (chat) => {
        setSelectedChat(chat);
        setRightPanelView('chat');
        if (window.innerWidth <= 768) {
            setIsChatVisible(true); // On mobile, switch to the chat view
        }
    };

    const handleShowProfile = () => {
        setSelectedChat(null);
        setRightPanelView('profile');
        if (window.innerWidth <= 768) {
            setIsChatVisible(true);
        }
    };

    const handleShowCallHistory = () => {
        setSelectedChat(null);
        setRightPanelView('callHistory');
        if (window.innerWidth <= 768) {
            setIsChatVisible(true);
        }
    };
    
    // NEW FUNCTION: To go back to the chat list on mobile
    const handleShowChatList = () => {
        setIsChatVisible(false);
    };

    const renderRightPanel = () => {
        switch (rightPanelView) {
            case 'chat':
                // Pass the new handler function to DialogBox
                return <DialogBox selectedChat={selectedChat} onShowChatList={handleShowChatList} />;
            case 'profile':
                return <ProfileEditForm onBack={handleShowChatList} />;
            case 'callHistory':
                return <CallHistory onBack={handleShowChatList} />;
            case 'welcome':
            default:
                return (
                    <div className="welcome-screen">
                        <h1>Select a chat to start messaging.</h1>
                    </div>
                );
        }
    };

    if (inCall) {
        return <VideoCall />;
    }

    // UPDATED: Added a dynamic class to the main container
    return (
        <div className={`chat-container ${isChatVisible ? 'show-chat' : ''}`}>
            {callRequest && <IncomingCallModal />}
            <div className="left-panel">
                <SideBar
                    onSelectChat={handleSelectChat}
                    onShowProfile={handleShowProfile}
                    onShowCallHistory={handleShowCallHistory}
                    selectedChat={selectedChat}
                />
            </div>
            <div className="right-panel">
                {renderRightPanel()}
            </div>
        </div>
    );
}