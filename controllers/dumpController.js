const Dump = require("../models/Dump");
const asyncHandler = require("express-async-handler");

const createDump = async (req, res) => {
  const {
    sellerId,
    bin,
    country,
    svc,
    bank,
    price,
    type,
    level,
    track1,
    track2,
    exp
  } = req.body;
  if (!sellerId || !bin || !country || !svc || !price || !type || !level || !exp)
    return res.status(400).json({ message: "All fields are required" });


    function getMonthYearString(dateStr) {
      const date = new Date(dateStr);
      const month = date.getUTCMonth() + 1; // Add 1 to convert from 0-indexed to 1-indexed
      const year = date.getUTCFullYear();
      return `${month}/${year}`;
    }

  const dumpObject = {
    "exp": getMonthYearString(exp),
    sellerId,
    bin,
    country,
    svc,
    bank,
    price,
    type,
    level,
    track1,
    track2,
  };

  const dump = await Dump.create(dumpObject);

  if (dump) {
    res.status(201).json({ message: `New dump file created` });
  } else {
    res.status(400).json({ message: "Invalid dump data received" });
  }
};

const getAllDumps = asyncHandler(async (req, res) => {
  const page = req?.query?.page || 1;
  const perPage = req?.query?.perPage || 20;
  const skip = (page - 1) * parseInt(perPage);

  const { bank, country, type, level, bin, svc } = req.query;

  const filters = {
    bank: { $regex: bank, $options: "i" },
    type: { $regex: type, $options: "i" },
    country: { $regex: country, $options: "i" },
    level: { $regex: level, $options: "i" },
    bin: { $regex: bin, $options: "i" },
    svc: { $regex: svc, $options: "i" },
    status: "Available",
  };

  const [files, count] = await Promise.all([
    Dump.find(filters)
      .select("bin sellerId country exp svc bank price type level track1 track2")
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(parseInt(perPage))
      .lean()
      .exec(),
    Dump.countDocuments(filters),
  ]);

  if (!files?.length) {
    return res.status(200).json({ message: "No files found" });
  }

  const modifiedFiles = files.map((file) => ({
    ...file,
    track1: file.track1 ? "yes" : "no",
    track2: file.track2 ? "yes" : "no",
  }));

  res.json({ files: modifiedFiles, count });
});

const getAllDumpsBySellerId = asyncHandler(async (req, res) => {

  const sellerId = req.params.sellerId;

  if(!sellerId) return res.status(400).json({message: "seller id is required"});

  const page = req?.query?.page || 1;
  const perPage = req?.query?.perPage || 20;
  const skip = (page - 1) * parseInt(perPage);

  const {status, isPaid} = req.query;

    const filters = {
      sellerId: sellerId,
      status:  { $regex: status, $options: "i" },
      isPaid:  { $regex: isPaid, $options: "i" }
    };

  const [files, count] = await Promise.all([
    Dump.find(filters)
      .select("bin exp sellerId country svc bank price type level track1 track2 isPaid status")
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(parseInt(perPage))
      .lean()
      .exec(),
    Dump.countDocuments(filters),
  ]);

  if (!files?.length) {
    return res.status(200).json({ message: "No files found" });
  }

  const modifiedFiles = files.map((file) => ({
    ...file,
    track1: file.track1 ? "yes" : "no",
    track2: file.track2 ? "yes" : "no",
  }));

  res.json({ files: modifiedFiles, count });
});

module.exports = {
  createDump,
  getAllDumps,
  getAllDumpsBySellerId
};
