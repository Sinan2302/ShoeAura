const Wishlist = require('../model/wishlistSchema'); 

const wishlistMiddleware = async (req, res, next) => {
    try {
        res.locals.wishlistedProductIds = [];

        if (req.session.user) { 
            const userId = req.session.user._id;
            const wishlist = await Wishlist.findOne({ userId });

            if (wishlist) {
                res.locals.wishlistedProductIds = wishlist.products.map(item => item.productId.toString());
            }
        }
        next();
    } catch (error) {
        console.error("Error in wishlist middleware:", error.message);
        next();
    }
};

module.exports = wishlistMiddleware;
