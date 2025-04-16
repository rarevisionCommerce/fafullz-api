const asyncHandler = require("express-async-handler");
const axios = require("axios");
const request = require("request");
const Payment = require("../models/Payment");

const getPaymentAdress = asyncHandler(async (req, res) => {
  try {
    const userId = req.body.userId;
    const amount = req.body.amount;
    const userName = req.body.userName;
    if (!userId || !amount)
      return res.status(400).json({ message: "All fields are required!" });

    var data = JSON.stringify({
      name: "RareVision deposit",
      description: "Deposit into your account",
      local_price: {
        amount: amount,
        currency: "USD",
      },
      pricing_type: "fixed_price",
      metadata: {
        customer_id: userId,
        customer_name: userName,
      },
    });

    let options = {
      method: "POST",
      url: "https://api.commerce.coinbase.com/charges",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-CC-Version": process.env.COINBASE_VERSION,
        "X-CC-Api-Key": process.env.COINBASE_API_KEY,
      },
      body: data,
    };

    request(options, function (error, response, body) {
      if (error) {
        console.error(error);
        return res.status(500).json({ message: "Something went wrong!!" });
      } else {
        console.log(
          "Charge created by user:" +
            userId +
            " charge code: " +
            JSON.parse(body).data.code +
            " at :" +
            new Date()
        );
        console.log(body);
        const addressObj = {
          message: "Payment address generated!",
          addresses: JSON.parse(body).data.addresses,
          coinAmount: JSON.parse(body).data.pricing,
        };
        console.log(addressObj);
        res.status(200).json(addressObj);
      }
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Something went wrong!" });
  }
});

const deposit = async (req, res) => {
  try {
    console.log("webhook data is :", req.body);
    //TODO update data from webhook
    const event = req.body.event;
    const eventType = event?.type;
    const userId = event?.data?.metadata?.customer_id;
    const id = event?.data?.code;
    const coin = event?.data?.payments[0]?.value?.crypto?.currency || "BTC";
    const network = event?.data?.payments[0]?.network || "bitcoin";
    const wallet = event?.data?.addresses[network];
    const amount = event?.data?.payments[0]?.value?.local?.amount || 0; //NOTE can get this from pricing  object as well.

    const date = event?.data?.timeline[0]?.time;
    // const date = chargeDate.split("T")[0] // split date

    // test data
    // const {status, userId, id, transactionStatus, date, wallet, coin, amount } = req.body;
    //  if(!userId || !eventType || !id || !transactionStatus ||!date || !wallet || !coin || !amount) return res.status(400).json({ message: "All fields are required!" });
    console.log("Event is: ", eventType);

    //get payment document
    const payment = await Payment.findOne({ userId: userId }).exec();

    if (eventType === "charge:confirmed") {
      if (!payment) {
        // create new payment document
        const newPayment = new Payment({
          userId: userId,
          balance: amount,
          transaction: [
            {
              id: id,
              status: "CONFIRMED",
              date: date,
              wallet: wallet,
              coin: coin,
              amount: amount,
            },
          ],
        });
        await newPayment.save();
        console.log({
          message: "First time depo attempt  ----Deposited ",
          userId: userId,
        });
      } else {
        // update existing payment document
        const existingBal = payment.balance;
        const newBal = parseFloat(existingBal) + parseFloat(amount);
        payment.balance = newBal;
        payment.transaction.push({
          id: id,
          status: "CONFIRMED",
          date: date,
          wallet: wallet,
          coin: coin,
          amount: amount,
        });
        await payment.save();

        console.log({
          message: "Not first time depo attempt ----Deposited",
          userId: userId,
        });
      }
    } else if (eventType === "charge:failed") {
      if (!payment) {
        // create new payment document
        const newPayment = new Payment({
          userId: userId,
          balance: 0,
          transaction: [
            {
              id: id,
              status: "FAILED",
              date: date,
              wallet: wallet,
              coin: coin,
              amount: 0,
            },
          ],
        });
        await newPayment.save();

        console.log({
          message: "First time depo attempt ----Failed ",
          userId: userId,
        });
      } else {
        // update existing payment document
        payment.transaction.push({
          id: id,
          status: "FAILED",
          date: date,
          wallet: wallet,
          coin: coin,
          amount: 0,
        });
        await payment.save();

        console.log({
          message: "Not first time depo attempt ----Failed ",
          userId: userId,
        });
      }
    }
  } catch (error) {
    console.log(error);
    return res.sendStatus(200).json({ message: "Something went wrong!" });
  }
  return res.sendStatus(200);
};
//  end deposit ..........................

// refund
const refund = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;
    const amount = req.body.amount;

    if (!userId || !amount)
      return res.status(400).json({ message: "All fields are required!" });

    // Find the payment document for the user
    const payment = await Payment.findOne({ userId: userId }).lean().exec();

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    // Update the payment balance and add a refund transaction
    const bal = payment.balance;
    const newBalance = parseInt(bal) + parseInt(amount);
    const refundTransaction = {
      id: Math.random().toString(36).substring(6).toUpperCase(),
      status: "Refund",
      date: new Date().toISOString().slice(0, 10),
      wallet: "--",
      coin: "--",
      amount: amount,
    };

    payment.balance = newBalance;
    payment.transaction.push(refundTransaction);

    // Save the updated payment document
    const updatedPayment = await payment.save();

    if (updatedPayment)
      return res.status(200).json({ message: "Refund processed!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong!" });
  }
});

// get user payment history...................

const getUserPaymentsById = async (req, res) => {
  try {
    if (!req?.params?.userId)
      return res.status(400).json({ message: "Id is required" });

    const payments = await Payment.findOne(req.params).lean().exec();

    if (!payments || payments === null) {
      return res.status(200).json({ message: `No payments made!` });
    }
    res.json(payments);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error!" });
  }
};

// get all charges..............
const getAllCharges = asyncHandler(async (req, res) => {
  let config = {
    method: "get",
    url: "https://api.commerce.coinbase.com/charges",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-CC-Version": "2018-03-22",
      "X-CC-Api-Key": "6860befd-f647-4da7-8a55-3f93d9fdc9d7",
    },
  };

  axios(config)
    .then((response) => {
      console.log(JSON.stringify(response.data));
      res.status(200).json(response.data);
    })
    .catch((error) => {
      console.log(error);
    });
});

const addPayment = async (req, res) => {
  const { buyerId, amount } = req.body;

  if (!buyerId || !amount)
    return res.status(400).json({ message: "All fields are required" });

  try {
    const payment = await Payment.findOne({ userId: buyerId }).exec();
    if (!payment) {
      // create new payment document
      const newPayment = new Payment({
        userId: buyerId,
        balance: amount,
        transaction: [
          {
            id: Math.random().toString(36).substring(6).toUpperCase(),
            status: "Confirmed",
            date: new Date().toISOString().slice(0, 10),
            wallet: "Deposited by Admin",
            coin: "--",
            amount: amount,
          },
        ],
      });
      await newPayment.save();
    } else {
      const bal = payment.balance;
      const newBalance = parseFloat(bal) + parseFloat(amount);
      const depositTransaction = {
        id: Math.random().toString(36).substring(6).toUpperCase(),
        status: "Confirmed",
        date: new Date().toISOString().slice(0, 10),
        wallet: "Deposited by Admin",
        coin: "--",
        amount: amount,
      };

      payment.balance = newBalance;
      payment.transaction.push(depositTransaction);

      await payment.save();
    }

    res.status(200).json({ message: `Payment added!` });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

const deductPayment = async (req, res) => {
  const { buyerId, amount } = req.body;

  if (!buyerId || !amount)
    return res.status(400).json({ message: "All fields are required" });

  try {
    const payment = await Payment.findOne({ userId: buyerId }).exec();
    if (!payment || payment?.balance < amount) {
      // create new payment document
      return res
        .status(400)
        .json({ message: "Client does not have enoygh balance" });
    } else {
      const bal = payment.balance;
      const newBalance = parseFloat(bal) - parseFloat(amount);
      const depositTransaction = {
        id: Math.random().toString(36).substring(6).toUpperCase(),
        status: "Deducted",
        date: new Date().toISOString().slice(0, 10),
        wallet: "Deducted by Admin",
        coin: "--",
        amount: amount,
      };

      payment.balance = newBalance;
      payment.transaction.push(depositTransaction);

      await payment.save();
    }

    res.status(200).json({ message: `Payment deducted!` });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// nowpayments apis
const { NOWPAYMENT_API_KEY, API_DOMAIN } = process.env;

// get currencies
const getAllCurrencies = async (req, res) => {
  try {
    var config = {
      method: "get",
      maxBodyLength: Infinity,
      url: "https://api.nowpayments.io/v1/merchant/coins",
      headers: {
        "x-api-key": `${NOWPAYMENT_API_KEY}`,
      },
    };

    axios(config)
      .then(function (response) {
        res.status(200).json(response.data);
      })
      .catch(function (error) {
        res.status(400).json({ message: "Error geting currencies" });
        console.log(error);
      });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
    console.log(error);
  }
};

// get minimum crypto
const getMinimumAmount = async (req, res) => {
  const { crypto } = req.params;
  try {
    var config = {
      method: "get",
      maxBodyLength: Infinity,
      url: `https://api.nowpayments.io/v1/min-amount?currency_from=${crypto}&currency_to=usd&fiat_equivalent=usd&is_fee_paid_by_user=False`,
      headers: {
        "x-api-key": `${NOWPAYMENT_API_KEY}`,
      },
    };

    axios(config)
      .then(function (response) {
        return res.status(200).json(response.data);
      })
      .catch(function (error) {
        console.log(error);
        return res.status(400).json({ message: "Error geting min amount" });
      });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

// create payments request
const createPaymentNowpayments = async (req, res) => {
  const { amount, cryptoCurrency, userId, userName } = req.body;

  if (!amount || !cryptoCurrency || !userId)
    return res.status(400).json({ message: "All fields are required!" });

  try {
    var data = JSON.stringify({
      price_amount: amount,
      price_currency: "usd",
      pay_currency: cryptoCurrency,
      ipn_callback_url: `${API_DOMAIN}/payments/nowpayments/ipn-callback`,
      order_id: userId,
      order_description: `Rarevision Deposit by: ${userName || ""} `,
    });

    var config = {
      method: "post",
      maxBodyLength: Infinity,
      url: "https://api.nowpayments.io/v1/payment",
      headers: {
        "x-api-key": `${NOWPAYMENT_API_KEY}`,
        "Content-Type": "application/json",
      },
      data: data,
    };

    axios(config)
      .then(function (response) {
        return res.status(200).json({
          message: "Payment Address Generated",
          paymentData: response.data,
        });
      })
      .catch(function (error) {
        console.log(error);
        return res
          .status(400)
          .json({ message: "Something went wrong. Try again." });
      });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const IPNCallbackNowPayments = async (req, res) => {
  console.log("Notification hit...");
  console.log(req.body);

  try {
    const eventType = req.body.payment_status;
    const userId = req.body.order_id; // Fixed typo here
    const id = req.body.purchase_id;
    const coin = req.body.pay_currency || "BTC";
    const network = req.body.pay_currency || "bitcoin";
    const wallet = req.body.pay_address;
    const order_description = req.body.order_description;
    const amount = req.body.price_amount || 0; // Note: can get this from pricing object as well

    const date = new Date();

    if (eventType === "finished" && order_description == "zyft") {
      const data = { userId, amount, id };

const result = await sendToZyft(data);
if (result === 1) {
  console.log("Notification sent successfully.");
} else {
  console.log("Failed to send notification.");
}

      return res
        .status(200)
        .json({ message: "Notification processed successfully" });
    }

    // Get payment document
    const payment = await Payment.findOne({ userId: userId }).exec();

    if (eventType === "finished") {
      if (!payment) {
        // Create new payment document
        const newPayment = new Payment({
          userId: userId,
          balance: amount,
          transaction: [
            {
              id: id,
              status: "CONFIRMED",
              date: date,
              wallet: wallet,
              coin: coin,
              amount: amount,
            },
          ],
        });
        await newPayment.save();
        console.log({
          message: "First time depo attempt  ----Deposited ",
          userId: userId,
        });
      } else {
        // Update existing payment document
        const existingBal = payment.balance;
        const newBal = parseFloat(existingBal) + parseFloat(amount);
        payment.balance = newBal;
        payment.transaction.push({
          id: id,
          status: "CONFIRMED",
          date: date,
          wallet: wallet,
          coin: coin,
          amount: amount,
        });
        await payment.save();

        console.log({
          message: "Not first time depo attempt ----Deposited",
          userId: userId,
        });
      }
    } else if (eventType === "failed" || eventType === "expired") {
      if (!payment) {
        // Create new payment document
        const newPayment = new Payment({
          userId: userId,
          balance: 0,
          transaction: [
            {
              id: id,
              status: "FAILED",
              date: date,
              wallet: wallet,
              coin: coin,
              amount: 0,
            },
          ],
        });
        await newPayment.save();

        console.log({
          message: "First time depo attempt ----Failed ",
          userId: userId,
        });
      } else {
        // Update existing payment document
        payment.transaction.push({
          id: id,
          status: "FAILED",
          date: date,
          wallet: wallet,
          coin: coin,
          amount: 0,
        });
        await payment.save();

        console.log({
          message: "Not first time depo attempt ----Failed ",
          userId: userId,
        });
      }
    }

    return res
      .status(200)
      .json({ message: "Notification processed successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const sendToZyft = async (data) => {
  try {
    const response = await axios.post(
      `${process.env.ZYFTAPI}/payments/notification`,
      data,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Zyft response:", response.data);
    return 1; // success
  } catch (error) {
    console.error("Error sending to Zyft:", error?.response?.data || error.message);
    return 0; // failure
  }
};

module.exports = {
  getPaymentAdress,
  deposit,
  refund,
  getUserPaymentsById,
  getAllCharges,
  addPayment,
  deductPayment,
  getAllCurrencies,
  createPaymentNowpayments,
  IPNCallbackNowPayments,
  getMinimumAmount,
};
