const mongoose = require("mongoose")
const {Schema} = mongoose


const categorySchema = new Schema({
    categoryname:{
        type:String,
        required:true,
        unique:true,
    },
    description :{
        type:String,
        required:true,
    },
    isBlocked:{
        type:Boolean,
        default: false, 
    },
    categoryOffer:{
        type:Number,
        default:0,
    },
    categoryImage:{
        type: [String],
        required: true,
    },
    createdAt:{
        type:Date,
        default:Date.now,
    },
    updatedAt:{
        type:Date,
        default:Date.now,
    }

})

const category = mongoose.model("category",categorySchema)

module.exports = category