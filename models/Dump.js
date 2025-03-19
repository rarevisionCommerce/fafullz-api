const mongoose = require("mongoose");

const dumpSchema = new mongoose.Schema({
  sellerId: {
    type: String,
    required: true,
  },
  bin: { type: String, required: true },
  country: { type: String, required: true },
  svc: { type: String, required: true },
  bank: { type: String, required: false },
  price: { type: Number, required: true },
  type: { type: String, required: false },
  level: { type: String, required: true },
  track1: { type: String, required: false },
  exp: { type: String, required: false },
  track2: { type: String, required: false },
  status: { type: String, default: "Available" },
  isPaid: { type: String, default: "Not Paid" },
  productType: { type: String, default: "dump" },
  purchaseDate: { type: Date, required: false },




},{
  timestamps:true
});

const Dump = mongoose.model("Dump", dumpSchema);

module.exports = Dump;
