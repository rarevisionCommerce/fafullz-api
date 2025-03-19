const GoogleVoice = require("../models/GoogleVoice");
const Mail = require("../models/Mail");
const File = require("../models/File");
const Dump = require("../models/Dump");
const Card = require("../models/Card");
const Account = require("../models/Account");
const Ssn = require("../models/SsnDob");
const User = require("../models/User");

const productMap = {
  gVoice: GoogleVoice,
  mail: Mail,
  file: File,
  dump: Dump,
  card: Card,
  account: Account,
  ssn: Ssn,
};

const getADminDashData = async (req, res) => {
  try {
    const [totalBuyers, totalSellers, totalAdmins] = await Promise.all([
      User.countDocuments({ roles: { $in: ["Buyer"] } }),
      User.countDocuments({ roles: { $in: ["Seller"] } }),
      User.countDocuments({ roles: { $in: ["Admin"] } }),
    ]);

    let totalProducts = 0;
    let totalSoldProducts = 0;
    let totalSold = 0;

    for (const [key, value] of Object.entries(productMap)) {
      const productCount = await value.countDocuments();
      const soldProductCount = await value.countDocuments({ status: "Sold" });

      let soldProducts = [];

      if (["ssn", "gVoice", "mail"].includes(key)) {
        soldProducts = await value
          .find({
            status: "Sold",
          })
          .populate("price");
      } else {
        soldProducts = await value.find({
          status: "Sold",
        });
      }

      totalProducts += productCount;
      totalSoldProducts += soldProductCount;

      if (soldProducts.length > 1) {
        soldProducts.forEach((product) => {
          totalSold +=
            parseFloat(product.price.price) || parseFloat(product.price) || 0;
        });
      }
    }

    const totalProfit = totalSold * 0.3;
    res.status(200).json({
      totalBuyers,
      totalSellers,
      totalAdmins,
      totalProducts,
      totalSoldProducts,
      totalProfit,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Something went wrong, if the problem persists contact support",
    });
  }
};

module.exports = {
  getADminDashData,
};
