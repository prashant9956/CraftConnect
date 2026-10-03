const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const router = express.Router();


// ========================================
// SIGNUP PAGE
// ========================================

router.get("/signup", (req, res) => {
    res.render("auth/signup");
});


// ========================================
// SIGNUP
// ========================================

router.post("/signup", async (req, res) => {

    try {

        const {
            name,
            email,
            password,
            role
        } = req.body;


        // Check required fields

        if (!name || !email || !password) {

            return res
                .status(400)
                .send("All required fields must be filled.");

        }


        // Check if user already exists

        const existingUser = await User.findOne({
            email: email.toLowerCase().trim()
        });


        if (existingUser) {

            return res
                .status(400)
                .send("An account with this email already exists.");

        }


        // Only buyer and artisan can signup

        const selectedRole =
            role === "artisan"
                ? "artisan"
                : "buyer";


        // Hash password

        const hashedPassword =
            await bcrypt.hash(password, 12);


        // Create user

        const newUser = new User({

            name: name.trim(),

            email: email
                .toLowerCase()
                .trim(),

            password: hashedPassword,

            role: selectedRole

        });


        await newUser.save();


        console.log(
            "New user registered:",
            newUser.email
        );


        // Automatically login after signup

        req.session.userId = newUser._id;

        req.session.userName = newUser.name;

        req.session.userRole = newUser.role;


        res.redirect("/");

    } catch (err) {

        console.log("Signup error:", err);

        res
            .status(500)
            .send("Something went wrong during signup.");

    }

});


// ========================================
// LOGIN PAGE
// ========================================

router.get("/login", (req, res) => {

    res.render("auth/login");

});


// ========================================
// LOGIN
// ========================================

router.post("/login", async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;


        // Check fields

        if (!email || !password) {

            return res
                .status(400)
                .send("Email and password are required.");

        }


        // Find user

        const user = await User.findOne({

            email: email
                .toLowerCase()
                .trim()

        });


        if (!user) {

            return res
                .status(400)
                .send("Invalid email or password.");

        }


        // Compare password

        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password
            );


        if (!passwordMatch) {

            return res
                .status(400)
                .send("Invalid email or password.");

        }


        // Store user information in session

        req.session.userId =
            user._id;

        req.session.userName =
            user.name;

        req.session.userRole =
            user.role;


        console.log(
            "User logged in:",
            user.email
        );


        // Redirect according to role

        if (user.role === "artisan") {

            return res.redirect(
                "/artisan/dashboard"
            );

        }


        if (user.role === "admin") {

            return res.redirect(
                "/admin"
            );

        }


        // Buyer

        res.redirect("/marketplace");


    } catch (err) {

        console.log(
            "Login error:",
            err
        );

        res
            .status(500)
            .send(
                "Something went wrong during login."
            );

    }

});


// ========================================
// LOGOUT
// ========================================

router.get("/logout", (req, res) => {

    req.session.destroy((err) => {

        if (err) {

            console.log(
                "Logout error:",
                err
            );

            return res
                .status(500)
                .send("Could not logout.");

        }


        res.redirect("/");

    });

});
// ========================================
// CHECK LOGIN
// ========================================

function isLoggedIn(req, res, next) {

    if (!req.session.userId) {
        return res.redirect("/login");
    }

    next();
}


// ========================================
// CHECK ARTISAN
// ========================================

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


// ========================================
// CHECK ADMIN
// ========================================

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

module.exports = router;