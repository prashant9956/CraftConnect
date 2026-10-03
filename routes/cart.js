const express = require("express");
const Cart = require("../models/cart");
const Product = require("../models/product");
const { isLoggedIn } = require("../middleware/auth");

const router = express.Router();


// CART PAGE
router.get("/", isLoggedIn, async (req, res) => {
    try {
        const cart = await Cart.findOne({
            buyer: req.session.userId
        }).populate("items.product");

        res.render("cart/index", {
            cart: cart || { items: [] }
        });

    } catch (err) {
        console.log("Cart page error:", err);
        res.status(500).send("Something went wrong.");
    }
});


// ADD TO CART
router.post("/add/:productId", isLoggedIn, async (req, res) => {
    try {
        const { productId } = req.params;

        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).send("Product not found.");
        }

        let cart = await Cart.findOne({
            buyer: req.session.userId
        });

        if (!cart) {
            cart = new Cart({
                buyer: req.session.userId,
                items: [
                    {
                        product: productId,
                        quantity: 1
                    }
                ]
            });
        } else {

            const existingItem = cart.items.find(
                item => item.product.toString() === productId
            );

            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cart.items.push({
                    product: productId,
                    quantity: 1
                });
            }
        }

        await cart.save();

        res.redirect("/cart");

    } catch (err) {
        console.log("Add to cart error:", err);
        res.status(500).send("Could not add product to cart.");
    }
});


// REMOVE FROM CART
router.post("/remove/:productId", isLoggedIn, async (req, res) => {
    try {

        await Cart.findOneAndUpdate(
            {
                buyer: req.session.userId
            },
            {
                $pull: {
                    items: {
                        product: req.params.productId
                    }
                }
            }
        );

        res.redirect("/cart");

    } catch (err) {
        console.log("Remove cart error:", err);
        res.status(500).send("Could not remove product.");
    }
});


module.exports = router;