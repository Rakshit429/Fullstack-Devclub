import React, { useEffect, useRef } from 'react';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { useAuth } from './context/AuthContext';

// UPDATED: Remove redundant props. The component will get everything it needs from the context.
export default function VideoCall() {
    const containerRef = useRef(null);
    // UPDATED: Get the endCall function from context, which we will need.
    const { callRoomName, mongoUser, endCall } = useAuth();

    useEffect(() => {
        // Prevent execution if we don't have the necessary data yet.
        if (!callRoomName || !mongoUser?._id || !mongoUser?.username || !containerRef.current) {
            return;
        }

        const appID = 506327381;
        const serverSecret = "dbbcdc903e33196e90b42f1e8c22c98b";

        // Use the stable values from the context
        const roomID = callRoomName;
        const userID = mongoUser._id;
        const userName = mongoUser.username;

        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(appID, serverSecret, roomID, userID, userName);
        const zp = ZegoUIKitPrebuilt.create(kitToken);

        zp.joinRoom({
            container: containerRef.current,
            scenario: {
                mode: ZegoUIKitPrebuilt.VideoConference,
            },
            onLeaveRoom: () => {
                endCall();
            },
            sharedLinks: [
                {
                    name: 'Copy Meeting Link',
                    url: `${window.location.protocol}//${window.location.host}${window.location.pathname}?roomID=${roomID}`,
                },
            ],
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
        });

        // NEW: This is the cleanup function.
        // It runs when the component is about to unmount.
        return () => {
            zp.destroy(); // Destroy the Zego instance to clean up resources.
        };

        // UPDATED: The dependency array now uses stable values from the context.
    }, [callRoomName, mongoUser, endCall]);

    return <div ref={containerRef} style={{ width: '100vw', height: '100vh' }} />;
}