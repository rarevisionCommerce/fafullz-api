const mongoose = require("mongoose");

const adminSettingsSchema = new mongoose.Schema({
  isOfferActive: {
    type: Boolean,
    default: false,
  },
  offerName: {
    type: String,
    required: false,
  },
  offerAmount: {
    type: Number,
    default: 0,
  },
});

const AdminSettings = mongoose.model("AdminSettings", adminSettingsSchema);
module.exports = AdminSettings;
