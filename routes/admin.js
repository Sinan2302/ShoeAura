const express = require('express');
const { uploadFields } = require('../middleware/multerConfig');
const router = express.Router();
const adminController = require('../controllers/admin/adminController');
const adminAuth = require('../middleware/adminAuth')
const usermanageController = require('../controllers/admin/usermanageController')
const categoryController = require('../controllers/admin/categoryController')
const productController = require('../controllers/admin/productController')


router.get('/adminlogin',adminAuth.isLogin, adminController.loadLogin);
router.get('/dashboard', adminController.loadDashboard);
router.get('/usermanagement',usermanageController.usermanagement)
router.get('/category_management',categoryController.categorymanagement)
router.get('/addcategory',categoryController.loadaddcategory)
router.get('/updateCategory/:id',categoryController.loadUpdateCategory)
router.get('/product_management',productController.product_management)
router.get('/addproduct',productController.loadaddproducts)
router.get('/productUpdate/:id',productController.loadproductUpdate)
router.get('/productview/:id',productController.productview)


router.post('/adminlogin', adminController.login);
router.post('/banUser/:userId', usermanageController.banUser);
router.post('/UnbanUser/:userId', usermanageController.UnbanUser);
router.post('/blocked_category/:categoryId',categoryController.blocked_category)
router.post('/Unblocked_category/:categoryId',categoryController.Unblocked_category)
router.post('/addcategory',categoryController.addcategory)
router.post('/updateCategory/:id',categoryController.updateCategory)
router.post('/addproduct', uploadFields, productController.addproducts);
router.post('/blocked_product/:productId', productController.blocked_product);
router.post('/unblocked_product/:productId', productController.unblocked_product);
router.post('/productUpdate/:id',uploadFields,productController.productUpdate)



router.post('/logout',adminController.logout)



module.exports = router;
