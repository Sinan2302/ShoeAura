const Cart = require('../../model/cartSchema')
const User = require('../../model/userSchema')
const Product = require('../../model/productSchema')
const Address = require('../../model/addressSchema')
const Order = require('../../model/orderSchema')
const Coupon = require('../../model/couponSchema')
const crypto = require("crypto");
const createOrder = require('../../middleware/Razorpay')
const { v4: uuidv4 } = require("uuid");



const cartpage = async (req, res) => {
    const isLogin = req.session.user || false; 
    if (isLogin) {
        try {
            let cart = await Cart.findOne({ userId: isLogin._id }).populate('items.productId');
            let coupons = await Coupon.find({ isActive: true }); 

            let Subtotal = 0;
            cart.items.forEach(item => Subtotal += item.total);

            let ShippingFee = cart.items.length != 0 ? (Subtotal > 500 ? 0 : 50) : 0;
            const cartlength = cart.items.length != 0;
            let Discount = 0;
            let Total = Subtotal + ShippingFee - Discount;

            let DeliveryMes = Subtotal > 1000 ? "Free delivery " : "Free delivery to order above Rs.500";

            const breadcrumbs = [ 
                { name: 'Home', url: '/' },
                { name: 'Shopping Cart', url: '/cart' },
            ];

            res.render('cart', {
                isLogin, 
                breadcrumbs, 
                cart, 
                Subtotal, 
                ShippingFee, 
                Discount, 
                DeliveryMes,
                Total,
                cartlength,
                coupons 
            });

        } catch (error) {
            console.error("Server Error During Load Page:", error);
            res.status(500).json({ success: false, message: "Server Error During Load Page" });
        }
    } else {
        res.render('cart', { isLogin, coupons: [] }); 
    }
};


const Addtocart = async (req, res) => {
    try {
        const { id } = req.params;    
        const { selectedSize } = req.body;

        const userData = req.session.user;
        if (!userData) {
            return res.json({ success: false, message: "Please log in to add products to your cart." });
        }

        const FindUser = await User.findById(userData._id);
        if (!FindUser) {
            return res.json({ success: false, message: "User not found" });
        }

        const product = await Product.findOne({ _id: id, isBlocked: false }).populate('category');
        if (!product) {
            return res.json({ success: false, message: "Product not found" });
        }

        if (!product.sizes.has(selectedSize) || product.sizes.get(selectedSize) <= 0) {
            return res.json({ success: false, message: `Selected size is out of stock` });
        }

        const availableStock = product.sizes.get(selectedSize);

        let cart = await Cart.findOne({ userId: userData._id });

        if (!cart) {
            cart = new Cart({
                userId: userData._id,
                items: [],
            });
        }

        const existingItem = cart.items.find(item => 
            item.productId.toString() === id && item.size === selectedSize
        );

        if (existingItem) {
            if (existingItem.quantity + 1 > availableStock) {
                return res.json({ 
                    success: false, 
                    message: `Only ${availableStock} items available in stock for size ${selectedSize}.` 
                });
            }
            if(existingItem.quantity === 3){
                return res.json({
                    success: false,
                    message: "Maximum quantity of an item in the cart is reached"
                })
            }
            existingItem.quantity += 1;
            existingItem.total = existingItem.quantity * product.SalePrice;
        } else {
            cart.items.push({
                productId: product._id,
                size: selectedSize,
                quantity: 1,
                price: product.SalePrice,
                total: product.SalePrice,
            });
        }

        await cart.save();

        await User.findByIdAndUpdate(userData._id, { $set: { cart: cart._id } });

        return res.json({ success: true, message: "Product added to cart", cart });

    } catch (error) {
        console.error("Server Error:", error);
        return res.json({ success: false, message: "Server error, please try again." });
    }
};



const updateCart = async (req, res) => {
    try {
        const { productId, quantity, selectedSize } = req.body;
        const userId = req.session.user._id;


        if (quantity > 3) {
            return res.json({ success: false, message: "Maximum quantity allowed is 3." });
        }

        let cart = await Cart.findOne({ userId }).populate("items.productId");
        if (!cart) return res.json({ success: false, message: "Cart not found." });


        cart.items.forEach(i => console.log("Cart Item Product ID:", i.productId._id.toString()));

        let item = cart.items.find(i => 
            i.productId._id.toString() === productId && i.size.toString() === selectedSize.toString()
        );


        if (!item) {
            return res.json({ success: false, message: "Item not found in cart." });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.json({ success: false, message: "Product not found." });
        }

        if (product.sizes instanceof Map) {  
            const availableStock = product.sizes.get(selectedSize.toString()); 

            if (availableStock !== undefined && quantity > availableStock) {
                return res.json({ 
                    success: false, 
                    message: `Only ${availableStock} item(s) available for size ${selectedSize}.`
                });
            }
        } else {
            return res.json({ success: false, message: "Product sizes are not stored as a Map." });
        }

        item.quantity = quantity;
        item.total = quantity * item.productId.SalePrice;

        await cart.save();

        res.json({ 
            success: true, 
            updatedQuantity: item.quantity, 
            productName: item.productId.productname,
            message: "Quantity updated successfully."
        });

    } catch (error) {
        console.error("Cart Update Error:", error);
        res.json({ success: false, message: "Server Error" });
    }
};





const removeCart = async (req, res) => {
    try {
        const { itemId } = req.body;  
        const userId = req.session.user._id; 

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.json({ success: false, message: "Cart not found" });
        } 

        const itemExists = cart.items.some(item => item._id.toString() === itemId);
        if (!itemExists) {
            return res.json({ success: false, message: "Item not found in cart" });
        }

        await Cart.updateOne(
            { userId },
            { $pull: { items: { _id: itemId } } }
        );

    

        res.json({ success: true, message: "Item removed successfully" });

    } catch (error) {
        console.error("Error removing item:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};
const postCart = async (req, res) => {
    try {
        console.log("req.body", req.body);
        const { cartItems, finalTotal, discountAmount } = req.body;
        const userId = req.session.user._id;

        if (!userId) {
            return res.status(401).json({ success: false, message: "User not logged in" });
        }

        let cart = await Cart.findOne({ userId });

        if (!cart) {
            cart = new Cart({ userId, items: [] });
        }

        cart.items = cartItems.map(item => ({
            productId: item.productId,
            size: item.size,
            quantity: item.quantity,
            price: item.price,
            discount: item.discountAmount,  
            total: item.price * item.quantity, 
        }));

        cart.finalTotal = finalTotal;  
        cart.discountAmount = discountAmount;  

        await cart.save();

        res.json({ success: true, message: "Cart updated successfully" });
    } catch (error) {
        console.error("Update Cart Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};



const checkout = async (req, res) => {
    try {
        const isLogin = req.session.user;
        if (!isLogin) {
            return res.redirect('/');
        }

        const breadcrumbs = [
            { name: 'Home', url: '/' },
            { name: 'Shopping Cart', url: '/cart' },
            { name: 'Checkout page', url: '/checkout' },
        ];

        const userId = req.session.user._id;
        const user = await User.findById(userId).select('wallet').lean();

        const userAddresses = await Address.find({ userId });

        const cart = await Cart.findOne({ userId }).populate("items.productId");

        console.log("req.body",req.body)

        if (!cart || !cart.items.length) {
            return res.redirect('/')
        }

        const cartProducts = cart.items.map(item => ({
            _id: item.productId?._id, 
            name: item.productId?.productname || "Unknown Product",
            image: item.productId?.productImages[0] || "/images/default.jpg", 
            price: item.price,
            quantity: item.quantity,
            size: item.size,
        }));

        const cartTotal = cartProducts.reduce((total, product) => total + product.price * product.quantity, 0);

        const finalTotal = cart.finalTotal || cartTotal;

        const discountAmount = cart.discountAmount
       

        console.log("discountAmount",discountAmount)
        const shippingFee = cartTotal > 500 ? 0 : 50; 
        const total = finalTotal + shippingFee - discountAmount;

        res.render('checkout', { 
            breadcrumbs, 
            addresses: userAddresses, 
            user, 
            cartProducts, 
            isLogin, 
            cartTotal, 
            shippingFee, 
            total,
            finalTotal,    
            discountAmount 
        });
    } catch (error) {
        console.error('Checkout Error:', error);
        res.status(500).send("Internal Server Error");
    }
};

const placeOrder = async (req, res) => {
    try {
        const userId = req.session.user?._id;
        let { selectedAddress, paymentMethod } = req.body;

        if (!userId) {
            return res.json({ success: false, message: "User not logged in" });
        }

        if (!selectedAddress || !paymentMethod) {
            return res.json({ success: false, message: "Address and payment method are required" });
        }

        const cart = await Cart.findOne({ userId }).populate("items.productId");

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: "Cart is empty" });
        }

        const cartTotal = cart.items.reduce(
            (sum, item) => sum + item.productId.SalePrice * item.quantity, 0
        );
        const shippingFee = cartTotal > 500 ? 0 : 50;
        const discountAmount = cart.discountAmount || 0;
        const totalAmount = cartTotal + shippingFee - discountAmount;

        if (paymentMethod === "cod" && totalAmount >= 1000) {
            return res.json({ success: false, message: "COD is only available for orders below ₹1000" });
        }

        if (paymentMethod === "Wallet") {
            const user = await User.findById(userId);
            if (!user || user.wallet.balance === undefined) {
                return res.json({ success: false, message: "Wallet not found" });
            }

            if (user.wallet.balance < totalAmount) {
                console.log("Insufficient wallet balance");
                return res.json({ success: false, message: "Insufficient wallet balance" });
            }

            await User.updateOne(
                { _id: userId },
                {
                    $inc: { "wallet.balance": -totalAmount },
                    $push: {
                        "wallet.transactions": {
                            amount: totalAmount,
                            type: "debit",
                            description: "Order Payment",
                            date: new Date(),
                        }
                    }
                }
            );
        }

        const newOrder = new Order({
            orderId: uuidv4(),
            userId,
            items: cart.items.map(item => ({
                productId: item.productId._id,
                name: item.productId.productname,
                size: item.size,
                quantity: item.quantity,
                price: item.productId.SalePrice,
                total: item.productId.SalePrice * item.quantity,
            })),
            subtotal: cartTotal,
            shippingCharge: shippingFee,
            totalAmount,
            selectedAddress,
            paymentMethod,
            discountAmount,
            status: (paymentMethod === "Wallet" || paymentMethod === "Razorpay") ? "Confirmed" : "Pending",
            createdAt: new Date(),
        });

        await newOrder.save();

        for (const item of cart.items) {
            await Product.updateOne(
                { _id: item.productId._id },
                { $inc: { [`sizes.${item.size}`]: -item.quantity } }
            );
        }

        await Cart.updateOne({ userId }, { $set: { items: [] } });

        await User.updateOne(
            { _id: userId },
            { $push: { orderHistory: newOrder._id } }
        );

        if (paymentMethod === "Razorpay") {
            const razorpayOrder = await createOrder(totalAmount, "INR", newOrder.orderId);
            return res.json({
                success: true,
                orderId: newOrder._id,
                razorpayOrderId: razorpayOrder.id,
                amount: totalAmount,
                currency: "INR",
                key: process.env.RAZORPAY_KEY_ID,
            });
        } else {
            return res.json({ success: true, message: "Order placed successfully" });
        }
    } catch (error) {
        console.error("Order Placement Error:", error.message, error.stack);
        return res.status(500).json({ success: false, message: error.message });
    }
};



const verifyRazorpayPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(400).json({ success: false, message: "Order not found" });
        }

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: "Payment verification failed" });
        }

        order.status = "Confirmed";
        order.paymentMethod = "Razorpay";
        order.paymentId = razorpay_payment_id;
        await order.save();

        return res.json({ success: true, message: "Payment verified successfully" });
    } catch (error) {
        console.error("Payment Verification Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};



const SuccessOrder = async (req, res) => {
    try {
        const userId = req.session.user._id; 
        if (!userId) {
            return res.redirect("/userlogin"); 
        }

        let order = await Order.findOne({ userId })
            .sort({ createdAt: -1 }) 
            .populate("items.productId");

        if (!order) {
            return res.redirect("/cart"); 
        }

        if (order.status === "Payment Pending") {
            req.flash("error", "Your payment failed. Please try again.");
            return res.redirect("/checkout");  
        }

        res.render("SuccessOrder", { user: req.session.user, order });
    } catch (error) {
        console.error("Error loading success order page:", error);
        res.status(500).send("Internal Server Error");
    }
};


module.exports = {
    cartpage,
    Addtocart,
    updateCart,
    removeCart,
    postCart,
    checkout,
    placeOrder,
    verifyRazorpayPayment,
    SuccessOrder
}