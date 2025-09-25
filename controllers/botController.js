const Payment = require("../models/Payment");
const SsnDob = require("../models/SsnDob");
const User = require("../models/User");
const bcrypt = require("bcrypt");
const { logBalanceChange } = require("./userBalLogController");
const TxtBuilder = require("../utils/txtBuilder"); // Import the utility
const fs = require("fs");
const path = require("path");
const BasePrice = require("../models/BasePrice");
const expressAsyncHandler = require("express-async-handler");

const { NOWPAYMENT_API_KEY, API_DOMAIN } = process.env;

const formatResponse = (success, data, message = null, statusCode = 200) => ({
  success,
  data,
  message,
  statusCode,
});

// Error handling wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Helper function for date filtering
const buildDateFilter = (filters) => {
  const dateFilter = {};
  if (filters.yearFrom) dateFilter.$gte = new Date(filters.yearFrom);
  if (filters.yearTo) dateFilter.$lte = new Date(filters.yearTo);
  return dateFilter;
};

const createBotUser = async (req, res) => {
  try {
    const { username } = req.body;
    console.log("Creating bot user with username:", username);

    if (!username) {
      const response = formatResponse(false, null, "Username is required", 400);
      return res.status(response.statusCode).json(response);
    }

    let user = await User.findOne({ userName: username }).exec();

    if (!user) {
      const hashedPassword = await bcrypt.hash(username, 10);
      user = await User.create({
        userName: username,
        password: hashedPassword,
        role: "Buyer",
        accountType: "bot",
      });
    }

    const payment = await Payment.findOne({ userId: user._id }).exec();

    // Convert user to plain object so we can safely add balance
    const userObj = user.toObject();
    userObj.balance = payment ? payment.balance : 0;

    res
      .status(200)
      .json({ user: userObj, message: "User created successfully" });
  } catch (error) {
    console.error("Error creating bot user:", error);
    const response = formatResponse(false, null, "Failed to create user", 500);
    res.status(response.statusCode).json(response);
  }
};

const getSsns = async (req, res) => {
  try {
    // Extract filter parameters
    const { base, state, city, zip, country, dob, dobMax, cs, name } =
      req.query;

    console.log(req.query);

    // Build filter object
    const filters = { status: "Available" };

    // Only add non-empty filters
    if (base) filters.price = base;
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

    const ssnCount = await SsnDob.countDocuments(filters).exec();

    console.log(ssnCount);
    res.status(200).json({
      message: "SSN count fetched successfully",
      count: ssnCount,
    });
  } catch (error) {
    console.error("Error fetching SSNs:", error);
    res
      .status(500)
      .json({ message: "Error fetching records", error: error.message });
  }
};

const checkOutSSNByNumber = async (req, res) => {
  try {
    const { number, username, filters = {} } = req.body;

    if ("base" in filters) {
      filters.price = filters.base;
      delete filters.base;
    }

    const { yearFrom, yearTo } = filters;

    // Add dob filter if yearFrom/yearTo exist
    if (yearFrom || yearTo) {
      filters.dob = {};

      if (yearFrom) {
        filters.dob.$gte = new Date(`${yearFrom}-01-01`);
      }
      if (yearTo) {
        filters.dob.$lte = new Date(`${yearTo}-12-31`);
      }
    }

    // Input validation
    if (!username)
      return res.status(400).json({ message: "Username is required" });
    if (number === undefined || number === null || number === "") {
      return res.status(400).json({ message: "Number is required" });
    }

    if (isNaN(Number(number))) {
      return res.status(400).json({ message: "Invalid number" });
    }
    const ssnCount = await SsnDob.countDocuments(filters).exec();
    if (ssnCount < number) {
      return res.status(400).json({
        message: `Insufficient SSNs available. Requested: ${number}, Available: ${ssnCount}`,
      });
    }

    // Find user
    const user = await User.findOne({ username }).exec();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Build query filters functionally
    const buildQuery = TxtBuilder.pipe(
      (filters) => ({ status: "Available", ...filters }),
      (query) =>
        filters.dob || filters.dobMax
          ? { ...query, dob: buildDateFilter(filters) }
          : query
    );

    const query = buildQuery(filters);

    // Remove them from filters
    // delete filters.yearFrom;
    // delete filters.yearTo;

    // Find SSN records
    const ssn = await SsnDob.find(filters)
      .limit(number)
      .populate("price")
      .exec();

    // console.log(ssn);

    if (!ssn || ssn.length === 0) {
      return res
        .status(404)
        .json({ message: "No SSNs found matching the criteria" });
    }

    // Calculate total cost functionally
    const totalCost = ssn.reduce((acc, item) => acc + item.price.price, 0);
    const payment = await Payment.findOne({ userId: user._id }).exec();
    const userBalance = payment ? payment.balance : 0;

    // Check balance and process transaction
    if (userBalance < totalCost) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    payment.balance -= totalCost;
    await payment.save();

    await SsnDob.updateMany(
      { _id: { $in: ssn.map((item) => item._id) } },
      { $set: { status: "Sold", buyerId: user._id, purchaseDate: new Date() } }
    );

    // 1. Group totals by sellerId
    // const totalsBySeller = ssn.reduce((acc, item) => {
    //   const sellerId = item.sellerId;
    //   const amount = item?.price?.price || 0;

    //   if (!acc[sellerId]) {
    //     acc[sellerId] = 0;
    //   }

    //   acc[sellerId] += amount;

    //   return acc;
    // }, {});

    // for (const [sellerId, total] of Object.entries(totalsBySeller)) {
    //   await User.findByIdAndUpdate(
    //     sellerId,
    //     { $inc: { balance: total } },
    //     { new: true }
    //   );
    // }

    // Transform data for better display using functional approach

    const transformedData = ssn
      .map((item) => ({
        base: item.price.base,
        firstName: item.firstName,
        lastName: item.lastName,
        country: item.country,
        email: item.email,
        emailPass: item.emailPass,
        faUname: item.faUname,
        faPass: item.faPass,
        backupCode: item.backupCode,
        securityQa: item.securityQa,
        state: item.state,
        gender: item.gender,
        zip: item.zip,
        address: item.address,
        ssn: item.ssn,
        city: item.city,
        dateOfBirth: item.dob,
        description: item.description || "N/A",
        price: item.price.amount,
        purchaseDate: new Date(),
        enrollment: item.enrollment || "N/A",
      }))
      .sort((a, b) => a.lastName.localeCompare(b.lastName));

    // Metadata section
    const metadata = {
      purchasedBy: username,
      totalCost: `$${totalCost.toFixed(2)}`,
      transactionDate: new Date().toLocaleString(),
      filtersApplied:
        Object.keys(filters).length > 0
          ? Object.entries(filters)
              .filter(([_, value]) => value)
              .map(([key, value]) => `${key}: ${value}`)
              .join(", ")
          : "None",
    };

    const metadataSection = [
      "Purchase Report",
      "========================================",
      ...Object.entries(metadata).map(([key, value]) => `${key}: ${value}`),
      "========================================",
    ].join("\n");

    // Build the text file using functional approach
    // Records section
    const recordsSection = transformedData
      .map((item, index) => {
        const recordHeader = `Record ${index + 1}\n${"=".repeat(40)}`;
        const recordBody = Object.entries(item)
          .map(([key, value]) => `${key}: ${value}`)
          .join("\n");
        return `${recordHeader}\n${recordBody}`;
      })
      .join("\n\n");

    // Final text content
    const txtContent = `${metadataSection}\n\n${recordsSection}`;

    console.log(txtContent);
    const uploadsDir = path.join(process.cwd(), "uploads");

    console.log("Attempting to create directory:", uploadsDir);

    // Check if directory exists and create if not
    if (!fs.existsSync(uploadsDir)) {
      console.log("Directory does not exist, creating...");
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log("Directory created successfully");
    }

    // Verify directory was created and is writable
    fs.accessSync(uploadsDir, fs.constants.W_OK);
    console.log("Directory is writable");

    // Generate filename with better sanitization
    const sanitizedUsername = username.replace(/[^a-zA-Z0-9]/g, "_");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `ssn-purchase-${sanitizedUsername}-${timestamp}.txt`;
    const filePath = path.join(uploadsDir, filename);

    console.log("Writing file to:", filePath);
    console.log("Content length:", txtContent?.length || 0);

    // Validate content before writing
    if (!txtContent || typeof txtContent !== "string") {
      throw new Error("Invalid file content: content is empty or not a string");
    }

    // Write file with explicit encoding
    fs.writeFileSync(filePath, txtContent, { encoding: "utf8", flag: "w" });

    // Verify file was created
    if (!fs.existsSync(filePath)) {
      throw new Error("File was not created successfully");
    }

    const fileStats = fs.statSync(filePath);
    console.log("File created successfully. Size:", fileStats.size, "bytes");

    logBalanceChange(
      user._id,
      totalCost,
      "debit",
      `${process.env.API_DOMAIN}/uploads/${filename}`,
      payment.balance
    ).catch((err) => console.error("Error logging balance change:", err));

    res.json({
      message: "File saved successfully",
      filename,
      path: `${process.env.API_DOMAIN}/uploads/${filename}`,
      size: fileStats.size,
    });

    // res.sendFile(path.resolve(`./uploads/${filename}`));
  } catch (error) {
    console.error("Error checking out SSN by number:", error);
    res.status(500).json({
      message: "Error processing SSN checkout",
      error: error.message,
    });
  }
};

const getAllBases = async (req, res) => {
  try {
    const [bases, count] = await Promise.all([
      BasePrice.find().lean().exec(),
      BasePrice.countDocuments(),
    ]);

    if (!bases.length) {
      res.status(404).json({ message: `No bases found` });
    } else {
      res.status(200).json({ bases, count });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

const getAllCurrencies = asyncHandler(async (req, res) => {
  try {
    const config = {
      method: "get",
      url: "https://api.nowpayments.io/v1/merchant/coins",
      headers: {
        "x-api-key": NOWPAYMENT_API_KEY,
      },
    };

    const response = await axios(config);
    const apiResponse = formatResponse(
      true,
      response.data,
      "Currencies fetched successfully"
    );
    res.status(apiResponse.statusCode).json(apiResponse);
  } catch (error) {
    console.error("Error fetching currencies:", error);
    const response = formatResponse(
      false,
      null,
      "Error fetching currencies",
      400
    );
    res.status(response.statusCode).json(response);
  }
});

const createPayment = asyncHandler(async (req, res) => {
  const { amount, cryptoCurrency, username, description } = req.body;

  const user = await User.findOne({ userName: username });

  if (!user) {
    const response = formatResponse(
      false,
      null,
      "Add username to your telegram account to continue",
      404
    );
    return res.status(response.statusCode).json(response);
  }
  const userId = user._id.toString();

  // Validate input
  const validation = validatePaymentData({ amount, cryptoCurrency, userId });

  if (!validation.isValid) {
    const response = formatResponse(
      false,
      null,
      validation.errors.join(", "),
      400
    );
    return res.status(response.statusCode).json(response);
  }

  try {
    const paymentData = {
      price_amount: parseFloat(amount),
      price_currency: "usd",
      pay_currency: cryptoCurrency,
      ipn_callback_url: `${API_DOMAIN}/api/payments/nowpayments/webhook`,
      order_id: userId,
      order_description: "bot",
    };

    const config = {
      method: "post",
      url: "https://api.nowpayments.io/v1/payment",
      headers: {
        "x-api-key": NOWPAYMENT_API_KEY,
        "Content-Type": "application/json",
      },
      data: paymentData,
    };

    const response = await axios(config);

    const paymentDataResponse = {
      pay_address: response?.data.pay_address,
      price_amount: response?.data.price_amount,
      price_currency: response?.data.price_currency,
      amount_received: response?.data.amount_received,
      pay_currency: response?.data.pay_currency,
      network: response?.data.network,
      order_id: response?.data.order_id,
      pay_amount: response?.data.pay_amount,
    };

    const apiResponse = formatResponse(
      true,
      {
        paymentData: paymentDataResponse,
        status: "waiting",
      },
      "Payment address generated successfully"
    );

    res.status(apiResponse.statusCode).json(apiResponse);
  } catch (error) {
    console.error("Error creating payment:", error);
    const response = formatResponse(
      false,
      null,
      "Failed to create payment request",
      400
    );
    res.status(response.statusCode).json(response);
  }
});

module.exports = {
  getSsns,
  checkOutSSNByNumber,
  createBotUser,
  getAllBases,
  getAllCurrencies,
  createPayment
};
