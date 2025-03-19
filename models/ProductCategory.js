const mongoose = require("mongoose");

const productCategorySchema = new mongoose.Schema(
  {
    productType: { type: String, required: true },
    categories: [
      {
        category: {
          type: String,
          required: true,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("ProductCategory", productCategorySchema);
