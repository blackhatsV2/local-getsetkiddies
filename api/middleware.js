
export const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.parent) {
        return next();
    }

    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(401).json({ message: "Login required" });
    }

    res.redirect("/login");
};
