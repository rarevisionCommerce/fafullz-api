const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    jabberId: {
      type: String,
      required: false,
    },
    userName: {
      type: String,
      required: true,
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

    refreshToken: String,
  },

  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
