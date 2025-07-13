const crypto = require('crypto');

/**
 * Generate ZegoCloud Kit Token using the official algorithm
 * Based on the official ZegoCloud server assistant library
 * @param {number} appId Your ZegoCloud App ID
 * @param {string} serverSecret Your ZegoCloud Server Secret (32 characters)
 * @param {string} userId The user's unique identifier
 * @param {number} effectiveTimeInSeconds Token validity duration (default: 3600 = 1 hour)
 * @param {string} payload Optional payload for advanced access control
 * @returns {string} The generated Kit Token
 */
function generateToken04(appId, serverSecret, userId, effectiveTimeInSeconds = 3600, payload = '') {
    // Validate inputs
    if (!appId || !serverSecret || !userId) {
        throw new Error('Missing required parameters: appId, serverSecret, or userId');
    }

    if (serverSecret.length !== 32) {
        throw new Error('ServerSecret must be exactly 32 characters long');
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const expireTime = currentTime + effectiveTimeInSeconds;

    // Create token info object according to ZegoCloud specification
    const tokenInfo = {
        app_id: appId,
        user_id: userId,
        nonce: crypto.randomBytes(8).readBigUInt64BE().toString(), // Use BigInt for nonce
        ctime: currentTime,
        expire: expireTime,
        payload: payload || '', // Empty payload for UIKit
    };

    // Convert to JSON string
    const plainText = JSON.stringify(tokenInfo);
    
    // Generate random IV (12 bytes for AES-GCM)
    const iv = crypto.randomBytes(12);
    
    // Create cipher using AES-256-GCM (more secure than CBC)
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(serverSecret), iv);
    
    // Encrypt the plaintext
    let encrypted = cipher.update(plainText, 'utf8');
    cipher.final();
    
    // Get the authentication tag
    const authTag = cipher.getAuthTag();
    
    // Combine encrypted data and auth tag
    const encryptedData = Buffer.concat([encrypted, authTag]);

    // Create the final token structure
    const tokenData = {
        ver: '1',
        iv: iv.toString('base64'),
        content: encryptedData.toString('base64'),
    };

    // Create the final token with '04' prefix
    const token = '04' + Buffer.from(JSON.stringify(tokenData)).toString('base64');

    return token;
}

/**
 * Alternative simpler token generation for UIKit
 * This uses the exact format expected by ZegoUIKitPrebuilt
 */
function generateUIKitToken(appId, serverSecret, userId, effectiveTimeInSeconds = 3600) {
    const currentTime = Math.floor(Date.now() / 1000);
    const expireTime = currentTime + effectiveTimeInSeconds;
    
    // For UIKit, we need a simpler payload structure
    const payload = {
        user_id: userId,
        privilege: {
            1: 1, // Login room privilege
            2: 1, // Publish stream privilege
        },
        stream_id_list: null,
    };

    const tokenInfo = {
        app_id: appId,
        user_id: userId,
        nonce: Math.floor(Math.random() * 4294967295), // Random 32-bit integer
        ctime: currentTime,
        expire: expireTime,
        payload: JSON.stringify(payload),
    };

    const plainText = JSON.stringify(tokenInfo);
    
    // Use AES-256-CBC as in the original ZegoCloud examples
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(serverSecret), iv);
    
    let encrypted = cipher.update(plainText, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    const tokenData = {
        ver: '1',
        iv: iv.toString('base64'),
        content: encrypted.toString('base64'),
    };

    return '04' + Buffer.from(JSON.stringify(tokenData)).toString('base64');
}

const generateZegoToken = (req, res) => {
    try {
        const { userID } = req.body;
        
        // Validate input
        if (!userID) {
            return res.status(400).json({ 
                success: false,
                message: 'userID is required to generate a token' 
            });
        }

        // Get environment variables
        const appId = parseInt(process.env.ZEGO_APP_ID);
        const serverSecret = process.env.ZEGO_SERVER_SECRET;

        // Validate environment variables
        if (!appId || isNaN(appId)) {
            console.error('ZEGO_APP_ID is missing or invalid');
            return res.status(500).json({ 
                success: false,
                message: 'Zego App ID not configured properly' 
            });
        }

        if (!serverSecret) {
            console.error('ZEGO_SERVER_SECRET is missing');
            return res.status(500).json({ 
                success: false,
                message: 'Zego Server Secret not configured' 
            });
        }

        if (serverSecret.length !== 32) {
            console.error('ZEGO_SERVER_SECRET must be exactly 32 characters long');
            return res.status(500).json({ 
                success: false,
                message: 'Zego Server Secret configuration error' 
            });
        }

        // Try the UIKit-specific token generation first
        let kitToken;
        try {
            kitToken = generateUIKitToken(appId, serverSecret, userID);
            console.log('UIKit token generated successfully for user:', userID);
        } catch (error) {
            console.log('UIKit token failed, trying standard token:', error.message);
            // Fallback to standard token generation
            kitToken = generateToken04(appId, serverSecret, userID);
            console.log('Standard token generated successfully for user:', userID);
        }

        // Additional validation - check if token starts with '04'
        if (!kitToken || !kitToken.startsWith('04')) {
            throw new Error('Generated token is invalid');
        }

        res.status(200).json({ 
            success: true,
            kitToken 
        });

    } catch (error) {
        console.error('Error generating Zego token:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error while generating token',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = { generateZegoToken, generateToken04, generateUIKitToken };