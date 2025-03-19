const mongoose = require("mongoose");

const cardSchema = new mongoose.Schema({
  sellerId: {
    type: String,
    required: true,
  },
  bin: { type: String, required: true },
  name: { type: String, required: true },
  country: { type: String, required: true },
  state: { type: String, required: false },
  city: { type: String, required: false },
  price: { type: Number, required: true },
  bank: { type: String, required: false },
  dob: { type: String, required: false },
  address: { type: String, required: true },
  ssn: { type: String, required: false },
  classz: { type: String, required: true },
  level: { type: String, required: true },
  exp: { type: String, required: true },
  zip: { type: String, required: false },
  dl: { type: String, required: false },
  mmn: { type: String, required: false },
  ip: { type: String, required: false },
  ccnum: { type: String, required: true },
  cvv: { type: String, required: true },
  phone: { type: String, required: false },
  email: { type: String, required: false },
  password: { type: String, required: false },
  type: { type: String, required: false },
  status: { type: String, default: "Available" },
  isPaid: { type: String, default: "Not Paid" },
  productType: { type: String, default: "card" },
  purchaseDate: { type: Date, required: false },



},{
  timestamps:true
});

const Card = mongoose.model("Card", cardSchema);

module.exports = Card;
