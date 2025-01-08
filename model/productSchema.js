const mongoose = require("mongoose");
const { Schema } = mongoose;

const productSchema = new Schema({
    productname: {
        type: String,
        required: true,
        unique: true,
    },
    description: {
        type: String,
        required: true,
    },
    category: {
        type: Schema.Types.ObjectId,
        ref: "category",
        required: true,
    },
    brand: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    SalePrice: {
        type: Number,
        required: true,
    },
    productOffer: {
        type: Number,
        default: 0,
    },
    stockQuantity: {
        type: Number,
        required: false,
    },
    colors: {
        type: [String],
        required: false,
    },
    productImages: {
        type: [String],
        required: true,
    },
    sizes: {
         type: Map,
          of: Number 
    }, 
    isBlocked: {
        type: Boolean,
        default: false,
    },
    status: {
        type: String,
        enum: ["Available", "Out of Stock"],
        required: true,
        default: "Available",  
    },
}, { timestamps: true });

const product = mongoose.model("product", productSchema);
module.exports = product;
