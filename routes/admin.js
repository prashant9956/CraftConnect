const express = require("express");
// const User = require("../models/User");
const User = require("../models/user.js");
const Product = require("../models/product");
const { isAdmin } = require("../middleware/auth");

const router = express.Router();


// =====================================================
// ADMIN DASHBOARD
// =====================================================

router.get("/", isAdmin, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();

        const totalArtisans = await User.countDocuments({
            role: "artisan"
        });

        const totalBuyers = await User.countDocuments({
            role: "buyer"
        });

        const totalProducts = await Product.countDocuments();

        const recentProducts = await Product.find()
            .populate("artisan", "name email")
            .sort({ createdAt: -1 })
            .limit(6);

        res.render("admin/dashboard", {
            totalUsers,
            totalArtisans,
            totalBuyers,
            totalProducts,
            recentProducts
        });

    } catch (err) {
        console.log("Admin dashboard error:", err);
        res.status(500).send("Something went wrong.");
    }
});


// =====================================================
// MANAGE USERS
// =====================================================

router.get("/users", isAdmin, async (req, res) => {
    try {
        const users = await User.find()
            .sort({ createdAt: -1 });

        res.render("admin/users", {
            users
        });

    } catch (err) {
        console.log("Admin users error:", err);
        res.status(500).send("Could not load users.");
    }
});


// =====================================================
// DELETE USER
// =====================================================

router.delete("/users/:id", isAdmin, async (req, res) => {
    try {
        const userId = req.params.id;

        // Prevent admin from deleting himself
        if (userId === req.session.userId.toString()) {
            return res.status(400).send(
                "You cannot delete your own admin account."
            );
        }

        await User.findByIdAndDelete(userId);

        res.redirect("/admin/users");

    } catch (err) {
        console.log("Delete user error:", err);
        res.status(500).send("Could not delete user.");
    }
});


// =====================================================
// MANAGE PRODUCTS
// =====================================================

router.get("/products", isAdmin, async (req, res) => {
    try {
        const products = await Product.find()
            .populate("artisan", "name email")
            .sort({ createdAt: -1 });

        res.render("admin/products", {
            products
        });

    } catch (err) {
        console.log("Admin products error:", err);
        res.status(500).send("Could not load products.");
    }
});


// =====================================================
// DELETE PRODUCT
// =====================================================

router.delete("/products/:id", isAdmin, async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);

        res.redirect("/admin/products");

    } catch (err) {
        console.log("Delete product error:", err);
        res.status(500).send("Could not delete product.");
    }
});


module.exports = router;