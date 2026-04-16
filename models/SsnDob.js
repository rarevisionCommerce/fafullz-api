const mongoose = require("mongoose");

const SsnSchema = new mongoose.Schema(
  {
    sellerId: {
      type: String,
      required: true,
    },
    base: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    country: { type: String, default: "USA" },
    email: { type: String, required: false },
    emailPass: { type: String, required: false },
    faUname: { type: String, required: false },
    faPass: { type: String, required: false },
    backupCode: { type: String, required: false },
    securityQa: { type: String, required: false },
    state: { type: String, required: false },
    gender: { type: String, required: false },
    enrollment: { type: String, required: false },
    enrollmentDetails: { type: String, required: false },
    price: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BasePrice",
      required: true,
    },
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    zip: { type: String, required: false },
    dob: { type: Date, required: true },
    address: { type: String, required: true },
    description: { type: String, required: false },
    ssn: { type: String, required: true },
    cs: { type: String, required: false },
    city: { type: String, required: true },
    status: { type: String, default: "Available" },
    isPaid: { type: String, default: "Not Paid" },
    productType: { type: String, default: "ssn" },
    purchaseDate: { type: Date, required: false },
    twoFa: { type: String, default: null },
    level: { type: String, default: null },
    programs: { type: String, default: null },
    isValid: {type: String, default: "valid"}
  },
  {
    timestamps: true,
  }
);

const SsnDob = mongoose.model("SsnDob", SsnSchema);

module.exports = SsnDob;
