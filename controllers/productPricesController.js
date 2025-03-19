const ProductPrices = require("../models/ProductPrices");

const setProductPrice = async (req, res) => {
  const { productType, price } = req.body;

  if (!productType || !price)
    return res.status(400).json({ message: "All fields are required" });

  try {
    const product = await ProductPrices.findOne({
      productType: productType,
    }).exec();

    if (product) {
      product.price = price;
      await product.save();
      res.status(200).json({ message: "Product price updated successfully" });

    } else {
      await ProductPrices.create(req.body);
      res.status(200).json({ message: "Product price added successfully" });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

const getProductPrice = async (req, res) => {
  const { productType } = req.params;

  if (!productType)
    return res.status(400).json({ message: "product type is required" });
  try {
    const product = await ProductPrices.findOne({
      productType: productType,
    })
      .lean()
      .exec();

    if (!product) {
      res.status(201).json({ message: `No product type-${productType} found` });
    } else {
      res.status(200).json(product);
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

const getAllProductPrices = async (req, res) => {
  try {
    const products = await ProductPrices.find().lean().exec();
    if (!products.length) {
      res.status(201).json({ message: `No product type found` });
    } else {
      res.status(200).json(products);
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

module.exports = {
  setProductPrice,
  getProductPrice,
  getAllProductPrices
};
