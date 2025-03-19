const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema({
  sellerId: {
    type: String,
    required: true,
  },
  category: { type: String, required: true },
  country: { type: String, required: true },
  state: { type: String, required: true },
  description: { type: String, required: false },
  price: { type: Number, required: true },
  size: { type: String, required: false },
  purchaseDate: { type: Date, required: false },
  filePath: { type: String, required: true },
  status: { type: String, default: "Available" },
  isPaid: { type: String, default: "Not Paid" },
  productType: { type: String, default: "account" },


},{
  timestamps:true
});

const Account = mongoose.model("Account", accountSchema);

module.exports = Account;
