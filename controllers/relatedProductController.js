const express = require('express');
const Product = require('../models/productModel');
const addRelatedProduct = async (req, res) => {
    const productId = req.params.id;
    const { relatedProductIds } = req.body;

    try {
        let productIds = relatedProductIds.split(',').map(productId => productId.trim());
        // Fetch the product to which you want to add a related product
        const product = await Product.findById(productId);
        
        if (!product) {
            return res.status(404).send('Product not found');
        }

        // Add the related product ID to the relatedProducts field
        product.relatedProducts = productIds;

        await product.save();
        res.status(201).json({
            status: 'success',
            data: product
        });
    } catch (error) {
        console.error('Error creating promotion:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
}
const updateRelatedProduct = async (req, res) => {
    const productId = req.params.id;
    const { relatedProductIds } = req.body;

    try {
        // Phân tích và chuẩn bị danh sách ID sản phẩm mới từ yêu cầu
        const newProductIds = relatedProductIds.split(',').map(id => id.trim());

        // Tìm sản phẩm hiện tại
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).send('Product not found');
        }

        // Nếu relatedProductIds là chuỗi rỗng, xóa tất cả các sản phẩm liên quan cũ
        if (relatedProductIds === "") {
            product.relatedProducts = [];
        } else {
            // Lấy danh sách ID sản phẩm liên quan cũ và chuyển đổi chúng thành chuỗi để so sánh
            const oldProductIds = product.relatedProducts.map(id => id.toString());

            // Xác định các ID để thêm mới (các ID không có trong danh sách cũ)
            const toAdd = newProductIds.filter(id => !oldProductIds.includes(id));

            // Xác định các ID để xóa (các ID không có trong danh sách mới)
            const toRemove = oldProductIds.filter(id => !newProductIds.includes(id));

            // Lọc các sản phẩm hiện có, chỉ giữ lại những sản phẩm nằm trong danh sách mới
            product.relatedProducts = product.relatedProducts.filter(id => !toRemove.includes(id.toString()));

            // Thêm các sản phẩm mới bằng cách sử dụng concat
            product.relatedProducts = product.relatedProducts.concat(toAdd);
        }

        // Lưu cập nhật sản phẩm
        await product.save();
        res.status(201).json({
            status: 'success',
            data: product
        });
    } catch (error) {
        console.error('Error updating related products:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};


module.exports = {
    addRelatedProduct,
    updateRelatedProduct
};
