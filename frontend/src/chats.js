import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './context/AuthContext';
export default function ShowChats ({setreceiver}){
    const { mongoUser } = useAuth();
    const [chats, setChats] = useState([]);
    
    useEffect(() => {
        const fetchChats = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/chats', {
                    headers: {
                        Authorization: `Bearer ${mongoUser.token}`
                    }
                });
                setChats(response.data);
            } catch (error) {
                console.error('Error fetching chats:', error);
            }
        };
        fetchChats();
    }, [mongoUser.token]);

    return (
        <div className="chat-list">
            <h2>Chats</h2>
            <ul>
                {chats.map(chat => (
                    <li key={chat._id} onClick={() => setreceiver(chat.receiver)}>
                        {chat.receiver.username}
                    </li>
                ))}
            </ul>
        </div>
    );
}