const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      ref: "User",
    },
    balance: {
      type: Number,
      required: true,
    },
    transaction: [
      {
        id: { type: String },
        status: { type: String },
        date: { type: String },
        wallet: { type: String, required: true },
        coin: { type: String, required: true },
        amount: { type: Number, required: true },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = Payment;
