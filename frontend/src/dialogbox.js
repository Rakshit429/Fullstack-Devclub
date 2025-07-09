import React, { useState, useEffect, useRef } from 'react';
// Import all the necessary Firebase functions
import { database } from './firebase';
import { ref, onValue, push, set, serverTimestamp } from 'firebase/database';
import { useAuth } from './context/AuthContext';
import ChatNavbar from './chatnavbar'; 

export default function DialogBox({ selectedChat }) {
    const { firebaseUser , mongoUser } = useAuth(); // Get our logged-in Firebase user
    const [messages, setMessages] = useState([]); // State to hold the conversation messages
    const [newMessage, setNewMessage] = useState(''); // State for the input box

    // Create a ref to an invisible div at the bottom of the chat list
    // We will use this to automatically scroll down when new messages arrive
    const messagesEndRef = useRef(null);

    // This useEffect hook handles auto-scrolling
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]); // It runs every time the 'messages' array changes

    // This useEffect hook loads the chat history for the selected user
    useEffect(() => {
        // Don't run if we haven't selected a chat or don't know who we are
        if (!selectedChat || !firebaseUser) return;

        // 1. Create a reference to the entire /Chats collection
        const chatsRef = ref(database, 'Chats');

        // 2. Set up the live listener with onValue
        const unsubscribe = onValue(chatsRef, (snapshot) => {
            const allMessages = snapshot.val();
            if (allMessages) {
                // 3. Filter the messages
                const conversation = Object.values(allMessages).filter(
                    (msg) =>
                        (msg.sender === firebaseUser.uid && msg.receiver === selectedChat.uid) ||
                        (msg.sender === selectedChat.uid && msg.receiver === firebaseUser.uid)
                );

                // 4. Sort the messages by timestamp
                conversation.sort((a, b) => a.timestamp - b.timestamp);

                // 5. Update the state to display the messages
                setMessages(conversation);
            } else {
                setMessages([]); // If no messages exist at all, ensure our state is an empty array
            }
        });

        // Cleanup: When the component unmounts or we select a new chat, cancel this subscription
        return () => unsubscribe();
    }, [selectedChat, firebaseUser]); // Re-run this ENTIRE effect if we click a different user


    // This function handles sending a new message
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (newMessage.trim() === '' || !selectedChat) return;
        console.log("reciver",selectedChat);
        const newChatRef = push(ref(database, 'Chats'));
        const messageData = {
            message: newMessage,
            sender: firebaseUser.uid,
            receiver: selectedChat.uid,
            timestamp: serverTimestamp(),
        };

        // 1. Save the new message
        await set(newChatRef, messageData);

        // --- NEW: Update the Chatlist for both users ---
        // 2. Create a reference for the sender's chatlist
        const senderChatlistRef = ref(database, `Chatlist/${firebaseUser.uid}/${selectedChat.uid}`);
        // 3. Create a reference for the receiver's chatlist
        const receiverChatlistRef = ref(database, `Chatlist/${selectedChat.uid}/${firebaseUser.uid}`);

        // 4. Update both chatlists with the latest message info
        const chatlistData = {
            uid: selectedChat.uid,
            username: selectedChat.username, // Store partner's username for easy access
            lastMessage: newMessage,
            timestamp: serverTimestamp(),
        };
        await set(senderChatlistRef, chatlistData);

        // Update the receiver's chatlist with the sender's info
        const senderInfoForReceiver = {
            uid: firebaseUser.uid,
            username: mongoUser.username, // The current user's name
            lastMessage: newMessage,
            timestamp: serverTimestamp(),
        };
        await set(receiverChatlistRef, senderInfoForReceiver);


        setNewMessage(''); // Clear the input field
    };
    // If no user is selected, show a placeholder message
    if (!selectedChat) {
        return <div className="dialog-box-placeholder">Select a user to start chatting</div>;
    }

    return (
        <>
        <ChatNavbar selectedChat={selectedChat} /> 
        <div className="dialog-box">
            <div className="chat-window">
                {/* Loop through the messages in state and display each one */}
                {messages.map((msg, index) => (
                    <div
                        key={index}
                        // Conditionally apply a class for styling our messages vs their messages
                        className={msg.sender === firebaseUser.uid ? 'message sent' : 'message received'}
                    >
                        <p>{msg.message}</p>
                    </div>
                ))}
                {/* This is the invisible div that we scroll to */}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="message-input">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                />
                <button type="submit">Send</button>
            </form>
        </div>
        </>
    );
}