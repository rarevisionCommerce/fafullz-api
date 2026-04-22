const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "User",
        },
        id: { type: String },
        status: { type: String },
        date: { type: String },
        wallet: { type: String, required: true },
        coin: { type: String, required: true },
        amount: { type: Number, required: true },
    },
    {
        timestamps: true,
    }
);

const Transaction = mongoose.model("Transaction", paymentSchema);

module.exports = Transaction;
