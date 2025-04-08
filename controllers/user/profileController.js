const User = require('../../model/userSchema')
const Address = require('../../model/addressSchema')
const mongoose = require('mongoose')
const Order = require('../../model/orderSchema')
const bcrypt = require("bcrypt");
const nodemailer = require('nodemailer')
const Product = require('../../model/productSchema')
const crypto = require("crypto");
const createOrder = require('../../middleware/Razorpay')
const uploadProductImages = require('../../utils/cloudinary')
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");



const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        console.log("Password hash generated:", passwordHash);
        return passwordHash;
    } catch (error) {
        console.error("Error hashing password:", error.message);

        throw new Error("Password hashing failed. Please try again.");
    }
};


function generateOtp (){
    return Math.floor(100000 + Math.random()*900000).toString()
}

async function sentVerificationOtp(email,otp){
    try {
        const transporter = nodemailer.createTransport({
            service:"gmail",
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD
            }
        })

        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: 'Verify your account',
            text: `Your OTP is ${otp}`,
            html: `<b>Your OTP: ${otp}</b>`,
        });
        return info.accepted.length>0

    } catch (error) {
        console.error("Error Sending email",error)
        return false;
    }
}
const UserProfile = async (req, res) => {
    try {
        const isLogin = req.session.user;
        
        if (!isLogin) {
            return res.redirect('/login'); 
        }

        const breadcrumbs = [ 
            { name: 'Home', url: '/' },
            { name: 'User Profile', url: '/UserProfile' },
        ];

        const user = await User.findOne({ _id: isLogin });

        if (user) {
            res.render('profile', { isLogin, user, breadcrumbs });
        } else {
            res.redirect('/');
        }
    } catch (error) {
        console.error("User Profile Error:", error);
        res.status(500).send("Internal Server Error");
    }
};

const edit_profile = async (req, res) => {
    try {
        const { name,  phone } = req.body;
        const isLogin = req.session.user
        const FindUser = await User.findOne({_id: isLogin} );

        if (!FindUser) {
            return res.json({ success: false, message: "User not found" });
        }

        const userData = await User.findByIdAndUpdate(
            FindUser._id,
            { name,  phone },
            { new: true } 
        );

        console.log("Updated data", userData);

        req.session.user = userData;

        res.json({ success: true, message: "User profile updated" });

    } catch (error) {
        console.error("Error:", error);
        res.json({ success: false, message: "Server Error" });
    }
};


const editprofileEmail = async (req, res) => {
    try {
        const isLogin = req.session.user;
        const { email: newEmail } = req.body;

        const FindUser = await User.findOne({_id: isLogin});
        console.log("User Data:", FindUser);

        if (!FindUser) {
            return res.json({ success: false, message: "User not Found" });
        }

        const existingEmail = FindUser.email;
        if (existingEmail == newEmail) {
            return res.json({ success: false, message: "Email cannot be the same" });  
        }

        const AnotherUser = await User.findOne({ email: newEmail });
        if (AnotherUser) {
            return res.json({ success: false, message: "Email is used by another user, try a different one" });  
        }

        const existingEmailOtp = generateOtp();
        const newEmailOtp = generateOtp();

        const emailSentToExisting = await sentVerificationOtp(existingEmail, existingEmailOtp);
        if (!emailSentToExisting) {
            return res.json({ success: false, message: "Failed to send OTP to existing email" });  
        }

        const emailSentToNew = await sentVerificationOtp(newEmail, newEmailOtp);
        if (!emailSentToNew) {
            console.log("Failed to send OTP to new email");
            return res.json({ success: false, message: "Failed to send OTP to new email" }); 
        }

        req.session.userOtp = {
            existingEmailOtp,
            newEmailOtp
        };
        req.session.userData = { email: newEmail };

        console.log("OTP sent to existing email:", existingEmailOtp);
        console.log("OTP sent to new email:", newEmailOtp);

        return res.json({ success: true, message: "OTP sent to both emails. Verify OTPs." });

    } catch (error) {
        console.error("Server Error:", error);
        return res.json({ success: false, message: "Internal server error" }); 
    }
};


const postEmailOtp = async (req, res) => {
    try {
        const { otp1, otp2 } = req.body;

        if (!req.session.userOtp || !req.session.userData) {
            return res.status(400).json({ success: false, message: "Session expired. Please retry." });
        }

        const { existingEmailOtp, newEmailOtp } = req.session.userOtp;
        const newEmail = req.session.userData.email;

        if (otp1 !== existingEmailOtp) {
            return res.status(400).json({ success: false, message: "Incorrect OTP for old email." });
        }

        if (otp2 !== newEmailOtp) {
            return res.status(400).json({ success: false, message: "Incorrect OTP for new email." });
        }

        const existingUser = await User.findOne({ email: newEmail });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "New email is already in use." });
        }

        const user = await User.findOneAndUpdate(
            { email: req.session.user.email }, 
            { email: newEmail }, 
            { new: true } 
        );

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        req.session.user.email = newEmail; 
        req.session.save((err) => {
            if (err) {
                console.error("Session save error:", err);
                return res.status(500).json({ success: false, message: "Error updating session." });
            }
            return res.status(200).json({ success: true, message: "Email updated successfully!" });
        });

    } catch (error) {
        console.error("Server Error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};


const postNewpassword = async (req, res) => {
    try {
        const { currentpassword, password, confirmpassword } = req.body;
        const isLogin = req.session.user;

        const FindUser = await User.findOne({ _id: isLogin });

        if (!FindUser) {
            return res.json({ success: false, message: "User not found" });
        }

        const isPasswordMatch = await bcrypt.compare(currentpassword, FindUser.password);
        if (!isPasswordMatch) {
            return res.json({ success: false, message: "Incorrect current password" });
        }

        if (password !== confirmpassword) {
            return res.json({ success: false, message: "Passwords do not match" });
        }

        const Otp = generateOtp();
        const email = FindUser.email;

        const emailSent = await sentVerificationOtp(email, Otp);
        if (!emailSent) {
            return res.json({ success: false, message: "Email sending error" });
        }

        req.session.userOtp = Otp;
        req.session.userData = { password };

        console.log("OTP sent:", Otp);

        res.status(201).json({ success: true, message: "Verify OTP" });

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};



const postPasswordOtp = async(req,res)=>{
    try {
        console.log("heloooo")
        const { otp} = req.body;

        const isLogin = req.session.user

        const FindUser = await User.findOne(isLogin)

        if (!req.session.userOtp || !req.session.userData) {
            return res.status(400).json({ success: false, message: "Session expired. Please retry." });
        }
        const  existingEmailOtp = req.session.userOtp;
      
        if (otp !== existingEmailOtp) {
            return res.status(400).json({ success: false, message: "Incorrect OTP " });
        }


        const passwordData = req.session.userData
        console.log("password",passwordData.password)
        const passwordHash = await securePassword(passwordData.password);


        const user = await User.findByIdAndUpdate(
            FindUser._id,
            {password :passwordHash},
            {new:true}
        )
        console.log("Updated data", user);

        req.session.user = user;

        delete req.session.userData
        delete req.session.userOtp

        res.json({ success: true, message: "Account Password updated" });

    } catch (error) {
        console.error("Server error",error)
    }
}

const ProfileAddress = async (req, res) => {
    try {
        const isLogin = req.session.user;
        if (!isLogin) {
            return res.redirect('/'); 
        }

        const breadcrumbs = [
            { name: 'Home', url: '/' },
            { name: 'User Profile', url: '/UserProfile' },
        ];

        const user = await User.findOne({ _id: isLogin._id });
        if (!user) {
            return res.redirect('/');
        }

        const addresses = await Address.find({ userId: user._id });

        res.render('ProfileAddress', { isLogin, user, breadcrumbs, addresses });
    } catch (error) {
        console.error("Server Error Occurred", error);
        res.status(500).send("Internal Server Error");
    }
};



const addAddress = async (req, res) => {
    try {
        const { name, phone, pincode, landmark, address, city, state, addressType } = req.body;
        const userId = req.session.user._id;

        const userExists = await User.findById(userId);
        if (!userExists) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        let userAddress = await Address.findOne({ userId });

        if (!userAddress) {
            userAddress = new Address({
                userId,
                address: [{ name, phone, pincode, landmark, address, city, state, addressType }]
            });
        } else {
            userAddress.address.push({ name, phone, pincode, landmark, address, city, state, addressType });
        }

        await userAddress.save();

        console.log("Updated address:", userAddress);
        res.status(200).json({ success: true, message: "Address added successfully", data: userAddress });

    } catch (error) {
        console.error("Error adding address:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const getAddress = async (req, res) => {
    try {
        const { addressId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(addressId)) {
            return res.status(400).json({ success: false, error: "Invalid address ID" });
        }

        const userAddress = await Address.findOne({ "address._id": addressId }, { "address.$": 1 });

        console.log("Fetched Address Data:", userAddress);

        if (!userAddress || !userAddress.address || userAddress.address.length === 0) {
            return res.status(404).json({ success: false, error: "Address not found" });
        }

        res.json({ success: true, message: "Edit Address successfully opened", address: userAddress });
    } catch (error) {
        console.error("Error fetching address:", error);
        res.status(500).json({ success: false, error: "Server error" });
    }
};

const editAddress = async (req, res) => {
    try {
        const { name, phone, pincode, landmark, address, city, state, addressType } = req.body;
        const { addressId } = req.params;

        console.log("AddressId", addressId);

        const userAddress = await Address.findOne({ "address._id": addressId });

        if (!userAddress) {
            return res.json({ success: false, message: "Address not found" });
        }

        const updatedUser = await Address.findOneAndUpdate(
            { "address._id": addressId },
            {
                $set: {
                    "address.$.name": name,
                    "address.$.phone": phone,
                    "address.$.pincode": pincode,
                    "address.$.landmark": landmark,
                    "address.$.address": address,
                    "address.$.city": city,
                    "address.$.state": state,
                    "address.$.addressType": addressType,
                },
            },
            { new: true }
        );

        console.log("Updated data", updatedUser);

        res.json({ success: true, message: "User Address updated", data: updatedUser });

    } catch (error) {
        console.error("Error:", error);
        res.json({ success: false, message: "Server Error" });
    }
};


const deleteAddress = async (req, res) => {
    try {
        const { id } = req.body;
        console.log("addressdeleteId",id)
        if (!id) {
            return res.status(400).json({ message: "Invalid address ID" });
        }


        const deletedAddress = await Address.updateOne(
            { "address._id": id },
            { $pull: { address: { _id: id } } }
        );

        if (deletedAddress.modifiedCount === 0) {
            return res.status(404).json({ message: "Address not found" });
        }

        res.json({ success: true, message: "Address deleted successfully" }); 
    } catch (error) {
        console.error("Delete Error:", error);
        res.status(500).json({ message: "Server error while deleting address" });
    }
};

const myOrders = async (req, res) => {
    try {
        const isLogin = req.session.user;
        const userId = req.session.user?._id;
        const breadcrumbs = [
            { name: 'Home', url: '/' },
            { name: 'My Orders', url: '/myOrders' },
        ];
        if (!userId) {
            return res.redirect("/login");
        }

        const orders = await Order.find({ userId }).populate("items.productId").sort({ createdAt: -1 });
        const addresses = await Address.find({ userId });
        console.log("addresses",addresses)

        return res.render("myOrders", { isLogin, orders, addresses, breadcrumbs });
    } catch (error) {
        console.error("Server Error", error);
    }
};
const downloadInvoice = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findOne({ orderId })
            .populate("items.productId")
            .populate("selectedAddress");

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        const userAddress = order.selectedAddress?.address?.[0]; // Extract first address entry

        const invoicePath = path.join(__dirname, "../public/invoices");
        if (!fs.existsSync(invoicePath)) {
            fs.mkdirSync(invoicePath, { recursive: true });
        }

        const filePath = path.join(invoicePath, `invoice_${orderId}.pdf`);
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Header
        doc.font("Helvetica-Bold").fontSize(20).text("Invoice", { align: "center" }).moveDown(1);
        doc.font("Helvetica").fontSize(12).text(`Order ID: ${order.orderId}`);
        doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`).moveDown(1);

        // Customer Details
        doc.font("Helvetica-Bold").text("Customer Details").moveDown(0.5);
        doc.font("Helvetica");
        doc.text(`Name: ${userAddress?.name || "N/A"}`)
           .text(`Address: ${userAddress?.address?.replace(/\n/g, ", ") || "N/A"}`)
           .text(`City: ${userAddress?.city || "N/A"}`)
           .text(`State: ${userAddress?.state || "N/A"}`)
           .text(`Pincode: ${userAddress?.pincode || "N/A"}`)
           .text(`Phone: ${userAddress?.phone || "N/A"}`)
           .moveDown(1);
       
        // Order Items
        doc.font("Helvetica-Bold").text("Order Summary").moveDown(0.5);
        order.items.forEach((item, index) => {
            doc.font("Helvetica")
                .text(`${index + 1}. ${item.name} (Size: ${item.size}) x${item.quantity} - ₹${item.price.toFixed(2)}`, { indent: 20 });
        });
        doc.moveDown(1);

        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke().moveDown(0.5);
        doc.font("Helvetica-Bold")
            .text(`Subtotal: ₹${order.subtotal.toFixed(2)}`)
            .text(`Shipping Charge: ₹${order.shippingCharge.toFixed(2)}`)
            .text(`Discount: ₹${order.discountAmount?.toFixed(2) || "0.00"}`)
            .text(`Total: ₹${order.totalAmount.toFixed(2)}`)
            .moveDown(1);
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();

        doc.font("Helvetica-Oblique").fontSize(10).text("Thank you for your purchase!", { align: "center" });

        doc.end();
        stream.on("finish", () => res.download(filePath));
    } catch (error) {
        console.error("Error generating invoice:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};



const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { cancellationReason } = req.body;

        const order = await Order.findOne({ orderId }).populate("userId");

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        if (order.status === "Cancelled") {
            return res.status(400).json({ success: false, message: "Order is already cancelled" });
        }

        order.status = "Cancelled";
        order.cancellationReason = cancellationReason;
        
        order.items.forEach(item => {
            item.cancelled = true;
            item.cancellationReason = cancellationReason;
        });

      
        if (order.paymentMethod !== "COD") {
            if (order.userId && order.userId.wallet) {  
                order.userId.wallet.balance += order.totalAmount;
                order.userId.wallet.transactions.push({
                    amount: order.totalAmount,
                    type: "credit",
                    description: `Refund for Order #${order.orderId}`
                });
                await order.userId.save();
            } else {
                console.error("User wallet not found");
            }
        }
        

        await order.save();

        return res.json({ success: true, message: "Order cancelled successfully" });

    } catch (error) {
        console.error("Order Cancellation Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};


const cancelProduct = async (req, res) => {
    try {
        const { orderId, productId } = req.params;
        const { cancellationReason } = req.body;


        const order = await Order.findOne({ orderId }).populate("userId");

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        const itemIndex = order.items.findIndex(item => item.productId.toString() === productId);

        if (itemIndex === -1) {
            return res.status(404).json({ success: false, message: "Product not found in order" });
        }

        const cancelledProduct = order.items[itemIndex];
        const cancelledProductPrice = cancelledProduct.price;
        const cancelledQuantity = cancelledProduct.quantity;
        const cancelledTotalAmount = cancelledProductPrice * cancelledQuantity;

        cancelledProduct.cancelled = true;
        cancelledProduct.cancellationReason = cancellationReason;

        order.subtotal -= cancelledTotalAmount;
        order.totalAmount -= cancelledTotalAmount;

        const product = await Product.findById(productId);
        if (product && cancelledProduct.size && product.sizes.has(cancelledProduct.size)) {
            product.sizes.set(cancelledProduct.size, product.sizes.get(cancelledProduct.size) + cancelledQuantity);
            await product.save();
        }

        const allItemsCancelled = order.items.every(item => item.cancelled);
        if (allItemsCancelled) {
            order.status = "Cancelled";
        }

        if (order.paymentMethod !== "COD" && order.userId && order.userId.wallet) {
            order.userId.wallet.balance += cancelledTotalAmount;  
            order.userId.wallet.transactions.push({
                amount: cancelledTotalAmount,
                type: "credit",
                description: `Refund for cancelled Product #${productId} in Order #${order.orderId}`
            });
            await order.userId.save();
        }

        await order.save();

        res.json({
            success: true,
            message: allItemsCancelled ? "Order fully cancelled" : "Product cancelled successfully, stock updated",
        });

    } catch (error) {
        console.error("Error cancelling product:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};



const returnOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { returnReason, returnComment } = req.body;

        const order = await Order.findOne({ orderId });

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        if (order.status !== "Delivered" && order.status !== "Completed") {
            return res.status(400).json({ success: false, message: "Only delivered orders can be returned" });
        }

        if (order.status === "Return Requested" || order.status === "Returned") {
            return res.status(400).json({ success: false, message: "Return already requested or completed" });
        }

        order.status = "Return Requested";
        order.returnReason = returnReason;
        order.returnComment = returnComment;
        order.returnStatus = "Return Requested";

        order.items.forEach(item => {
            item.returnStatus = "Return Requested";
            item.returnReason = returnReason;
            item.returnComment = returnComment;
        });

        await order.save();

        return res.json({ success: true, message: "Return request submitted successfully" });
    } catch (error) {
        console.error("Order Return Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const returnProduct = async (req, res) => {
    try {
        const { orderId, productId } = req.params;
        const { returnReason, returnComment } = req.body; 

        const order = await Order.findOne({ orderId });

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        if (order.status !== "Delivered" && order.status !== "Completed") {
            return res.status(400).json({ success: false, message: "Only delivered orders can be returned" });
        }

        const product = order.items.find(item => item.productId.toString() === productId);

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found in order" });
        }

        if (product.returnStatus === "Return Requested" || product.returnStatus === "Returned") {
            return res.status(400).json({ success: false, message: "Product return already requested or completed" });
        }

        product.returnStatus = "Return Requested";
        product.returnReason = returnReason;
        product.returnComment = returnComment;

        const anyProductReturned = order.items.some(item => item.returnStatus === "Return Requested");

        if (anyProductReturned) {
            order.status = "Return Requested";
        }

        await order.save();

        return res.json({ success: true, message: "Product return request submitted successfully", order });

    } catch (error) {
        console.error("Product Return Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const retryPayment = async (req, res) => {
    try {
        const orderId = req.params.orderId;

        const order = await Order.findOne({ orderId });

        if (!order) {
            req.flash("error", "Order not found.");
            return res.redirect("/myOrders");
        }

        if (order.status !== "Payment Pending") {
            req.flash("error", "Payment cannot be retried for this order.");
            return res.redirect("/myOrders");
        }

        res.redirect(`/checkout?orderId=${order.orderId}`);
    } catch (error) {
        res.redirect("/myorders");
    }
};




const wallet = async (req, res) => {
    try {
        const isLogin = req.session.user;
        const userId = req.session.user?._id;

        if (!userId) {
            return res.redirect('/login'); 
        }

        const user = await User.findById(userId)
            .select('wallet')
            .lean();

        if (!user) {
            return res.status(404).send("User not found");
        }

        if (user.wallet && user.wallet.transactions) {
            user.wallet.transactions.sort((a, b) => b.date - a.date);
        }

        const breadcrumbs = [
            { name: 'Home', url: '/' },
            { name: 'My Wallet', url: '/wallet' },
        ];

        res.render('wallet', {
            breadcrumbs,
            isLogin,
            user
        });

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).send("Internal Server Error");
    }
};


const walletCreateOrder = async (req, res) => {
    try {
        const { amount } = req.body;
        
        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid amount" });
        }

        const order = await createOrder(amount);
        res.json({ success: true, order });
    } catch (error) {
        console.error("Error creating Razorpay order:", error);
        res.status(500).json({ success: false, message: "Failed to create order" });
    }
};

const walletAddAmount = async (req, res) => {
    try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature, amount } = req.body;
        const userId = req.session.user?._id;

        if (!userId) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid amount" });
        }

        const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
        hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
        const generatedSignature = hmac.digest("hex");

        if (generatedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: "Payment verification failed" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        user.wallet.balance += Number(amount);
        user.wallet.transactions.push({
            amount: Number(amount),
            type: "credit",
            description: "Added money via Razorpay",
            timestamp: new Date(),
        });

        await user.save();
        res.json({ success: true, message: "Wallet updated successfully" });
    } catch (error) {
        console.error("Error updating wallet:", error);
        res.status(500).json({ success: false, message: "Error updating wallet" });
    }
};

const referral = async (req, res) => {
    try {
        const isLogin = req.session.user;
        const userId = req.session.user?._id;

        if (!userId) {
            return res.redirect('/login');
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).send("User not found");
        }

        const breadcrumbs = [
            { name: 'Home', url: '/' },
            { name: 'Referral', url: '/referral' }
        ];

        res.render('refferal', {
            breadcrumbs,
            isLogin,
            user,
            referralCode: user.referralCode 
        });
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).send("Internal Server Error");
    }
};


module.exports={
    UserProfile,
    edit_profile,
    ProfileAddress,
    addAddress,
    deleteAddress,
    getAddress,
    editAddress,
    editprofileEmail,
    postEmailOtp,
    postNewpassword,
    postPasswordOtp,
    myOrders,
    downloadInvoice,
    cancelOrder,
    cancelProduct,
    returnOrder,
    returnProduct,
    retryPayment,
    wallet,
    walletCreateOrder,
    walletAddAmount,
    referral
    
}