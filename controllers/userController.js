const User = require("../models/User");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");
const { addFundsOnAccountCreation } = require("./adminSettingController");

//get all users
const getAllUsers = asyncHandler(async (req, res) => {
  const page = req?.query?.page || 1;
  const perPage = req?.query?.perPage || 20;
  const skip = (page - 1) * parseInt(perPage);
  const role = req?.query?.role || "Buyer"; // default to 'Buyer' if no role is specified
  const userName = req?.query?.userName;
  const jabberId = req?.query?.jabberId;

  const filters = {
    userName: { $regex: userName, $options: "i" },
    jabberId: { $regex: jabberId, $options: "i" },
    roles: { $in: [role] },
  };

  // Find all users with the specified role
  try {
    const [users, count] = await Promise.all([
      User.find(filters)
        .select("-password -refreshToken")
        .limit(parseInt(perPage))
        .skip(skip)
        .lean()
        .exec(),
      User.countDocuments(filters),
    ]);
    if (!users?.length) {
      return res.status(200).json({ message: "No users found" });
    }

    res.json({ users, count });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: `Error getting users: ` });
  }
});

//create new user
const createNewUser = asyncHandler(async (req, res) => {
  const { jabberId, userName, password, roles, categories, accountType } =
    req.body;

  const userStatus = (role) => {
    if (role === "Seller") {
      return "Inactive";
    }
    return "Active";
  };

  const roles1 = [roles];

  if (roles === "Seller" && (!categories || categories.length < 1))
    return res
      .status(400)
      .json({ message: "A seller must have atleast one category" });

  //confirming required data
  if (!userName || !password) {
    return res.status(400).json({ message: "All fields required" });
  }

  //checking duplicates
  const dupUserName = await User.findOne({
    userName: { $regex: userName, $options: "i" },
    accountType: { $regex: accountType || "", $options: "i" },
  })
    .lean()
    .exec();
  const dupJabberId = await User.findOne({
    jabberId: { $regex: jabberId, $options: "i" },
    accountType: { $regex: accountType || "", $options: "i" },
  })
    .lean()
    .exec();

  if (dupUserName) {
    return res
      .status(409)
      .json({ message: "A user with the same user name already exists" });
  }
  if (dupJabberId) {
    return res
      .status(409)
      .json({ message: "A user with the same jabber id already exists" });
  }

  //hash password
  const hashedPwd = await bcrypt.hash(password, 10);

  const userObject = {
    userName: userName.trim(),
    jabberId,
    password: hashedPwd,
    roles: roles1,
    status: userStatus(roles),
    categories,
    accountType,
  };

  //create and store user
  const user = await User.create(userObject);

  if (user) {
    res.status(201).json({ message: `Welcome  ${userName}` });
  } else {
    res.status(400).json({ message: "Invalid user data received" });
  }

  if (roles == "Client") {
    addFundsOnAccountCreation(user._id);
  }
});

const changePassword = async (req, res) => {
  const { userId } = req.params;
  let { password, type = "self" } = req.body;

  if (!userId) return res.status(400).json({ message: "user id is required" });

  try {
    // Does the user exist to update?
    const user = await User.findById({ _id: userId }).exec();

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (type == "reset") {
      password = "123456";
    }

    user.password = await bcrypt.hash(password, 10); // salt rounds
    await user.save();

    res.json({
      message: `${
        type == "reset"
          ? "User password has been reset to 123456"
          : "Your password has been updated"
      } `,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

//getUser by ID
const getUserById = async (req, res) => {
  if (!req?.params?.userId)
    return res.status(400).json({ message: "id is required" });
  const user = await User.findOne({ _id: req.params.userId })
    .select("-password -refreshToken")
    .lean()
    .exec();

  if (!user) {
    return res
      .status(204)
      .json({ message: `No user matches id: ${req.params.userId}` });
  }

  if (!user?.productStatus) {
    user.productStatus = "Available"; // Ensure productStatus is set
  }

  res.json(user);
};

//delete user
const deleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const user = User.findById({ _id: userId }).exec();

  if (!user)
    return res.status(400).json({
      message: "Something went wrong, refresh the page and try again",
    });

  await User.findOneAndDelete({ _id: userId }).exec();

  res.status(200).json({ message: "User deleted successfully" });
});

const updateUserStatus = async (req, res) => {
  const { userId, status } = req.params;

  if (!userId || !status)
    return res.status(400).json({ message: "All fiels are required" });

  try {
    const updates = {
      status: status,
    };
    const user = await User.findByIdAndUpdate(userId, updates, { new: true });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "User status updated successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

const updateSellerCategories = async (req, res) => {
  const { sellerId } = req.params;

  const newCategories = req.body.categories;
  if (!newCategories || newCategories?.length < 1)
    return res
      .status(400)
      .json({ message: "A seller must have atleast one category" });

  try {
    // Find the user by Id
    const user = await User.findById(sellerId).exec();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update the categories field
    user.categories = newCategories;

    // Save the updated user document
    await user.save();

    return res.json({ message: "Categories updated successfully" });
  } catch (error) {
    console.error("Error updating categories:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

module.exports = {
  getAllUsers,
  createNewUser,
  changePassword,
  updateUserStatus,
  deleteUser,
  getUserById,
  updateSellerCategories,
};
