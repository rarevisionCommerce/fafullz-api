const Account = require("../models/Account");
const asyncHandler = require("express-async-handler");

const uploadAccount = async (req, res) => {
  console.log(req.file)
  console.log(req.body)

  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { sellerId, category, state, country, price } = req.body;

    if (
      !sellerId ||
      !category ||
      !state ||
      !price ||
      !country ||
      !req.file.path
    )
      return res.status(400).json({ message: "all fields are required" });

    const accountObject = {
      category: req.body.category,
      sellerId: req.body.sellerId,
      state: req.body.state,
      country: req.body.country,
      price: req.body.price,
      description: req.body.description,
      filePath: `https://api.rarevision.net/${req.file.path}`,
      size: fileSizeFormatter(req.file.size, 2),
    };

    const account = await Account.create(accountObject);

    if (account) {
      res.status(201).json({ message: ` Account  created` });
    } else {
      res.status(400).json({ message: "Invalid account data received" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server jh error" });
  }
};

const getAllAccounts = asyncHandler(async (req, res) => {
  const page = req?.query?.page || 1;
  const perPage = req?.query?.perPage || 20;

  const {category, state, country, sellerId} = req.query

  const filters = {
    category: { $regex: category, $options: "i" },
    state: { $regex: state, $options: "i" },
    country: { $regex: country, $options: "i" },
    sellerId: { $regex: sellerId, $options: "i" },
    status: "Available",

  }

  const [accounts, count] = await Promise.all([
    Account.find(filters)
      .select("-filePath")
      .skip((page - 1) * parseInt(perPage))
      .limit(parseInt(perPage))
      .lean()
      .exec(),
    Account.countDocuments(filters)
  ]);

  if (!accounts?.length) {
    return res.status(200).json({ message: "No accounts found" });
  }
  res.json({ accounts, count });
});





const getAllAccountsBySellerId = asyncHandler(async (req, res) => {
  const page = req?.query?.page || 1;
  const perPage = req?.query?.perPage || 20;

  const sellerId = req.params.sellerId;

  if(!sellerId) return res.status(400).json({message: "seller id is required"});

  const {status, isPaid} = req.query;

  const filters = {
    sellerId: sellerId,
    status:  { $regex: status, $options: "i" },
    isPaid:  { $regex: isPaid, $options: "i" }
  };
  const [accounts, count] = await Promise.all([
    Account.find(filters)
      .select("-filePath")
      .skip((page - 1) * parseInt(perPage))
      .limit(parseInt(perPage))
      .lean()
      .exec(),
    Account.countDocuments(filters)
  ]);

  if (!accounts?.length) {
    return res.status(200).json({ message: "No accounts found" });
  }
  res.json({ accounts, count });
});

const fileSizeFormatter = (bytes, decimal) => {
  if (bytes === 0) {
    return "0 Bytes";
  }
  const dm = decimal || 2;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "YB", "ZB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1000));
  return (
    parseFloat((bytes / Math.pow(1000, index)).toFixed(dm)) + " " + sizes[index]
  );
};

module.exports = {
  uploadAccount,
  getAllAccounts,
  getAllAccountsBySellerId
};
