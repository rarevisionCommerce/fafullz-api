require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/dbConn');
const SsnDob = require('./models/SsnDob');

// Define default config and pull from env
const REASSIGN_LIMIT = parseInt(process.env.REASSIGN_LIMIT, 10) || 30;
const AVAILABLE_THRESHOLD = parseInt(process.env.AVAILABLE_THRESHOLD, 10) || 10000;
const TARGET_SELLER_ID = 'theodore';

const runReassignment = async () => {
    try {
        console.log(`[INIT] Starting script to reassign ${REASSIGN_LIMIT} SsnDobs per eligible seller to "${TARGET_SELLER_ID}"...`);
        console.log(`[INIT] Eligibility threshold: Sellers with > ${AVAILABLE_THRESHOLD} "Available" SsnDobs.\n`);

        // Connect to MongoDB using the exact configuration used by the API
        await connectDB();

        // 1. Find sellers with 'Available' status count greater than 10k
        const eligibleSellers = await SsnDob.aggregate([
            { $match: { status: "Available" } },
            { $group: { _id: "$sellerId", count: { $sum: 1 } } },
            { $match: { count: { $gt: AVAILABLE_THRESHOLD } } }
        ]);

        if (!eligibleSellers || eligibleSellers.length === 0) {
            console.log(`[INFO] No sellers found with more than ${AVAILABLE_THRESHOLD} available SsnDobs.`);
            return;
        }

        console.log(`[INFO] Found ${eligibleSellers.length} eligible seller(s). Processing...\n`);

        // 2. Iterate each eligible seller
        let totalReassigned = 0;

        for (const seller of eligibleSellers) {
            const currentSellerId = seller._id;

            // Obviously skip if the seller is already the target seller
            if (currentSellerId === TARGET_SELLER_ID) {
                console.log(`[SKIP] Skipping seller "${currentSellerId}" because it is the target destination.`);
                continue;
            }

            console.log(`[INFO] Processing seller: "${currentSellerId}" (Current available count: ${seller.count})`);

            // Fetch IDs of X 'Available' items to reassign using native collection
            // to bypass Mongoose string casting (in case sellerId is stored as ObjectId in DB)
            const docsToUpdate = await SsnDob.collection.find({ sellerId: currentSellerId, status: "Available" })
                .limit(REASSIGN_LIMIT)
                .project({ _id: 1 })
                .toArray();

            const docIds = docsToUpdate.map(doc => doc._id);

            // Reassign them
            if (docIds.length > 0) {
                const result = await SsnDob.updateMany(
                    { _id: { $in: docIds } },
                    { $set: { sellerId: TARGET_SELLER_ID } }
                );

                console.log(`[SUCCESS] Reassigned ${result.modifiedCount} SsnDobs from "${currentSellerId}" to "${TARGET_SELLER_ID}".`);
                totalReassigned += result.modifiedCount;
            } else {
                console.log(`[WARN] No available SsnDobs found to update for "${currentSellerId}" during reassignment phase.`);
            }
        }

        console.log(`\n[COMPLETE] Script finished successfully. Total SsnDobs reassigned: ${totalReassigned}`);

    } catch (error) {
        console.error('[ERROR] An error occurred during reassignment:', error);
    } finally {
        // Always ensure we close the DB connection
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
            console.log('[INFO] Database connection closed.');
        }
        process.exit(0);
    }
};

// Run the function
runReassignment();
