const Coupon = require('../../model/couponSchema')

const loadCouponManagement = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; 
        const itemsPerPage = 10; 
        const searchQuery = req.query.search ? req.query.search.trim() : '';

        const searchCriteria = searchQuery
            ? {
                  $or: [
                      { name: { $regex: searchQuery, $options: "i" } }, 
                      { offerPrice: { $regex: searchQuery, $options: "i" } }, 
                  ],
              }
            : {};

        const totalCoupons = await Coupon.countDocuments(searchCriteria);
        const totalPages = Math.ceil(totalCoupons / itemsPerPage);

        const coupons = await Coupon.find(searchCriteria)
            .skip((page - 1) * itemsPerPage)
            .limit(itemsPerPage);

        res.render('coupon_management', {
            coupons,
            currentPage: page,
            totalPages,
        });
    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ success: false, message: "Error loading the page" });
    }
};

const loadaddcoupon = async(req, res)=>{
    try {
        res.render("addcoupon"); 

    } catch (error) {
        console.error('server error',error)
    }
}

const addCoupon = async (req, res) => {
    try {
        console.log("Received Request Body:", req.body); // Debugging

        const { couponCode, offerPrice, minPurchase, expiresOn, status } = req.body;

        if (!couponCode) {
            return res.status(400).json({ success: false, message: "Coupon name is required." });
        }

        const existingCoupon = await Coupon.findOne({ name:couponCode });
        if (existingCoupon) {
            return res.status(400).json({ success: false, message: "Coupon name already exists." });
        }

        const newCoupon = new Coupon({
            name:couponCode,
            offerPrice,
            minPurchase,
            expiresOn,
            status: status || "Active",
        });

        await newCoupon.save();
        res.status(201).json({ success: true, message: "Coupon added successfully" });

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ success: false, message: "Error adding coupon" });
    }
};


const loadUpdateCoupon = async (req,res)=>{
    try {
        const id = req.params.id;
        const coupon = await Coupon.findById(id);
        if (!coupon) {
            return res.status(404).send('Coupon not found');
        }
        console.log("hello")
        res.render('updatecoupon', { coupon });
    } catch (error) {
        res.status(500).send('Server error');
    }
}

const updateCoupon = async (req, res) => {
    try {
        const { name, offerPrice, minPurchase, expiresOn, isActive } = req.body;
        const couponId = req.params.id;

        const coupon = await Coupon.findById(couponId);
        if (!coupon) {
            return res.status(404).json({ message: "Coupon not found" });
        }

        coupon.name = name;
        coupon.offerPrice = offerPrice;
        coupon.minPurchase = minPurchase;
        coupon.expiresOn = new Date(expiresOn); 
        coupon.isActive = isActive;

        await coupon.save(); 

        res.status(200).json({ message: "Coupon updated successfully" });
    } catch (error) {
        console.error("Update Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};


const deleteCoupon = async (req, res) => {
    try {
        const couponId = req.params.id;

        const coupon = await Coupon.findById(couponId);
        if (!coupon) {
            return res.status(404).json({ message: "Coupon not found" });
        }

        await Coupon.findByIdAndDelete(couponId); 

        res.status(200).json({ message: "Coupon deleted successfully" });
    } catch (error) {
        console.error("Deletion Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = { deleteCoupon };

module.exports = {
    loadCouponManagement,
    loadaddcoupon,
    addCoupon,
    loadUpdateCoupon,
    updateCoupon,
    deleteCoupon
}