const express = require("express");
const app = express();
const port = 3000;

// Cấu hình middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public")); // Đảm bảo thư mục public có chứa các tài nguyên như CSS, JS

// Import route controller
const homeController = require("./app/controllers/homeController");
app.use("/", homeController); // Gắn controller chính

const accountRoutes = require("./app/controllers/accountController");
app.use("/account", accountRoutes);

app.listen(port, () => {
  console.log(` Server chạy tại http://localhost:${port}`);
});
