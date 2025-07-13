import React, { createContext, useState, useEffect, useContext , useRef } from 'react';
import axios from 'axios';
// Import all necessary Firebase services and functions
import { auth, database } from '../firebase';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    sendEmailVerification,
    signOut,
} from 'firebase/auth';
// We now need 'get' to perform a one-time read
import { ref, set, onDisconnect, get, onValue, remove, update, query, orderByChild } from 'firebase/database'
import { v4 as uuidv4 } from 'uuid'; // We need a way to generate unique room names
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [mongoUser, setMongoUser] = useState(null);
    const [firebaseUser, setFirebaseUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [callRequest, setCallRequest] = useState(null); // Holds incoming call data
    const [inCall, setInCall] = useState(false); // Are we currently in a call?
    const [callRoomName, setCallRoomName] = useState(''); // The Jitsi room name
    const [notifications, setNotifications] = useState([]); // Holds notifications
    const [unreadCount, setUnreadCount] = useState(0); // Holds the count of unread notifications

    // 2. CREATE a ref to hold the current callRequest state.
    // This allows us to access the latest value inside listeners without causing re-renders.
    const callRequestRef = useRef(callRequest);

    // 3. KEEP the ref in sync with the state. This hook runs whenever callRequest changes.
    useEffect(() => {
        callRequestRef.current = callRequest;
    }, [callRequest]);

    useEffect(() => {
        let callListenerUnsubscribe = () => { };
        let notificationListenerUnsubscribe = () => { };

        // onAuthStateChanged is the single source of truth for the user's auth state.
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            // First, clean up any listeners from a previous user session.
            callListenerUnsubscribe();
            notificationListenerUnsubscribe();
            console.log("Auth state changed:", user);
            if (user) {
                // --- A USER IS LOGGED INTO FIREBASE ---
                setFirebaseUser(user);

                // Fetch the corresponding user profile from our backend.
                // This keeps our mongoUser state in sync with the Firebase session.
                try {
                    const { data } = await axios.get('/api/auth/profile');
                    console.log("User logged in:", data);
                    setMongoUser(data);
                } catch (error) {
                    // This might happen if the cookie is invalid but Firebase session persists.
                    // In this case, we log the user out of Firebase to be safe.
                    console.error("Could not fetch mongo profile, logging out.", error);
                    signOut(auth);
                    return;
                }

                // Set Firebase Realtime Database status to 'online'
                const userStatusRef = ref(database, `/ChatUsers/Users/${user.uid}/status`);
                set(userStatusRef, 'online');
                // Set status to 'offline' when the client disconnects
                onDisconnect(userStatusRef).set('offline');

                // Set up the listener for incoming call requests
                const callRequestRefPath = ref(database, `CallRequests/${user.uid}`);
                callListenerUnsubscribe = onValue(callRequestRefPath, async (snapshot) => {
                    const request = snapshot.val();
                    const currentCallRequest = callRequestRef.current; // Use the ref here

                    // Check for a MISSED CALL
                    if (!request && currentCallRequest && currentCallRequest.status === 'pending') {
                        // The call request disappeared from the DB while we were looking at it.
                        // This means the caller cancelled, so it's a "missed" call for us.
                        await logCallToDb(currentCallRequest, 'missed', Date.now());
                        setCallRequest(null); // Clear the local state
                    }
                    else if (request && request.status === 'pending') {
                        setCallRequest(request); // A new call is coming in
                    }
                    else if (request && request.status === 'accepted') {
                        // The call was accepted by us on another device, or there's a sync event.
                        setCallRoomName(request.roomName);
                        setInCall(true);
                        setCallRequest(null);
                    } else {
                        // Default case: no active request, clear the state.
                        setCallRequest(null);
                    }
                });

                // Set up the listener for notifications
                const notificationsRef = ref(database, `Notifications/${user.uid}`);
                const notificationsQuery = query(notificationsRef, orderByChild('timestamp'));
                notificationListenerUnsubscribe = onValue(notificationsQuery, (snapshot) => {
                    if (snapshot.exists()) {
                        const data = snapshot.val();
                        const allNotifications = Object.keys(data).map(key => ({ id: key, ...data[key] })).reverse();
                        setNotifications(allNotifications);
                        setUnreadCount(allNotifications.filter(n => !n.isRead).length);
                    } else {
                        setNotifications([]);
                        setUnreadCount(0);
                    }
                });

            } else {
                // --- NO USER IS LOGGED INTO FIREBASE ---
                // Clear all user-related state.
                setFirebaseUser(null);
                setMongoUser(null);
                setCallRequest(null);
                setInCall(false);
                setNotifications([]);
                setUnreadCount(0);
            }
            // We are done with the initial check, so we can stop showing a loader.
            setLoading(false);
        });

        // The cleanup function for when the AuthProvider unmounts.
        return () => unsubscribe();
    }, []);

    const markNotificationsAsRead = async () => {
        if (!firebaseUser) return;
        const notificationsRef = ref(database, `Notifications/${firebaseUser.uid}`);
        const updates = {};
        notifications.forEach(notif => {
            if (!notif.isRead) {
                // Create a path to the 'isRead' property of each unread notification and set it to true
                updates[`${notif.id}/isRead`] = true;
            }
        });

        // Perform a multi-path update
        if (Object.keys(updates).length > 0) {
            await update(notificationsRef, updates);
        }
    };

    const logCallToDb = async (callData, status, endTime) => {
        if (!callData) return;

        const duration = endTime ? Math.round((new Date(endTime).getTime() - new Date(callData.timestamp).getTime()) / 1000) : 0;

        const logPayload = {
            participants: [callData.callerMongoId, callData.receiverMongoId],
            initiator: callData.callerMongoId,
            callType: callData.callType || 'video',
            status: status,
            startTime: new Date(callData.timestamp),
            endTime: endTime ? new Date(endTime) : null,
            duration: duration > 0 ? duration : 0,
        };
        try {
            await axios.post('/api/calls/log', logPayload);
        } catch (error) {
            console.error("Failed to log call to DB:", error);
        }
    };

    const startCall = async (receiver) => {
        if (!firebaseUser || !mongoUser) return;

        // Fetch the receiver's full profile to get their mongoId
        const receiverRef = ref(database, `ChatUsers/Users/${receiver.uid}`);
        const snapshot = await get(receiverRef);
        if (!snapshot.exists()) {
            alert("Could not start call. User data not found.");
            return;
        }
        const receiverData = snapshot.val();

        const roomName = `caic-chat-${uuidv4()}`;
        const newCallRequest = {
            callerId: firebaseUser.uid,
            callerMongoId: mongoUser._id,
            callerName: mongoUser.username,
            receiverId: receiver.uid,
            receiverMongoId: receiverData.mongoId,
            status: 'pending',
            roomName: roomName,
            callType: 'video',
            timestamp: Date.now()
        };

        await set(ref(database, `CallRequests/${receiver.uid}`), newCallRequest);
        await set(ref(database, `CallRequests/${firebaseUser.uid}`), newCallRequest);
    };

    const acceptCall = async () => {
        if (!callRequest) return;
        const updates = { status: 'accepted' };
        await update(ref(database, `CallRequests/${callRequest.callerId}`), updates);
        await update(ref(database, `CallRequests/${firebaseUser.uid}`), updates);
        setCallRoomName(callRequest.roomName);
        setInCall(true);
        setCallRequest(null);
    };

    const declineCall = async () => {
        if (!callRequest) return;
        await logCallToDb(callRequest, 'declined', Date.now());

        await remove(ref(database, `CallRequests/${callRequest.callerId}`));
        await remove(ref(database, `CallRequests/${firebaseUser.uid}`));
        setCallRequest(null);
    };

    const endCall = async () => {
        if (!firebaseUser) {
            setInCall(false);
            setCallRoomName('');
            return;
        }

        const currentUserCallRef = ref(database, `CallRequests/${firebaseUser.uid}`);
        const snapshot = await get(currentUserCallRef);

        if (snapshot.exists()) {
            const callData = snapshot.val();
            const { callerId, receiverId, status } = callData;

            // Log the call with the appropriate status
            if (status === 'pending') {
                // If status is still pending, the caller cancelled it
                await logCallToDb(callData, 'cancelled', Date.now());
            } else {
                // Otherwise, it was a completed call
                await logCallToDb(callData, 'completed', Date.now());
            }

            // Clean up Firebase records
            if (callerId) await remove(ref(database, `CallRequests/${callerId}`));
            if (receiverId) await remove(ref(database, `CallRequests/${receiverId}`));
        }

        // Reset local state
        setInCall(false);
        setCallRoomName('');
    };

    // --- NEW REGISTER FUNCTION ---
    const register = async (username, email, password) => {
        // 1. Create the user in Firebase Auth FIRST.
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseUid = userCredential.user.uid;

        // 2. Create the user in our MongoDB via our backend, now passing the firebaseUid.
        const { data: newMongoUser } = await axios.post('/api/auth/register', {
            username,
            email,
            password,
            firebaseUid // <-- Send the UID to the backend
        });

        // 3. Send the verification email using Firebase.
        await sendEmailVerification(userCredential.user);

        // 4. Create the user profile in Firebase Realtime Database.
        await set(ref(database, 'ChatUsers/Users/' + firebaseUid), {
            username: username,
            email: email,
            uid: firebaseUid,
            mongoId: newMongoUser._id, // Use the ID from the backend response
            status: 'offline',
        });

        // 5. Sign the user out. They must log in after verifying their email.
        await signOut(auth);
    };

    // --- NEW LOGIN FUNCTION WITH VERIFICATION CHECK ---
    const login = async (email, password) => {
        // 1. Sign into Firebase FIRST to check verification status.
        const userCredential = await signInWithEmailAndPassword(auth, email, password);


        // 2. Check if the user's email is verified.
        if (!userCredential.user.emailVerified) {
            // If not verified, sign them out immediately and throw an error.
            await signOut(auth);
            throw new Error('You must verify your email before logging in. Please check your inbox.');
        }

        // 3. If verified, log into our backend to set the secure cookie.
        const { data } = await axios.post('/api/auth/login', { email, password });
        // 4. Update the context state to complete the login.
        // The onAuthStateChanged listener will also fire and set up listeners.
        console.log("User logged in:", data);
        setMongoUser(data);
    };

    const updateUserProfile = async (profileData) => {
        // The backend will handle updating Mongo, Firebase Auth, and Firebase RTDB.
        // We just need to make the API call.
        const { data } = await axios.put('/api/auth/profile', profileData);

        // After a successful update, refresh the user state in the context.
        setMongoUser(data);

        // Also, tell the Firebase client SDK to reload its user data
        // to get the latest info (like a changed email).
        if (auth.currentUser) {
            await auth.currentUser.reload();
        }

        // Return the updated data in case the calling component needs it
        return data;
    };

    const logout = async () => {
        if (auth.currentUser) {
            // Set status to offline before signing out
            const userStatusRef = ref(database, `/ChatUsers/Users/${auth.currentUser.uid}/status`);
            await set(userStatusRef, 'offline');
        }

        // Sign out of Firebase, which will trigger onAuthStateChanged to clear state.
        await signOut(auth);

        // Call our backend to clear the httpOnly cookie.
        await axios.post('/api/auth/logout');
    };

    const value = {
        loading,
        firebaseUser,
        mongoUser,
        callRequest,
        inCall,
        callRoomName,
        notifications,
        unreadCount,
        updateUserProfile,
        setMongoUser,
        markNotificationsAsRead,
        startCall,
        acceptCall,
        declineCall,
        endCall,
        login,
        logout,
        register,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};