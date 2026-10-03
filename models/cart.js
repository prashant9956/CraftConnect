const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },

    items: [
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product",
                required: true
            },

            quantity: {
                type: Number,
                default: 1,
                min: 1
            }
        }
    ],

    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports =
    mongoose.models.Cart ||
    mongoose.model("Cart", cartSchema);