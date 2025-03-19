const SsnDob = require("../models/SsnDob");
const Card = require("../models/Card");
const Mail = require("../models/Mail");
const csv = require("csv-parser");
const fs = require("fs");
const { default: mongoose } = require("mongoose");

const uploadSsn = async (req, res) => {
  try {
    // Validate file existence
    if (!req.file || Object.keys(req.file).length === 0) {
      return res.status(400).json({ message: "No file was uploaded." });
    }

    const csvfile = req.file;
    console.log(csvfile.mimetype);
    // if (csvfile.mimetype !== "text/csv") {
    //   return res
    //     .status(400)
    //     .json({ message: "Invalid file type. Only CSV files are allowed." });
    // }

    // Validate required fields in request body
    const { sellerId, price, base } = req.body;
    if (!sellerId || !price || !base) {
      return res
        .status(400)
        .json({ message: "sellerId, base, and price are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(price)) {
      return res.status(400).json({ message: "Invalid price ID format" });
    }

    const requiredFields = [
      "firstName",
      "lastName",
      "country",
      "email",
      "emailPass",
      "faUname",
      "faPass",
      "backupCode",
      "securityQa",
      "dob",
      "address",
      "ssn",
      "city",
    ];

    const results = [];
    const missingFields = new Set();

    // Process CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvfile.path)
        .pipe(csv())
        .on("data", (data) => {
          const missing = requiredFields.filter((field) => !data[field]);
          if (missing.length > 0) {
            missing.forEach((field) => missingFields.add(field));
          } else {
            results.push(data);
          }
        })
        .on("end", resolve)
        .on("error", reject);
    });

    if (missingFields.size > 0) {
      return res.status(400).json({
        message: `Missing required fields in CSV: ${Array.from(
          missingFields
        ).join(", ")}`,
      });
    }

    // Map data to Mongoose schema
    const ssnDobs = results.map((result) => ({
      sellerId,
      firstName: result.firstName,
      lastName: result.lastName,
      country: result.country,
      email: result.email,
      emailPass: result.emailPass,
      faUname: result.faUname,
      faPass: result.faPass,
      backupCode: result.backupCode,
      securityQa: result.securityQa,
      state: result.state || null,
      gender: result.gender || null,
      base,
      price: new mongoose.Types.ObjectId(price),
      zip: result.zip || null,
      description: result.description || null,
      dob: new Date(result.dob),
      address: result.address,
      ssn: result.ssn,
      cs: result.cs || null,
      city: result.city,
      status: "Available",
      isPaid: "Not Paid",
      productType: "ssn",
    }));

    // Insert data into MongoDB
    const insertedData = await SsnDob.insertMany(ssnDobs);

    res.status(200).json({
      message: `${insertedData.length} SSNs uploaded successfully`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Something went wrong, please check your data and try again",
    });
  }
};

const uploadCard = async (req, res) => {
  if (!req.file || Object.keys(req.file).length === 0) {
    return res.status(400).send("No files were uploaded.");
  }

  const csvfile = req.file;
  const { sellerId } = req.body;

  if (!sellerId)
    return res.status(400).json({ message: "seller id is required" });

  // if (csvfile.mimetype !== 'text/csv') {
  //   return res.status(400).json({message: 'Invalid file type. Only CSV files are allowed.'});
  // }

  const results = [];
  const requiredFields = [
    "state",
    "country",
    "bank",
    "class",
    "level",
    "exp",
    "zip",
    "ssn",
    "price",
    "ccnum",
    "cvv",
    "name",
    "address",
  ];

  try {
    // Read file using csv-parser
    fs.createReadStream(csvfile.path)
      .pipe(csv())
      .on("data", (data) => {
        results.push(data);
      })
      .on("end", async () => {
        // Verify that all required fields are present
        const missingFields = requiredFields.filter(
          (field) => !Object.keys(results[0]).includes(field)
        );

        if (missingFields.length > 0) {
          return res.status(400).json({
            message: `Missing required fields: ${missingFields.join(", ")}`,
          });
        }

        // Map data to Mongoose schema
        const cards = results.map((result) => {
          return {
            sellerId: sellerId,
            bin: result?.ccnum?.substr(0, 6),
            state: result?.state,
            country: result?.country,
            bank: result?.bank,
            classz: result?.class,
            level: result?.level,
            exp: result?.exp,
            zip: result?.zip,
            ssn: result?.ssn,
            dob: result?.dob,
            dl: result?.dl,
            mmn: result?.mmn,
            ip: result?.ip,
            price: result?.price,
            ccnum: result?.ccnum,
            cvv: result?.cvv,
            name: result?.name,
            address: result?.address,
            phone: result?.phone,
            email: result?.email,
            password: result?.password,
            type: result?.type,
            city: result?.city,
            status: "Available",
            isPaid: "Not Paid",
            productType: "card",
          };
        });

        // Insert data into MongoDB using Mongoose
        try {
          const insertedData = await Card.insertMany(cards);
          res.status(200).json({
            message: `${insertedData.length} Card(s) uploaded successfully`,
          });
        } catch (err) {
          console.log(err);
          res.status(500).json({
            message: "Something went wrong, check your data and resubmit",
          });
        }
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Something went wrong, if the problem persists contact support",
    });
  }
};

const uploadMail = async (req, res) => {
  if (!req.file || Object.keys(req.file).length === 0) {
    return res.status(400).send("No files were uploaded.");
  }

  const csvfile = req.file;
  const { sellerId, price, category } = req.body;
  console.log(price)

  if (!sellerId)
    return res.status(400).json({ message: "seller id is required" });

  // if (csvfile.mimetype !== 'text/csv') {
  //   return res.status(400).json({message: 'Invalid file type. Only CSV files are allowed.'});
  // }

  const results = [];
  const requiredFields = [
    "email",
    "password",
   
  ];

  try {
    // Read file using csv-parser
    fs.createReadStream(csvfile.path)
      .pipe(csv())
      .on("data", (data) => {
        results.push(data);
      })
      .on("end", async () => {
        // Verify that all required fields are present
        const missingFields = requiredFields.filter(
          (field) => !Object.keys(results[0]).includes(field)
        );

        if (missingFields.length > 0) {
          return res.status(400).json({
            message: `Missing required fields: ${missingFields.join(", ")}`,
          });
        }

        // Map data to Mongoose schema
        const mails = results.map((result) => {
          return {
            sellerId: sellerId,
            email: result?.email,
            price: price,
            category: category,
            password: result?.password,
            recoveryMail: result?.recoveryMail,
            status: "Available",
            isPaid: "Not Paid",
            productType: "mail",
          };
        });

        // Insert data into MongoDB using Mongoose
        try {
          const insertedData = await Mail.insertMany(mails);
          res.status(200).json({
            message: `${insertedData.length} Mail(s) uploaded successfully`,
          });
        } catch (err) {
          console.log(err);
          res.status(500).json({
            message: "Something went wrong, check your data and resubmit",
          });
        }
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Something went wrong, if the problem persists contact support",
    });
  }
};

module.exports = {
  uploadSsn,
  uploadCard,
  uploadMail
};