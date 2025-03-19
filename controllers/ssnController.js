const SsnDob = require("../models/SsnDob");
const asyncHandler = require("express-async-handler");

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
  const page = parseInt(req.query.page) || 1;
  const perPage = parseInt(req.query.perPage) || 20;
  const skip = (page - 1) * perPage;

  const { base, state, city, zip, country, dob, dobMax, cs, name } = req.query;

  const filters = { status: "Available" };

  if (base) filters.base = { $regex: base, $options: "i" };
  if (state) filters.state = { $regex: state, $options: "i" };
  if (city) filters.city = { $regex: city, $options: "i" };
  if (zip) filters.zip = { $regex: zip, $options: "i" };
  if (country) filters.country = { $regex: country, $options: "i" };
  if (cs) filters.cs = { $regex: cs, $options: "i" };
  if (name) filters.firstName = { $regex: name, $options: "i" };
  if (dob && dobMax) {
    filters.dob = {
      $gte: new Date(`${dob}-01-01`),
      $lte: new Date(`${dobMax}-12-31`),
    };
  }

  try {
    const [ssns, count] = await Promise.all([
      SsnDob.aggregate([
        { $match: filters },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
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
            firstName: 1,
            dob: { $year: "$dob" }, // Extract only the year
            state: 1,
            zip: 1,
            description: 1,
            otherFieldsExist: {
              $cond: {
                if: { $gt: [{ $size: { $objectToArray: "$$ROOT" } }, 5] },
                then: true,
                else: false,
              },
            },
          },
        },
      ]),
      SsnDob.countDocuments(filters),
    ]);

    if (!ssns.length) {
      return res.status(200).json({ message: "No files found", count: 0 });
    }

    res.json({
      ssns,
      count,
      totalPages: Math.ceil(count / perPage),
      currentPage: page,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Something went wrong, please try again." });
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

module.exports = {
  createSsnDob,
  getAllSsns,
  getAllSsnsBySellerId,
};
