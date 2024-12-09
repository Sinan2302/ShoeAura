
const pageNotFound = async(req,res)=>{
    try {
        res.render('error')
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const loadHomepage = async(req,res)=>{
    try {
        return res.render('home')
    } catch (error) {
        console.log("home Page is not found")
        res.status(500).send("server error")
    }
}

module.exports = {
    loadHomepage,
    pageNotFound,
}