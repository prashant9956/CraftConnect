const express = require("express");
const Product = require("../models/product");

const router = express.Router();

// Marketplace
router.get("/", async (req, res) => {
    try {
        const { search, category } = req.query;

        let filter = {};

        // Search
        if (search && search.trim() !== "") {
            filter.$or = [
                {
                    productName: {
                        $regex: search.trim(),
                        $options: "i"
                    }
                },
                {
                    description: {
                        $regex: search.trim(),
                        $options: "i"
                    }
                },
                {
                    tags: {
                        $regex: search.trim(),
                        $options: "i"
                    }
                }
            ];
        }

        // Category filter
        if (category && category !== "All") {
            filter.category = category;
        }

        const products = await Product.find(filter).sort({
            createdAt: -1
        });

     
res.render("marketplace/index", {
    products,
    search: search || "",
    category: category || "All",
    title: "Handmade Crafts Marketplace | CraftConnect",
    description: "Explore unique handmade products, discover beautiful artisan creations, and support local craftsmanship on CraftConnect."
});


    } catch (err) {
        console.log("Marketplace error:", err);
        res.status(500).send("Something went wrong");
    }
});
// Product detail page

res.render("marketplace/product-detail", {
    product,
    title: `${product.productName} | CraftConnect`,
    description: `Discover ${product.productName} on CraftConnect, your marketplace for unique handmade products and artisan creations.`
});


module.exports = router;