// --- START OF FILE jitsiRoutes.js ---

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { protect } = require('../middleware/authMiddleware');

router.post('/token', protect, (req, res) => {
    const user = req.user;
    const { roomName } = req.body;

    if (!roomName) {
        return res.status(400).json({ message: 'Room name is required' });
    }

    // --- CORRECTED JITSI JWT PAYLOAD AND OPTIONS ---
    const payload = {
        context: {
            user: {
                id: user._id.toString(),
                name: user.username,
                email: user.email,
            }
        },
        // Features must be a top-level claim
        features: {
            "prejoin-enabled": false,
            "chat-enabled": true,
            "invite-enabled": true,
            "raise-hand-enabled": true,
            "reactions-enabled": true
        },
        aud: 'jitsi-meet',
        iss: process.env.JITSI_APP_ID, // Your Jitsi App ID (e.g., 'vpaas-magic-cookie-...')
        sub: 'meet.jitsi.si', // The domain of your Jitsi instance
        room: roomName,
        moderator: true, 
        exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour expiration
    };

    const jwtOptions = {
        algorithm: 'RS256', // Must be RS256 for key-based authentication
        header: {
            // The 'kid' (Key ID) is your Jitsi App ID
            kid: process.env.JITSI_APP_ID 
        }
    };

    try {
        // IMPORTANT: The private key from .env needs newlines correctly formatted
        const privateKey = process.env.JITSI_APP_SECRET.replace(/\\n/g, '\n');
        
        // Sign the token with the private key and correct options
        const token = jwt.sign(payload, privateKey, jwtOptions);
        res.json({ token });
    } catch (error) {
        console.error("Error signing Jitsi JWT:", error);
        res.status(500).json({ message: "Could not generate call token." });
    }
});

module.exports = router;