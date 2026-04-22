const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    jabberId: {
      type: String,
      required: false,
      set: v => v ? v.replace(/\s+/g, '') : v,
      trim: true,
    },
    userName: {
      type: String,
      required: true,
      // trim
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    accountType: {
      type: String,
      required: false,
    },
    roles: [
      {
        type: String,
        default: "Buyer",
      },
    ],
    categories: [
      {
        type: String,
      },
    ],
    status: {
      type: String,
      default: "Active",
    },
    productStatus: {
      type: String,
      default: "Available",
    },
    accountType: {
      type: String,
      default: "web",
    },
    totalPaid: {
      type: Number,
      default: 0,
    },
    totalProfit: {
      type: Number,
      default: 0,
    },
    totalDeposited: {
      type: Number,
      default: 0,
    },
    

    refreshToken: String,
  },

  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
