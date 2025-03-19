const ProductCategory = require("../models/ProductCategory");

const getProductCategory = async (req, res) => {
  const productType = req.params.productType;

  if (!productType)
    return res.status(404).json({ message: "Product type is required" });

  try {
    const productCategory = await ProductCategory.findOne({
      productType: productType,
    })
      .lean()
      .exec();

    if (!productCategory) {
      return res.status(404).json({ message: "Product category not found" });
    }
    // console.log(productCategory);
    res.status(200).json(productCategory);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Something went wrong, if the problem persists contact support",
    });
  }
};

const addProductCategory = async (req, res) => {
  const { productType, category } = req.body;

  if (!productType || !category)
    return res.status(404).json({ message: "All fields are required" });

  try {
    let productCategory = await ProductCategory.findOne({
      productType: productType,
    }).exec();

    if (!productCategory) {
      productCategory = new ProductCategory({
        productType: productType,
        categories: [
          {
            category: category,
          },
        ],
      });
    } else {
      const productCategoryIndex = productCategory.categories.findIndex(
        (product) => product.category === category
      );
      if (productCategoryIndex !== -1) {
        return res
          .status(400)
          .json({ message: "Product category already exist" });
      } else {
        productCategory.categories.push({
          category: category,
        });
      }
    }

    await productCategory.save();
    res.status(200).json({ message: "Category added successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Something went wrong, if the problem persists contact support",
    });
  }
};

const deleteProductCategory = async (req, res) => {
  try {
    const productType = req.params.productType;
    const category = req.params.category;

    const productCategory = await ProductCategory.findOne({
      productType: productType,
    }).exec();
    if (!productCategory) {
      return res.status(404).json({ message: "Product category not found" });
    }

    // Find the index of the product by productId
    const productCategoryIndex = productCategory.categories.findIndex(
      (product) => product.category === category
    );
    if (productCategoryIndex === -1) {
      return res.status(404).json({ message: "Product category not found " });
    }

    // Remove the product from the products array
    productCategory.categories.splice(productCategoryIndex, 1);

    // Save the updated cart
    await productCategory.save();

    res.status(200).json({ message: "Product category deleted" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  getProductCategory,
  addProductCategory,
  deleteProductCategory,
};
