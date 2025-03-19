const GoogleVoice = require("../models/GoogleVoice");
const Mail = require("../models/Mail");
const File = require("../models/File");
const Dump = require("../models/Dump");
const Card = require("../models/Card");
const Account = require("../models/Account");
const Ssn = require("../models/SsnDob");
const Order = require("../models/Orders");
const mongoose = require("mongoose");
const WithdrawRequest = require("../models/WithdrawRequest");

const productMap = {
  gVoice: GoogleVoice,
  mail: Mail,
  file: File,
  dump: Dump,
  card: Card,
  account: Account,
  ssn: Ssn,
};


const getMyProductCount = async (req, res) => {
  const sellerId = req.params.sellerId;
  if (!sellerId)
    return res.status(400).json({ message: "seller id is required" });

  try {
    const productTypeArray = [
      "gVoice",
      "mail",
      "file",
      "dump",
      "card",
      "account",
      "ssn",
    ];
    const products = {};

    await Promise.all(
      productTypeArray.map(async (item) => {
        const ProductModel = productMap[item];

        if (!ProductModel) {
          return;
        }

        const productCount = await ProductModel.countDocuments({
          sellerId: sellerId,
        }).exec();

        if (productCount > 0) {
          products[item] = productCount;
        }

        const soldCount = await ProductModel.countDocuments({
          sellerId: sellerId,
          status: "Sold",
        });

        let totalPrice = 0;

        if (["ssn", "gVoice", "mail"].includes(item)) {
          const soldProducts = await ProductModel.find({
            sellerId: sellerId,
            status: "Sold",
            isPaid: "Not Paid",
          }).populate("price");

          soldProducts.forEach((product) => {
            if (product.price.price) {
              totalPrice += parseFloat(product.price.price);
            }
          });
        } else {
          totalPrice = await ProductModel.aggregate([
            {
              $match: { sellerId: sellerId, status: "Sold", isPaid: "Not Paid" },
            },
            { $group: { _id: null, total: { $sum: "$price" } } },
          ]).then((result) => result[0]?.total ?? 0);
        }

        const product = {
          totalProducts: productCount,
          soldCount,
          totalPrice: totalPrice,
        };

        products[item] = product;
      })
    );

    res.status(200).json(products);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};



const deleteProductById = async (req, res) => {
  const { productId, productType } = req.params;

  if (!productId || !productType)
    return res.status(400).json({ message: "All fields are required" });

  try {
    const productToDelete = await productMap[productType]
      .findById({ _id: productId })
      .lean()
      .exec();

    if (!productToDelete || productToDelete.status === "Sold")
      return res
        .status(400)
        .json({ message: "Bad request, the product was sold or not found" });

    await productMap[productType].findByIdAndDelete({ _id: productId });
    return res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

const updateIspaidStatusToAllSellersProducts = async (req, res) => {
  const sellerId = req.params.sellerId;
  const amount = req.query.amount
  if (!sellerId || !amount)
    return res.status(400).json({ message: "All fields are required" });

  // Create an array of promises to find products in each schema
  const promises = Object.values(productMap).map((Product) =>
    Product.updateMany({ sellerId, status: "Sold" }, { isPaid: "Is Paid" })
  );

  try {
    // Execute all promises in parallel
    await Promise.all(promises);
    await WithdrawRequest.findOneAndUpdate(
      { sellerId: sellerId, status: "Pending" },
      { $set: { status: "Processed", amount: amount } }
    );

    res.status(200).json({ message: "Product status updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message:
        "Something went wrong, Refresh your browser, if the problem persist please contact support",
    });
  }
};

const updateOneProductToIsPaid = async (req, res) => {
  const { productId, productType } = req.params;

  if (!productId || !productMap[productType])
    return res
      .status(400)
      .json({ message: "Product Id is missing or invalid product type" });

  try {
    const updates = {
      isPaid: "Is Paid",
    };
    const product = await productMap[productType].findByIdAndUpdate(
      productId,
      updates,
      { new: true }
    );
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(200).json({ message: "Product updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message:
        "Something went wrong, Refresh your browser, if the problem persist please contact support",
    });
  }
};

const suspendSellerProducts = async (req, res) => {
  const { sellerId } = req.params;

  if (!sellerId) {
    return res.status(400).json({ message: "seller id is required" });
  }

  try {
    const promises = Object.values(productMap).map(ProductModel =>
      ProductModel.updateMany({ status: 'Available', sellerId }, { $set: { status: 'Suspended' } }).exec()
    );

     await Promise.all(promises);

    // results.forEach((res, index) => {
    //   const productType = Object.keys(productMap)[index];
    //   console.log(`${res.nModified} ${productType} products updated`);
    // });

    res.status(200).json({
      message: "Products suspended successfully",
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Something went wrong",
    });
  }
};


const unSuspendSellerProducts = async (req, res) => {
  const { sellerId } = req.params;

  if (!sellerId) {
    return res.status(400).json({ message: "seller id is required" });
  }

  try {
    const promises = Object.values(productMap).map(ProductModel =>
      ProductModel.updateMany({ status: 'Suspended', sellerId }, { $set: { status: 'Available' } }).exec()
    );

     await Promise.all(promises);

    // results.forEach((res, index) => {
    //   const productType = Object.keys(productMap)[index];
    //   console.log(`${res.nModified} ${productType} products updated`);
    // });

    res.status(200).json({
      message: "Products updated successfully",
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Something went wrong",
    });
  }
};


module.exports = {
  getMyProductCount,
  deleteProductById,
  updateIspaidStatusToAllSellersProducts,
  updateOneProductToIsPaid,
  suspendSellerProducts,
  unSuspendSellerProducts
};
