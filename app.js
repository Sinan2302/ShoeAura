const express = require('express')
const app = express()
const env = require("dotenv").config()
const connectDB = require('./config/db')
connectDB()



app.listen(process.env.PORT,()=>{
    console.log("server is running");
    
})

module.exports=app