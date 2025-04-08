const Order = require('../../model/orderSchema')
const Address = require('../../model/addressSchema')
const User = require('../../model/userSchema')



const getOrderManagement = async (req, res) => {
    try {

        const page = parseInt(req.query.page) || 1;
        const itemsPerPage = 10;
        const searchQuery = req.query.search ? req.query.search.trim() : '';

        const searchCriteria = searchQuery
            ? {
                  $or: [
                      { orderId: { $regex: searchQuery, $options: "i" } }, 
                      { paymentMethod: { $regex: searchQuery, $options: "i" } }, 
                      { "userId.name": { $regex: searchQuery, $options: "i" } }, 
                  ],
              }
            : {};

        const totalOrders = await Order.countDocuments(searchCriteria);

        const orders = await Order.find(searchCriteria)
            .populate("userId")
            .sort({ createdAt: -1 }) 
            .skip((page - 1) * itemsPerPage)
            .limit(itemsPerPage);

        const totalPages = Math.ceil(totalOrders / itemsPerPage);

        res.render("order_management", { orders, currentPage: page, totalPages, searchQuery });
    } catch (error) {
        console.error("Error During Loading Orders:", error);
        res.redirect("/pageNotFound");
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        const order = await Order.findOne({ orderId }).populate("userId");

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        order.status = status;
        await order.save();

        return res.json({ success: true, message: "Order status updated successfully" });
    } catch (error) {
        console.error("Order Status Update Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};



const getOrderDetails = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await Order.findOne({ orderId })
            .populate("userId")
            .populate("items.productId");

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        console.log("Selected Address ID:", order.selectedAddress);

        const addressDoc = await Address.findOne({ "address._id": order.selectedAddress });

        if (!addressDoc) {
            return res.status(404).json({ success: false, message: "Address not found" });
        }

        const selectedAddress = addressDoc.address.find(addr => addr._id.toString() === order.selectedAddress.toString());

        console.log("Selected Address:", selectedAddress);

        return res.json({ success: true, order, selectedAddress });
    } catch (error) {
        console.error("Error fetching order details:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const acceptReturn = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await Order.findById(orderId).populate("userId");
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        const user = order.userId;
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        user.wallet = user.wallet || { balance: 0, transactions: [] };

        let refundAmount = 0;
        let returnUpdated = false;

        order.items.forEach(item => {
            if (item.returnStatus === "Return Requested") {
                item.returnStatus = "Return Request Accepted";
                refundAmount += item.price * item.quantity;
                returnUpdated = true;
            }
        });

        if (!returnUpdated) {
            return res.status(400).json({ success: false, message: "No return request found in items" });
        }

        const allReturned = order.items.every(item => item.returnStatus === "Return Request Accepted");

        // If all items are returned, include shipping charge in refund
        if (allReturned) {
            refundAmount += order.shippingCharge;
            order.status = "Returned";
        } else {
            order.status = "Partially Returned";
        }

        if (refundAmount > 0) {
            user.wallet.balance += refundAmount;
            user.wallet.transactions.push({
                amount: refundAmount,
                type: "credit",
                description: `Refund for accepted return of order ${orderId}`,
            });

            await user.save();
        }

        await order.save();

        res.json({
            success: true,
            message: "Return approved successfully",
            refundedAmount: refundAmount,
            order
        });

    } catch (error) {
        console.error("Error approving return:", error);
        res.status(500).json({ success: false, message: "Server error", error });
    }
};




const rejectReturn = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        let returnUpdated = false;
        order.items.forEach(item => {
            if (item.returnStatus === "Return Requested") {
                item.returnStatus = "Return Request Rejected";
                returnUpdated = true;
            }
        });

        if (!returnUpdated) {
            return res.status(400).json({ success: false, message: "No return request found in items" });
        }

        // Optionally update order status
        order.status = "Return Request Rejected";

        await order.save();

        res.json({ success: true, message: "Return rejected successfully", order });
    } catch (error) {
        console.error("Error rejecting return:", error);
        res.status(500).json({ success: false, message: "Server error", error });
    }
};



module.exports = { 
    getOrderManagement ,
    updateOrderStatus,
    getOrderDetails,
    acceptReturn,
    rejectReturn,
 
};
