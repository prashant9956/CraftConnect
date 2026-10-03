const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const ejsMate = require("ejs-mate");
require("dotenv").config();

const app = express();
const artisanRouter = require("./routes/artisan");
const marketplaceRouter = require("./routes/marketplace");
const methodOverride = require("method-override");
const session = require("express-session");
const authRouter = require("./routes/auth");
const cartRouter = require("./routes/cart");
const adminRouter = require("./routes/admin");

// --------------------
// Basic Configuration
// --------------------

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.engine("ejs", ejsMate);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));

app.use(
    session({
        secret: process.env.SESSION_SECRET || "craftconnect-secret",
        resave: false,
        saveUninitialized: false
    })
);
app.use((req, res, next) => {
    res.locals.currentUser = req.session.userId
        ? {
            id: req.session.userId,
            name: req.session.userName,
            role: req.session.userRole
        }
        : null;

    next();
});


app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/", authRouter);
app.use("/artisan", artisanRouter);
app.use("/marketplace", marketplaceRouter);
app.use("/cart", cartRouter);
app.use("/admin", adminRouter);
// --------------------
// MongoDB Connection
// --------------------

const MONGO_URL =
    process.env.MONGO_URL || "mongodb://127.0.0.1:27017/craftconnect";

mongoose
    .connect(MONGO_URL)
    .then(() => {
        console.log("MongoDB connected successfully");
    })
    .catch((err) => {
        console.log("MongoDB connection error:", err);
    });

// --------------------
// Home Route
// --------------------

app.get("/", (req, res) => {
    res.render("home");
});

// --------------------
// Server
// --------------------

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
    console.log(`CraftConnect running on port ${PORT}`);
});