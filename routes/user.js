const express = require('express')
const router = express.Router()
const userController = require('../controllers/user/userController')
const userAuth = require('../middleware/userAuth')
const userIsBanned = require('../middleware/isUserBanned')


router.get("/",userIsBanned,userController.loadHomepage)
router.get('/banpage',userController.banpage)
router.get('/pageNotFound',userController.pageNotFound)
router.get('/auth/google', userController.googleSignin)
router.get('/auth/google/callback',userController.callbackGoogle)
router.get('/signUp',userAuth.isLogin,userController.loadSignup)
router.get('/userlogin',userAuth.isLogin,userController.loadLogin)
router.get('/Shopping_page',userIsBanned,userController.Shopping_page)
router.get('/product_details/:id',userIsBanned,userController.product_details)
router.get('/category_collection/:categoryId',userIsBanned,userController.category_collection)

router.post('/signUp',userController.signup)
router.post('/verifyOtp',userController.verifyOtp)
router.post('/resendOtp',userController.resendOtp)
router.post('/userlogin',userController.login)
router.post('/logout',userAuth.checkSession,userController.logout)


module.exports = router