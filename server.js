const express = require("express");
const session = require("express-session");
const path = require("path");
const app = express();
const port = 3000;

const db = require("./db");
db.connect();

app.use(
  session({
    secret: "ban-muon-gi-cung-duoc",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 ngày
      secure: false,
      httpOnly: true,
    },
  })
);
// Cấu hình middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// Import route controller
const homeController = require("./app/controllers/homeController");
app.use("/", homeController); // Gắn controller chính

const accountRoutes = require("./app/controllers/accountController");
app.use("/account", accountRoutes);

const adminRoutes = require("./app/controllers/adminController");
app.use("/", adminRoutes);

const providerRoute = require("./app/controllers/providerController");
app.use("/provider", providerRoute);

const methodOverride = require("method-override");
const router = require("./app/controllers/adminController");
app.use(methodOverride("_method"));

app.listen(port, () => {
  console.log(` Server chạy tại http://localhost:${port}`);
});
