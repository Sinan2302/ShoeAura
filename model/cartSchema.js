const mongoose = require("mongoose")
const {Schema} = mongoose

const cartSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    items: [{
        productId: {
            type: Schema.Types.ObjectId,
            ref: "product",
            required: true,
        },
        size: {
            type: String,
            required: true,
        },
        quantity: {
            type: Number,
            default: 1,
        },
        price: {
            type: Number,
            required: true,
        },
        discount: {
            type: Number,
            required: false,
        },
        total: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            default: 'placed'
        },
    }],
    finalTotal: { 
        type: Number, 
        required: false 
    },
    discountAmount: { 
        type: Number, 
        required: false 
    }
}, { timestamps: true });

const Cart = mongoose.model("Cart", cartSchema);
module.exports = Cart;
