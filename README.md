# E-commerce-Website-for-Children-s-Fashion-KIDDO-BE
This is a API service for client UI in this repo.
Tech Stack
Client: React, Redux
Server: Node, Express
Environment Variables
To run this project, you will need to add the following environment variables to your .env file

PORT (default 4000)

JWT_SECRET JWT_LIFETIME (for JWT and cookies validation)

SMTP_USER SMTP_PASSWORD (google smtp configuration for nodemailer)

VNP_TMNCODE VNP_HASHSECRET VNP_URL VNP_API VNP_RETURN_URL (configuration for VNPay service. You can create one here)

NGROK_AUTHTOKEN (for tunneling from localhost to internet, you can create one here)

Notices : With this ngrok implementation, the tunnel URL will reset each time you restart the project. Therefore, I recommend creating your own VNPay configuration to easily manage the IPN URL. Route for ipn is {tunnelURL}/api/order/vnpay_ipn
