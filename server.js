require("dotenv").config()
require("express-async-errors")
const http = require('http');
const socketIO = require('socket.io'); 
const express = require("express")
const app = express()
const server = http.createServer(app); // Tạo server HTTP
const io = socketIO(server, {
  cors: {
    origin: "http://localhost:3005", // Cho phép truy cập từ origin này
    methods: ["GET", "POST"]
  }
}); // Gắn Socket.io vào server
// const fileUpload = require('express-fileupload');
// // Rest of the packages



const morgan = require("morgan") //HTTP request logger middleware
const cookieParser = require("cookie-parser")
// Require Database
const connectDB = require("./db/connect")
const { createProxyMiddleware } = require('http-proxy-middleware');
// Require Routers
const authRouter = require("./routes/authRoutes")
const userRouter = require("./routes/userRoutes")
const productRouter = require("./routes/productRoutes")
const categoryRouter = require("./routes/categoryRoutes")
const brandRouter = require("./routes/brandRoutes")
const reviewRouter = require("./routes/reviewRoutes")
const orderRouter = require("./routes/orderRoutes")
const cartRouter = require("./routes/cartRoutes")
const blogRouter = require("./routes/blogRoutes")
const revenueRouter = require("./routes/revenueRoutes")
const addressRouter = require("./routes/addressRoutes")
const promotionRouter = require("./routes/promotionRoutes")
const notificationRouter = require("./routes/notificationRoutes")
const recommendRouter = require("./routes/recommendRoutes")
const relatedProductRouter = require("./routes/relatedProductRoutes")
const rankRouter = require("./routes/ranksRoutes")
const voucherRoutes = require("./routes/voucherRoutes")
// const promotionMiddleware = require('./utils/promotionMiddleware');
// Require Middleware
const notFoundMiddleware = require("./middleware/not-found")
const errorHandlerMiddleware = require("./middleware/error-handler")
const bodyParser = require('body-parser');
const cors = require('cors');
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3005','http://127.0.0.1:3005'], // Thay thế bằng tên miền hoặc nguồn gốc của trang web bạn muốn cho phép truy cập
  credentials: true, // Bật cho phép gửi cookie và thông tin xác thực
}));

// Invoke Extra packages
app.use(morgan("tiny"))
app.use(bodyParser.json());
app.use(express.json())
app.use(cookieParser(process.env.JWT_SECRET))
app.use(express.static("./public"))
// app.use("/api/v1/apps/product", promotionMiddleware, productRouter);
// // Middleware to disable caching

// app.use((req, res, next) => {
//   res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
//   res.setHeader('Pragma', 'no-cache');
//   res.setHeader('Expires', '0');
//   next();
// });
app.use((req, res, next) => {
  req.io = io; // Đặt `io` vào `req` để các middleware/controller khác có thể dùng
  next();
});

io.on('connection', (socket) => {
  console.log('New client connected');

  // Xử lý khi client ngắt kết nối
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Home get
app.get("/", (req, res) => {
  res.send("<h1> E-Commerce API</h1>")
})

// Testing route
app.get("/api/v1/", (req, res) => {
  res.send("E-commerce API")
})
app.use('/public/uploads', express.static('public/uploads'));
// Invoke Routers
app.use("/api/v1/auth", authRouter)
app.use("/api/v1/apps/account", userRouter)
app.use("/api/v1/apps/product", productRouter)
app.use("/api/v1/apps/category", categoryRouter)
app.use("/api/v1/apps/brand", brandRouter)
app.use("/api/v1/apps/review", reviewRouter)
app.use("/api/v1/apps/order", orderRouter) 
app.use("/api/v1/apps/cart", cartRouter)
app.use("/api/v1/apps/blog", blogRouter)
app.use("/api/v1/apps/revenue", revenueRouter)
app.use("/api/v1/apps/address", addressRouter)
app.use("/api/v1/apps/promotion", promotionRouter)
app.use("/api/v1/apps/notification", notificationRouter)
app.use("/api/v1/apps/recommend", recommendRouter)
app.use("/api/v1/apps/related-product", relatedProductRouter)
app.use("/api/v1/apps/rank", rankRouter)
app.use("/api/v1/apps/voucher", voucherRoutes)
// Invoke Middleware
app.use(notFoundMiddleware)
app.use(errorHandlerMiddleware)
// app.use(fileUpload());
const port = process.env.PORT || 5000
const start = async () => {
  try {
    // Connect database
    await connectDB(process.env.MONGO_URL)
    server.listen(port, () =>
      console.log(`🚀 Server is listening on port ${port}...`)
    )
  } catch (error) {
    console.log(error)
  }
}

start()
