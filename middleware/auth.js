function isLoggedIn(req, res, next) {
    if (!req.session.userId) {
        return res.redirect("/login");
    }

    next();
}

function isArtisan(req, res, next) {
    if (!req.session.userId) {
        return res.redirect("/login");
    }

    if (req.session.userRole !== "artisan") {
        return res.status(403).send(
            "Access denied. Artisan account required."
        );
    }

    next();
}

function isAdmin(req, res, next) {
    if (!req.session.userId) {
        return res.redirect("/login");
    }

    if (req.session.userRole !== "admin") {
        return res.status(403).send(
            "Access denied. Admin account required."
        );
    }

    next();
}

module.exports = {
    isLoggedIn,
    isArtisan,
    isAdmin
};