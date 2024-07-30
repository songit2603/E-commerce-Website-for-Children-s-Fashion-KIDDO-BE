
# Ecomerce platform API

This is a REST API built using Node.js and Express.js for eCommerce. It provides endpoints for user authentication, product management, review management, and order management.

## Tech Stack

**Client:** React, Redux

**Server:** Node, Express

## Environment Variables

To run this project, you will need to add the following environment variables to your .env file

`PORT` (default 4000)

`JWT_SECRET`
`JWT_LIFETIME` (for JWT and cookies validation)

`SMTP_USER`
`SMTP_PASSWORD` (google smtp configuration for [nodemailer](https://nodemailer.com))

`VNP_TMNCODE`
`VNP_HASHSECRET`
`VNP_URL`
`VNP_API`
`VNP_RETURN_URL` (configuration for VNPay service. You can create one [here](https://sandbox.vnpayment.vn/apis/docs/gioi-thieu/))

`NGROK_AUTHTOKEN` (for tunneling from localhost to internet, you can create one [here](https://ngrok.com))

> **Notices** : With this ngrok implementation, the tunnel URL will reset each time you restart the project. Therefore, I recommend creating your own VNPay configuration to easily manage the [IPN URL](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html). Route for ipn is `{tunnelURL}/api/order/vnpay_ipn`


## Running Tests

> We use **MongoDB Community** version **6.0.6**

To run tests, run the following command

- Repare image data

  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;1. Download folder `uploads` from this [url](https://drive.google.com/file/d/1jZ0BfGoaYJP5RoTTrqXWErT7JmBwXdYA/view?usp=sharing)

  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;2. Extract and put it in `/src/public`

  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;3. Final structure should be like this
```
src
└───public
    │───css
    └───uploads
         │──[uid].img
         └──...
```


- Install dependency packages

```bash
  npm install
```

- Import json data

```bash
  npm run generate
```

- Run test enviroment

```bash
  npm run devStart
```.
