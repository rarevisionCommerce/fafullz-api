const SsnDob = require("../models/SsnDob");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");

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
  const { base, state, city, zip, country, dob, dobMax, cs, name } = req.query;

  // Build filter object
  const filters = { status: "Available" };

  // Only add non-empty filters
  if (base) filters.base = { $regex: base, $options: "i" };
  if (city) filters.city = { $regex: city, $options: "i" };
  if (country) filters.country = { $regex: country, $options: "i" };
  if (zip) filters.zip = { $regex: zip, $options: "i" };
  if (state) filters.state = { $regex: state, $options: "i" };
  if (cs) filters.cs = { $regex: cs, $options: "i" };
  if (name) filters.firstName = { $regex: name, $options: "i" };

  // Handle date range if provided
  if (dob && dobMax) {
    const startDate = new Date(`${dob}-01-01`);
    const endDate = new Date(`${dobMax}-12-31`);
    filters.dob = { $gte: startDate, $lte: endDate };
  }

  try {
    const [ssns, count] = await Promise.all([
      SsnDob.aggregate([
        { $match: filters },
        { $skip: skip }, // Proper pagination implementation
        { $limit: perPage },
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

            // Boolean flags for other fields
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

            // Price information
            price: { $arrayElemAt: ["$price", 0] },
          },
        },
        { $sort: { firstName: 1 } },
      ]).exec(),
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

const getAllSsnsAdmin = asyncHandler(async (req, res) => {
  // Get pagination parameters
  const page = parseInt(req?.query?.page) || 1;
  const perPage = parseInt(req?.query?.perPage) || 20;
  const skip = (page - 1) * perPage;

  // Extract filter parameters
  const { base, status, sellerId, paid } = req.query;

  // Build filter object
  const filters = {};

  // Only add non-empty filters
  if (base) filters.price = base;
  if (sellerId) filters.sellerId = sellerId;
  if (status) filters.status = status;
  if (paid) filters.isPaid = paid;

  try {
    const [ssns, count] = await Promise.all([
      SsnDob.find(filters)
        .skip(parseInt(skip))
        .limit(parseInt(perPage))
        .populate("price")
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

module.exports = {
  createSsnDob,
  getAllSsns,
  getAllSsnsBySellerId,
  updateSellerProductStatus,
  getAllSsnsAdmin,
  deleteProducts
};
