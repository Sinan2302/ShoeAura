const User  = require('../model/userSchema')

const sessionValidator = async (req, res, next) => {
    try {
        if (req.session.user) {
            const user = await User.findById(req.session.user._id);
            if (!user || user.isBlocked) {
                req.session.destroy(err => {
                    if (err) {
                        console.error("Error destroying session:", err);
                        return res.status(500).send("An error occurred.");
                    }
                    return res.redirect('/banpage'); 
                });
                return;
            }
        }
        next();
    } catch (error) {
        console.error("Error validating session:", error);
        res.status(500).send("An error occurred.");
    }
};

module.exports = sessionValidator
