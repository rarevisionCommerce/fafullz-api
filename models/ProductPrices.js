const mongoose = require("mongoose");

const productPricesSchema = new mongoose.Schema({
  productType: {
    type: String,
    required: true,
  },
  price: {
    type: String,
    required: true,
  }
},

{
    timestamps:true
}

);

module.exports = mongoose.model('ProductPrices', productPricesSchema);