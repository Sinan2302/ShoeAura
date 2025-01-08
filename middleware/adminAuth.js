const isLogin = async(req,res,next)=>{
    if(req.session.isAdminLoggedIn){
        res.redirect('/admin/dashboard')
    }else{
        next()
    }
}

module.exports = {isLogin}