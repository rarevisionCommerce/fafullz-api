const Cart = require("../models/Cart");
const GoogleVoice = require("../models/GoogleVoice");
const Mail = require("../models/Mail");
const File = require("../models/File");
const Dump = require("../models/Dump");
const Card = require("../models/Card");
const Account = require("../models/Account");
const Ssn = require("../models/SsnDob");
const Order = require("../models/Orders");
const mongoose = require("mongoose");
const Payment = require("../models/Payment");

const productMap = {
  gVoice: GoogleVoice,
  mail: Mail,
  file: File,
  dump: Dump,
  card: Card,
  account: Account,
  ssn: Ssn,
};

const checkoutProducts = async (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ message: "user id is required" });

  try {
    const cart = await Cart.findOne({ userId: userId }).exec();

    if (!cart || cart?.products?.length < 1) {
      return res.status(404).json({ message: "Cart is empty" });
    }

    // Find the payment document for the user
    const payment = await Payment.findOne({ userId: userId }).exec();

    if (!payment) {
      return res.status(404).json({ message: "Insufficient balance!" });
    }
    const balance = payment.balance;

    const totalPrice = await findTotalCartPrice(userId);

    if (parseFloat(balance) < parseFloat(totalPrice)) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    // Check if order exists
    let order = await Order.findOne({ userId: userId });

    if (!order) {
      order = new Order({ userId: userId, products: [] });
    }

    await Promise.all(
      cart.products.map(async (item) => {
        let product = await productMap[item.productType].findById(
          mongoose.Types.ObjectId(item.productId)
        );

        order.products.push({
          productId: item.productId,
          productType: item.productType,
        });

        // update product status
        product.status = "Sold";
        product.purchaseDate = new Date().toISOString();
        await product.save();
      })
    );

    // Save the updated order and cart
    cart.products = [];
    const newBalance = parseInt(balance) - totalPrice;
    payment.balance = newBalance;
    await Promise.all([order.save(), cart.save(), payment.save()]);

    res.status(200).json({ message: "Order sent successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

const getMyOrders = async (req, res) => {
  const userId = req.params.userId;
  if (!userId) return res.status(400).json({ message: "user id is required" });

  try {
    const order = await Order.findOne({ userId: userId }).lean().exec();

    if (!order || order?.products?.length < 1) {
      return res.status(404).json({ message: "You have no order" });
    }

    const products = {};

    await Promise.all(
      order.products.map(async (item) => {
        const productId = mongoose.Types.ObjectId(item.productId);
        const productType = item.productType;
        const ProductModel = productMap[productType];

        if (!ProductModel) {
          return;
        }

        const product = await ProductModel.findById(productId)
          .sort({ updatedAt: -1 })
          .lean()
          .exec();

        if (!product) {
          return;
        }

        if (!products[productType]) {
          products[productType] = [];
        }

        products[productType].push(product);
      })
    );

    res.status(200).json(products);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

const findTotalCartPrice = async (userId) => {
  let totalprice = 0;
  const cart = await Cart.findOne({ userId: userId }).lean().exec();

  if (!cart) return totalprice;

  await Promise.all(
    cart.products.map(async (item) => {
      let something;
      if (
        item.productType === "gVoice" ||
        item.productType === "ssn" ||
        item.productType === "mail"
      ) {
        // Handle gVoice, ssn, and mail products that require population
        something = await productMap[item.productType]
          .findById({ _id: item.productId })
          .populate("price");
      } else {
        // Handle products that are not gVoice, ssn, or mail and do not require population
        something = await productMap[item.productType].findById(item.productId);
      }

      if (something.status === "Available") {
        totalprice +=
          parseFloat(something?.price?.price) || parseFloat(something?.price);
      }
    })
  );
  return totalprice;
};

const removeProducts = async (req, res) => {
  const { productIds, userId } = req.body;

  if (!Array.isArray(productIds) || productIds.length === 0 || !userId) {
    return res
      .status(400)
      .json({ message: "productIds must be a non-empty array." });
  }

  try {
    const result = await Order.findOneAndUpdate(
      { userId },
      { $pull: { products: { productId: { $in: productIds } } } }
    );

    return res.status(200).json({
      message: "Products removed from orders successfully.",
      matchedCount: result.matchedCount || result.n,
      modifiedCount: result.modifiedCount || result.nModified,
    });
  } catch (err) {
    console.error("Error removing products from orders:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
};

module.exports = {
  checkoutProducts,
  getMyOrders,
  removeProducts
};
