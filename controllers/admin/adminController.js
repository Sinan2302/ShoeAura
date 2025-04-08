const mongoose = require('mongoose');
const fs = require('fs')
const path = require('path')
const admin = require("../../model/adminSchema")
const User = require("../../model/userSchema")
const Category = require('../../model/categorySchema')
const bcrypt = require('bcrypt');
const Product = require('../../model/productSchema');
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const Order = require('../../model/orderSchema')





const loadLogin = async(req,res)=>{
    try {
        res.render('login')
        
    } catch (error) {
        res.redirect('/pageNotFound')
    }
   
    
}


const loadDashboard = async (req, res) => {
    try {
        const totalOrders = await Order.countDocuments();
        const totalUsers = await User.countDocuments();
        const totalRevenue = await Order.aggregate([
            { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } }
        ]);
        const totalProducts = await Product.countDocuments();

        const topProducts = await Order.aggregate([
            { $unwind: "$items" },
            {
                $lookup: {
                    from: "products",
                    localField: "items.productId",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" },
            {
                $group: {
                    _id: "$items.productId",
                    productName: { $first: "$productDetails.productname" },
                    quantitySold: { $sum: "$items.quantity" },
                    totalRevenue: { $sum: "$items.total" }
                }
            },
            { $sort: { quantitySold: -1 } },
            { $limit: 10 }
        ]);
        
        const topCategories = await Order.aggregate([
            { $unwind: "$items" },
            {
                $lookup: {
                    from: "products",
                    localField: "items.productId",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" },
            {
                $lookup: {
                    from: "categories",
                    localField: "productDetails.category",
                    foreignField: "_id",
                    as: "categoryDetails"
                }
            },
            { $unwind: "$categoryDetails" },
            {
                $group: {
                    _id: "$categoryDetails._id",
                    categoryName: { $first: "$categoryDetails.categoryname" },
                    quantitySold: { $sum: "$items.quantity" },
                    totalRevenue: { $sum: "$items.total" }
                }
            },
            { $sort: { quantitySold: -1 } },
            { $limit: 10 }
        ]);

        const topBrands = await Order.aggregate([
            { $unwind: "$items" },
            {
                $lookup: {
                    from: "products",
                    localField: "items.productId",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" },
            {
                $group: {
                    _id: "$productDetails.brand",
                    brandName: { $first: "$productDetails.brand" },
                    quantitySold: { $sum: "$items.quantity" },
                    totalRevenue: { $sum: "$items.total" }
                }
            },
            { $sort: { quantitySold: -1 } },
            { $limit: 10 }
        ]);
        
        

        res.render('dashboard', {
            totalOrders,
            totalUsers,
            totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].totalRevenue : 0,
            totalProducts,
            topProducts,
            topCategories,
            topBrands
        });
    } catch (error) {
        console.error("Error loading dashboard:", error.message);
        res.redirect('/pageNotFound');
    }
};






const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        const adminData = await admin.findOne({ username });
        if (!adminData) {
            return res.render('login', { message: 'User not found' });
        }
        const match = await bcrypt.compare(password, adminData.password);
        if (!match) {
            return res.render('login', { message: 'Invalid password' });
        }

        req.session.isAdminLoggedIn = adminData;

        const users = await User.find({});
        res.redirect('/admin/dashboard')
        console.log("login successfully")
        
    } catch (error) {
        console.error('Error during login:', error.message);
        res.render('login', { message: 'Something went wrong' });
    }
};


const logout = async (req,res)=>{
    try {
        req.session.destroy((error)=>{
            if (error) {
                console.error("Error destroying session", error);
                return res.status(500).send("Failed to logout");
            }

            res.clearCookie(process.env.SESSION_SECRET); 
            res.status(200).redirect('/admin/dashboard'); 
            console.log("logout Successfull")
        })
    } catch (error) {
        console.error("error occured during logout")
        res.json({success:false,message:"Error Occured"})
    }
}
const generateSalesReport = async (req, res) => {
    try {
        const { filterType, startDate, endDate, fetchAll } = req.query;
        let filter = {};

        if (filterType === "daily") {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);

            filter.createdAt = { $gte: today, $lt: tomorrow };
        } else if (filterType === "weekly") {
            const today = new Date();
            const lastWeek = new Date(today);
            lastWeek.setDate(today.getDate() - 7);

            filter.createdAt = { $gte: lastWeek, $lt: today };
        } else if (filterType === "monthly") {
            const today = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

            filter.createdAt = { $gte: firstDay, $lt: lastDay };
        } else if (filterType === "yearly") {
            const today = new Date();
            const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
            const lastDayOfYear = new Date(today.getFullYear(), 11, 31, 23, 59, 59);

            filter.createdAt = { $gte: firstDayOfYear, $lt: lastDayOfYear };
        } else if (filterType === "custom") {
            if (startDate && endDate) {
                filter.createdAt = {
                    $gte: new Date(startDate),
                    $lt: new Date(endDate),
                };
            }
        }

        const ordersQuery = Order.find(filter).sort({ createdAt: -1 });

        if (!fetchAll) {
            const { page, itemsPerPage } = req.query;
            const skip = (parseInt(page) - 1) * parseInt(itemsPerPage);
            ordersQuery.skip(skip).limit(parseInt(itemsPerPage));
        }

        const orders = await ordersQuery;
        let totalSalesCount = orders.length;
        let totalOrderAmount = orders.reduce((acc, order) => acc + order.totalAmount, 0);
        let totalDiscount = orders.reduce((acc, order) => acc + (order.discountAmount || 0), 0);

        res.json({
            success: true,
            data: { totalSalesCount, totalOrderAmount, totalDiscount, orders },
        });
    } catch (error) {
        console.error("Error generating sales report:", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const getFilterForRange = (range) => {
    const now = new Date();
    let filter = {};

    switch (range) {
        case "24hours":
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            filter.createdAt = { $gte: yesterday, $lt: now };
            break;

        case "7days":
            const lastWeek = new Date(now);
            lastWeek.setDate(now.getDate() - 7);
            filter.createdAt = { $gte: lastWeek, $lt: now };
            break;

        case "31days":
            const lastMonth = new Date(now);
            lastMonth.setDate(now.getDate() - 31);
            filter.createdAt = { $gte: lastMonth, $lt: now };
            break;

        case "12months":
            const lastYear = new Date(now);
            lastYear.setFullYear(now.getFullYear() - 1);
            filter.createdAt = { $gte: lastYear, $lt: now };
            break;

        default:
            throw new Error("Invalid range");
    }

    return filter;
};

const downloadPDFReport = async (req, res) => {
    try {
        const { range } = req.query;
        const filter = getFilterForRange(range);
        const orders = await Order.find(filter);

        const reportsDir = path.join(__dirname, "../public/reports");
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }

        const filePath = path.join(reportsDir, "sales_report.pdf");
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        doc
            .font("Helvetica-Bold")
            .fontSize(20)
            .text("Sales Report", { align: "center" })
            .moveDown(0.5);

        doc
            .font("Helvetica")
            .fontSize(12)
            .text(`Date: ${new Date().toLocaleDateString()}`, { align: "right" })
            .moveDown(1);

        doc
            .font("Helvetica-Bold")
            .fontSize(12)
            .text("Order ID", 50, doc.y, { width: 150 })
            .text("Total (₹)", 210, doc.y, { width: 100, align: "right" })
            .text("Discount (₹)", 310, doc.y, { width: 100, align: "right" })
            .text("Final (₹)", 410, doc.y, { width: 100, align: "right" })
            .text("Date", 510, doc.y, { width: 100, align: "right" })
            .moveDown(0.5);

        doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke(); 
        doc.moveDown(0.5);

        let totalSales = 0, totalDiscount = 0, finalSales = 0;

        if (orders.length === 0) {
            doc
                .font("Helvetica")
                .fontSize(14)
                .text("No sales data available.", { align: "center" });
        } else {
            orders.forEach((order) => {
                totalSales += order.totalAmount;
                totalDiscount += order.discountAmount || 0;
                finalSales += order.totalAmount - (order.discountAmount || 0);

                doc
                    .font("Helvetica")
                    .fontSize(12)
                    .text(order._id.toString(), 50, doc.y, { width: 150 })
                    .text(`₹${order.totalAmount.toFixed(2)}`, 210, doc.y, { width: 100, align: "right" })
                    .text(`₹${(order.discountAmount || 0).toFixed(2)}`, 310, doc.y, { width: 100, align: "right" })
                    .text(`₹${(order.totalAmount - (order.discountAmount || 0)).toFixed(2)}`, 410, doc.y, { width: 100, align: "right" })
                    .text(new Date(order.createdAt).toLocaleDateString(), 510, doc.y, { width: 100, align: "right" })
                    .moveDown(0.5);
            });

            doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke(); 
            doc.moveDown(0.5);
        }

        doc
            .font("Helvetica-Bold")
            .fontSize(14)
            .text("Summary", { underline: true })
            .moveDown(0.5);

        doc
            .font("Helvetica")
            .fontSize(12)
            .text(`Total Sales: ₹${totalSales.toFixed(2)}`)
            .text(`Total Discount: ₹${totalDiscount.toFixed(2)}`)
            .text(`Final Sales: ₹${finalSales.toFixed(2)}`)
            .moveDown(1);

        doc
            .font("Helvetica-Oblique")
            .fontSize(10)
            .text("Generated by Sales System", 50, doc.page.height - 50, { align: "center" });

        doc.end();
        stream.on("finish", () => res.download(filePath));
    } catch (error) {
        console.error("Error generating PDF:", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};


const downloadExcelReport = async (req, res) => {
    try {
        const { range } = req.query;
        const filter = getFilterForRange(range);
        const orders = await Order.find(filter);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Sales Report");

        worksheet.columns = [
            { header: "Order ID", key: "orderId", width: 30 },
            { header: "Total Amount (₹)", key: "totalAmount", width: 20 },
            { header: "Discount (₹)", key: "discountAmount", width: 20 },
            { header: "Final Amount (₹)", key: "finalAmount", width: 20 },
        ];

        orders.forEach((order) => {
            worksheet.addRow({
                orderId: order.orderId,
                totalAmount: order.totalAmount,
                discountAmount: order.discountAmount || 0,
                finalAmount: order.totalAmount - (order.discountAmount || 0),
            });
        });

        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", "attachment; filename=sales_report.xlsx");

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error("Error generating Excel:", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};


module.exports = {
    loadLogin,
    loadDashboard,
    login,
    logout,
    generateSalesReport,
    downloadPDFReport,
    downloadExcelReport
}