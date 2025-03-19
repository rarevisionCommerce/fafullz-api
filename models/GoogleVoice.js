const mongoose = require('mongoose')


const gSchema = new mongoose.Schema({
    sellerId: {
        type: String,
        required: true,
      },
      email: { type: String, required: true },
      password: { type: String, required: true },
      recoveryMail: { type: String, required: true },
      state: { type: String, required: false },
      price: { type: mongoose.Schema.Types.ObjectId,
         ref: "ProductPrices",
         required: true
         },
      status: { type: String, default: "Available" },
      isPaid: { type: String, default: "Not Paid" },
      productType: { type: String, default: "gVoice" },
      purchaseDate: { type: Date, required: false },




})

const GoogleVoice = mongoose.model('GoogleVoice', gSchema)

module.exports = GoogleVoice