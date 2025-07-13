// client/src/dialogbox.js
import axios from 'axios';
import { useState, useEffect, useRef } from 'react';
import { database } from './firebase';
import { ref as dbRef, onValue, push, set, serverTimestamp, update, increment } from 'firebase/database';
import { useAuth } from './context/AuthContext';
import ChatNavbar from './chatnavbar';
import DOMPurify from 'dompurify';
import publicApi from './utils/public'


export default function DialogBox({ selectedChat, onShowChatList }) {
    const { firebaseUser, mongoUser } = useAuth();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    //State for file uploads ---
    const [file, setFile] = useState(null); // Holds the selected file
    const [uploadProgress, setUploadProgress] = useState(0); // Holds upload progress percentage
    const [isUploading, setIsUploading] = useState(false); // Tracks if an upload is in progress
    const fileInputRef = useRef(null); // Ref to access the hidden file input
    // ---

    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (!selectedChat || !firebaseUser) return;

        const chatRoomId = [firebaseUser.uid, selectedChat.uid].sort().join('-');
        const chatsRef = dbRef(database, `Chats/${chatRoomId}`);

        const unsubscribe = onValue(chatsRef, (snapshot) => {
            if (snapshot.exists()) {
                const messagesData = snapshot.val();
                const loadedMessages = Object.keys(messagesData).map(key => ({
                    id: key, // The unique key from Firebase is our message ID
                    ...messagesData[key] // The rest of the message data
                }));
                loadedMessages.sort((a, b) => a.timestamp - b.timestamp);
                setMessages(loadedMessages);
            } else {
                setMessages([]);
            }
        });

        return () => unsubscribe();
    }, [selectedChat, firebaseUser]);


    //Function to handle when a user selects a file ---
    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if ((newMessage.trim() === '' && !file) || !selectedChat) return;
        const chatRoomId = [firebaseUser.uid, selectedChat.uid].sort().join('-');
        const chatListRefSender = dbRef(database, `Chatlist/${firebaseUser.uid}/${selectedChat.uid}`);
        const chatListRefReceiver = dbRef(database, `Chatlist/${selectedChat.uid}/${firebaseUser.uid}`);

        // --- FILE UPLOAD LOGIC (Now using your own backend) ---
        if (file) {
            setIsUploading(true);
            setUploadProgress(0);

            // 1. Create a FormData object to send the file
            const formData = new FormData();
            formData.append('file', file); // The key 'file' must match `upload.single('file')` on the backend

            try {
                //`onUploadProgress` to track and display upload percentage.
                const response = await axios.post('/api/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    onUploadProgress: (progressEvent) => {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setUploadProgress(percentCompleted);
                    },
                });

                // 3. Get the file URL from your backend's response
                const downloadURL = response.data.filePath;

                // 4. Create the message object for Firebase Realtime Database
                const messageData = {
                    message: newMessage,
                    sender: firebaseUser.uid,
                    receiver: selectedChat.uid,
                    timestamp: serverTimestamp(),
                    messageType: 'image',
                    mediaUrl: downloadURL, // <-- Use the URL from your backend
                    fileName: file.name
                };

                const newMessageRef = push(dbRef(database, `Chats/${chatRoomId}`));
                await set(newMessageRef, messageData);

                // Update chat list for both users
                const lastMessage = `📷 Image ${newMessage ? `(${newMessage})` : ''}`;
                await set(chatListRefSender, { uid: selectedChat.uid, username: selectedChat.username, lastMessage, timestamp: serverTimestamp() });
                await update(chatListRefReceiver, {
                    uid: firebaseUser.uid,
                    username: mongoUser.username,
                    email: mongoUser.email, 
                    lastMessage,
                    timestamp: serverTimestamp(),
                    unreadCount: increment(1) // <-- ADD THIS LINE
                });
                // 5. Reset the state
                setFile(null);
                setNewMessage('');

            } catch (error) {
                console.error("Error uploading file:", error);
                alert("File upload failed. Please try again.");
            } finally {
                setIsUploading(false); // Make sure to stop the loading state
            }

        } else {
            // --- TEXT MESSAGE LOGIC (This part remains unchanged) ---
            const messageData = {
                message: newMessage,
                sender: firebaseUser.uid,
                receiver: selectedChat.uid,
                timestamp: serverTimestamp(),
                messageType: 'text',
            };

            const newMessageRef = push(dbRef(database, `Chats/${chatRoomId}`));
            await set(newMessageRef, messageData);

            // Update chat list for both users
            await set(chatListRefSender, { uid: selectedChat.uid, username: selectedChat.username, lastMessage: newMessage, timestamp: serverTimestamp() });
            await update(chatListRefReceiver, {
                uid: firebaseUser.uid,
                username: mongoUser.username,
                email: mongoUser.email,
                lastMessage: newMessage,
                timestamp: serverTimestamp(),
                unreadCount: increment(1) // <-- ADD THIS LINE
            });
            setNewMessage('');
        }
    };

    const handleTranslate = async (messageId, text) => {
        setMessages(currentMessages =>
            currentMessages.map(m =>
                m.id === messageId ? { ...m, translatedText: 'Translating...' } : m
            )
        );

        try {
            // Use the new 'publicApi' instance for the call
            console.log("Translating text:", text);
            const response = await publicApi.get(`/get?q=${encodeURIComponent(text)}&langpair=auto|en`);
            console.log("Translation response:", response.data);
            let translatedText = 'Translation not found.';
            if (response.data && response.data.responseData) {
                const result = response.data.responseData.translatedText;
                if (result && result.toLowerCase() !== text.toLowerCase()) {
                    translatedText = result;
                }
            }

            setMessages(currentMessages =>
                currentMessages.map(m =>
                    m.id === messageId ? { ...m, translatedText: translatedText } : m
                )
            );

        } catch (error) {
            console.error("Translation failed:", error);
            setMessages(currentMessages =>
                currentMessages.map(m =>
                    m.id === messageId ? { ...m, translatedText: 'Translation failed' } : m
                )
            );
        }
    };

    const renderMessageContent = (msg) => {
        // console.log("Rendering message:", msg);
        const showTranslateButton = msg.sender !== firebaseUser.uid && msg.messageType === 'text' && msg.message.trim() !== '' && !msg.translatedText;
        return (
            <div className="message-content">
                {/* --- The part for rendering images is unchanged --- */}
                {msg.messageType === 'image' && (
                    <div className="media-message-container">
                        <img src={msg.mediaUrl} alt={msg.fileName} className="chat-image" />
                        <div className="media-info">
                            {msg.message && (
                                <p
                                    className="caption"
                                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.message) }}
                                ></p>
                            )}
                            <a href={msg.mediaUrl} download={msg.fileName || 'download'} target="_blank" rel="noopener noreferrer" className="download-btn">⬇️</a>
                        </div>
                    </div>
                )}
                {/* ---Display the text--- */}
                {/* {console.log(DOMPurify.sanitize(msg.message))} */}
                {msg.messageType !== 'image' && (
                    <p dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.message || "") }}></p>
                )}
                {/* --- Display the translation if it exists --- */}
                {msg.translatedText && <p className="translated-text">{msg.translatedText}</p>}

                {/* --- The Translate Button --- */}
                {showTranslateButton && (
                    <button onClick={() => handleTranslate(msg, msg.message)} className="translate-btn">
                        Translate
                    </button>
                )}
            </div>
        );
    };

    if (!selectedChat) {
        return <div className="dialog-box-placeholder">Select a user to start chatting</div>;
    }

    return (
        <>
            <ChatNavbar selectedChat={selectedChat} onShowChatList={onShowChatList} />
            <div className="dialog-box">
                <div className="chat-window">
                    {messages.map((msg, index) => (
                        <div key={index} className={msg.sender === firebaseUser.uid ? 'message sent' : 'message received'}>
                            {renderMessageContent(msg)} {/* <-- Use the new render function */}
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* --- NEW: UI for file preview and upload progress --- */}
                {isUploading && (
                    <div className="upload-progress-bar">
                        <div style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                )}
                {file && !isUploading && (
                    <div className="file-preview">
                        <span>Selected: {file.name}</span>
                        <button onClick={() => setFile(null)}>X</button>
                    </div>
                )}

                {/* --- UPDATED: The message input form --- */}
                <form onSubmit={handleSendMessage} className="message-input">
                    {/* Hidden file input, triggered by the button */}
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept="image/*" />
                    <button type="button" className="attach-btn" onClick={() => fileInputRef.current.click()}>
                        📎
                    </button>
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={file ? "Add a caption..." : "Type your message..."}
                        disabled={isUploading}
                    />
                    <button type="submit" disabled={isUploading}>
                        {isUploading ? '↺' : '⮞'}
                    </button>
                </form>
            </div>
        </>
    );
}