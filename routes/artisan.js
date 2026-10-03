const express = require("express");
const Product = require("../models/Product");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const { GoogleGenAI, Type } = require("@google/genai");

const { isArtisan } = require("../middleware/auth");

const router = express.Router();


// ========================================
// GEMINI AI
// ========================================

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});


// ========================================
// NORMAL IMAGE UPLOAD
// ========================================

const upload = multer({
    dest: "uploads/"
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
// ARTISAN DASHBOARD
// ========================================

router.get(
    "/dashboard",
    isArtisan,
    async (req, res) => {

        try {

            // Only show products belonging
            // to the logged-in artisan

            const products = await Product.find({
                artisan: req.session.userId
            }).sort({
                createdAt: -1
            });

            res.render("artisan/dashboard", {
                products
            });

        } catch (err) {

            console.log("Dashboard error:", err);

            res.status(500).send(
                "Something went wrong"
            );
        }
    }
);


// ========================================
// ADD PRODUCT PAGE
// ========================================

router.get(
    "/products/new",
    isArtisan,
    (req, res) => {

        res.render("artisan/add-product");
    }
);


// ========================================
// AI PRODUCT UPLOAD PAGE
// ========================================

router.get(
    "/products/ai-upload",
    isArtisan,
    (req, res) => {

        res.render(
            "artisan/ai-product-upload"
        );
    }
);


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


            // Convert image to base64

            const base64Image =
                req.file.buffer.toString("base64");


            // Detect MIME type

            const mimeType =
                req.file.mimetype || "image/jpeg";


            // Gemini request

            const response = await ai.models.generateContent({

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

                    responseMimeType: "application/json",

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


            // Get AI response

            const text =
                response.text;


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


            // Delete temporary uploaded image

            try {

                fs.unlinkSync(req.file.path);

            } catch (fileError) {

                console.log(
                    "Temporary file cleanup error:",
                    fileError
                );
            }


            // Send AI result

            res.json({
                success: true,
                data
            });


        } catch (err) {

            console.log(
                "AI generation error:",
                err
            );

            res.status(500).json({
                success: false,
                message:
                    "AI product generation failed."
            });
        }
    }
);


// ========================================
// CREATE PRODUCT
// ========================================

router.post(
    "/products",
    isArtisan,
    upload.single("image"),

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


            // Basic validation

            if (
                !productName ||
                !category ||
                !price
            ) {

                return res.status(400).send(
                    "Product name, category and price are required."
                );
            }


            // Create product

            const newProduct = new Product({

                // IMPORTANT:
                // Link product to logged-in artisan

                artisan: req.session.userId,

                productName: productName.trim(),

                category: category.trim(),

                material:
                    material
                        ? material.trim()
                        : "",

                price: Number(price),

                description:
                    description
                        ? description.trim()
                        : "",

                tags:
                    tags
                        ? tags
                            .split(",")
                            .map(tag => tag.trim())
                            .filter(tag => tag !== "")
                        : [],

                image:
                    req.file
                        ? req.file.filename
                        : null
            });


            await newProduct.save();


            console.log(
                "Product created:",
                newProduct._id
            );


            res.redirect(
                "/artisan/dashboard"
            );


        } catch (err) {

            console.log(
                "Create product error:",
                err
            );

            res.status(500).send(
                "Something went wrong while creating the product."
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

                    // IMPORTANT:
                    // Artisan can only edit
                    // their own product

                    artisan: req.session.userId
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
    upload.single("image"),

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


            // Find only product belonging
            // to logged-in artisan

            const product =
                await Product.findOne({

                    _id: req.params.id,

                    artisan: req.session.userId
                });


            if (!product) {

                return res.status(404).send(
                    "Product not found or access denied."
                );
            }


            // Update fields

            product.productName =
                productName;

            product.category =
                category;

            product.material =
                material;

            product.price =
                Number(price);

            product.description =
                description;

            product.tags =
                tags
                    ? tags
                        .split(",")
                        .map(tag => tag.trim())
                        .filter(tag => tag !== "")
                    : [];


            // Replace image if new image uploaded

            if (req.file) {

                // Delete old image

                if (product.image) {

                    const oldImagePath =
                        path.join(
                            __dirname,
                            "..",
                            "uploads",
                            product.image
                        );

                    if (
                        fs.existsSync(oldImagePath)
                    ) {

                        try {

                            fs.unlinkSync(
                                oldImagePath
                            );

                        } catch (deleteError) {

                            console.log(
                                "Old image delete error:",
                                deleteError
                            );
                        }
                    }
                }


                product.image =
                    req.file.filename;
            }


            await product.save();


            res.redirect(
                "/artisan/dashboard"
            );


        } catch (err) {

            console.log(
                "Update product error:",
                err
            );

            res.status(500).send(
                "Something went wrong while updating the product."
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

                    // IMPORTANT:
                    // Artisan can only delete
                    // their own product

                    artisan: req.session.userId
                });


            if (!product) {

                return res.status(404).send(
                    "Product not found or access denied."
                );
            }


            // Delete product image

            if (product.image) {

                const imagePath =
                    path.join(
                        __dirname,
                        "..",
                        "uploads",
                        product.image
                    );

                if (
                    fs.existsSync(imagePath)
                ) {

                    try {

                        fs.unlinkSync(
                            imagePath
                        );

                    } catch (deleteError) {

                        console.log(
                            "Image delete error:",
                            deleteError
                        );
                    }
                }
            }


            await Product.deleteOne({
                _id: product._id
            });


            res.redirect(
                "/artisan/dashboard"
            );


        } catch (err) {

            console.log(
                "Delete product error:",
                err
            );

            res.status(500).send(
                "Something went wrong while deleting the product."
            );
        }
    }
);


module.exports = router;