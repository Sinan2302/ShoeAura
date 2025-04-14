const Razorpay = require("razorpay");
require("dotenv").config();


const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const createOrder = async (amount, currency = "INR", receiptId) => {
    try {
        const options = {
            amount: amount * 100, 
            currency,
            receipt: receiptId || `receipt_${Math.random() * 1000}`,
            payment_capture: 1,
        };

        const order = await razorpay.orders.create(options);
        return order; 
    } catch (error) {
        throw new Error(error.message); 
    }
};

module.exports = createOrder;
