const Support = require("../models/Support");

const sendUsMessage = async (req, res) => {
  const { jabberId, message, role, userName } = req.body;

  if (!jabberId || !message || !role || !userName)
    return res.status(400).json({ message: "All fields are required" });

  try {
    const supportMessage = await Support.findOne({ jabberId: jabberId }).exec();

    if (!supportMessage) {
      const newMessage = new Support({
        userName: userName,
        jabberId: jabberId,
        role: role,
        adminUnread: 1,
        messages: [
          {
            from: role,
            message: message,
            createdAt: new Date(),
          },
        ],
      });

      await newMessage.save();
      res.status(200).json({ message: "Message sent " });
    } else {
      role === "Admin"
        ? (supportMessage.customerUnread += 1)
        : (supportMessage.adminUnread += 1);

      supportMessage.messages.push({
        from: role,
        message: message,
        createdAt: new Date(),
      });

      await supportMessage.save();
      res.status(200).json({ message: "Message sent " });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

const getSupportMessages = async (req, res) => {
  const page = req?.query?.page || 1;
  const perPage = req?.query?.perPage || 20;
  const skip = (page - 1) * parseInt(perPage);
  const role = req?.query?.role;
  const userName = req?.query?.userName;
  const jabberId = req?.query?.jabberId;

  const filters = {
    userName: { $regex: userName, $options: "i" },
    jabberId: { $regex: jabberId, $options: "i" },
    role: { $regex: role, $options: "i" },
  };

  const [messages, count] = await Promise.all([
    Support.find(filters)
      .select("userName jabberId role updatedAt adminUnread customerUnread")
      .limit(parseInt(perPage))
      .skip(skip)
      .sort({ updatedAt: -1 })
      .lean()
      .exec(),
    Support.countDocuments(filters),
  ]);

  if (!messages?.length) {
    return res.status(200).json({ message: "No support messages" });
  }

  res.json({ messages, count });
};

const getMyMessages = async (req, res) => {
  const { jabberId, role } = req.params;

  if (!jabberId)
    return res.status(400).json({ message: "jabber id is required" });

  try {
    const messages = await Support.findOne({ jabberId: jabberId }).exec();
    if (!messages) {
      return res.status(200).json({ message: "No messages" });
    }

    role === "Admin"
      ? (messages.adminUnread = 0)
      : (messages.customerUnread = 0);

    messages.save();
    res.json(messages);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

const countCustomerUnread = async (req, res) => {
  const { jabberId } = req.params;

  if (!jabberId)
    return res.status(400).json({ message: "jabber id is required" });
  let totalCustomerUnread = 0;

  try {
    const messages = await Support.findOne({ jabberId: jabberId }).exec();
    if (!messages || !messages.customerUnread) {
      return res.status(200).json({ totalCustomerUnread });
    }

    totalCustomerUnread = messages.customerUnread;

    res.json({ totalCustomerUnread });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

const countAdminUnread = async (req, res) => {
  try {
    let totalAdminUnread = 0;
    const supports = await Support.find({ adminUnread: { $gt: 0 } }); // Get only the support documents where adminUnread is greater than zero

    if (supports.length < 1) return res.status(200).json({ totalAdminUnread });

    for (let support of supports) {
      totalAdminUnread += support.adminUnread; // Add up the adminUnread of each document
    }

    res.status(200).json({ totalAdminUnread }); // Return the total adminUnread
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong" });
  }
};

const adminSendMessage = async (req, res) => {
  const { jabberId, message, role, userName } = req.body;

  if (!jabberId || !message || !role || !userName)
    return res.status(400).json({ message: "All fields are required" });

  try {
    const supportMessage = await Support.findOne({ jabberId: jabberId }).exec();

    if (!supportMessage) {
      const newMessage = new Support({
        userName: userName,
        jabberId: jabberId,
        role: role,
        customerUnread: 1,
        messages: [
          {
            from: "Admin",
            message: message,
            createdAt: new Date(),
          },
        ],
      });

      await newMessage.save();
      res.status(200).json({ message: "Message sent " });
    } else {
      supportMessage.customerUnread += 1;

      supportMessage.messages.push({
        from: "Admin",
        message: message,
      });

      await supportMessage.save();
      res.status(200).json({ message: "Message sent " });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
const deleteMessageById = async(req, res) => {
  const {conversationId, messageId} = req.body;


  if(!conversationId || !messageId) return res.status(400).json({message: "All fields are required"});

  try {
    const supportMessage = await Support.findById(conversationId).exec();
    if(!supportMessage) return res.status(404).json({message: "No conversation found"});

      // Find the index of the product by productId
      const messageIndex = supportMessage.messages.findIndex(
        (message) => message._id.toString() === messageId,
      )

      if (messageIndex === -1) {
        return res.status(404).json({ message: 'message not found' })
      }
  
      // Remove the product from the products array
      supportMessage.messages.splice(messageIndex, 1)
      await supportMessage.save();

      res.status(200).json({message: "Message deleted"})

    
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
    
  }
}


module.exports = {
  sendUsMessage,
  getSupportMessages,
  getMyMessages,
  countAdminUnread,
  countCustomerUnread,
  adminSendMessage,
  deleteMessageById
};
