const Cart = require('../models/Cart')
const GoogleVoice = require('../models/GoogleVoice')
const Mail = require('../models/Mail')
const File = require('../models/File')
const Dump = require('../models/Dump')
const Card = require('../models/Card')
const Account = require('../models/Account')
const Ssn = require('../models/SsnDob')
const mongoose = require('mongoose')
const Payment = require('../models/Payment')

const productMap = {
  gVoice: GoogleVoice,
  mail: Mail,
  file: File,
  dump: Dump,
  card: Card,
  account: Account,
  ssn: Ssn,
}

const addToCart = async (req, res) => {
  const items = Array.isArray(req.body) ? req.body : [req.body]

  if (!items.length) {
    return res.status(400).json({ message: "Request body is empty" })
  }

  const { userId } = items[0]

  try {
    // Fetch or create cart
    let cart = await Cart.findOne({ userId })

    if (!cart) {
      cart = new Cart({
        userId,
        products: [],
      })
    }

    const existingProductIds = new Set(
      cart.products.map(p => p.productId.toString())
    )

    const addedProducts = []
    const skippedProducts = []

    for (const item of items) {
      const { productId, productType } = item

      if (!productMap[productType]) {
        skippedProducts.push({ productId, reason: "Invalid product type" })
        continue
      }

      if (existingProductIds.has(productId)) {
        skippedProducts.push({ productId, reason: "Already in cart" })
        continue
      }

      const product = await productMap[productType]
        .findById(new mongoose.Types.ObjectId(productId))
        .populate("price")

      if (!product) {
        skippedProducts.push({ productId, reason: "Product not found" })
        continue
      }

      cart.products.push({
        productId,
        productType,
        price: product.price.price,
        sellerId: product.sellerId,
      })

      existingProductIds.add(productId)
      addedProducts.push(productId)
    }

    await cart.save()

    return res.status(200).json({
      message: "Cart updated",
      addedCount: addedProducts.length,
      skippedCount: skippedProducts.length,
      addedProducts,
      skippedProducts,
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({
      message:
        "Something went wrong, if the problem persists contact support",
    })
  }
}

// const getCartByUserId = async (req, res) => {
//   const userId = req.params.userId;
//   if (!userId) return res.status(400).json({ messsage: "User Id is required" });

//   try {
//     const cart = await Cart.findOne({ userId: userId }).exec();

//   // Find the payment document for the user
//    const payment = await Payment.findOne({ userId: userId }).lean().exec();
//    const balanceObj = {};
//    if (!payment) {
//      balanceObj.balance = 0;
//     }else{
//       const balance = payment.balance;
//       balanceObj.balance = balance;
//     }

//     if (!cart) {
//       const emCart = [];
//       console.log("empty............")
//       return res.status(404).json({emCart:emCart, balanceObj});
//     }else{
//     const availableProducts = []
//     await Promise.all(
//      cart.products.map(async (item, index)=>{
//       if(item.productType === "gVoice" || item.productType === "ssn" || item.productType === "mail"){

//         let something = await productMap[item.productType].findById({_id: item.productId}).populate('price');
//         if(something.status === "Available"){
//          availableProducts.push({
//            description: something?.description,
//            category:something?.category,
//            price:something?.price?.price,
//          })
//         }else{
//            // Remove the product from the products array
//      cart.products.splice(item.productId, 1);
//         }
//       }else{

//        let something = await productMap[item.productType].findById({_id: item.productId});
//        if(something.status === "Available"){
//         availableProducts.push({
//           description: something?.description,
//           category:something?.category,
//           price:something?.price,
//         })
//        }else{
//           // Remove the product from the products array
//     cart.products.splice(item.productId, 1);
//        }
//       }

//     }))
//      // Save the updated cart
//     await cart.save();
//     console.log("arraaa ",availableProducts);

//     res.status(200).json({cart:availableProducts, balanceObj});
//     }
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

const getCartByUserId = async (req, res) => {
  const userId = req.params.userId
  if (!userId) return res.status(400).json({ messsage: 'User Id is required' })

  try {
    const [cart, payment] = await Promise.all([
      Cart.findOne({ userId: userId }).exec(),
      Payment.findOne({ userId: userId }).lean().exec(),
    ])

    const balanceObj = {}
    if (!payment) {
      balanceObj.balance = 0
    } else {
      const balance = payment.balance
      balanceObj.balance = balance
    }

    if (!cart) {
      const emCart = []
      return res.status(404).json({ emCart: emCart, balanceObj })
    } else {
      const availableProducts = []
      await Promise.all(
        cart.products.map(async (item, index) => {
          let something ={}
          if (
            item.productType === 'gVoice' ||
            item.productType === 'ssn' ||
            item.productType === 'mail'
          ) {
            // Handle gVoice, ssn, and mail products that require population
            something = await productMap[item.productType]
              .findById({ _id: item.productId })
              .populate('price')
          } else {
            // Handle products that are not gVoice, ssn, or mail and do not require population
            something = await productMap[item.productType].findById(
              item.productId,
            )
          }


          if (something?.status === 'Available') {
            availableProducts.push({
              description: something?.description,
              category: something?.productType,
              productId: something?._id,
              price: something?.price?.price || something?.price,
            })
          } else {
            // Remove the product from the products array
            cart.products.splice(index, 1)
          }
        }),
      )

      // Save the updated cart
      await cart.save()

      res.status(200).json({ cart: availableProducts, balanceObj })
    }
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const deleteProductFromCart = async (req, res) => {
  try {
    const userId = req.params.userId
    const productId = req.params.productId


    const cart = await Cart.findOne({ userId: userId }).exec()
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' })
    }

    // Find the index of the product by productId
    const productIndex = cart.products.findIndex(
      (product) => product.productId === productId,
    )
    if (productIndex === -1) {
      return res.status(404).json({ message: 'Product not found in cart' })
    }

    // Remove the product from the products array
    cart.products.splice(productIndex, 1)

    // Save the updated cart
    await cart.save()

    res.status(200).json({ message: 'Item removed' })
  } catch (err) {
    res.status(500).json({ message: 'Server Error' })
  }
}

const deleteCartProducts = async (req, res) => {
  try {
    const userId = req.params.userId

    // Find the cart by userId
    const cart = await Cart.findOne({ userId: userId }).exec()
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' })
    }

    // Clear all products from the products array
    cart.products = []

    // Save the updated cart
    await cart.save()

    res.status(200).json({ message: 'Cart cleared' })
  } catch (err) {
    console.error(err.message)
    res.status(500).json({ message: 'Server Error' })
  }
}

module.exports = {
  addToCart,
  getCartByUserId,
  deleteProductFromCart,
  deleteCartProducts,
}
