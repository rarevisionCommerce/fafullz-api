const File = require("../models/File");
const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");

const uploadFile = async (req, res) => {
  console.log(req.body.sellerId);

  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    console.log(req.file.size);

    const { category, state, country, price } = req.body;

    if (!category || !state || !price || !country || !req.file.path)
      return res.status(400).json({ message: "all fields are required" });

    const fileObject = {
      category: req.body.category,
      sellerId: req.body.sellerId,
      state: req.body.state,
      country: req.body.country,
      price: req.body.price,
      description: req.body.description,
      filePath: `https://api.rarevision.net/${req.file.path}`,
      size: fileSizeFormatter(req.file.size, 2),
    };

    const file = await File.create(fileObject);

    if (file) {
      res.status(201).json({ message: ` File  created` });
    } else {
      res.status(400).json({ message: "Invalid file data received" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server jh error" });
  }
};

const getAllFiles = asyncHandler(async (req, res) => {
  const page = req?.query?.page || 1;
  const perPage = req?.query?.perPage || 20;


  const {category, state, country} = req.query

  const filters = {
    category: { $regex: category, $options: 'i' },
    state: { $regex: state, $options: 'i' },
    country: { $regex: country, $options: 'i' },
    status: "Available"
  }

  const [files, count] = await Promise.all([
    File.find(filters)
      .select("-filePath")
      .skip((page - 1) * parseInt(perPage))
      .limit(parseInt(perPage))
      .lean()
      .exec(),

    File.countDocuments(filters),
  ]);

  if (!files?.length) {
    return res.status(200).json({ message: "No files found" });
  }
  res.json({ files, count });
});


const getAllFilesBySellerId = asyncHandler(async (req, res) => {
  const sellerId = req.params.sellerId;

  if(!sellerId) return res.status(400).json({message: "seller id is required"});

  const page = req?.query?.page || 1;
  const perPage = req?.query?.perPage || 20;


  const {status, isPaid} = req.query;

    const filters = {
      sellerId: sellerId,
      status:  { $regex: status, $options: "i" },
      isPaid:  { $regex: isPaid, $options: "i" }
    };

  const [files, count] = await Promise.all([
    File.find(filters)
      .skip((page - 1) * parseInt(perPage))
      .limit(parseInt(perPage))
      .lean()
      .exec(),

    File.countDocuments(filters),
  ]);

  if (!files?.length) {
    return res.status(200).json({ message: "No files found" });
  }
  res.json({ files, count });
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
  uploadFile,
  getAllFiles,
  getAllFilesBySellerId
};
