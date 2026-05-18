
export const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.parent) {
        return next();
    }

    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(401).json({ message: "Login required" });
    }

    res.redirect("/login");
};

export const isAdmin = (req, res, next) => {
    if (req.session && req.session.parent && req.session.parent.isAdmin) {
        return next();
    }

    if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
        return res.status(403).json({ message: "Admin access required" });
    }

    res.redirect("/login");
};

