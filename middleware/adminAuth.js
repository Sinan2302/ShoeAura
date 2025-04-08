const checkSession = async(req,res,next)=>{
    if(!req.session.isAdminLoggedIn){
        next()
    }else{
        res.redirect('/admin/dashboard')

    }
}

const isLogin = async(req,res,next)=>{
    if(req.session.isAdminLoggedIn){
        next()
    }else{
        res.redirect('/admin/adminlogin')
    }
}

module.exports = {checkSession,isLogin}