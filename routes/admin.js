const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin/adminController');
const adminAuth = require('../middleware/adminAuth')
const usermanageController = require('../controllers/admin/usermanageController')
const categoryController = require('../controllers/admin/categoryController')
const productController = require('../controllers/admin/productController')
const orderController = require('../controllers/admin/orderController')
const couponController = require('../controllers/admin/couponController')
const upload = require('../middleware/multerConfig');  // Import multer configuration


router.get('/adminlogin',adminAuth.checkSession, adminController.loadLogin);
router.get('/dashboard',adminAuth.isLogin, adminController.loadDashboard);
router.get('/usermanagement',adminAuth.isLogin,usermanageController.usermanagement)
router.get('/category_management',adminAuth.isLogin,categoryController.categorymanagement)
router.get('/addcategory',adminAuth.isLogin,categoryController.loadaddcategory)
router.get('/updateCategory/:id',adminAuth.isLogin,categoryController.loadUpdateCategory)
router.get('/product_management',adminAuth.isLogin,productController.product_management)
router.get('/addproduct',adminAuth.isLogin,productController.loadaddproducts)
router.get('/productUpdate/:id',adminAuth.isLogin,productController.loadproductUpdate)
router.get('/productview/:id',adminAuth.isLogin,productController.productview)
router.get('/order_management',adminAuth.isLogin,orderController.getOrderManagement)
router.get('/orderview/:orderId',adminAuth.isLogin,orderController.getOrderDetails)
router.get('/coupon_management',adminAuth.isLogin,couponController.loadCouponManagement)
router.get('/addcoupon',adminAuth.isLogin,couponController.loadaddcoupon)
router.get('/updatecoupon/:id',adminAuth.isLogin,couponController.loadUpdateCoupon)
router.get('/report',adminAuth.isLogin,adminController.generateSalesReport)
router.get('/download/pdf',adminAuth.isLogin,adminController.downloadPDFReport)
router.get('/download/excel',adminAuth.isLogin,adminController.downloadExcelReport)

router.post('/addcoupon',adminAuth.isLogin,couponController.addCoupon)
router.post('/updatecoupon/:id', adminAuth.isLogin, couponController.updateCoupon);
router.post('/updateOrderStatus/:orderId',adminAuth.isLogin,orderController.updateOrderStatus)
router.post('/adminlogin',adminAuth.checkSession, adminController.login);
router.post('/banUser/:userId',adminAuth.isLogin, usermanageController.banUser);
router.post('/UnbanUser/:userId',adminAuth.isLogin, usermanageController.UnbanUser);
router.post('/blocked_category/:categoryId',adminAuth.isLogin,categoryController.blocked_category)
router.post('/Unblocked_category/:categoryId',adminAuth.isLogin,categoryController.Unblocked_category)
router.post('/addcategory',adminAuth.isLogin,upload,categoryController.addcategory)
router.post('/updateCategory/:id',adminAuth.isLogin,upload,categoryController.updateCategory)
router.post('/addproduct',adminAuth.isLogin,upload, productController.addproducts);
router.post('/blocked_product/:productId',adminAuth.isLogin, productController.blocked_product);
router.post('/unblocked_product/:productId',adminAuth.isLogin, productController.unblocked_product);
router.post('/productUpdate/:id',adminAuth.isLogin,upload,productController.productUpdate)

router.patch('/orders/:orderId/return/approve',adminAuth.isLogin,orderController.acceptReturn)
router.patch('/orders/:orderId/return/reject',adminAuth.isLogin,orderController.rejectReturn)

router.delete('/deletecoupon/:id', adminAuth.isLogin, couponController.deleteCoupon);


router.post('/logout',adminController.logout)



module.exports = router;
