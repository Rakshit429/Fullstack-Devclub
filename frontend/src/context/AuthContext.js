import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
// Import all necessary Firebase services and functions
import { auth, database } from '../firebase';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
} from 'firebase/auth';
// We now need 'get' to perform a one-time read
import { ref, set, onDisconnect, get, onValue, remove, update } from 'firebase/database';
import { v4 as uuidv4 } from 'uuid'; // We need a way to generate unique room names
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [mongoUser, setMongoUser] = useState(null);
    const [firebaseUser, setFirebaseUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [callRequest, setCallRequest] = useState(null); // Holds incoming call data
    const [inCall, setInCall] = useState(false); // Are we currently in a call?
    const [callRoomName, setCallRoomName] = useState(''); // The Jitsi room name
    const [jitsiToken, setJitsiToken] = useState(null);

    const fetchJitsiToken = async (roomName) => {
        try {
            // 1. Get the stored user info directly from localStorage.
            const storedUserInfo = localStorage.getItem('userInfo');
            if (!storedUserInfo) {
                throw new Error("User is not logged in.");
            }
            const userInfo = JSON.parse(storedUserInfo);

            // 2. Check if the token exists.
            if (!userInfo.token) {
                throw new Error("No auth token found for user.");
            }

            // 3. Create the axios config with the fresh token.
            const config = {
                headers: {
                    Authorization: `Bearer ${userInfo.token}`,
                },
            };

            const { data } = await axios.post('http://localhost:5000/api/jitsi/token', { roomName }, config);
            return data.token;
        } catch (error) {
            console.error("Failed to fetch Jitsi token:", error);
            return null;
        }
    };
    
    useEffect(() => {
        let callListenerUnsubscribe = () => { }; // A variable to hold the call listener's cleanup function
        const authListenerUnsubscribe = onAuthStateChanged(auth, async (user) => {
            // First, clean up any existing call listener from a previous user
            callListenerUnsubscribe();
            setFirebaseUser(user);
            if (user) {
                // User is logged in
                const userProfileRef = ref(database, `/ChatUsers/Users/${user.uid}`);
                const snapshot = await get(userProfileRef);

                if (snapshot.exists()) {
                    const userStatusRef = ref(database, `/ChatUsers/Users/${user.uid}/status`);
                    set(userStatusRef, 'online');
                    onDisconnect(userStatusRef).set('offline');
                }

                // Set up the new call listener for the current user
                const callRequestRef = ref(database, `CallRequests/${user.uid}`);
                callListenerUnsubscribe = onValue(callRequestRef, async (snapshot) => {
                    const request = snapshot.val();
                    if (request && request.status === 'pending') {
                        setCallRequest(request);
                    } else if (request && request.status === 'accepted' && request.receiverId === user.uid) {
                        // We check receiverId to ensure we join a call we ACCEPTED, not one we initiated
                        const token = await fetchJitsiToken(request.roomName);
                        if (token) {
                            setJitsiToken(token);
                            setCallRoomName(request.roomName);
                            setInCall(true);
                            setCallRequest(null);
                        }
                    } else if (request && request.status === 'accepted' && request.callerId === user.uid) {
                        // This handles the caller's side when the receiver accepts
                        const token = await fetchJitsiToken(request.roomName);
                        if (token) {
                            setJitsiToken(token);
                            setCallRoomName(request.roomName);
                            setInCall(true);
                        }
                    } else {
                        setCallRequest(null);
                    }
                });
            }

            const storedMongoUser = localStorage.getItem('userInfo');
            if (storedMongoUser) {
                setMongoUser(JSON.parse(storedMongoUser));
            }
            setLoading(false);
        });

        // The final cleanup function returned by useEffect
        return () => {
            authListenerUnsubscribe();
            callListenerUnsubscribe();
        };
    }, []);

    // --- CORRECTED startCall function ---
    const startCall = async (receiver) => {
        const roomName = `caic-chat-${uuidv4()}`;
        const newCallRequest = {
            callerId: firebaseUser.uid,
            callerName: mongoUser.username,
            receiverId: receiver.uid,
            status: 'pending',
            roomName: roomName,
            timestamp: Date.now()
        };
        console.log("Starting call with receiver:", receiver, "Room name:", roomName);
        // We ONLY write the call request to the receiver's path.
        await set(ref(database, `CallRequests/${receiver.uid}`), newCallRequest);
        // We also create a copy for the caller so they can listen for status changes (accepted/declined)
        await set(ref(database, `CallRequests/${firebaseUser.uid}`), newCallRequest);
    };

    const acceptCall = async () => {
        if (!callRequest) return;

        const token = await fetchJitsiToken(callRequest.roomName);
        if (!token) {
            console.error("Could not get Jitsi token, cannot accept call.");
            declineCall(); // Decline if we can't get a token
            return;
        }

        setJitsiToken(token);

        const updates = { status: 'accepted' };
        await update(ref(database, `CallRequests/${callRequest.callerId}`), updates);
        await update(ref(database, `CallRequests/${firebaseUser.uid}`), updates);

        setCallRoomName(callRequest.roomName);
        setInCall(true);
        setCallRequest(null);
    };

    const declineCall = async () => {
        if (!callRequest) return;
        await remove(ref(database, `CallRequests/${callRequest.callerId}`));
        await remove(ref(database, `CallRequests/${firebaseUser.uid}`));
        setCallRequest(null);
    };

    const endCall = async () => {
        // ...
        setInCall(false);
        setCallRoomName('');
        setJitsiToken(null); // Clear the token on call end
    };

    // The register function is now correct and doesn't need changes
    const register = async (username, email, password) => {
        const { data: newMongoUser } = await axios.post('http://localhost:5000/api/auth/register', {
            username,
            email,
            password,
        });

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newFirebaseUser = userCredential.user;

        await set(ref(database, 'ChatUsers/Users/' + newFirebaseUser.uid), {
            username: newMongoUser.username,
            email: newMongoUser.email,
            uid: newFirebaseUser.uid,
            status: 'offline',
        });

        localStorage.setItem('userInfo', JSON.stringify(newMongoUser));
        setMongoUser(newMongoUser);
    };

    // The rest of your login and logout functions are also correct and don't need changes.
    const login = async (email, password) => {
        // Step 1: Log into our backend to get JWT and profile
        const { data } = await axios.post('http://localhost:5000/api/auth/login', {
            email,
            password,
        });

        // Step 2: Sign into Firebase
        await signInWithEmailAndPassword(auth, email, password);
        // The onAuthStateChanged listener will automatically handle setting the status to 'online'

        // Set our MongoDB user state
        localStorage.setItem('userInfo', JSON.stringify(data));
        setMongoUser(data);
    };

    const logout = async () => {
        if (firebaseUser) {
            // --- NEW: Step 1: Manually set status to offline on a clean logout ---
            const userStatusRef = ref(database, `/ChatUsers/Users/${firebaseUser.uid}/status`);
            await set(userStatusRef, 'offline');
        }

        // Step 2: Sign out of Firebase
        await signOut(auth);

        // Step 3: Clear our own user state and localStorage
        localStorage.removeItem('userInfo');
        setMongoUser(null);
    };


    const value = {
        loading,
        firebaseUser,
        mongoUser,
        callRequest,
        inCall,
        callRoomName,
        jitsiToken,
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