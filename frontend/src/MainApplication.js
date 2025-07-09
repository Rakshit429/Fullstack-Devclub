import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import SideBar from './sidebar';
import DialogBox from './dialogbox';
import IncomingCallModal from './IncomingCallModal';
import VideoCall from './VideoCall';
import './chat.css'; // Import our new CSS file

export default function MainApplication() {
	const { inCall, callRequest } = useAuth();
	const [selectedChat, setSelectedChat] = useState(null);
	if (inCall) {
		return <VideoCall />;
	}
	// We will pass the logout function to the sidebar later
	return (
		<div className="chat-container">
			{callRequest && <IncomingCallModal />}
			<div className="left-panel">
				<SideBar onSelectChat={setSelectedChat} />
			</div>
			<div className="right-panel">
				{selectedChat ? (
					<DialogBox selectedChat={selectedChat} />
				) : (
					<div className="welcome-screen">
						<h1>Select a chat to start messaging</h1>
					</div>
				)}
			</div>
		</div>
	);
}