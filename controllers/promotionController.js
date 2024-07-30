const mongoose = require('mongoose');
const Promotion = require('../models/promotionModel');
const Product = require('../models/productModel');
const fs = require("fs");
const path = require("path");
const { format } = require('date-fns'); 
const moment = require('moment');
const { StatusCodes } = require("http-status-codes");
const calculateProductPrices = async (product, promotionDiscount) => {
    let minPrice = null;
    let maxPrice = null;
    let newPrice = null;
    if (product.variant1 && product.variant1.length > 0) {
        for (const variant1 of product.variant1) {
            if (variant1.variant2 && variant1.variant2.length > 0) {
                for (const variant2 of variant1.variant2) {
                    const originalVariant2Price = Math.round(parseFloat(variant2.price) + (parseFloat(variant2.price) * (product.profit) / 100));
                    const newVariant2Price = Math.round(originalVariant2Price * (1 - (promotionDiscount) / 100));
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
                const originalVariant1Price = Math.round(parseFloat(variant1.price) + (parseFloat(variant1.price) * (product.profit) / 100));
                const newVariant1Price = Math.round(originalVariant1Price * (1 - (promotionDiscount) / 100));
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
        const originalPrice = Math.round(parseFloat(product.price) + (parseFloat(product.price) * (product.profit) / 100));
        newPrice =  Math.round(originalPrice * (1 - (promotionDiscount) / 100));
        product.originalPrice = originalPrice;
        product.newPrice = newPrice;
        product.netProfit = newPrice - parseFloat(product.price);
        await product.save();
        minPrice = newPrice;
        maxPrice = newPrice;
    }

    return { minPrice, maxPrice, newPrice };
};

const createPromotion = async (req, res) => {
    try {
        const { name, discount,products, startDate, endDate} = req.body;
        const banner = req.files.banner;
        const frameStyle = req.files.frameStyle;
        const normalizedName = name.trim().toLowerCase();
        const existingPromotions = await Promotion.find();

        const matchingPromotion = existingPromotions.find((promotion) => {
        const promotionName = promotion.name.trim().toLowerCase();
        // Loại bỏ khoảng trắng giữa các từ trong tên danh mục
        const normalizedPromotionName = promotionName.replace(/\s+/g, "");
        // Loại bỏ khoảng trắng giữa các từ trong tên đã nhập
        const normalizedInputName = normalizedName.replace(/\s+/g, "");

        // So sánh tên danh mục và tên đã nhập đã chuẩn hóa
        return normalizedPromotionName === normalizedInputName;
        });

        if (matchingPromotion) {
        // Tìm thấy danh mục khớp
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: "error",
            data: { message: "Promotion with the same name already exists." },
        });
        }
        let imageFrameData = [];
        if (frameStyle && frameStyle.length > 0) {
        imageFrameData = frameStyle.map((image) => {
        const imageName = path.basename(image.path);
        return {
            url: `http://localhost:5000/public/uploads/${path.basename(
            image.path
            )}`,
            name: imageName,
        };
        });
        }
        // Xử lý tệp đính kèm của banner ở đây
        let imageData = [];
        if (banner && banner.length > 0) {
        imageData = banner.map((image) => {
        const imageName = path.basename(image.path);
        return {
            url: `http://localhost:5000/public/uploads/${path.basename(
            image.path
            )}`,
            name: imageName,
        };
        });
        }
        // Lấy danh sách ID sản phẩm từ request body
        let productIds = products.split(',').map(productId => productId.trim());

        // Kiểm tra xem trong danh sách sản phẩm có sản phẩm nào đã có promotion không
        const productsWithPromotion = await Product.find({ _id: { $in: productIds }, promotion: { $exists: true, $ne: null } });

        if (productsWithPromotion.length > 0) {
            // Nếu có sản phẩm đã có promotion, loại bỏ chúng khỏi danh sách sản phẩm cần thêm promotion mới
            productIds = productIds.filter(productId => !productsWithPromotion.some(product => product._id == productId));
        }

        if (productIds.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'All products already have promotions. Cannot create promotion for any product again.'
            });
        }

        const promotion = new Promotion({
            name,
            discount,
            startDate: startDate,
            endDate: endDate,
            banner: imageData,
            products: productIds, // Chỉ lấy ObjectId của các sản phẩm
            frameStyle: imageFrameData
        });

        // Lưu chương trình khuyến mãi vào cơ sở dữ liệu
        const savedPromotion = await promotion.save();

        for (const productId of productIds) {
            // Tìm sản phẩm trong danh sách sản phẩm của ứng dụng
            const product = await Product.findById(productId).populate({
                path: 'variant1',
                populate: {
                    path: 'variant2'
                }
            });
            if (product) {
                if (!product.promotion || Object.keys(product.promotion).length === 0) {
                    // Nếu sản phẩm chưa có promotion nào, thì thêm promotion mới vào sản phẩm và tiến hành tính toán và cập nhật giá trị
                    product.frameStyle = imageFrameData;
                    product.promotion = savedPromotion._id
                    console.log("Before saving product:", product);
                    await product.save();
                    console.log("After saving product:", product);

                    // const { minPrice, maxPrice } = await calculateProductPrices(product, discount);
                    // product.minPrice = minPrice;
                    // product.maxPrice = maxPrice;
                    // product.discount = discount;
                    // await product.save();
                } else {
                    // Nếu sản phẩm đã có promotion, thì không cần thực hiện gì cả
                }
            }
        }

        res.status(201).json({
            status: 'success',
            data: savedPromotion
        });
    } catch (error) {
        console.error('Error creating promotion:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
const updatePromotion = async (req, res) => {
    const promotionId = req.params.id;
    const updatedData = req.body;
    const banner = req.files.banner;
    const frameStyle = req.files.frameStyle;
    const nameBanner = req.body.nameBanner;
    const nameFrame = req.body.nameFrame;
    try {
        // Tìm chương trình khuyến mãi cần cập nhật
        const promotion = await Promotion.findById(promotionId);

        if (!promotion) {
            return res.status(404).json({ status: 'error', message: `No promotion with the id ${promotionId}` });
        }

        // Cập nhật thông tin của chương trình khuyến mãi
        if (updatedData.name) {
            promotion.name = updatedData.name;
        }
        if (updatedData.discount) {
            promotion.discount = updatedData.discount;
            for (const productId of promotion.products) {
                const product = await Product.findById(productId).populate({
                    path: 'variant1',
                    populate: {
                        path: 'variant2'
                    }
                });

                if (product) {
                    const { minPrice, maxPrice, newPrice } = await calculateProductPrices(product, promotion.discount);
                    product.minPrice = minPrice;
                    product.maxPrice = maxPrice;
                    product.newPrice = newPrice;
                    product.discount = promotion.discount;
                    await product.save();
                }
            }
        }
        if (updatedData.startDate) {
            promotion.startDate = updatedData.startDate;
        }
        if (updatedData.endDate) {
            promotion.endDate = updatedData.endDate;
        }
        const uploadDirectory = "./public/uploads";
        const existingNameBanner = promotion.banner.map(image => image.name);
        console.log(nameBanner)
        for (const existingName of existingNameBanner) {
            // Kiểm tra nếu imageName không phải là mảng hoặc existingName không tồn tại trong imageName
            if (!nameBanner.includes(existingName)) {
                // Xóa ảnh từ thư mục uploadDirectory
                const imagePath = path.join(uploadDirectory, existingName);
                if (fs.existsSync(imagePath)) {
                    try {
                        fs.unlinkSync(imagePath);
                        console.log(`Đã xóa ảnh '${existingName}' từ thư mục.`);
                    } catch (error) {
                        console.error(`Lỗi khi xóa ảnh '${existingName}' từ thư mục: ${error.message}`);
                    }
                }

                // Xóa ảnh từ mảng product.imagesVariant
                const index = promotion.banner.findIndex(image => image.name === existingName);
                if (index !== -1) {
                    promotion.banner.splice(index, 1);
                    console.log(`Đã xóa ảnh '${existingName}' từ mảng product.images.`);
                }
            }
        }
        const existingNameFrame = promotion.frameStyle.map(image => image.name);
        for (const existingName of existingNameFrame) {
            // Kiểm tra nếu imageName không phải là mảng hoặc existingName không tồn tại trong imageName
            if (!nameFrame.includes(existingName)) {
                // Xóa ảnh từ thư mục uploadDirectory
                const imagePath = path.join(uploadDirectory, existingName);
                if (fs.existsSync(imagePath)) {
                    try {
                        fs.unlinkSync(imagePath);
                        console.log(`Đã xóa ảnh '${existingName}' từ thư mục.`);
                    } catch (error) {
                        console.error(`Lỗi khi xóa ảnh '${existingName}' từ thư mục: ${error.message}`);
                    }
                }

                // Xóa ảnh từ mảng product.imagesVariant
                const index = promotion.frameStyle.findIndex(image => image.name === existingName);
                if (index !== -1) {
                    promotion.frameStyle.splice(index, 1);
                    console.log(`Đã xóa ảnh '${existingName}' từ mảng product.images.`);
                }
                for (const productId of promotion.products) {
                    const product = await Product.findById(productId).populate({
                        path: 'variant1',
                        populate: {
                            path: 'variant2'
                        }
                    });
    
                    if (product) {
                        product.frameStyle = [];
                        await product.save();
                    }
                }
            }
        }
        if (banner && banner.length > 0) {
            imageData = banner.map((image) => {
                const imageName = path.basename(image.path);
                const existingBanner = promotion.banner.find(banner => banner.name === imageName);
                // Kiểm tra xem tên mới có tồn tại trong danh sách banner hiện tại không
                if (existingBanner) {
                    // Nếu có, sử dụng tên cũ
                    return existingBanner;
                } else {
                    // Nếu không, tạo một đối tượng mới với tên mới
                    return {
                        url: `http://localhost:5000/public/uploads/${imageName}`,
                        name: imageName,
                    };
                }
            });
            promotion.banner = imageData;
            await promotion.save();
        }
        if (frameStyle && frameStyle.length > 0) {
            imageFrameData = frameStyle.map((image) => {
                const imageName = path.basename(image.path);
                const existingFrameStyle = promotion.frameStyle.find(frame => frame.name === imageName);
                // Kiểm tra xem tên mới có tồn tại trong danh sách frameStyle hiện tại không
                if (existingFrameStyle) {
                    // Nếu có, sử dụng tên cũ
                    return existingFrameStyle;
                } else {
                    // Nếu không, tạo một đối tượng mới với tên mới
                    return {
                        url: `http://localhost:5000/public/uploads/${imageName}`,
                        name: imageName,
                    };
                }
            });
            promotion.frameStyle = imageFrameData;
            for (const productId of promotion.products) {
                const product = await Product.findById(productId).populate({
                    path: 'variant1',
                    populate: {
                        path: 'variant2'
                    }
                });

                if (product) {
                    product.frameStyle = imageFrameData;
                    await product.save();
                }
            }
        }
        // Nếu có sản phẩm được cung cấp để cập nhật
        if (updatedData.products && updatedData.products.length > 0) {
            // Lấy danh sách ID sản phẩm mới từ request body
            const newProductIds = updatedData.products.split(',').map(productId => productId.trim());
        
            // Lấy danh sách ID sản phẩm cũ từ chương trình khuyến mãi hiện tại
            const oldProductIds = promotion.products.map(productId => productId.toString());
        
            // Tìm các sản phẩm mới được thêm vào
            let productsToAdd = newProductIds.filter(productId => !oldProductIds.includes(productId));
            const productsWithExistingPromotion = await Product.find({ _id: { $in: productsToAdd }, promotion: { $exists: true, $ne: null } });
        
            if (productsWithExistingPromotion.length > 0) {
                // Nếu có sản phẩm mới đã có promotion, loại bỏ chúng khỏi danh sách sản phẩm mới cần thêm promotion
                productsToAdd = productsToAdd.filter(productId => !productsWithExistingPromotion.some(product => product._id == productId));
            }
        
            // Tìm các sản phẩm bị xóa khỏi chương trình khuyến mãi
            const productsToRemove = oldProductIds.filter(productId => !newProductIds.includes(productId));
        
            // Thêm và xóa các sản phẩm chỉ khi promotion đang diễn ra và isStart là true
            if (promotion.isStart === 'Started') {
                // Thêm các sản phẩm mới vào chương trình khuyến mãi
                promotion.products = promotion.products.concat(productsToAdd);
        
                // Xóa các sản phẩm không còn trong danh sách mới
                for (const productId of productsToRemove) {
                    const index = promotion.products.indexOf(productId);
                    if (index !== -1) {
                        promotion.products.splice(index, 1);
                    }
                }
        
                // Đặt giá trị discount của sản phẩm mới bằng discount của promotion
                for (const productId of productsToAdd) {
                    const product = await Product.findById(productId).populate({
                        path: 'variant1',
                        populate: {
                            path: 'variant2'
                        }
                    });
        
                    if (product) {
                        if (!product.promotion || product.promotion.length === 0) {
                            // Nếu sản phẩm chưa có promotion nào, thì thêm promotion mới vào sản phẩm và tiến hành tính toán và cập nhật giá trị
                            product.promotion = promotion._id
                            product.frameStyle = promotion.frameStyle;
                            await product.save();
        
                            const { minPrice, maxPrice, newPrice } = await calculateProductPrices(product, promotion.discount);
                            product.minPrice = minPrice;
                            product.maxPrice = maxPrice;
                            product.newPrice = newPrice;
                            product.discount = promotion.discount;
                            await product.save();
                        }
                    }
                }
        
                // Đặt giá trị discount của sản phẩm bị xóa thành 0 và tính toán lại giá trị price
                for (const productId of productsToRemove) {
                    const product = await Product.findById(productId).populate({
                        path: 'variant1',
                        populate: {
                            path: 'variant2'
                        }
                    });
        
                    if (product) {
                        await Product.updateOne({ _id: productId }, { $set: { promotion: null, frameStyle: [] } });
                        const { minPrice, maxPrice, newPrice } = await calculateProductPrices(product, 0);
                        product.minPrice = minPrice;
                        product.maxPrice = maxPrice;
                        product.newPrice = newPrice;
                        product.discount = 0;
                        await product.save();
                    }
                }
            } else if (promotion.isStart === 'Pending' || promotion.isStart === 'Finished') {
                // Chỉ thêm và xóa sản phẩm khi promotion không đang diễn ra và isStart là false
                // Thêm các sản phẩm mới vào chương trình khuyến mãi
                promotion.products = promotion.products.concat(productsToAdd);
                for (const productId of productsToAdd) {
                    const product = await Product.findById(productId).populate({
                        path: 'variant1',
                        populate: {
                            path: 'variant2'
                        }
                    });
        
                    if (product) {
                        if (!product.promotion || product.promotion.length === 0) {
                            // Nếu sản phẩm chưa có promotion nào, thì thêm promotion mới vào sản phẩm và tiến hành tính toán và cập nhật giá trị
                            product.promotion = promotion._id;
                            product.frameStyle = promotion.frameStyle;
                            await product.save();
                        }
                    }
                }
                // Xóa các sản phẩm không còn trong danh sách mới
                for (const productId of productsToRemove) {
                    const index = promotion.products.indexOf(productId);
                    if (index !== -1) {
                        promotion.products.splice(index, 1);
                    }
                    const product = await Product.findById(productId).populate({
                        path: 'variant1',
                        populate: {
                            path: 'variant2'
                        }
                    });
                    if (product) { 
                        await Product.updateOne({ _id: productId }, { $set: { promotion: null } });
                        await product.save();
                    }
                }
            }
        } else {
            // Xóa tất cả các sản phẩm khỏi chương trình khuyến mãi
            await Product.updateMany(
                { promotion: promotionId }, // Tìm các sản phẩm có promotionId cần loại bỏ
                { $set: { promotion: null, discount: 0, frameStyle: [] } } // Đặt promotion về null và discount về 0
            );
            for (const productId of promotion.products) {
                const product = await Product.findById(productId).populate({
                    path: 'variant1',
                    populate: {
                        path: 'variant2'
                    }
                });

                if (product) {
                    const { minPrice, maxPrice, newPrice } = await calculateProductPrices(product, 0);
                    product.minPrice = minPrice;
                    product.maxPrice = maxPrice;
                    product.newPrice = newPrice;
                    product.discount = 0;
                    await product.save();
                }
            }
            promotion.products = [];
        }
        // Lưu chương trình khuyến mãi đã cập nhật vào cơ sở dữ liệu
        const updatedPromotion = await promotion.save();

        // Trả về kết quả thành công
        return res.status(200).json({ status: 'success', data: updatedPromotion });
    } catch (error) {
        console.error('Error updating promotion:', error);
        return res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
const getAllPromotions = async (req, res) => {
    try {
      const promotions = await Promotion.find().populate({ path: "products", populate: {path: "brand category"}} );
      res.status(StatusCodes.OK).json({ status: 'success', data: promotions});
    } catch (error) {
      console.error(error.stack);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ status: 'error', data: { message: 'Lỗi server' } });
    }
};
const getPromotionById = async (req, res) => {
    const { id: promotionId } = req.params;
  
    try {
        const promotion = await Promotion.findOne({ _id: promotionId }).populate({ path: "products", populate: {path: "brand category"}} );
        
        if (!promotion) {
            return res.status(404).json({ status: 'error', data: { message: `No promotion with the id ${promotionId}` } });
        } else {
            return res.status(201).json({ status: 'success', data: promotion });
        }
    } catch (error) {
        console.error(error.stack);
        return res.status(500).json({ status: 'error', data: { message: 'Internal server error' } });
    }
};
const removePromotionById = async (req, res) => {
    const promotionId = req.params.id;

    try {
        // Tìm promotion theo ID
        const promotion = await Promotion.findById(promotionId);

        if (!promotion) {
            return res.status(404).json({ status: 'error', message: `No promotion with the id ${promotionId}` });
        }

        // Xóa promotion
        await Promotion.findByIdAndDelete(promotionId);

        // Xóa reference promotion trong các sản phẩm
        await Product.updateMany(
            { promotion: promotionId }, // Tìm các sản phẩm có promotionId cần loại bỏ
            { $set: { promotion: null, discount: 0, frameStyle: [] } } // Đặt promotion về null và discount về 0
        );
        for (const productId of promotion.products) {
            const product = await Product.findById(productId).populate({
                path: 'variant1',
                populate: {
                    path: 'variant2'
                }
            });

            if (product) {
                const { minPrice, maxPrice, newPrice } = await calculateProductPrices(product, 0);
                product.minPrice = minPrice;
                product.maxPrice = maxPrice;
                product.newPrice = newPrice;
                product.discount = 0;
                await product.save();
            }
        }
        // Trả về kết quả thành công
        return res.status(200).json({ status: 'success', message: `Promotion with id ${promotionId} has been deleted.`, promotion: promotionId });
    } catch (error) {
        console.error('Error removing promotion:', error);
        return res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
const removeExpiredPromotions = async () => {
    try {
        const promotions = await Promotion.find();
        const currentTime = new Date(); // Thời gian hiện tại

        // Lọc các khuyến mãi đã hết hạn
        const expiredPromotions = promotions.filter(promotion => {
            // Chuyển đổi endDate từ chuỗi sang đối tượng Date
            const endDate = moment(promotion.endDate, 'HH:mm DD/MM/YYYY').toDate();
            // So sánh endDate với currentTime
            return endDate <= currentTime;
        });
        for (const promotion of expiredPromotions) {
            await Product.updateMany(
                { promotion: promotion._id }, // Tìm các sản phẩm có promotionId cần loại bỏ
                { $set: { promotion: null, discount: 0, frameStyle: [] } } // Đặt promotion về null và discount về 0
            );

            for (const productId of promotion.products) {
                const product = await Product.findById(productId).populate({
                    path: 'variant1',
                    populate: {
                        path: 'variant2'
                    }
                });

                if (product) {
                    const { minPrice, maxPrice, newPrice } = await calculateProductPrices(product, 0);
                    product.minPrice = minPrice;
                    product.maxPrice = maxPrice;
                    product.newPrice = newPrice;
                    product.discount = 0;
                    await product.save();
                }
            }
            await Promotion.updateOne({ _id: promotion._id }, { $set: { products: [] } });
            promotion.isStart = 'Finished';
            await promotion.save();
        }
    } catch (error) {
        console.error('Error removing expired promotions:', error);
    }
};
const applyDiscountForOngoingPromotions = async () => {
    try {
        // Lấy tất cả các chương trình khuyến mãi
        const promotions = await Promotion.find();
        const currentTime = new Date(); // Thời gian hiện tại

        // Lọc các chương trình khuyến mãi đang diễn ra
        const ongoingPromotions = promotions.filter(promotion => {
            // Chuyển đổi startDate từ chuỗi sang đối tượng Date
            const startDate = moment(promotion.startDate, 'HH:mm DD/MM/YYYY').toDate();
            const endDate = moment(promotion.endDate, 'HH:mm DD/MM/YYYY').toDate();
            // So sánh startDate với currentTime
            return startDate <= currentTime && endDate > currentTime;
        });
        // Áp dụng discount cho các sản phẩm trong các chương trình khuyến mãi đang diễn ra
        for (const promotion of ongoingPromotions) {
            promotion.isStart = 'Started'; // Đặt trường isStart thành true
            await promotion.save();
            // Áp dụng discount cho từng sản phẩm trong chương trình khuyến mãi
            for (const productId of promotion.products) {
                const product = await Product.findById(productId).populate({
                    path: 'variant1',
                    populate: {
                        path: 'variant2'
                    }
                });

                if (product) {
                    // Tính toán giá trị mới cho sản phẩm với discount của chương trình khuyến mãi
                    const { minPrice, maxPrice, newPrice } = await calculateProductPrices(product, promotion.discount);
                    product.minPrice = minPrice;
                    product.maxPrice = maxPrice;
                    product.newPrice = newPrice;
                    product.discount = promotion.discount;
                    await product.save();
                }
            }
        }
    } catch (error) {
        console.error('Error applying discount for ongoing promotions:', error);
    }
};
module.exports = {
    createPromotion,
    updatePromotion,
    getPromotionById,
    removeExpiredPromotions,
    removePromotionById,
    applyDiscountForOngoingPromotions,
    getAllPromotions
};