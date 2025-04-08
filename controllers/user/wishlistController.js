const User = require('../../model/userSchema')
const Product = require('../../model/productSchema')
const Wishlist = require('../../model/wishlistSchema')
const Cart = require('../../model/cartSchema')

const loadWishlist = async (req, res) => {
    try {
        const isLogin = req.session.user;
        const userId = req.session.user;

        const wishlist = await Wishlist.findOne({ userId }).populate('products.productId');
        
        const cart = await Cart.findOne({ userId }).populate('items.productId');

       

        const cartProductIds = cart ? cart.items.map(item => item.productId._id.toString()) : [];

        const filteredWishlistItems = wishlist 
            ? wishlist.products.filter(item => !cartProductIds.includes(item.productId._id.toString())) 
            : [];

        const wishlistlength = filteredWishlistItems.length !== 0;

        const breadcrumbs = [
            { name: 'Home', url: '/' },
            { name: 'Wishlist', url: '/wishlist' },
        ];

        res.render('wishlist', { 
            isLogin, 
            breadcrumbs, 
            wishlistlength, 
            wishlistItems: filteredWishlistItems 
        });

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).send("Internal Server Error");
    }
};





const addToWishlist = async (req, res) => {
    try {
        const userId = req.session.user?._id;
        const { productId } = req.params;

        if (!userId) {
            return res.status(401).json({ success: false, message: "User not logged in" });
        }

        if (!productId) {
            return res.status(400).json({ success: false, message: "Product ID is required" });
        }

        let wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            wishlist = new Wishlist({ userId, products: [] });
        }

        const isAlreadyInWishlist = wishlist.products.some(item => item.productId.toString() === productId);

        if (!isAlreadyInWishlist) {
            wishlist.products.push({ productId });
            await wishlist.save();
            return res.json({ success: true, message: "Product added to wishlist" });
        }

        return res.json({ success: false, message: "Product already in wishlist" });
    } catch (error) {
        console.error("Wishlist Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const removeFromWishlist = async (req, res) => {
    try {
        const userId = req.session.user?._id;
        const { productId } = req.params;

        if (!userId) {
            return res.status(401).json({ success: false, message: "User not logged in" });
        }

        let wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            return res.status(404).json({ success: false, message: "Wishlist not found" });
        }

        wishlist.products = wishlist.products.filter(item => item.productId.toString() !== productId);
        await wishlist.save();

        return res.json({ success: true, message: "Product removed from wishlist" });
    } catch (error) {
        console.error("Wishlist Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

module.exports = {
    loadWishlist,
    addToWishlist,
    removeFromWishlist
}