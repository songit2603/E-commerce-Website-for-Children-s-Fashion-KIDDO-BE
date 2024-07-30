const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');
const Product = require('../models/productModel');
const ProductSnapshot = require('../models/productSnapshotModel');
const Variant1 = require('../models/variant1Model');
const Variant2 = require('../models/variant2Model');
const path = require("path");
const transporter = nodemailer.createTransport(
  smtpTransport({
    service: 'gmail',
    auth: {
      user: 'kiddoshop1st@gmail.com',
      pass: 'ovwb pxkj mvqi lxem', // Không nên lưu pass dạng plaintext
    },
  })
);
const sendOrderConfirmationEmail = async (order) => {
  try {
    const cid = 'logo@kiddoshop';
    
    // Đường dẫn đến hình ảnh logo cục bộ
    const imagePath = path.join(__dirname, '..', 'public/uploads', 'logo.png');

    // Tạo danh sách đính kèm với CID
    const attachments = [
      {
        filename: 'logo.png',
        path: imagePath,
        cid: cid,
      },
    ];
    let variantCid = "";
    const itemsHtml = await Promise.all(
      order.items.map(async (item) => {
        const productSnapshot = await ProductSnapshot.findById(item.product);
        const product = await Product.findById(productSnapshot.product);
        let productDescription = '';
        let variantCid = ""; // Khởi tạo variantCid cho mỗi item
        let foundVariantImage = false;
        if (product) {
          productDescription = `${item.quantity} x ${product.name}`;
          if (item.variant1?._id) {
            const variant1 = await Variant1.findById(item.variant1._id);
            productDescription += ` - ${variant1?.name || 'Variant1'}`;
            const variantImageName = variant1.imageName;
            const matchingImage = product.imagesVariant.find(
              (img) => img.name === variantImageName
            );
    
            if (matchingImage) {
              variantCid = `variant1_${variantImageName}@kiddoshop`;
              const imagePath = path.join(__dirname, '..', 'public/uploads', matchingImage.name);
    
              attachments.push({
                filename: matchingImage.name,
                path: imagePath,
                cid: variantCid,
              });
              foundVariantImage = true;
            }
          }
          if (item.variant2?._id) {
            const variant2 = await Variant2.findById(item.variant2._id);
            productDescription += ` / ${variant2?.name || 'Variant2'}`;
          }
          if(!foundVariantImage) {
            // Nếu không có ảnh của variant, sử dụng ảnh của sản phẩm chính
            const mainProductImage = product.images[0]; // Lấy ảnh đầu tiên của sản phẩm
            variantCid = `main_product_image_${product._id}@kiddoshop`; // Tạo CID mới cho ảnh của sản phẩm chính
            const mainImagePath = path.join(__dirname, '..', 'public/uploads', mainProductImage.name);
        
            attachments.push({
              filename: mainProductImage.name,
              path: mainImagePath,
              cid: variantCid,
            });
          }
        } else {
          productDescription = `Sản phẩm không rõ `;
        }
    
        // Sử dụng variantCid khởi tạo mới cho mỗi item
        const result = `<tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><img src="cid:${variantCid}" alt="Product Image" style="width: 50px; height: 50px; object-fit: cover;" /></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${productDescription}</td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.price}đ</td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.quantity}</td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${(item.price * item.quantity)}đ</td>
            </tr>`;
        return result;
      })
    );

    const emailHtml = `
      <div style="font-family: 'Roboto', sans-serif; padding: 20px; background: #f9f9f9; color: #333;">
        <div style="max-width: 800px; margin: auto; background: #ffffff; border: 1px solid #ddd; border-radius: 10px; box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);">
          <div style="padding: 20px; border-bottom: 1px solid #ddd; text-align: center;">
            <img src="cid:${cid}" alt="Kiddo Shop" style="width: 150px;" />
          </div>
          <div style="padding: 20px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">
                  <strong>Địa Chỉ</strong><br>
                  Số 1 đường Võ Văn Ngân, phường Linh Chiểu, thành phố Thủ Đức
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">
                  <strong>Email</strong><br>
                  <a href="mailto:kiddo@gmail.com">kiddo@gmail.com</a><br>
                  <strong>Website</strong><br>
                  <a href="https://www.kiddo.com">www.kiddo.com</a><br>
                  <strong>Liên hệ</strong><br>
                  +(84) 367151727
                </td>
              </tr>
            </table>
          </div>
          <div style="padding: 20px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">
                  <strong>HÓA ĐƠN SỐ:</strong><br>
                  ${order.orderCode}
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">
                  <strong>NGÀY TẠO:</strong><br>
                  ${order.createDate}
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">
                  <strong>TÌNH TRẠNG ĐƠN HÀNG:</strong><br>
                  ${order.status}
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">
                  <strong>TỔNG SỐ TIỀN:</strong><br>
                  ${(order.total)}đ
                </td>
              </tr>
            </table>
          </div>
          <div style="padding: 20px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">
                  <strong>THÔNG TIN KHÁCH HÀNG</strong><br>
                  Họ và tên: ${order.name}<br>
                  Số điện thoại: ${order.phoneNumber}<br>
                  Email: <a href="mailto:${order.email}">${order.email}</a>
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">
                  <strong>ĐỊA CHỈ GIAO HÀNG</strong><br>
                  ${order.shippingAddress}<br>
                  Phương thức thanh toán: ${order.paymentMethod}
                </td>
              </tr>
            </table>
          </div>
          <div style="padding: 20px;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f9f9f9;">
                  <th style="padding: 10px; border-bottom: 1px solid #ddd;">Hình ảnh</th>
                  <th style="padding: 10px; border-bottom: 1px solid #ddd;">Chi tiết sản phẩm</th>
                  <th style="padding: 10px; border-bottom: 1px solid #ddd;">Đơn giá</th>
                  <th style="padding: 10px; border-bottom: 1px solid #ddd;">Số lượng</th>
                  <th style="padding: 10px; border-bottom: 1px solid #ddd;">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml.join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="4" style="padding: 10px; text-align: right; border-top: 1px solid #ddd;">Tạm tính:</td>
                  <td colspan="2" style="padding: 10px; border-top: 1px solid #ddd;">${(order.totalItem)}đ</td>
                </tr>
                <tr>
                  <td colspan="4" style="padding: 10px; text-align: right;">Giảm giá:</td>
                  <td colspan="2" style="padding: 10px;">-${(order.voucherValue)}đ</td>
                </tr>
                <tr>
                  <td colspan="4" style="padding: 10px; text-align: right;">Thuế VAT (10%):</td>
                  <td colspan="2" style="padding: 10px;">${(order.totalItem*order.taxFee)/100}đ</td>
                </tr>
                <tr>
                  <td colspan="4" style="padding: 10px; text-align: right;">Phí giao hàng:</td>
                  <td colspan="2" style="padding: 10px;">${(order.shippingCost)}đ</td>
                </tr>
                <tr>
                  <td colspan="4" style="padding: 10px; text-align: right; font-weight: bold;">Tổng tiền:</td>
                  <td colspan="2" style="padding: 10px; font-weight: bold;">${(order.total)}đ</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div style="padding: 20px; text-align: center;">
            <p style="color: #333;">Có câu hỏi? Liên hệ chúng tôi qua email: <a href="mailto:support@kiddoshop.com" style="color: #3498db; text-decoration: underline;">support@kiddoshop.com</a></p>
            <p style="color: #333; margin-top: 20px;">Chúc bạn có trải nghiệm mua sắm tuyệt vời tại Kiddo Shop!</p>
          </div>
        </div>
      </div>
    `;

    const mailOptions = {
      from: 'Kiddoshop@gmail.com',
      to: order.email,
      subject: 'Xác Nhận Đơn Hàng - Kiddo Shop',
      html: emailHtml,
      attachments,
    };

    const result = await transporter.sendMail(mailOptions);
    return result;
  } catch (error) {
    console.error('Lỗi khi gửi email xác nhận đơn hàng:', error);
    throw error;
  }
};

const sendResetPasswordEmail = async (email, resetUrl) => {
  try {
    // Tạo email options
    const mailOptions = {
      from: 'your-email@gmail.com',
      to: email,
      subject: 'Reset Your Password',
      html: `
        <p>Bạn nhận được email này vì bạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
        <p>Vui lòng nhấp vào liên kết sau để đặt lại mật khẩu của bạn:</p>
        <a href="${resetUrl}">Đặt Lại Mật Khẩu</a>
        <p>Nếu bạn không yêu cầu điều này, vui lòng bỏ qua email này và mật khẩu của bạn sẽ không thay đổi.</p>
      `,
    };

    // Gửi email
    const result = await transporter.sendMail(mailOptions);
    return result;
  } catch (error) {
    console.error('Error sending reset password email:', error);
    throw error;
  }
};

module.exports = { sendOrderConfirmationEmail, sendResetPasswordEmail };