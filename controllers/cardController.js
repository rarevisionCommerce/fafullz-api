const Card = require("../models/Card");

const createCard = async (req, res) => {
  const {
    
    state,
    country,
    bank,
    classz,
    level,
    exp,
    zip,
    ssn,
    dob,
    dl,
    mmn,
    ip,
    sellerId,
    price,
    ccnum,
    cvv,
    name,
    address,
    phone,
    email,
    password,
    type,
    city
  } = req.body;

  if (
    
    !state ||
    !country ||
    !bank ||
    !classz ||
    !level ||
    !exp ||
    !zip ||
    !ssn ||
    !sellerId ||
    !price ||
    !ccnum ||
    !cvv ||
    !name ||
    !address
  
  )
    return res.status(400).json({ message: "All fields are required" });
    try {
      
   

    function getMonthYearString(dateStr) {
      const date = new Date(dateStr);
      const month = date.getUTCMonth() + 1; // Add 1 to convert from 0-indexed to 1-indexed
      const year = date.getUTCFullYear();
      return `${month}/${year}`;
    }

  const cardObject = {
    "bin": ccnum?.substr(0, 6),
    state,
    country,
    bank,
    classz,
    level,
    "exp": getMonthYearString(exp),
    zip,
    ssn,
    dob,
    dl,
    mmn,
    ip,
    sellerId,
    price,
    ccnum,
    cvv,
    name,
    address,
    phone,
    email,
    password,
    type,
    city
  };

  const card = await Card.create(cardObject);

  if (card) {
    res.status(201).json({ message: `New card file created` });
  } else {
    res.status(400).json({ message: "Invalid card data received" });
  }
} catch (error) {
  console.error(error);
  res.status(500).json({ message: "Something went wrong" });
      
}
};

const getAllCards = async (req, res) => {
  try {
    const page = req?.query?.page || 1;
    const perPage = req?.query?.perPage || 20;
    const skip = (page - 1) * parseInt(perPage);

    const { bank, country, minPrice, type, level, bin, state, classz, zip, price } =
      req.query;

    function yesOrNo(str) {
      if (str === "yes") {
        return true;
      } else if (str === "no") {
        return false;
      } else {
        return null;
      }
    }

    const ssnFilter = req.query.ssn ? { ssn: { $exists: yesOrNo(req.query.ssn) }} : {};
    const dobFilter = req.query.dob ? { dob: { $exists: yesOrNo(req.query.dob) }} : {};
    const dlFilter = req.query.dl ? { dl: { $exists: yesOrNo(req.query.dl) }} : {};
    const mmnFilter = req.query.mmn ? { mmn: { $exists: yesOrNo(req.query.mmn) }} : {};
    const ipFilter = req.query.ip ? { ip: { $exists: yesOrNo(req.query.ip) }} : {};


    const filters = {
      bank:  { $regex: bank, $options: "i" },
      type: { $regex: type, $options: "i" },
      country: { $regex: country, $options: "i" },
      level: { $regex: level, $options: "i" },
      bin: { $regex: bin, $options: "i" },
      state: { $regex: state, $options: "i" },
      classz: { $regex: classz, $options: "i" },
      zip: { $regex: zip, $options: "i" },
      price: { $gte: minPrice || 0, $lte: price || 0 },
      ...ssnFilter,
      ...dobFilter,
      ...dlFilter,
      ...mmnFilter,
      ...ipFilter,
      status: "Available",
    };

    const [cards, count] = await Promise.all([
      Card.find(filters)
        .select(
          "bin state country city type bank classz level exp zip ssn dob dl mmn ip sellerId price"
        )
        .skip(skip)
        .limit(parseInt(perPage))
        .lean()
        .exec(),
      Card.countDocuments(filters),
    ]);

    if (!cards?.length) {
      return res.status(200).json({ message: "No cards found" });
    }

    const modifiedFiles = cards.map((card) => ({
      ...card,
      ssn: card.ssn ? "yes" : "no",
      dob: card.dob ? "yes" : "no",
      dl: card.dl ? "yes" : "no",
      mmn: card.mmn ? "yes" : "no",
      ip: card.ip ? "yes" : "no",
    }));

    res.json({ cards: modifiedFiles, count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};


const getAllCardsBySellerId = async (req, res) => {
  const sellerId = req.params.sellerId;

  if(!sellerId) return res.status(400).json({message: "seller id is required"});

  try {
    const page = req?.query?.page || 1;
    const perPage = req?.query?.perPage || 20;
    const skip = (page - 1) * parseInt(perPage);

    const {status, isPaid} = req.query;

    const filters = {
      sellerId: sellerId,
      status:  { $regex: status, $options: "i" },
      isPaid:  { $regex: isPaid, $options: "i" }
    };

    const [cards, count] = await Promise.all([
      Card.find(filters)
     
        .skip(skip)
        .limit(parseInt(perPage))
        .lean()
        .exec(),
      Card.countDocuments(filters),
    ]);

    if (!cards?.length) {
      return res.status(200).json({ message: "No cards found" });
    }

 

    res.json({ cards, count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  createCard,
  getAllCards,
  getAllCardsBySellerId
};
