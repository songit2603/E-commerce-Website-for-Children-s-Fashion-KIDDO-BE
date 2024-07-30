
# Ecomerce platform API

This is a REST API built using Node.js and Express.js for eCommerce. It provides endpoints for user authentication, product management, brand management, category management, review management, order management,...

## Tech Stack

**Client:** React, Redux

**Server:** Node, Express

## Environment Variables

To run this project, you will need to add the following environment variables to your .env file

`PORT` (default 5000)

`JWT_SECRET`
`JWT_LIFETIME` (for JWT and cookies validation)
default.js file in folder config
VNP_TMNCODE VNP_HASHSECRET VNP_URL VNP_API VNP_RETURN_URL (configuration for VNPay service. You can create one here)
> **Notices** : With this ngrok implementation, the tunnel URL will reset each time you restart the project. Therefore, I recommend creating your own VNPay configuration to easily manage the [IPN URL](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html). Route for ipn is `{tunnelURL}/api/order/vnpay_ipn`


## Running Tests

- Install dependency packages

```bash
  npm install
```

- Import json data from folder Data


- Run test enviroment

```bash
  npm run start
```.
