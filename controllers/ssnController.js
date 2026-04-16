const SsnDob = require("../models/SsnDob");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const e = require("express");
const { buildStateFilter } = require("../utils/stateFilterBuilder");

const createSsnDob = async (req, res) => {
  const {
    base,
    firstName,
    lastName,
    sellerId,
    country,
    state,
    city,
    zip,
    dob,
    cs,
    price,
    address,
    ssn,
    description,
  } = req.body;

  if (
    !base ||
    !firstName ||
    !lastName ||
    !country ||
    !sellerId ||
    !state ||
    !city ||
    !zip ||
    !dob ||
    !price ||
    !address ||
    !ssn
  )
    return res.status(400).json({ message: "All fields are required" });

  const ssnObject = {
    base,
    sellerId,
    firstName,
    lastName,
    country,
    state,
    city,
    zip,
    dob,
    cs,
    price,
    address,
    ssn,
    description,
  };

  const ssndob = await SsnDob.create(ssnObject);

  if (ssndob) {
    res.status(201).json({ message: `New ssn file created` });
  } else {
    res.status(400).json({ message: "Invalid ssn data received" });
  }
};

const getAllSsns = asyncHandler(async (req, res) => {
  // Get pagination parameters
  const page = parseInt(req?.query?.page) || 1;
  const perPage = parseInt(req?.query?.perPage) || 20;
  const skip = (page - 1) * perPage;

  // Extract filter parameters
  const { base, state, city, zip, country, dob, dobMax, cs, name, enrollment, twoFa, college, level } = req.query;

  // Build filter object
  const filters = { status: "Available" };

  // Only add non-empty filters
  if (base) filters.base = { $regex: base, $options: "i" };
  if (city) filters.city = { $regex: city, $options: "i" };
  if (country) filters.country = { $regex: country, $options: "i" };
  if (zip) filters.zip = { $regex: zip, $options: "i" };
  if (cs) filters.cs = { $regex: cs, $options: "i" };
  if (name) filters.firstName = { $regex: name, $options: "i" };
  if (enrollment) filters.enrollment = { $regex: enrollment, $options: "i" };
  if (state) {
    Object.assign(filters, buildStateFilter(state));
  }
  if (college) {
    filters.$or = [
      { description: { $regex: college, $options: "i" } },
      { enrollmentDetails: { $regex: college, $options: "i" } }
    ];
  }

  if (level) {
    filters.level = level;
  }

  if (twoFa) {
    // if yes select records where twoFa has value
    if (twoFa === "Yes") {
      filters.twoFa = { $ne: null };
    }
    // if no select records where twoFa is null
    if (twoFa === "No") {
      filters.twoFa = null;
    }
  }

  // Handle date range if provided
  if (dob && dobMax) {
    const startDate = new Date(`${dob}-01-01`);
    const endDate = new Date(`${dobMax}-12-31`);
    filters.dob = { $gte: startDate, $lte: endDate };
  }

  try {
    const devsFilters = { ...filters, sellerId: "theodore" };
    const othersFilters = { ...filters, sellerId: { $ne: "theodore" } };

    const [devsCount, othersCount] = await Promise.all([
      SsnDob.countDocuments(devsFilters),
      SsnDob.countDocuments(othersFilters),
    ]);

    const count = devsCount + othersCount;

    const actualCumulative = (p) => {
      const targetTotal = p * perPage;
      const devsPerPage = Math.ceil(perPage * 0.2);

      let devs = Math.min(p * devsPerPage, devsCount);
      let others = Math.min(targetTotal - devs, othersCount);

      const shortfall = targetTotal - (devs + others);
      if (shortfall > 0) {
        devs = Math.min(devs + shortfall, devsCount);
      }

      return { devs, others };
    };

    const prev = actualCumulative(page - 1);
    const curr = actualCumulative(page);

    const devsSkip = prev.devs;
    const devsLimit = curr.devs - prev.devs;

    const othersSkip = prev.others;
    const othersLimit = curr.others - prev.others;

    const getAggregation = (matchCond, skp, lmt) => {
      if (lmt <= 0) return Promise.resolve([]);
      return SsnDob.aggregate([
        { $match: matchCond },
        { $skip: skp },
        { $limit: lmt },
        {
          $lookup: {
            from: "baseprices",
            localField: "price",
            foreignField: "_id",
            as: "price",
          },
        },
        {
          $project: {
            // Required fields
            firstName: 1,
            dobYear: { $year: "$dob" },
            state: 1,
            zip: 1,
            description: 1,

            // Boolean flags for other fields retrun false if empty string or null
            lastName: {
              $cond: [{ $ifNull: ["$lastName", false] }, true, false],
            },
            country: { $cond: [{ $ifNull: ["$country", false] }, true, false] },
            email: { $cond: [{ $ifNull: ["$email", false] }, true, false] },
            emailPass: {
              $cond: [{ $ifNull: ["$emailPass", false] }, true, false],
            },
            faUname: { $cond: [{ $ifNull: ["$faUname", false] }, true, false] },
            faPass: { $cond: [{ $ifNull: ["$faPass", false] }, true, false] },
            backupCode: {
              $cond: [{ $ifNull: ["$backupCode", false] }, true, false],
            },
            securityQa: {
              $cond: [{ $ifNull: ["$securityQa", false] }, true, false],
            },
            address: { $cond: [{ $ifNull: ["$address", false] }, true, false] },
            ssn: { $cond: [{ $ifNull: ["$ssn", false] }, true, false] },
            city: { $cond: [{ $ifNull: ["$city", false] }, true, false] },
            gender: { $cond: [{ $ifNull: ["$gender", false] }, true, false] },
            cs: { $cond: [{ $ifNull: ["$cs", false] }, true, false] },
            twoFa: { $cond: [{ $ifNull: ["$twoFa", false] }, true, false] },
            enrollment: 1,
            enrollmentDetails: 1,

            // Price information
            price: { $arrayElemAt: ["$price", 0] },
          },
        },
        { $sort: { firstName: 1 } },
      ]).exec();
    };

    const [devsSsns, othersSsns] = await Promise.all([
      getAggregation(devsFilters, devsSkip, devsLimit),
      getAggregation(othersFilters, othersSkip, othersLimit),
    ]);

    const ssns = [...devsSsns, ...othersSsns];

    console.log("devsSsns", devsSsns.length);
    console.log("othersSsns", othersSsns.length);

    // Mix the products to ensure 'theodore' products are distributed 
    // rather than clustered at the very beginning of the results.
    for (let i = ssns.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ssns[i], ssns[j]] = [ssns[j], ssns[i]];
    }

    if (!ssns?.length) {
      return res.status(200).json({
        message: "No records found",
        count: 0,
        ssns: [],
      });
    }

    res.json({
      ssns,
      count,
      currentPage: page,
      totalPages: Math.ceil(count / perPage),
    });
  } catch (error) {
    console.error("Error fetching SSNs:", error);
    res
      .status(500)
      .json({ message: "Error fetching records", error: error.message });
  }
});

const getAllSsnsAdmin = asyncHandler(async (req, res) => {
  // Get pagination parameters
  const page = parseInt(req?.query?.page) || 1;
  const perPage = parseInt(req?.query?.perPage) || 20;
  const skip = (page - 1) * perPage;

  // Extract filter parameters
  const { base, status, sellerId, paid, fromDate, toDate } = req.query;

  // Build filter object
  const filters = {};

  // Only add non-empty filters
  if (base) filters.price = base;
  if (sellerId) filters.sellerId = sellerId;
  if (status) filters.status = status;
  if (paid) filters.isPaid = paid;
  if (fromDate) {
    filters.createdAt = { $gte: new Date(fromDate) };
  }
  if (toDate) {
    filters.createdAt = { $lte: new Date(toDate) };
  }

  try {
    const [ssns, count] = await Promise.all([
      SsnDob.find(filters)
        .skip(parseInt(skip))
        .limit(parseInt(perPage))
        .populate("price")
        .populate("buyerId", "userName")
        .sort({ purchaseDate: -1, createdAt: -1 }) // if status is Sold sort by purchasedAt else sort by createdAt
        .lean()
        .exec(),
      SsnDob.countDocuments(filters),
    ]);

    if (!ssns?.length) {
      return res.status(200).json({
        message: "No records found",
        count: 0,
        ssns: [],
      });
    }

    res.json({
      ssns,
      count,
      currentPage: page,
      totalPages: Math.ceil(count / perPage),
    });
  } catch (error) {
    console.error("Error fetching SSNs:", error);
    res
      .status(500)
      .json({ message: "Error fetching records", error: error.message });
  }
});

const getAllSsnsBySellerId = asyncHandler(async (req, res) => {
  const sellerId = req.params.sellerId;

  if (!sellerId)
    return res.status(400).json({ message: "seller id is required" });

  const page = req?.query?.page || 1;
  const perPage = req?.query?.perPage || 20;
  const skip = (page - 1) * parseInt(perPage);

  const { status, isPaid } = req.query;

  const filters = {
    sellerId: sellerId,
    status: { $regex: status, $options: "i" },
    isPaid: { $regex: isPaid, $options: "i" },
  };

  const [ssns, count] = await Promise.all([
    SsnDob.find(filters)
      .populate("price")
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(parseInt(perPage))
      .lean()
      .exec(),
    SsnDob.countDocuments(filters),
  ]);

  if (!ssns?.length) {
    return res.status(200).json({ message: "No files found" });
  }

  res.json({ ssns, count });
});

const updateSellerProductStatus = async (req, res) => {
  const { sellerId, status } = req.body;
  if (!sellerId || !status) {
    return res
      .status(400)
      .json({ message: "sellerId and status are required" });
  }
  try {
    await User.findOneAndUpdate(
      { jabberId: sellerId },
      {
        productStatus: status,
      }
    );

    await SsnDob.updateMany(
      {
        sellerId: sellerId,
        status: { $in: ["Available", "Suspended"] },
      },
      { $set: { status: status } }
    );

    res.status(200).json({
      message: `Seller product status updated to ${status}`,
    });
  } catch (error) {
    console.error("Error updating seller product status:", error);
    res.status(500).json({
      message: "Error updating seller product status",
      // error: error.message,
    });
  }
};

const deleteProducts = async (req, res) => {
  const { productIds } = req.body;

  if (!Array.isArray(productIds) || productIds.length === 0) {
    return res
      .status(400)
      .json({ message: "productIds must be a non-empty array." });
  }

  try {
    const result = await SsnDob.deleteMany({ _id: { $in: productIds } });

    return res.status(200).json({
      message: "Orders deleted permanently.",
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error("Error deleting orders:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
};

const updateSsnDobIsValid = async (products) => {
  try {
    const minNum = process.env.MIN_NUM_FOR_VALIDATION || 3;
    console.log("products", products);
    const productIds = products?.filter((item) => item.sellerId !== "theodore").map((item) => item.productId); // filter out product.sellerId === "theodore"

    console.log("productIds", productIds);

    if (productIds?.length < minNum) {
      return true;
    }
    // only 10 percent of the cart products should be marked as validated
    const validatedProducts = productIds.slice(0, Math.ceil(productIds.length * 0.1));

    await SsnDob.updateMany({ _id: { $in: validatedProducts } }, { $set: { isValid: "validated" } });
    return true;
  } catch (error) {
    console.error("Error updating orders:", err);
    return false;
  }
}

module.exports = {
  createSsnDob,
  getAllSsns,
  getAllSsnsBySellerId,
  updateSellerProductStatus,
  getAllSsnsAdmin,
  deleteProducts,
  updateSsnDobIsValid
};
