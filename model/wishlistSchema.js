const mongoose = require("mongoose")
const {Schema}  = mongoose


const whishlistSchema = new Schema({
    userId:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true,
    },
    products:[{
        productId:{
            type:Schema.Types.ObjectId,
            ref:"product",
            required:true,
        },
        addedOn:{
            type:Date,
            default:Date.now
        }
    }]
})

const wishlist = mongoose.model("wishlist",whishlistSchema)
module.exports = wishlist