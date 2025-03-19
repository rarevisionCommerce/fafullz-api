const GoogleVoice = require("../models/GoogleVoice");

const createGvoice = async (req, res) => {
  const { sellerId, state, price, recoveryMail, password, email } = req.body;

  if (!sellerId || !state || !price || !recoveryMail || !password || !email)
    return res.status(400).json({ message: "All fields are required" });

  const gObject = {
    sellerId,
    state,
    price,
    recoveryMail,
    password,
    email,
  };

  const gvoice = await GoogleVoice.create(gObject);

  if (gvoice) {
    res.status(201).json({ message: `New google voice created` });
  } else {
    res.status(400).json({ message: "Invalid google voice received" });
  }
};

const getAllGvoice = async (req, res) => {
  const page = req?.query?.page || 1;
  const perPage = req?.query?.perPage || 20;
  const skip = (page - 1) * parseInt(perPage);

  const state = req.query.state

  const filters = {
    state: { $regex: state, $options: 'i' },
    status: "Available"
  }

  const [gVoices, count] = await Promise.all([
    GoogleVoice.find(filters)
      .select(
        "sellerId  state"
      )
      .populate('price')
      .limit(parseInt(perPage))
      .skip(skip)
      .lean()
      .exec(),
    GoogleVoice.countDocuments(filters),
  ]);

  if (!gVoices?.length) {
    return res.status(200).json({ message: "No google voices found" });
  }


  res.json({ gVoices, count });

};


const getAllGvoiceBySellerId = async (req, res) => {
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

  const [gVoices, count] = await Promise.all([
    GoogleVoice.find(filters)
    
    .populate('price')
      .limit(parseInt(perPage))
      .skip(skip)
      .lean()
      .exec(),
    GoogleVoice.countDocuments(filters),
  ]);

  if (!gVoices?.length) {
    return res.status(200).json({ message: "No google voices found" });
  }


  res.json({ gVoices, count });

};


module.exports = {
    createGvoice,
    getAllGvoice,
    getAllGvoiceBySellerId
}
