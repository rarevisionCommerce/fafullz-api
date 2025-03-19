const WithdrawRequest = require("../models/WithdrawRequest");

const createWithdrawRequest = async (req, res) => {
  const { userId, sellerId, userName, wallet } = req.body;

  if (!userId || !userName || !wallet || !sellerId)
    return res.status(400).json({ message: "All fields are required" });

  try {
    const withdrawRequestCount = await WithdrawRequest.countDocuments({
      userName,
      status: "Pending",
    });
    if (withdrawRequestCount > 0) {
      return res
        .status(403)
        .json({ message: "You have a pending withdraw request." });
    }

    const request = await WithdrawRequest.create(req.body);

    if (request) {
      res.status(201).json({ message: ` Withdraw request  sent` });
    } else {
      res
        .status(400)
        .json({ message: "Invalid withdraw request data received" });
    }
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({
        message:
          "Something went wrong, if the problem persists contact support",
      });
  }
};

const getWithdrawRequests = async (req, res) => {
  const page = req?.query?.page || 1;
  const perPage = req?.query?.perPage || 20;
  const skip = (page - 1) * parseInt(perPage);
  const userName = req?.query?.userName;
  const status = req?.query?.status || "Pending";

  const filters = {
    userName: { $regex: userName, $options: "i" },
    status: { $regex: status, $options: "i" },
  };

  // Find all users with the specified role
  try {
    const [withdrawRequests, count] = await Promise.all([
      WithdrawRequest.find(filters)
        .limit(parseInt(perPage))
        .skip(skip)
        .lean()
        .exec(),
      WithdrawRequest.countDocuments(filters),
    ]);
    if (!withdrawRequests?.length) {
      return res.status(200).json({ message: "No requests found" });
    }

    await WithdrawRequest.updateMany({ isRead: 'unread' }, { $set: { isRead: 'read' }}).exec();

    res.json({ withdrawRequests, count });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: `Something went wrong ` });
  }
};


const getMyWithdrawRequests = async (req, res) => {
  const page = req?.query?.page || 1;
  const perPage = req?.query?.perPage || 20;
  const skip = (page - 1) * parseInt(perPage);
  

 const {userId} = req.params;

 if(!userId) return res.status(400).json({message: "user id is required"})

  // Find all users with the specified role
  try {
    const [withdrawRequests, count] = await Promise.all([
      WithdrawRequest.find({userId: userId})
        .limit(parseInt(perPage))
        .skip(skip)
        .lean()
        .exec(),
      WithdrawRequest.countDocuments({userId: userId}),
    ]);
    if (!withdrawRequests?.length) {
      return res.status(200).json({ message: "No requests found" });
    }

    res.json({ withdrawRequests, count });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: `Something went wrong ` });
  }
};

const countUnreadRequests = async(req, res) => {
  try {
    const count = await WithdrawRequest.countDocuments({isRead: "unread"}).exec();
    res.status(200).json(count);
    
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "something went wrong" });
    
  }
}


module.exports = {
    createWithdrawRequest,
    getWithdrawRequests,
    getMyWithdrawRequests,
    countUnreadRequests
}
