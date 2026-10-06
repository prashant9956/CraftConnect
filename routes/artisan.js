const express = require("express");
const Product = require("../models/product");
const multer = require("multer");

const { GoogleGenAI, Type } = require("@google/genai");
const { isArtisan } = require("../middleware/auth");

const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const router = express.Router();

// ========================================
// CLOUDINARY CONFIGURATION
// ========================================

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log("Cloudinary config:", {
    cloud_name: !!process.env.CLOUDINARY_CLOUD_NAME,
    api_key: !!process.env.CLOUDINARY_API_KEY,
    api_secret: !!process.env.CLOUDINARY_API_SECRET
});

// ========================================
// GEMINI AI
// ========================================

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

// ========================================
// AI IMAGE UPLOAD
// ========================================

const aiUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024
    }
});

// ========================================
// CLOUDINARY STORAGE
// ========================================

const cloudinaryStorage = new CloudinaryStorage({
    cloudinary: cloudinary,

    params: {
        folder: "craftconnect/products",
        allowed_formats: ["jpg", "jpeg", "png", "webp"]
    }
});

const cloudinaryUpload = multer({
    storage: cloudinaryStorage,
    limits: {
        fileSize: 10 * 1024 * 1024
    }
});

// ========================================
// ARTISAN DASHBOARD
// ========================================

router.get("/dashboard", isArtisan, async (req, res) => {
    try {
        const products = await Product.find({
            artisan: req.session.userId
        }).sort({ createdAt: -1 });

        res.render("artisan/dashboard", {
            products
        });

    } catch (err) {
        console.log("Dashboard error:", err);

        res.status(500).send(
            "Something went wrong while loading dashboard."
        );
    }
});
router.get("/products", isArtisan, async (req, res) => {
    try {
        const products = await Product.find({
            artisan: req.session.userId
        }).sort({ createdAt: -1 });

        res.render("artisan/dashboard", {
            products
        });

    } catch (err) {
        console.log("Products page error:", err);

        res.status(500).send(
            "Something went wrong while loading products."
        );
    }
});


// ========================================
// ADD PRODUCT PAGE
// ========================================

router.get("/products/new", isArtisan, (req, res) => {
    res.render("artisan/add-product");
});

// ========================================
// AI PRODUCT UPLOAD PAGE
// ========================================

router.get("/products/ai-upload", isArtisan, (req, res) => {
    res.render("artisan/ai-product-upload");
});

// ========================================
// AI PRODUCT GENERATION
// ========================================

router.post(
    "/products/ai-generate",
    isArtisan,
    aiUpload.single("image"),

    async (req, res) => {

        try {

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: "Please upload an image."
                });
            }

            const base64Image =
                req.file.buffer.toString("base64");

            const mimeType =
                req.file.mimetype || "image/jpeg";

            const response =
                await ai.models.generateContent({

                    model: "gemini-3.5-flash-lite",

                    contents: [

                        {
                            inlineData: {
                                mimeType: mimeType,
                                data: base64Image
                            }
                        },

                        {
                            text: `
You are an AI assistant helping local artisans create product listings.

Analyze the uploaded handmade product image.

Return ONLY valid JSON.

The JSON must contain exactly these fields:

{
    "productName": "short product name",
    "category": "one category",
    "material": "likely material",
    "description": "short attractive product description",
    "tags": ["tag1", "tag2", "tag3"]
}

Allowed categories:

- Home Decor
- Handicrafts
- Jewellery
- Clothing
- Pottery
- Paintings
- Other

Important rules:

1. Do not make unsupported claims.
2. If material cannot be confidently identified, use "Unknown / Not specified".
3. Do not claim the product is authentic, certified, handmade, traditional, organic, eco-friendly, etc. unless visually supported.
4. Keep the description concise.
5. Tags should be useful for marketplace search.
6. Human review will happen before publishing.
`
                        }

                    ],

                    config: {

                        responseMimeType:
                            "application/json",

                        responseSchema: {

                            type: Type.OBJECT,

                            properties: {

                                productName: {
                                    type: Type.STRING
                                },

                                category: {
                                    type: Type.STRING,

                                    enum: [
                                        "Home Decor",
                                        "Handicrafts",
                                        "Jewellery",
                                        "Clothing",
                                        "Pottery",
                                        "Paintings",
                                        "Other"
                                    ]
                                },

                                material: {
                                    type: Type.STRING
                                },

                                description: {
                                    type: Type.STRING
                                },

                                tags: {
                                    type: Type.ARRAY,

                                    items: {
                                        type: Type.STRING
                                    }
                                }

                            },

                            required: [
                                "productName",
                                "category",
                                "material",
                                "description",
                                "tags"
                            ]
                        }
                    }
                });

            const text = response.text;

            console.log(
                "Gemini AI response:",
                text
            );

            let data;

            try {

                data = JSON.parse(text);

            } catch (parseError) {

                console.log(
                    "AI JSON parse error:",
                    parseError
                );

                return res.status(500).json({
                    success: false,
                    message: "AI returned invalid data."
                });
            }

            return res.json({
                success: true,
                data: data
            });

        } catch (err) {

            console.log(
                "AI generation error:",
                err
            );

            console.log(
                "AI error message:",
                err.message
            );

            console.log(
                "AI error stack:",
                err.stack
            );

            return res.status(500).json({
                success: false,
                message:
                    err.message ||
                    "AI product generation failed."
            });
        }
    }
);

// ========================================
// CREATE PRODUCT
// ========================================
// IMPORTANT:
// Cloudinary/Multer is wrapped manually here
// so we can see the real upload error instead
// of only getting [object Object].

router.post(
    "/products",

    isArtisan,

    (req, res, next) => {

        cloudinaryUpload.single("image")(
            req,
            res,

            (err) => {

                if (err) {

                    console.log("");
                    console.log("=================================");
                    console.log("CLOUDINARY / MULTER ERROR");
                    console.log("=================================");

                    console.log(
                        "Error:",
                        err
                    );

                    console.log(
                        "Error message:",
                        err.message
                    );

                    console.log(
                        "Error name:",
                        err.name
                    );

                    console.log(
                        "Error stack:",
                        err.stack
                    );

                    console.log(
                        "Error JSON:",
                        JSON.stringify(
                            err,
                            Object.getOwnPropertyNames(err),
                            2
                        )
                    );

                    console.log(
                        "================================="
                    );

                    return res.status(500).send(
                        "Image upload failed: " +
                        (
                            err.message ||
                            "Unknown Cloudinary error"
                        )
                    );
                }

                next();
            }
        );
    },

    async (req, res) => {

        try {

            console.log("");
            console.log("=================================");
            console.log("CREATE PRODUCT");
            console.log("=================================");

            console.log(
                "Request body:",
                req.body
            );

            console.log(
                "Uploaded file:",
                req.file
            );

            const {
                productName,
                category,
                material,
                price,
                description,
                tags
            } = req.body;

            // ========================================
            // VALIDATION
            // ========================================

            if (
                !productName ||
                !category ||
                !price
            ) {

                return res.status(400).send(
                    "Product name, category and price are required."
                );
            }

            // ========================================
            // PRODUCT DATA
            // ========================================

            const newProduct = new Product({

                artisan: req.session.userId,

                productName:
                    productName.trim(),

                category:
                    category.trim(),

                material:
                    material
                        ? material.trim()
                        : "",

                price:
                    Number(price),

                description:
                    description
                        ? description.trim()
                        : "",

                tags:
                    tags
                        ? tags
                            .split(",")
                            .map(tag => tag.trim())
                            .filter(
                                tag => tag !== ""
                            )
                        : [],

                // Cloudinary URL
                image:
                    req.file
                        ? req.file.path
                        : null
            });

            console.log(
                "Product data before save:"
            );

            console.log(newProduct);

            // ========================================
            // SAVE TO MONGODB
            // ========================================

            await newProduct.save();

            console.log(
                "Product created successfully:",
                newProduct._id
            );

            console.log(
                "Cloudinary image:",
                newProduct.image
            );

            console.log(
                "================================="
            );

            return res.redirect(
                "/artisan/dashboard"
            );

        } catch (err) {

            console.log("");
            console.log("=================================");
            console.log("CREATE PRODUCT ERROR");
            console.log("=================================");

            console.log(
                "Error:",
                err
            );

            console.log(
                "Message:",
                err.message
            );

            console.log(
                "Name:",
                err.name
            );

            console.log(
                "Stack:",
                err.stack
            );

            console.log(
                "Error JSON:",
                JSON.stringify(
                    err,
                    Object.getOwnPropertyNames(err),
                    2
                )
            );

            console.log(
                "================================="
            );

            return res.status(500).send(
                "Something went wrong while creating the product: " +
                (
                    err.message ||
                    "Unknown error"
                )
            );
        }
    }
);

// ========================================
// EDIT PRODUCT PAGE
// ========================================

router.get(
    "/products/:id/edit",
    isArtisan,

    async (req, res) => {

        try {

            const product =
                await Product.findOne({

                    _id: req.params.id,

                    artisan:
                        req.session.userId

                });

            if (!product) {

                return res.status(404).send(
                    "Product not found or access denied."
                );
            }

            res.render(
                "artisan/edit-product",
                {
                    product
                }
            );

        } catch (err) {

            console.log(
                "Edit page error:",
                err
            );

            res.status(500).send(
                "Something went wrong."
            );
        }
    }
);

// ========================================
// UPDATE PRODUCT
// ========================================

router.put(
    "/products/:id",

    isArtisan,

    (req, res, next) => {

        cloudinaryUpload.single("image")(
            req,
            res,

            (err) => {

                if (err) {

                    console.log("");
                    console.log(
                        "================================="
                    );

                    console.log(
                        "CLOUDINARY UPDATE ERROR"
                    );

                    console.log(
                        "================================="
                    );

                    console.log(
                        "Error:",
                        err
                    );

                    console.log(
                        "Message:",
                        err.message
                    );

                    console.log(
                        "Stack:",
                        err.stack
                    );

                    console.log(
                        "Error JSON:",
                        JSON.stringify(
                            err,
                            Object.getOwnPropertyNames(err),
                            2
                        )
                    );

                    return res.status(500).send(
                        "Image upload failed: " +
                        (
                            err.message ||
                            "Unknown Cloudinary error"
                        )
                    );
                }

                next();
            }
        );
    },

    async (req, res) => {

        try {

            const {
                productName,
                category,
                material,
                price,
                description,
                tags
            } = req.body;

            const product =
                await Product.findOne({

                    _id: req.params.id,

                    artisan:
                        req.session.userId

                });

            if (!product) {

                return res.status(404).send(
                    "Product not found or access denied."
                );
            }

            // ========================================
            // UPDATE FIELDS
            // ========================================

            product.productName =
                productName
                    ? productName.trim()
                    : product.productName;

            product.category =
                category
                    ? category.trim()
                    : product.category;

            product.material =
                material
                    ? material.trim()
                    : "";

            product.price =
                Number(price);

            product.description =
                description
                    ? description.trim()
                    : "";

            product.tags =
                tags
                    ? tags
                        .split(",")
                        .map(tag => tag.trim())
                        .filter(
                            tag => tag !== ""
                        )
                    : [];

            // ========================================
            // NEW CLOUDINARY IMAGE
            // ========================================

            if (req.file) {

                product.image =
                    req.file.path;

                console.log(
                    "New Cloudinary image:",
                    product.image
                );
            }

            await product.save();

            console.log(
                "Product updated:",
                product._id
            );

            return res.redirect(
                "/artisan/dashboard"
            );

        } catch (err) {

            console.log(
                "Update product error:",
                err
            );

            console.log(
                "Message:",
                err.message
            );

            console.log(
                "Stack:",
                err.stack
            );

            return res.status(500).send(
                "Something went wrong while updating the product: " +
                (
                    err.message ||
                    "Unknown error"
                )
            );
        }
    }
);

// ========================================
// DELETE PRODUCT
// ========================================

router.delete(
    "/products/:id",

    isArtisan,

    async (req, res) => {

        try {

            const product =
                await Product.findOne({

                    _id: req.params.id,

                    artisan:
                        req.session.userId

                });

            if (!product) {

                return res.status(404).send(
                    "Product not found or access denied."
                );
            }

            await Product.deleteOne({
                _id: product._id
            });

            console.log(
                "Product deleted:",
                product._id
            );

            return res.redirect(
                "/artisan/dashboard"
            );

        } catch (err) {

            console.log(
                "Delete product error:",
                err
            );

            console.log(
                "Message:",
                err.message
            );

            console.log(
                "Stack:",
                err.stack
            );

            return res.status(500).send(
                "Something went wrong while deleting the product."
            );
        }
    }
);

// ========================================
// EXPORT ROUTER
// ========================================

module.exports = router;