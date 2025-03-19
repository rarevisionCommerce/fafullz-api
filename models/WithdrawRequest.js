const mongoose = require("mongoose");

const withdrawSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    }, sellerId: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    wallet: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      default: "Pending",
    },
    isRead: {
      type: String,
      default: "unread",
    },
    amount: {
      type: String,
      required: false,
    },

  },

  {
    timestamps: true,
  }
);

module.exports = mongoose.model("WithdrawRequest", withdrawSchema);
