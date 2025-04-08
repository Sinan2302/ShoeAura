const mongoose = require("mongoose");
const { Schema } = mongoose;
const { v4: uuidv4 } = require("uuid");

const orderSchema = new Schema(
    {
        orderId: { 
            type: String, 
            default: () => uuidv4(), 
            unique: true 
        }, 
        userId: { 
            type: Schema.Types.ObjectId, 
            ref: "User", 
            required: true 
        },
        items: [
            {
                productId: { 
                    type: Schema.Types.ObjectId, 
                    ref: "product", 
                    required: true 
                },
                name: { type: String, required: true },
                size: { type: String, required: true },
                quantity: { type: Number, required: true },
                price: { type: Number, required: true },
                total: { type: Number, required: true },

                cancelled: { type: Boolean, default: false }, 
                cancellationReason: { type: String, default: "" },

                returnStatus: {
                    type: String,
                    enum: [
                        "Return Request Accepted", "Return Request Rejected", "Return Requested", "Returned"
                    ],
                    required: false
                },
        
                returnReason: { type: String, default: "" },
                returnImage: { type: String, default: "" },
                returnComment: { type: String, default: "" },
            },
        ],
        subtotal: { 
            type: Number, 
            required: true 
        },
        shippingCharge: { 
            type: Number, 
            required: true 
        },
        discountAmount: { 
            type: Number, 
            required: false 
        },
        totalAmount: { 
            type: Number, 
            required: true 
        },
        selectedAddress: { 
            type: Schema.Types.ObjectId, 
            ref: "Address", 
            required: true
        },
        paymentMethod: { 
            type: String, 
            enum: ["cod", "Razorpay", "PayPal", "Wallet"], 
            required: true 
        },

        status: { 
            type: String, 
            enum: [
                "Pending", "Processing", "Completed", "Shipped", "Delivered", 
                "Cancelled", "Return Requested", "Returned", "Confirmed", "Partially Returned", 
                "Payment Pending"
            ], 
            default: "Pending" 
        },
       
        cancellationReason: { type: String, default: "" },
        returnReason: { type: String, default: "" },
        returnComment: { type: String, default: "" },
    },
    { timestamps: true } 
);

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;