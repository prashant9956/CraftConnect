const express = require("express");
const Cart = require("../models/cart");
const Product = require("../models/product");
const { isLoggedIn } = require("../middleware/auth");

const router = express.Router();
const Order = require("../models/order");


// ==========================================
// CART PAGE
// ==========================================

router.get("/", isLoggedIn, async (req, res) => {
    try {

        const cart = await Cart.findOne({
            buyer: req.session.userId
        }).populate("items.product");

        // Remove products that no longer exist
        if (cart) {

            cart.items = cart.items.filter(
                item => item.product !== null
            );

            await cart.save();
        }

        res.render("cart/index", {
            cart: cart || { items: [] }
        });

    } catch (err) {

        console.log("Cart page error:", err);

        res.status(500).send(
            "Something went wrong."
        );
    }
});



// ==========================================
// CHECKOUT PAGE
// ==========================================

router.get("/checkout", isLoggedIn, async (req, res) => {

    try {

        const cart = await Cart.findOne({
            buyer: req.session.userId
        }).populate("items.product");


        // Cart doesn't exist
        if (!cart) {

            return res.redirect("/cart");
        }


        // Remove deleted products
        cart.items = cart.items.filter(
            item => item.product !== null
        );


        // Save cleaned cart
        await cart.save();


        // Empty cart
        if (cart.items.length === 0) {

            return res.redirect("/cart");
        }


        // Calculate total
        const subtotal = cart.items.reduce(
            (total, item) => {

                return total +
                    (
                        Number(item.product.price || 0) *
                        Number(item.quantity || 0)
                    );

            },
            0
        );


        const total = subtotal;


        res.render("cart/checkout", {

            cart,
            subtotal,
            total

        });


    } catch (err) {

        console.log(
            "Checkout page error:",
            err
        );

        res.status(500).send(
            "Something went wrong while opening checkout."
        );
    }
});



// ==========================================
// ADD TO CART
// ==========================================

router.post("/add/:productId", isLoggedIn, async (req, res) => {

    try {

        const { productId } = req.params;


        const product = await Product.findById(
            productId
        );


        if (!product) {

            return res.status(404).send(
                "Product not found."
            );
        }


        let cart = await Cart.findOne({
            buyer: req.session.userId
        });


        // Create new cart
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
                item =>
                    item.product &&
                    item.product.toString() === productId
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

        console.log(
            "Add to cart error:",
            err
        );

        res.status(500).send(
            "Could not add product to cart."
        );
    }
});
// ==========================================
// PLACE ORDER
// ==========================================

router.post("/order", isLoggedIn, async (req, res) => {

    try {

        const {
            fullName,
            phone,
            pincode,
            address,
            city,
            state,
            paymentMethod
        } = req.body;


        // -------------------------------
        // VALIDATE ADDRESS
        // -------------------------------

        if (
            !fullName ||
            !phone ||
            !pincode ||
            !address ||
            !city ||
            !state
        ) {

            return res.status(400).send(
                "Please fill all delivery address fields."
            );

        }


        // -------------------------------
        // GET CART
        // -------------------------------

        const cart = await Cart.findOne({
            buyer: req.session.userId
        }).populate("items.product");


        if (!cart || cart.items.length === 0) {

            return res.redirect("/cart");

        }


        // -------------------------------
        // REMOVE DELETED PRODUCTS
        // -------------------------------

        cart.items = cart.items.filter(
            item => item.product !== null
        );


        if (cart.items.length === 0) {

            await cart.save();

            return res.redirect("/cart");

        }


        // -------------------------------
        // PREPARE ORDER ITEMS
        // -------------------------------

        const orderItems = cart.items.map(item => ({

            product: item.product._id,

            quantity: Number(item.quantity),

            price: Number(item.product.price || 0)

        }));


        // -------------------------------
        // CALCULATE TOTAL
        // -------------------------------

        const totalAmount = orderItems.reduce(
            (total, item) => {

                return total +
                    (
                        item.price *
                        item.quantity
                    );

            },
            0
        );


        // -------------------------------
        // CREATE ORDER
        // -------------------------------

        const order = new Order({

            buyer: req.session.userId,

            items: orderItems,

            deliveryAddress: {

                fullName: fullName.trim(),

                phone: phone.trim(),

                pincode: pincode.trim(),

                address: address.trim(),

                city: city.trim(),

                state: state.trim()

            },

            paymentMethod:
                paymentMethod || "COD",

            paymentStatus:
                paymentMethod === "COD"
                    ? "Pending"
                    : "Pending",

            orderStatus: "Placed",

            totalAmount

        });


        await order.save();


        // -------------------------------
        // EMPTY CART
        // -------------------------------

        cart.items = [];

        await cart.save();


        // -------------------------------
        // ORDER SUCCESS PAGE
        // -------------------------------

        res.render("cart/order-success", {

            order

        });


    } catch (err) {

        console.log(
            "Place order error:",
            err
        );

        res.status(500).send(
            "Something went wrong while placing your order."
        );

    }

});


// ==========================================
// REMOVE FROM CART
// ==========================================

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

        console.log(
            "Remove cart error:",
            err
        );

        res.status(500).send(
            "Could not remove product."
        );
    }
});



module.exports = router;