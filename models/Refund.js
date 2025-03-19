const mongoose = require("mongoose");

const refundSchema = new mongoose.Schema({
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  productId: { type: String, required: true },
  productType: { type: String, required: true },
  ipAddress: { type: String, required: true },
  screenshotLink: { type: String, required: true },
  description: { type: String, required: true  },
  amount: { type: Number, required: true  },
  status: { type: String, required: false  },
  userName: { type: String, required: false  },
  isRead: { type: String, default: "unread" },
});

const Refund = mongoose.model("Refund", refundSchema);

module.exports = Refund;
