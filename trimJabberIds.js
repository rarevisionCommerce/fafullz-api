require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/dbConn');
const User = require('./models/User');
const Support = require('./models/Support');

const trimJabberIds = async () => {
    try {
        console.log('[INIT] Starting script to trim spaces from all jabberIds in User and Support models...\n');

        // Connect to MongoDB
        await connectDB();

        // 1. Process Users
        console.log('[INFO] Processing User model...');
        const usersWithSpaces = await User.find({ jabberId: { $regex: /\s/ } });
        console.log(`[INFO] Found ${usersWithSpaces.length} user(s) with spaces in their jabberId.`);
        
        let usersUpdated = 0;
        for (const user of usersWithSpaces) {
            if (user.jabberId) {
                user.jabberId = user.jabberId.replace(/\s+/g, '');
                await user.save();
                usersUpdated++;
            }
        }
        console.log(`[SUCCESS] Successfully updated ${usersUpdated} user(s).\n`);

        // 2. Process Support
        console.log('[INFO] Processing Support model...');
        const supportsWithSpaces = await Support.find({ jabberId: { $regex: /\s/ } });
        console.log(`[INFO] Found ${supportsWithSpaces.length} support record(s) with spaces in their jabberId.`);
        
        let supportUpdated = 0;
        for (const support of supportsWithSpaces) {
            if (support.jabberId) {
                support.jabberId = support.jabberId.replace(/\s+/g, '');
                await support.save();
                supportUpdated++;
            }
        }
        console.log(`[SUCCESS] Successfully updated ${supportUpdated} support record(s).\n`);

        console.log('[COMPLETE] Script finished successfully.');

    } catch (error) {
        console.error('[ERROR] An error occurred during jabberId trimming:', error);
    } finally {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
            console.log('[INFO] Database connection closed.');
        }
        process.exit(0);
    }
};

// Run the function
trimJabberIds();
