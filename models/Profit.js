const mongoose = require("mongoose");

const profitSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
  },

  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Profit", profitSchema);
