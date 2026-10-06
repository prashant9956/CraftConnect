const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const ejsMate = require("ejs-mate");
const methodOverride = require("method-override");
const session = require("express-session");
require("dotenv").config();

const artisanRouter = require("./routes/artisan");
const marketplaceRouter = require("./routes/marketplace");
const authRouter = require("./routes/auth");
const cartRouter = require("./routes/cart");
const adminRouter = require("./routes/admin");

const app = express();

/* =========================
   APP CONFIG
========================= */

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine("ejs", ejsMate);

/* =========================
   MIDDLEWARE
========================= */

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

/* =========================
   CURRENT USER
========================= */

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

/* =========================
   STATIC FILES
========================= */

app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* =========================
   ROUTES
========================= */

app.use("/", authRouter);
app.use("/artisan", artisanRouter);
app.use("/marketplace", marketplaceRouter);
app.use("/cart", cartRouter);
app.use("/admin", adminRouter);

/* =========================
   HOME
========================= */

app.get("/", (req, res) => {
  res.render("home");
});

/* =========================
   DATABASE + SERVER
========================= */

const PORT = process.env.PORT || 8080;

/*
  IMPORTANT:
  Your existing environment variable is MONGO_URL.
  Do NOT change this to MONGODB_URI.
*/

const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
  console.error("=================================");
  console.error("ERROR: MONGO_URL is not defined");
  console.error("Please add MONGO_URL in Render Environment Variables.");
  console.error("=================================");
  process.exit(1);
}

mongoose
  .connect(MONGO_URL)
  .then(() => {
    console.log("=================================");
    console.log("MongoDB Atlas CONNECTED");
    console.log("Database:", mongoose.connection.name);
    console.log("=================================");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`CraftConnect running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("=================================");
    console.error("MongoDB Atlas CONNECTION ERROR:");
    console.error(err.message);
    console.error("=================================");

    process.exit(1);
  });