const mongoose = require('mongoose');
const { Schema } = mongoose;

const CouponSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    createdOn: {
        type: Date,
        default: Date.now,
        required: true
    },
    expiresOn: {  
        type: Date,
        required: true
    },
    offerPrice: {
        type: Number,
        required: true
    },
    minPurchase: {  
        type: Number,
        required: true
    },
    isActive: {  
        type: Boolean,
        default: true
    },
    userId: [{
        type: Schema.Types.ObjectId,
        ref: "User"
    }]
}, { timestamps: true }); 

const Coupon = mongoose.model("Coupon", CouponSchema);
module.exports = Coupon;
