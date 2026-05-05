const GoogleVoice = require("../models/GoogleVoice");
const Mail = require("../models/Mail");
const File = require("../models/File");
const Dump = require("../models/Dump");
const Card = require("../models/Card");
const Account = require("../models/Account");
const Ssn = require("../models/SsnDob");
const User = require("../models/User");
const moment = require("moment-timezone");
const SsnDob = require("../models/SsnDob");
const Payment = require("../models/Payment");
const Profit = require("../models/Profit");

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
    const [totalBuyers, totalSellers, totalAdmins, unclearedProfits] =
      await Promise.all([
        User.countDocuments({ roles: { $in: ["Buyer"] } }),
        User.countDocuments({ roles: { $in: ["Seller"] } }),
        User.countDocuments({ roles: { $in: ["Admin"] } }),
        Profit.find({ isCleared: false }),
      ]);

    let totalProducts = 0;
    let totalSoldProducts = 0;
    let totalSold = 0;

    for (const [key, value] of Object.entries(productMap)) {
      const productCount = await value.countDocuments();
      const soldProductCount = await value.countDocuments({
        status: "Sold",
        isPaid: "Not Paid",
      });

      let soldProducts = [];

      if (["ssn", "gVoice", "mail"].includes(key)) {
        soldProducts = await value
          .find({
            status: "Sold",
            isPaid: "Not Paid",
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

    const totalProfit = unclearedProfits.reduce(
      (sum, profit) => sum + profit.amount,
      0,
    );
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

const getDashStats = async (req, res) => {
  try {
    const [totalBalanceResult, topClients, result] = await Promise.all([
      Payment.aggregate([
        {
          $group: {
            _id: null,
            totalBalance: { $sum: "$balance" },
            clientCount: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            totalBalance: 1,
            clientCount: 1,
          },
        },
      ]),
      Payment.aggregate([
        { $sort: { balance: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            username: "$user.userName",
            email: "$user.email",
            balance: 1,
          },
        },
      ]),
      SsnDob.aggregate([
        {
          $group: {
            _id: {
              base: "$price",
              status: "$status",
            },
            count: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: "$_id.base",
            totalCount: { $sum: "$count" },
            statuses: {
              $push: {
                status: "$_id.status",
                count: "$count",
              },
            },
          },
        },
        {
          $addFields: {
            baseObjId: {
              $convert: {
                input: "$_id",
                to: "objectId",
                onError: "$_id",
                onNull: "$_id",
              },
            },
          },
        },
        {
          $lookup: {
            from: "baseprices",
            localField: "baseObjId",
            foreignField: "_id",
            as: "baseDetails",
          },
        },
        {
          $unwind: { path: "$baseDetails", preserveNullAndEmptyArrays: true },
        },
        {
          $project: {
            _id: 0,
            base: { $ifNull: ["$baseDetails.base", "$_id"] },
            totalCount: 1,
            statuses: 1,
          },
        },
      ]),
    ]);

    console.log(totalBalanceResult, topClients, result);

    res.status(200).json({ totalBalanceResult, topClients, result });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

const getSalesData = async (req, res) => {
  try {
    const { filter } = req.query; // 'daily', 'monthly', 'yearly'
    const now = moment().endOf("day");

    let matchStage = { status: "Sold" };
    let groupId = {};
    let dateRange = null;

    if (filter === "daily") {
      // Last 5 days including today
      const startDate = moment().subtract(4, "days").startOf("day");
      matchStage.purchaseDate = {
        $gte: startDate.toDate(),
        $lte: now.toDate(),
      };
      groupId = {
        year: { $year: "$purchaseDate" },
        month: { $month: "$purchaseDate" },
        day: { $dayOfMonth: "$purchaseDate" },
      };

      const sales = await SsnDob.aggregate([
        { $match: matchStage },
        { $group: { _id: groupId, sales: { $sum: 1 } } },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
      ]);

      // format and backfill missing days
      const formattedSales = [];
      for (let i = 4; i >= 0; i--) {
        const d = moment().subtract(i, "days");
        const found = sales.find(
          (s) =>
            s._id.day === d.date() &&
            s._id.month === d.month() + 1 &&
            s._id.year === d.year(),
        );
        formattedSales.push({
          name: d.format("MMM DD"),
          sales: found ? found.sales : 0,
        });
      }
      return res.status(200).json(formattedSales);
    } else if (filter === "monthly") {
      // Current year months
      const currentYear = moment().year();
      matchStage.purchaseDate = {
        $gte: moment().startOf("year").toDate(),
        $lte: now.toDate(),
      };
      groupId = { month: { $month: "$purchaseDate" } };

      const sales = await SsnDob.aggregate([
        { $match: matchStage },
        { $group: { _id: groupId, sales: { $sum: 1 } } },
        { $sort: { "_id.month": 1 } },
      ]);

      // format and backfill 12 months
      const formattedSales = [];
      for (let i = 1; i <= 12; i++) {
        const found = sales.find((s) => s._id.month === i);
        formattedSales.push({
          name: moment()
            .month(i - 1)
            .format("MMM"),
          sales: found ? found.sales : 0,
        });
      }
      return res.status(200).json(formattedSales);
    } else if (filter === "yearly") {
      // Group by year
      groupId = { year: { $year: "$purchaseDate" } };
      const sales = await SsnDob.aggregate([
        { $match: matchStage },
        { $group: { _id: groupId, sales: { $sum: 1 } } },
        { $sort: { "_id.year": 1 } },
      ]);

      const formattedSales = sales.map((s) => ({
        name: String(s._id.year),
        sales: s.sales,
      }));
      return res.status(200).json(formattedSales);
    }

    return res.status(400).json({ message: "Invalid filter parameter" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Something went wrong fetching sales data" });
  }
};

const getProfitData = async (req, res) => {
  try {
    const { filter } = req.query; // 'weekly', 'monthly', 'yearly'
    const now = moment().endOf("day");

    let matchStage = {};
    let groupId = {};

    if (filter === "weekly") {
      // Last 5 weeks including current
      const startDate = moment().subtract(4, "weeks").startOf("isoWeek");
      matchStage.createdAt = { $gte: startDate.toDate(), $lte: now.toDate() };
      groupId = {
        year: { $isoWeekYear: "$createdAt" },
        week: { $isoWeek: "$createdAt" },
      };

      const profits = await Profit.aggregate([
        { $match: matchStage },
        { $group: { _id: groupId, profit: { $sum: "$amount" } } },
        { $sort: { "_id.year": 1, "_id.week": 1 } },
      ]);

      // format and backfill 5 weeks
      const formattedProfits = [];
      for (let i = 4; i >= 0; i--) {
        const w = moment().subtract(i, "weeks");
        const found = profits.find(
          (p) => p._id.week === w.isoWeek() && p._id.year === w.isoWeekYear(),
        );
        formattedProfits.push({
          name: `W${w.isoWeek()}`,
          profit: found ? found.profit : 0,
        });
      }
      return res.status(200).json(formattedProfits);
    } else if (filter === "monthly") {
      // Current year months
      matchStage.createdAt = {
        $gte: moment().startOf("year").toDate(),
        $lte: now.toDate(),
      };
      groupId = { month: { $month: "$createdAt" } };

      const profits = await Profit.aggregate([
        { $match: matchStage },
        { $group: { _id: groupId, profit: { $sum: "$amount" } } },
        { $sort: { "_id.month": 1 } },
      ]);

      // format and backfill 12 months
      const formattedProfits = [];
      for (let i = 1; i <= 12; i++) {
        const found = profits.find((p) => p._id.month === i);
        formattedProfits.push({
          name: moment()
            .month(i - 1)
            .format("MMM"),
          profit: found ? found.profit : 0,
        });
      }
      return res.status(200).json(formattedProfits);
    } else if (filter === "yearly") {
      // Group by year
      groupId = { year: { $year: "$createdAt" } };
      const profits = await Profit.aggregate([
        { $match: matchStage },
        { $group: { _id: groupId, profit: { $sum: "$amount" } } },
        { $sort: { "_id.year": 1 } },
      ]);

      const formattedProfits = profits.map((p) => ({
        name: String(p._id.year),
        profit: p.profit,
      }));
      return res.status(200).json(formattedProfits);
    }

    return res.status(400).json({ message: "Invalid filter parameter" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Something went wrong fetching profit data" });
  }
};

const clearAllProfit = async (req, res) => {
  try {
    const result = await Profit.updateMany(
      { isCleared: false },
      { $set: { isCleared: true } },
    );
    res.status(200).json({ message: "All profits cleared successfully" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Something went wrong clearing profit data" });
  }
};

module.exports = {
  getADminDashData,
  getDashStats,
  getSalesData,
  getProfitData,
  clearAllProfit,
};
