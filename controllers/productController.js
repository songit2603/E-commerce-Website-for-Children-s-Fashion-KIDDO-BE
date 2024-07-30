const mongoose = require('mongoose');
const Product = require("../models/productModel");
const Review = require("../models/reviewModel");
const Category = require("../models/categoryModel");
const Brand = require("../models/brandModel");
const Variant2 = require("../models/variant2Model");
const { format } = require("date-fns");
const Variant1 = require("../models/variant1Model");
const CustomError = require("../errors");
const { StatusCodes } = require("http-status-codes");
const fs = require("fs");
const path = require("path");
// ** ===================  CALCULATOR PRICE  ===================
const calculateProductPrices = async (product, profit, discount) => {
  let minPrice = null;
  let maxPrice = null;
  let newPrice = null;
  if (product.variant1 && product.variant1.length > 0) {
      for (const variant1 of product.variant1) {
          if (variant1.variant2 && variant1.variant2.length > 0) {
              for (const variant2 of variant1.variant2) {
                  const originalVariant2Price = Math.round(parseFloat(variant2.price) + (parseFloat(variant2.price) * (profit) / 100));
                  const newVariant2Price = Math.round(originalVariant2Price * (1 - (discount) / 100));
                  variant2.originalPrice = originalVariant2Price;
                  variant2.newVariant2Price = newVariant2Price;
                  variant2.netProfit = newVariant2Price - parseFloat(variant2.price);
                  if (minPrice === null || newVariant2Price < minPrice) {
                      minPrice = newVariant2Price;
                  }
                  if (maxPrice === null || newVariant2Price > maxPrice) {
                      maxPrice = newVariant2Price;
                  }
                  newPrice = minPrice;
                  await variant2.save();
              }
          } else {
              const originalVariant1Price = Math.round(parseFloat(variant1.price) + (parseFloat(variant1.price) * (profit) / 100));
              const newVariant1Price = Math.round(originalVariant1Price * (1 - (discount) / 100));
              variant1.originalPrice = originalVariant1Price;
              variant1.newVariant1Price = newVariant1Price;
              variant1.netProfit = newVariant1Price - parseFloat(variant1.price);
              if (minPrice === null || newVariant1Price < minPrice) {
                  minPrice = newVariant1Price;
              }
              if (maxPrice === null || newVariant1Price > maxPrice) {
                  maxPrice = newVariant1Price;
              }
              newPrice = minPrice;
              await variant1.save();
          }
      }
  } else {
      const originalPrice = Math.round(parseFloat(product.price) + (parseFloat(product.price) * (profit) / 100));
      newPrice =  Math.round(originalPrice * (1 - (discount) / 100));
      product.originalPrice = originalPrice;
      product.newPrice = newPrice;
      product.netProfit = newPrice - parseFloat(product.price);
      await product.save();
      minPrice = newPrice;
      maxPrice = newPrice;
  }

  return { minPrice, maxPrice, newPrice };
};
// ** ===================  CONTENT BASED FILTERING  ===================
const deepSearch = (object, searchTerm, visited = new Set()) => {
  if (object === null || !searchTerm) return false;
  if (typeof object === 'string' || typeof object === 'number') {
    return object.toString().toLowerCase().includes(searchTerm.toLowerCase());
  }
  if (typeof object === 'object') {
    if (visited.has(object)) {
      return false; // Tránh lặp vô hạn bằng cách bỏ qua các đối tượng đã được duyệt qua
    }
    visited.add(object); // Đánh dấu đối tượng đã được duyệt qua
    return Object.values(object).some(value => deepSearch(value, searchTerm, visited));
  }
  return false;
};

async function findRelatedProducts(product) {
  const allProducts = await Product.find(); // Lấy tất cả sản phẩm
  const searchTerms = product.name.toLowerCase().split(/\s+/); // Tách các từ từ tên sản phẩm

  // Xác định giới tính của sản phẩm hiện tại
  const genderKeywords = ["bé trai", "bé gái"];
  let productGender = null;
  for (let keyword of genderKeywords) {
    if (product.name.toLowerCase().includes(keyword) || product.description.toLowerCase().includes(keyword))
    {
      productGender = keyword;
      break;
    }
  }

  // Xác định loại sản phẩm hiện tại và ánh xạ sản phẩm bổ sung
  const productTypes = {
    "đầm váy": ["quần short", "chân váy", "áo thun", "đầm váy", "balo", "túi xách", "quần lót"],
    "chân váy": ["áo khoác", "áo thun", "áo", "quần lót", "giày"],
    "áo khoác": ["đầm váy", "bộ thun", "áo thun"],
    "áo thun": ["áo thun", "quần short", "áo khoác", "chân váy", "quần"],
    "quần kaki": ["áo thun", "áo khoác"],
    "quần short": ["áo thun", "áo khoác"],
    "quần nỉ": ["dài tay"],
    "quần legging": ["túi xách", "áo thun"],
    "quần thô": ["áo thun dài tay"],
    "bộ thun": ["bộ thun", "áo thun", "quần", "quần lót", "balo"],
    "áo sơ mi": ["quần", "balo", "sandal"],
    "áo lót": ["quần lót"],
    "bộ nỉ": ["balo", "áo khoác", "áo thun", "quần kaki", "quần nỉ"]
  };

  let productType = null;
  for (let type in productTypes) {
    if (product.name.toLowerCase().includes(type)) {
      productType = type;
      break;
    }
  }

  // Tìm các sản phẩm liên quan dựa trên giới tính và ánh xạ loại sản phẩm bổ sung
  const relatedProducts = allProducts.filter(p =>
    p._id.toString() !== product._id.toString() &&
    (!productGender || (productGender && deepSearch(p.name, productGender))) &&
    (productType && productTypes[productType].length > 0 && productTypes[productType].some(type => deepSearch(p.name, type)))
  );

  return relatedProducts;
}
// ** ===================  CREATE PRODUCT  ===================
const createProduct = async (req, res) => {
  // Set the user ID in the request body
  const {
    name,
    stock,
    price,
    profit,
    specification,
    description,
    linkrv,
    discount,
    categoryId,
    brandId,
    variant1,
    isPublish,
    variantName1,
    variantName2,
  } = req.body;
  const images = req.files.images;
  let minPrice = null;
  let maxPrice = null;
  try {
    const normalizedName = name.trim().toLowerCase();
    const existingProducts = await Product.find();

    const matchingProduct = existingProducts.find((product) => {
      const productName = product.name.trim().toLowerCase();
      // Loại bỏ khoảng trắng giữa các từ trong tên danh mục
      const normalizedProductName = productName.replace(/\s+/g, "");
      // Loại bỏ khoảng trắng giữa các từ trong tên đã nhập
      const normalizedInputName = normalizedName.replace(/\s+/g, "");

      // So sánh tên danh mục và tên đã nhập đã chuẩn hóa
      return normalizedProductName === normalizedInputName;
    });

    if (matchingProduct) {
      // Tìm thấy danh mục khớp
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: "error",
        data: { message: "Product with the same name already exists." },
      });
    }
    const imageData = images.map((image) => {
      const imageName = path.basename(image.path);
      return {
        url: `http://localhost:5000/public/uploads/${path.basename(
          image.path
        )}`,
        name: imageName,
      };
    });
    const name_slug = name.trim().toLowerCase().replace(/\s+/g, "-");
    // Create the product object and set the image property
    const originalPrice = Math.round(parseFloat(price) + (parseFloat(price) * profit/100));
    const newPrice = Math.round(originalPrice * (1 - discount/100));
    const product = new Product({
      name,
      name_slug,
      stock,
      price,
      profit,
      specification,
      description,
      linkrv,
      discount,
      images: imageData,
      category: categoryId,
      brand: brandId,
      variant1: [],
      isPublish,
      originalPrice: originalPrice,
      newPrice: newPrice,
      netProfit: newPrice - price,
      variantName1,
      variantName2,
      maxPrice: newPrice,
      minPrice: newPrice,
      //user: userId
      // Include other properties from req.body
      // For example: tensanpham, soluong, dongia, etc.
    });
    // Kiểm tra xem mảng variant1 có dữ liệu không
    if (variant1 && variant1.length > 0) {
      const imagesVariant = req.files.imagesVariant;
      const imageVariantData = imagesVariant.map((image) => {
        const imageName = path.basename(image.path);
        return {
          url: `http://localhost:5000/public/uploads/${path.basename(
            image.path
          )}`,
          name: imageName,
        };
      });
      product.imagesVariant = imageVariantData;
      product.price = null;
      product.originalPrice = null;
      product.newPrice = null;
      product.netProfit = null;
      let totalStock = 0; 
      let variantClassCount = 0;
      for (let i = 0; i < variant1.length; i++) {
        const { name, variant2, price: variant1Price, stock: variant1Stock, imageName, index} = variant1[i];

        const newVariant1 = new Variant1({
          name,
          variant2: [],
          stock: variant1Stock,
          imageName,
          index
        });
        if (variant2 && variant2.length > 0) {
          for (const variation2Data of variant2) {
            const { name, price, stock: variant2Stock, position, index} = variation2Data;
            const originalVariant2Price = Math.round(parseFloat(price) + (parseFloat(price) * profit / 100));
            const newVariant2Price = Math.round(originalVariant2Price * (1 - discount / 100));
            const newVariant2 = new Variant2({
              name,
              price,
              stock: variant2Stock,
              variant1: newVariant1._id,
              originalPrice: originalVariant2Price,
              newVariant2Price: newVariant2Price,
              netProfit: newVariant2Price - parseFloat(price),
              position,
              index
            });
            newVariant1.variant2.push(newVariant2);
            totalStock += parseFloat(variant2Stock);
            variantClassCount = 2;
            // product.price = null;

            if (minPrice === null || newVariant2Price  < minPrice) {
              minPrice = newVariant2Price ;
            }
            if (maxPrice === null || newVariant2Price  > maxPrice) {
              maxPrice = newVariant2Price ;
            }

            await newVariant2.save();
          }
        } else {
          if (variant1Price) {
            const originalVariant1Price = Math.round(parseFloat(variant1Price) + (parseFloat(variant1Price) * profit / 100));
            const newVariant1Price = Math.round(originalVariant1Price * (1 - discount / 100));
            newVariant1.price = variant1Price;
            newVariant1.originalPrice = originalVariant1Price;
            newVariant1.newVariant1Price = newVariant1Price;
            newVariant1.netProfit = newVariant1Price - parseFloat(variant1Price);

            // product.price = null;

            if (minPrice === null || newVariant1Price < minPrice) {
              minPrice = newVariant1Price;
            }
            if (maxPrice === null || newVariant1Price > maxPrice) {
              maxPrice = newVariant1Price;
            }
          } else {
            minPrice = null;
            maxPrice = null;
          }
          totalStock += parseFloat(variant1Stock);
          variantClassCount = 1;
        }

        await newVariant1.save();
        product.variant1.push(newVariant1._id);
      }
      product.stock = totalStock;
      product.variantClassCount = variantClassCount;
      product.minPrice = minPrice;
      product.maxPrice = maxPrice;
      product.newPrice = minPrice;
    }
    product.publishedDate = format(new Date(), "HH:mm dd/MM/yyyy");
    product.updatedAt = format(new Date(), "HH:mm dd/MM/yyyy");
    // Create the product in the database
    await product.save();
    const category = await Category.findById(categoryId);
    category.products.push(product);
    await category.save();

    const brand = await Brand.findById(brandId);
    brand.products.push(product);
    await brand.save();
    product.category = category;
    product.brand = brand;
    await product.save();
    res
      .status(StatusCodes.CREATED)
      .json({ status: "success", data: { product } });
  } catch (error) {
    console.error(error.stack);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ status: "error", data: { message: "Lỗi server" } });
  }
};

// ** ===================  GET ALL PRODUCTS  ===================
const getAllProducts = async (req, res) => {
  try {
    let products = await Product.find()
      .populate({ path: "category", select: "name" })
      .populate({ path: "brand", select: "name" })
      .populate({ path: "promotion" })
      .populate({
        path: "variant1",
        populate: {
          path: "variant2",
          options: { sort: { index: 0 } }
        },
        options: { sort: { index: 0 } }
      });

    if (products.length === 0) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ status: "error", data: { message: "Không có sản phẩm nào." } });
    }

    for (let i = 0; i < products.length; i++) {
      
      // Gán giá trị newPrice bằng giá trị minPrice của sản phẩm
      products[i].newPrice = products[i].minPrice;
      
      await products[i].save();
    }

    res.status(StatusCodes.OK).json({ status: "success", data: products });
  } catch (error) {
    console.error(error.stack);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ status: "error", data: { message: "Lỗi server" } });
  }
};

// ** ===================  GET SINGLE PRODUCT  ===================
const getSingleProduct = async (req, res) => {
  const { id: productId } = req.params;

  try {
    const product = await Product.findOne({ _id: productId })
      .populate({ path: "reviews", populate: {path: "variant1 variant2 product user reviewComments.shopOwner"}} )
      .populate({ path: "category", select: "name" })
      .populate({ path: "brand", select: "name" })
      .populate({ path: "promotion" })
      .populate({ path: "relatedProducts" })
      .populate({
        path: "variant1",
        populate: {
          path: "variant2",
          options: { sort: { index: 0 } }
        },
        options: { sort: { index: 0 } }
      });   
    if (!product) {
      res
        .status(StatusCodes.NOT_FOUND)
        .json({
          status: "error",
          data: { message: `No product with the id ${productId}` },
        });
    } else {
      const allReviews = await Review.find({ product: productId });
      let averageRating = 0;
      const ratingCounts = {
        fiveStar: 0,
        fourStar: 0,
        threeStar: 0,
        twoStar: 0,
        oneStar: 0
      };
      allReviews.forEach(review => {
        averageRating += review.rating;
        if (review.rating === 5) ratingCounts.fiveStar++;
        else if (review.rating === 4) ratingCounts.fourStar++;
        else if (review.rating === 3) ratingCounts.threeStar++;
        else if (review.rating === 2) ratingCounts.twoStar++;
        else if (review.rating === 1) ratingCounts.oneStar++;
      });

      if (allReviews.length > 0) {
        const totalRating = allReviews.reduce((acc, curr) => acc + curr.rating, 0);
        averageRating = parseFloat((totalRating / allReviews.length).toFixed(1)); // Làm tròn đến 1 chữ số thập phân
      }

      product.averageRating = averageRating;
      product.ratingCounts = ratingCounts;
      const relatedProducts = await findRelatedProducts(product);
      product.relatedProducts = relatedProducts;
       // Lưu thông tin về số lượng đánh giá theo mỗi sao
      await product.save();
      res.status(StatusCodes.OK).json({ status: "success", data:  product });
    }
  } catch (error) {
    console.error(error.stack);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ status: "error", data: { message: "Lỗi server" } });
  }
};
// ** ===================  UPDATE PRODUCT  ===================
const updateProduct = async (req, res) => {
  const productId = req.params.id;
  const updatedData = req.body;
  const images = req.files.images;
  const nameImages = req.body.nameImages;
  const imagesVariant = req.files.imagesVariant;
  try {
    const product = await Product.findById(productId).populate({
      path: 'variant1',
      populate: {
          path: 'variant2'
      }
  });

    if (!product) {
      return res
        .status(404)
        .json({
          status: "error",
          data: { message: "Không tìm thấy sản phẩm" },
        });
    }
      const uploadDirectory = "./public/uploads";
      const existingNames = product.images.map(image => image.name);
      for (const existingName of existingNames) {
        // Kiểm tra nếu imageName không phải là mảng hoặc existingName không tồn tại trong imageName
        if (!nameImages.includes(existingName)) {
            // Xóa ảnh từ thư mục uploadDirectory
            const imagePath = path.join(uploadDirectory, existingName);
            if (fs.existsSync(imagePath)) {
                try {
                    fs.unlinkSync(imagePath);
                } catch (error) {
                    console.error(`Lỗi khi xóa ảnh '${existingName}' từ thư mục: ${error.message}`);
                }
            }

            // Xóa ảnh từ mảng product.imagesVariant
            const index = product.images.findIndex(image => image.name === existingName);
            if (index !== -1) {
                product.images.splice(index, 1);
                console.log(`Đã xóa ảnh '${existingName}' từ mảng product.images.`);
            }
        }
      }
    if (images && images.length > 0) {
      const oldImageUrls = product.images.map(image => image.url);
    
      // Lưu hình ảnh mới vào thư mục cục bộ và cập nhật đường dẫn
      const newImageData = images.map((image) => {
        const imageNameWithExtension = path.basename(image.path);
        const imageName = imageNameWithExtension;
        return {
          url: `http://localhost:5000/public/uploads/${imageNameWithExtension}`,
          name: imageName, 
        };
      });
    
      // Thêm các ảnh mới vào mảng ảnh của sản phẩm chỉ khi chúng không trùng với các ảnh cũ
      const uniqueNewImageData = newImageData.filter(image => !oldImageUrls.includes(image.url));
      product.images = product.images.concat(uniqueNewImageData);
    }
      if (updatedData.profit && updatedData.discount) {
        product.profit = updatedData.profit
        product.discount = updatedData.discount
        const { minPrice, maxPrice, newPrice } = await calculateProductPrices(product, updatedData.profit, updatedData.discount);
        product.minPrice = minPrice;
        product.maxPrice = maxPrice;
        product.newPrice = newPrice;
      }
      if (updatedData.name) {
        const normalizedName = updatedData.name.trim().toLowerCase();
        const existingProducts = await Product.find();
  
        const matchingProduct = existingProducts.find((existingProduct) => {
          const productName = existingProduct.name.trim().toLowerCase();
          const normalizedProductName = productName.replace(/\s+/g, "");
          const normalizedInputName = normalizedName.replace(/\s+/g, "");
          return (
            normalizedProductName === normalizedInputName &&
            existingProduct._id.toString() !== productId
          );
        });
  
        if (matchingProduct) {
          return res.status(400).json({
            status: "error",
            data: { message: "Tên sản phẩm đã tồn tại." },
          });
        }
      }
      if (updatedData.price !== null && updatedData.price !== undefined && !updatedData.variant1 ) {
        let minPrice = null;
        let maxPrice = null;
        const updatedOriginalPrice  = Math.round(parseFloat(updatedData.price) + (parseFloat(updatedData.price) * (updatedData.profit/100)));
        product.originalPrice = updatedOriginalPrice;
        const updatedNewPrice = Math.round(updatedOriginalPrice * (1 - (updatedData.discount/100)));
        product.newPrice = updatedNewPrice;
        product.netProfit = updatedNewPrice - updatedData.price;
        if (minPrice === null || updatedNewPrice < minPrice) {
          minPrice = updatedNewPrice;
        }
        if (maxPrice === null || updatedNewPrice > maxPrice) {
          maxPrice = updatedNewPrice;
        }
        product.minPrice = minPrice;
        product.maxPrice = maxPrice;
      }
      if (!updatedData.variant1 || updatedData.variant1.length === 0) {
        product.variantClassCount = 0;
        product.variant1 = [];
        
      }
      if (updatedData.variant1 ) {
        let minPrice = null;
        let maxPrice = null;
        const product = await Product.findById(productId);
        const hasVariant2 = updatedData.variant1.some(variant => variant.variant2 && variant.variant2.length > 0);
        product.variantClassCount = hasVariant2 ? 2 : 1;
        const variant1IdOlds = product.variant1;
        const variant1IdOldsStrings = variant1IdOlds.map(id => id.toString());
        const variant1s = await Variant1.find({ _id: { $in: variant1IdOlds } });
        const variant1NameOlds = variant1s.map(variant1 => variant1.name);
        const variant1Ids = variant1s.map(variant1 => variant1.id);
        let variant2IdOlds = []; // Khai báo ở đây để có thể truy cập bên ngoài vòng lặp
        variant1s.forEach(variant1 => {
            // Truy cập vào trường variant2 của mỗi đối tượng Variant1
            const variant2Ids = variant1.variant2;
            variant2IdOlds.push(...variant2Ids); // Thêm các id của variant2 vào mảng variant2IdOlds
        });
        const variant2s = await Variant2.find({ _id: { $in: variant2IdOlds } });
        const variant2NameOlds = variant2s.map(variant2 => variant2.name);
        // Convert các ObjectId sang chuỗi
        const variant2IdOldsStrings = variant2IdOlds.map(id => id.toString());
        const variant2Ids = variant2s.map(variant2 => variant2.id);
        const variant1 = updatedData.variant1
        if (variant1 && variant1.length > 0) {
          let totalStock = 0; 
          const variant1IdsToUpdate = [];
          const variant2IdsToUpdate = [];
          for (let i = 0; i < variant1.length; i++) {
              const { id, name, variant2, price: variant1Price, stock: variant1Stock, imageName, index } = variant1[i];
              const variantIdExists = variant1Ids.includes(variant1[i].id);
              // Cập nhật thông tin của variant1
              const variant1NameExists = variant1NameOlds.includes(name);
              if (!variant1NameExists && !variantIdExists) {
                // Nếu tên variant1 mới không tồn tại trong mảng variant1NameOlds, tạo mới đối tượng variant1
                // và cập nhật thông tin
                const newVariant = await Variant1.create({ name, price: variant1Price, stock: variant1Stock, imageName, variant2: [], index });
                variant1IdsToUpdate.push(newVariant._id);
                product.variant1.push(newVariant._id);
                console.log(newVariant.variant2)
                if (variant2 && variant2.length > 0) {
                  // Nếu có variant2, xử lý tạo mới và cập nhật giá cho từng variant2
                  for (const variant2Data of variant2) {
                    const { name: variant2Name, price: variant2Price, stock: variant2Stock, index, position } = variant2Data;
                    const newVariant2 = await Variant2.create({ name: variant2Name, price: variant2Price, stock: variant2Stock, index, position });
                    variant2IdsToUpdate.push(newVariant2._id);
                    newVariant.variant2.push(newVariant2._id);
                    console.log(newVariant.variant2)
                    console.log(newVariant2._id)
                    await newVariant.save()
                    totalStock += parseFloat(variant2Stock);
              
                    const originalVariant2Price = parseFloat(variant2Price) + (parseFloat(variant2Price) * (updatedData.profit) / 100);
                    const newVariant2Price = originalVariant2Price * (1 - (updatedData.discount) / 100);
                    newVariant2.originalPrice = originalVariant2Price;
                    newVariant2.newVariant2Price = newVariant2Price;
                    newVariant2.netProfit = newVariant2Price - parseFloat(variant2Price);
              
                    if (minPrice === null || newVariant2Price < minPrice) {
                      minPrice = newVariant2Price;
                    }
                    if (maxPrice === null || newVariant2Price > maxPrice) {
                      maxPrice = newVariant2Price;
                    }
                    await newVariant2.save();
                  }
                } else {
                  // Nếu không có variant2, xử lý giá cho variant1
                  const originalVariant1Price = parseFloat(variant1Price) + (parseFloat(variant1Price) * (updatedData.profit) / 100);
                  const newVariant1Price = originalVariant1Price * (1 - (updatedData.discount) / 100);
                  newVariant.originalPrice = originalVariant1Price;
                  newVariant.newVariant1Price = newVariant1Price;
                  newVariant.netProfit = newVariant1Price - parseFloat(variant1Price);
              
                  if (minPrice === null || newVariant1Price < minPrice) {
                    minPrice = newVariant1Price;
                  }
                  if (maxPrice === null || newVariant1Price > maxPrice) {
                    maxPrice = newVariant1Price;
                  }
                  totalStock += parseFloat(variant1Stock);
                  await newVariant.save();
                }
              }
              else if (variantIdExists) {
                const variantId = variant1[i].id;
                await Variant1.findByIdAndUpdate(variantId, { name, price: variant1Price, stock: variant1Stock, imageName, index});
                variant1IdsToUpdate.push(variantId);
              
                // Kiểm tra và cập nhật thông tin của variant2 nếu có
                if (variant2 && variant2.length > 0) {
                  for (const variation2Data of variant2) {
                      const { id: variant2Id, name: variant2Name, price: variant2Price, stock: variant2Stock, index, position } = variation2Data;
                      const variant2IdExists = variant2Ids.includes(variant2Id);
                      const variant2NameExists = variant2NameOlds.includes(variant2Name);
                      if (!variant2NameExists && !variant2IdExists) {
                        const newVariant2 = await Variant2.create({ name: variant2Name, price: variant2Price, stock: variant2Stock, index, position });
                        variant2IdsToUpdate.push(newVariant2._id);
                        
                        // Tìm biến thể variant1 tương ứng để thêm biến thể mới của variant2 vào đó
                        const variant1ToUpdate = await Variant1.findById(variantId); // Sử dụng ID của variant1
                        // const variant1ToUpdate = await Variant1.findOne({ name: variant1Name }); // Sử dụng tên của variant1

                        if (variant1ToUpdate) {
                            // Thêm ID của biến thể mới của variant2 vào mảng variant2 của biến thể variant1
                            variant1ToUpdate.variant2.push(newVariant2._id);
                            await variant1ToUpdate.save();

                            totalStock += parseFloat(variant2Stock);

                            // Tính toán và cập nhật giá trị originalPrice của sản phẩm
                            const originalVariant2Price = parseFloat(variant2Price) + (parseFloat(variant2Price) * (updatedData.profit) / 100);
                            const newVariant2Price = originalVariant2Price * (1 - (updatedData.discount) / 100);
                            newVariant2.originalPrice = originalVariant2Price;
                            newVariant2.newVariant2Price = newVariant2Price;
                            newVariant2.netProfit = newVariant2Price - parseFloat(variant2Price);

                            if (minPrice === null || newVariant2Price < minPrice) {
                                minPrice = newVariant2Price;
                            }
                            if (maxPrice === null || newVariant2Price > maxPrice) {
                                maxPrice = newVariant2Price;
                            }
                            await newVariant2.save();
                        }
                      }
                      else if (variant2IdExists) {
                        variant2IdsToUpdate.push(variant2Id);
                        // Cập nhật thông tin của variant2
                        await Variant2.findByIdAndUpdate(variant2Id, { name: variant2Name, price: variant2Price, stock: variant2Stock, index });
                        const originalVariant2Price = parseFloat(variant2Price) + (parseFloat(variant2Price) * (updatedData.profit) / 100);
                        const newVariant2Price = originalVariant2Price * (1 - (updatedData.discount) / 100); // Sửa biến originalVariant1Price thành originalVariant2Price
                
                        // Cập nhật thông tin mới tính toán được của variant2
                        await Variant2.findByIdAndUpdate(variant2Id, { 
                            originalPrice: originalVariant2Price, // Sửa biến originalVariant1Price thành originalVariant2Price
                            newVariant2Price: newVariant2Price, // Đổi tên biến newVariant1Price thành newVariant2Price
                            netProfit: newVariant2Price - parseFloat(variant2Price) // Sửa biến variant1Price thành variant2Price
                        });
                
                        // Cập nhật minPrice và maxPrice nếu cần
                        if (minPrice === null || newVariant2Price < minPrice) { // Sửa biến newVariant1Price thành newVariant2Price
                            minPrice = newVariant2Price; // Sửa biến newVariant1Price thành newVariant2Price
                        }
                        if (maxPrice === null || newVariant2Price > maxPrice) { // Sửa biến newVariant1Price thành newVariant2Price
                            maxPrice = newVariant2Price; // Sửa biến newVariant1Price thành newVariant2Price
                        }
                        totalStock += parseFloat(variant2Stock);
                      }
                }
              }
              else
              {     
                    const originalVariant1Price = parseFloat(variant1Price) + (parseFloat(variant1Price) * (updatedData.profit) / 100);
                    const newVariant1Price = originalVariant1Price * (1 - (updatedData.discount) / 100);
                    // Cập nhật thông tin mới tính toán được của variant1
                    await Variant1.findByIdAndUpdate(variantId, { 
                        originalPrice: originalVariant1Price,
                        newVariant1Price: newVariant1Price,
                        netProfit: newVariant1Price - parseFloat(variant1Price)
                    });
                    // Cập nhật minPrice và maxPrice nếu cần
                    if (minPrice === null || newVariant1Price < minPrice) {
                        minPrice = newVariant1Price;
                    }
                    if (maxPrice === null || newVariant1Price > maxPrice) {
                        maxPrice = newVariant1Price;
                    }
                    totalStock += parseFloat(variant1Stock);
              }
            }
          }
        const id2sToDelete = [];
              for (const oldId of variant2IdOldsStrings) {
                // Kiểm tra xem ID có tồn tại trong mảng các ID được cập nhật không
                if (!variant2IdsToUpdate.includes(oldId)) {
                  // Nếu ID không tồn tại trong mảng các ID được cập nhật, thêm ID vào mảng để xóa
                  id2sToDelete.push(oldId);
                }
              }
        await Variant1.updateMany(
          { _id: { $in: variant1IdsToUpdate } }, // Điều kiện tìm kiếm các đối tượng Variant1 cần cập nhật
          { $pull: { variant2: { $in: id2sToDelete } } } // Xóa các id2sToDelete khỏi mảng variant2
        );
        for (const idToDelete of id2sToDelete) {
          await Variant2.deleteOne({ _id: idToDelete });
        }
        const id1sToDelete = [];
        for (const oldId of variant1IdOldsStrings) {
          // Kiểm tra xem ID có tồn tại trong mảng các ID được cập nhật không
          if (!variant1IdsToUpdate.includes(oldId)) {
          // Nếu ID không tồn tại trong mảng các ID được cập nhật, thêm ID vào mảng để xóa
            id1sToDelete.push(oldId);
          }
        }
        await Product.updateOne(
          { _id: productId },
          { $pull: { variant1: { $in: id1sToDelete } } }
        );
        for (const idToDelete of id1sToDelete) {
          await Variant1.deleteOne({ _id: idToDelete });
          console.log(`Deleted variant with id ${idToDelete}`);
        }
        const nameCheck = [];
          variant1.forEach(item => {
              nameCheck.push(item.imageName);
        });
        const existingNames = product.imagesVariant.map(image => image.name);
        const oldImageVariantUrls = product.imagesVariant.map(image => image.url);
        // Lặp qua tất cả các existingName trong mảng existingNames
        for (const existingName of existingNames) {
            // Kiểm tra nếu imageName không phải là mảng hoặc existingName không tồn tại trong imageName
            if (!nameCheck.includes(existingName)) {
                // Xóa ảnh từ thư mục uploadDirectory
                // Xóa ảnh từ mảng product.imagesVariant
                const index = product.imagesVariant.findIndex(image => image.name === existingName);
                if (index !== -1) {
                    product.imagesVariant.splice(index, 1);
                }
            }
        }
        if (imagesVariant && imagesVariant.length > 0) {
        const imagesVariant = req.files.imagesVariant;
          const imageVariantData = imagesVariant.map((image) => {
            const imageName = path.basename(image.path);
            return {
              url: `http://localhost:5000/public/uploads/${path.basename(
                image.path
              )}`,
              name: imageName,
            };
        });
        const uniqueNewImageData = imageVariantData.filter(image => !oldImageVariantUrls.includes(image.url));
        product.imagesVariant = product.imagesVariant.concat(uniqueNewImageData);
      }
        // Cập nhật totalStock, minPrice và maxPrice cho product
        updatedData.stock = totalStock;
        product.minPrice = minPrice;
        product.maxPrice = maxPrice;
        product.newPrice = minPrice;
      }
      await product.save();
    }
    delete updatedData.variant1;
    Object.assign(product, updatedData);
    product.updatedAt = format(new Date(), "HH:mm dd/MM/yyyy");
    if (updatedData.categoryId) {
      // Xóa sản phẩm khỏi danh mục cũ
      await Category.updateOne(
        { products: productId },
        { $pull: { products: productId } }
      );
    
      // Thêm sản phẩm vào danh mục mới
      await Category.updateOne(
        { _id: updatedData.categoryId },
        { $addToSet: { products: productId } }
      );
      
      // Cập nhật thông tin sản phẩm
      await Product.updateOne(
        { _id: productId },
        { $set: { category: updatedData.categoryId } }
      );
    }
    
    if (updatedData.brandId) {
      // Xóa sản phẩm khỏi thương hiệu cũ
      await Brand.updateOne(
        { products: productId },
        { $pull: { products: productId } }
      );
    
      // Thêm sản phẩm vào thương hiệu mới
      await Brand.updateOne(
        { _id: updatedData.brandId },
        { $addToSet: { products: productId } }
      );
      
      // Cập nhật thông tin sản phẩm
      await Product.updateOne(
        { _id: productId },
        { $set: { brand: updatedData.brandId } }
      );
    }
    product.updatedAt = format(new Date(), "HH:mm dd/MM/yyyy");
    await product.save();
    
    res.status(StatusCodes.OK).json({ status: "success", data:  product  });
  } catch (error) {
    console.error(error.stack);
    res.status(500).json({ status: "error", data: { message: "Lỗi server" } });
  }
};

// ** ===================  DELETE PRODUCT  ===================
const deleteProduct = async (req, res) => {
  const productId = req.params.id; // Extract the productId from the request body

  if (!productId) {
    return res
      .status(400)
      .json({
        status: "error",
        data: { message: "Missing productId in request body" },
      });
  }

  try {
    const product = await Product.findById(productId).populate({
      path: 'variant1',
      populate: {
        path: 'variant2'
      }
    });

    if (!product) {
      return res
        .status(404)
        .json({
          status: "error",
          data: { message: "Không tìm thấy sản phẩm" },
        });
    }

    // Kiểm tra nếu ordersCount bằng 0 mới thực hiện xóa sản phẩm
    if (product.ordersCount === 0) {
      // Collect all Variant2 IDs from the Variant1 related to the product
      let variant2Ids = [];
      product.variant1.forEach(v1 => {
        if (v1.variant2 && v1.variant2.length > 0) {
          variant2Ids = variant2Ids.concat(v1.variant2);  // Collecting all Variant2 IDs
        }
      });

      if (variant2Ids.length > 0) {
        // Delete all Variant2s that have been collected
        await Variant2.deleteMany({ _id: { $in: variant2Ids } });
      }

      // Xóa toàn bộ màu sắc và biến thể liên quan đến sản phẩm
      await Variant1.deleteMany({ _id: { $in: product.variant1 } });
      

      const categoryId = product.category;
      const brandId = product.brand;

      // Xóa sản phẩm khỏi danh sách sản phẩm (products) của danh mục và thương hiệu
      const [category, brand] = await Promise.all([
        Category.findById(categoryId),
        Brand.findById(brandId),
      ]);

      if (category) {
        category.products.pull(productId);
        await category.save();
      }

      if (brand) {
        brand.products.pull(productId);
        await brand.save();
      }

      const uploadDirectory = "./public/uploads";
      // Xóa hình ảnh cục bộ
      product.images.forEach((image) => {
        const imagePath = path.join(uploadDirectory, path.basename(image.url));

        if (fs.existsSync(imagePath)) {
          try {
            fs.unlinkSync(imagePath);
          } catch (error) {
            console.error(`Lỗi khi xóa tệp ${imagePath}: ${error.message}`);
          }
        }
      });
      product.imagesVariant.forEach((image) => {
        const imagePath = path.join(uploadDirectory, path.basename(image.url));

        if (fs.existsSync(imagePath)) {
          try {
            fs.unlinkSync(imagePath);
          } catch (error) {
            console.error(`Lỗi khi xóa tệp ${imagePath}: ${error.message}`);
          }
        }
      });

      // Thực hiện xóa sản phẩm
      await Product.findByIdAndDelete(productId);

      return res.json({
        status: "success",
        data: { message: "Sản phẩm đã được xóa" },
      });
    } else {
      return res
        .status(400)
        .json({
          status: "error",
          data: { message: "Sản phẩm có đơn đặt hàng, không thể xóa" },
        });
    }
  } catch (error) {
    console.error(error.stack);
    res.status(500).json({ status: "error", data: { message: "Lỗi server" } });
  }
};


// ** ===================  UPLOAD IMAGE PRODUCT  ===================
const uploadImage = async (req, res) => {
  if (!req.files) {
    throw new CustomError.BadRequestError("No File Uploaded");
  }
  const productImage = req.files.image;
  if (!productImage.mimetype.startsWith("image")) {
    throw new CustomError.BadRequestError("Please Upload Image");
  }
  const maxSize = 1024 * 1024;
  if (productImage.size > maxSize) {
    throw new CustomError.BadRequestError("Please upload image smaller 1MB");
  }
  const imagePath = path.join(
    __dirname,
    "../public/uploads/" + `${productImage.name}`
  );
  await productImage.mv(imagePath);
  res.status(StatusCodes.OK).json({ image: `/uploads/${productImage.name}` });
};

module.exports = {
  createProduct,
  getAllProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
  uploadImage,
};
