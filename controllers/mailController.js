const Mail = require("../models/Mail");

const createMail = async (req, res) => {
  const { sellerId, category, price, recoveryMail, password, email } = req.body;

  if (!sellerId || !category || !price || !recoveryMail || !password || !email)
    return res.status(400).json({ message: "All fields are required" });

  const mailObject = {
    sellerId,
    category,
    price,
    recoveryMail,
    password,
    email,
  };

  const mail = await Mail.create(mailObject);

  if (mail) {
    res.status(201).json({ message: `New mail file created` });
  } else {
    res.status(400).json({ message: "Invalid mail data received" });
  }
};

const getAllMails = async (req, res) => {
  const page = req?.query?.page || 1;
  const perPage = req?.query?.perPage || 20;
  const category = req?.query?.category;
  const skip = (page - 1) * parseInt(perPage);

  const filters = {
    category: { $regex: category, $options: 'i' },
    status: "Available"
  }

  const [mails, count] = await Promise.all([
    Mail.find(filters)
      .select(
        "sellerId  category"
      )
      .populate('price')
      .skip(skip)
      .limit(parseInt(perPage))
      .lean()
      .exec(),
    Mail.countDocuments(filters),
  ]);

  if (!mails?.length) {
    return res.status(200).json({ message: "No mails found" });
  }

  res.json({ mails, count });

};



const getAllMailsBySellerId = async (req, res) => {

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


  const [mails, count] = await Promise.all([
    Mail.find(filters)
    .populate('price')
      .skip(skip)
      .limit(parseInt(perPage))
      .lean()
      .exec(),
    Mail.countDocuments(filters),
  ]);

  if (!mails?.length) {
    return res.status(200).json({ message: "No mails found" });
  }

  res.json({ mails, count });

};


module.exports = {
    createMail,
    getAllMails,
    getAllMailsBySellerId
}
