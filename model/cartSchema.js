const mongoose = require("mongoose")
const {Schema} = mongoose

const cartSchema  = new Schema({
    userId:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true,
    },
    items:[{
        productId:{
            type:Schema.Types.ObjectId,
            ref:"product",
            required:true,
        },
        quantity:{
            type:Number,
            default:1,
        },
        price:{
            type:Number,
            required:true,
        },
        total:{
            type:Number,
            required:true,
        },
        status :{
            type:Number,
            default:'placed'
        },
        
    }]
})

const cart = mongoose.model("cart",cartSchema)
module.exports