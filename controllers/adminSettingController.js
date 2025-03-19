const asyncHandler = require("express-async-handler");
const AdminSettings = require("../models/AdminSettings");
const Payment = require("../models/Payment");

// Get current settings
const getAdminSettings = asyncHandler(async (req, res) => {
  const settings = await AdminSettings.findOne({});
  if (!settings) {
    return res.status(404).json({ message: "Admin settings not found" });
  }
  res.json(settings);
});

// Create or update settings
const updateAdminSettings = asyncHandler(async (req, res) => {
  const { isOfferActive, offerAmount } = req.body;

  let settings = await AdminSettings.findOne({});

  if (!settings) {
    settings = new AdminSettings({ isOfferActive, offerAmount });
  } else {
    settings.isOfferActive = isOfferActive;
    settings.offerAmount = offerAmount;
  }

  await settings.save();
  res.json({ message: "Settings updated successfully", settings });
});

// Delete settings (if needed)
const deleteAdminSettings = asyncHandler(async (req, res) => {
  await AdminSettings.deleteMany({});
  res.json({ message: "Admin settings deleted successfully" });
});

const addFundsOnAccountCreation = async (userId) => {
  try {
    // Fetch admin settings to check if the offer is active
    const settings = await AdminSettings.findOne({});

    if (!settings || !settings.isOfferActive || !settings.offerAmount) {
      console.log("No active offer for new accounts.");
      return;
    }

    const offerAmount = settings.offerAmount;

    // Find or create a payment record for the user
    let payment = await Payment.findOne({ userId });

    if (!payment) {
      payment = new Payment({
        userId,
        balance: offerAmount,
        transaction: [
          {
            status: "completed",
            date: new Date().toISOString(),
            wallet: "Admin Offer",
            coin: "USD",
            amount: offerAmount,
          },
        ],
      });
    } else {
      // Update existing record
      await Payment.updateOne(
        { userId },
        {
          $inc: { balance: offerAmount },
          $push: {
            transaction: {
              status: "completed",
              date: new Date().toISOString(),
              wallet: "Fafullz Offer",
              coin: "USD",
              amount: offerAmount,
            },
          },
        }
      );
    }

    await payment.save();
    console.log(`Added ${offerAmount} to user ${userId}`);
  } catch (error) {
    console.error("Error adding funds on account creation:", error);
  }
};

module.exports = {
  getAdminSettings,
  updateAdminSettings,
  deleteAdminSettings,
  addFundsOnAccountCreation,
};
