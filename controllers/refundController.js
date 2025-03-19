const GoogleVoice = require("../models/GoogleVoice");
const Mail = require("../models/Mail");
const File = require("../models/File");
const Dump = require("../models/Dump");
const Card = require("../models/Card");
const Account = require("../models/Account");
const Ssn = require("../models/SsnDob");
const Refund = require("../models/Refund");
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

const processRefund = async (req, res) => {
  const { refundId, action } = req.body;

  if (!refundId || !action)
    return res.status(400).json({ message: "All fields are required" });
  const refund = await Refund.findById(refundId).exec();

  if (!refund) return res.status(404).json({ message: "refund not found" });
  if (refund.status)
    return res.status(400).json({ message: "refund already processed" });

  const payment = await Payment.findOne({ userId: refund?.buyerId }).exec();
  if (!payment) return res.status(404).json({ message: "payment not found" });
  
  const product = await productMap[refund?.productType].findById(refund?.productId).exec();
  if (!product) return res.status(404).json({ message: "product not found" });

  try {
    if (action === "Approved") {

      // Update the payment balance and add a refund transaction
      const bal = payment.balance;
      const newBalance = parseFloat(bal) + parseFloat(refund?.amount);
      const refundTransaction = {
        id: Math.random().toString(36).substring(6).toUpperCase(),
        status: "Approved",
        date: new Date().toISOString().slice(0, 10),
        wallet: "Refund",
        coin: "--",
        amount: refund?.amount,
      };

      refund.status = "Approved";
      product.status ='Disputed';
      payment.balance = newBalance;
      payment.transaction.push(refundTransaction);
    } else {
      // Update the payment balance and add a refund transaction
      const refundTransaction = {
        id: Math.random().toString(36).substring(6).toUpperCase(),
        status: "Declined",
        date: new Date().toISOString().slice(0, 10),
        wallet: "Refund",
        coin: "--",
        amount: 0.0,
      };
      refund.status = "Declined";
      payment.transaction.push(refundTransaction);
    }

    await refund.save();
    await payment.save();
    await product.save();

    res.status(200).json({ message: "Refund processed!" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

const addRefund = async (req, res) => {
  const {
    productType,
    productId,
    ipAddress,
    screenshotLink,
    description,
    buyerId,
    amount,
  } = req.body;

  if (
    !productType ||
    !productId ||
    !ipAddress ||
    !screenshotLink ||
    !description ||
    !buyerId ||
    !amount
  )
    return res.status(400).json({ message: "All fields are required" });

  try {
    const productRefundDuplicate = await Refund.findOne({
      productId: productId,
    })
      .lean()
      .exec();

    if (productRefundDuplicate)
      return res
        .status(400)
        .json({ message: "You already have a pending refund on this product" });

    const refund = await Refund.create(req.body);

    if (!refund) return res.status(400).json({ message: "Bad refund data" });

    res.status(201).json({ message: "Refund sent" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

const getAllRefunds = async (req, res) => {
  const page = req?.query?.page || 1;
  const perPage = req?.query?.perPage || 20;
  const userName = req?.query?.userName;
  const skip = (page - 1) * parseInt(perPage);

  const filters = {
    userName: { $regex: userName, $options: "i" },
  };

  const [refunds, count] = await Promise.all([
    Refund.find(filters)
      .skip(skip)
      .limit(parseInt(perPage))
      .sort({ isRead: -1, })
      .lean()
      .exec(),
    Refund.countDocuments(filters),
  ]);

  if (!refunds?.length) {
    return res.status(200).json({ message: "No refunds found" });
  }

  res.json({ refunds, count });
};

const getOneRefund = async (req, res) => {
  const { refundId } = req.params;

  if (!refundId)
    return res.status(400).json({ message: "refund id is required" });

  try {
    const refund = await Refund.findById(refundId).exec();

    if (!refund) return res.status(404).json({ message: "no refund found" });

    if (refund?.isRead === "unread") {
      refund.isRead = "read";
      await refund.save();
    }

    const product = await productMap[refund?.productType].findById(refund?.productId).lean().exec();


    res.status(200).json({refund, product});
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "something went wrong" });
  }
};

const getOneProduct = async (req, res) => {
  const { productId } = req.params;
  const productType = req.params.productType;

  if (!productId || !productType)
    return res.status(400).json({ message: "product id and product type are required" });

  try {
    // TODO: some products do not require population
    const product = await productMap[productType].findById(productId).populate('price').lean().exec();

    if (!product) return res.status(404).json({ message: "no product found" });


    res.status(200).json(product);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "something went wrong" });
  }
};

const countUnreadRefunds = async(req, res) => {
  try {
    const count = await Refund.countDocuments({isRead: "unread"}).exec();
    res.status(200).json(count);
    
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "something went wrong" });
    
  }
}


module.exports = {
    addRefund,
    processRefund,
    getAllRefunds,
    getOneRefund,
    getOneProduct,
    countUnreadRefunds
}

