const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
    // ========================================
    // PRODUCT OWNER
    // ========================================

    artisan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },


    // ========================================
    // PRODUCT INFORMATION
    // ========================================

    productName: {
        type: String,
        required: true,
        trim: true
    },

    category: {
        type: String,
        required: true,
        trim: true
    },

    material: {
        type: String,
        trim: true
    },

    price: {
        type: Number,
        required: true
    },

    description: {
        type: String,
        trim: true
    },

    tags: [
        {
            type: String,
            trim: true
        }
    ],

    image: {
        type: String
    },


    // ========================================
    // CREATED DATE
    // ========================================

    createdAt: {
        type: Date,
        default: Date.now
    }
});


module.exports =
    mongoose.models.Product ||
    mongoose.model("Product", productSchema);