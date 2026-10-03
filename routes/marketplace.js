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
            category: category || "All"
        });

    } catch (err) {
        console.log("Marketplace error:", err);
        res.status(500).send("Something went wrong");
    }
});
// Product detail page
router.get("/product/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const product = await Product.findById(id);

        if (!product) {
            return res.status(404).send("Product not found");
        }

        res.render("marketplace/product-detail", {
            product
        });

    } catch (err) {
        console.log("Product detail error:", err);
        res.status(500).send("Something went wrong");
    }
});

module.exports = router;