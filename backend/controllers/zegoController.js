// controllers/zegoController.js
const { generateToken04 } = require('./zegoTokenHelper');
const generateZegoToken = (req, res) => {
    try {
        const { userID, roomID, userName } = req.body;
        const appID = parseInt(process.env.ZEGO_APP_ID);
        const serverSecret = process.env.ZEGO_SERVER_SECRET;
        const effectiveTimeInSeconds = 3600;

        if (!userID || !roomID || !userName)
            return res.status(400).json({ success: false, message: 'Missing required fields' });

        const payloadObject = {
            room_id: roomID.toString(), // Please modify to the user's roomID
            // The token generated in this example allows loginRoom.
            // The token generated in this example does not allow publishStream.
            privilege: {
                1: 1,   // loginRoom: 1 pass , 0 not pass
                2: 0    // publishStream: 1 pass , 0 not pass
            },
            stream_id_list: null
        }; // 
        const payload = JSON.stringify(payloadObject);
        const userId = userID.toString(); // Ensure userID is a string
        console.log('Generating Zego token:', appID,userId,serverSecret, effectiveTimeInSeconds, payload);
        const kitToken =  generateToken04(appID, userId, serverSecret, effectiveTimeInSeconds, payload);

        res.status(200).json({ success: true, kitToken });
    } catch (err) {
        console.error('❌ Token generation error:', err);
        res.status(500).json({
            success: false,
            message: err.errorMessage || err.message || 'Internal server error'
        });
    }
};

module.exports = { generateZegoToken };
