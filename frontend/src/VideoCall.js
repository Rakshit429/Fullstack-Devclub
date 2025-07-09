// VideoCall.js
import React, { useEffect, useRef } from 'react';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { useAuth } from './context/AuthContext';

export default function VideoCall() {
    const { callRoomName, endCall, mongoUser, inCall } = useAuth();
    const containerRef = useRef(null);

    useEffect(() => {
        if (!inCall || !callRoomName || !mongoUser) return;

        const appID = 698148399;
        const serverSecret = '8b37670d213f976cec25a8e32353f0a0'; // replace in production with backend-generated token
        const userID = String(mongoUser._id || Math.floor(Math.random() * 10000));
        const userName = mongoUser.username;

        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(appID, serverSecret, callRoomName, userID, userName);

        const zp = ZegoUIKitPrebuilt.create(kitToken);
        const zpInstance = zp.joinRoom({
            container: containerRef.current,
            sharedLinks: [{
                name: 'Personal link',
                url: `${window.location.protocol}//${window.location.host}${window.location.pathname}?roomID=${callRoomName}`,
            }],
            scenario: {
                mode: ZegoUIKitPrebuilt.VideoConference,
            },
            turnOnMicrophoneWhenJoining: true,
            turnOnCameraWhenJoining: true,
            showMyCameraToggleButton: true,
            showMyMicrophoneToggleButton: true,
            showAudioVideoSettingsButton: true,
            showScreenSharingButton: true,
            showTextChat: true,
            showUserList: true,
            maxUsers: 50,
            layout: 'Auto',
            showLayoutButton: true,
            onLeaveRoom: () => {
                endCall();
            }
        });

        return () => {
            if (zpInstance) zpInstance.leaveRoom();
        };
    }, [callRoomName, mongoUser, inCall, endCall]);

    if (!inCall) return null;

    return <div ref={containerRef} style={{ width: '100vw', height: '100vh' }} />;
}
