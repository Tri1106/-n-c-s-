const express = require("express");
const path = require("path");
const router = express.Router();
const { sql, connect } = require("../../db");

// Route cho trang chủ
router.get("/", async (req, res) => {
  try {
    const isLoggedIn = req.session.user ? true : false; // Kiểm tra xem người dùng đã đăng nhập chưa

    // Đảm bảo đường dẫn đúng đến file home.html trong app/views/home
    const filePath = path.join(
      __dirname,
      "..",
      "..",
      "app",
      "views",
      "home",
      "home.html"
    );

    // Gửi file HTML
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error("Lỗi khi gửi file HTML:", err);
        res.status(500).send("Lỗi khi gửi file HTML");
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Lỗi khi lấy dữ liệu");
  }
});

// Route cho trang tour
router.get("/tour", (req, res) => {
  const filePath = path.join(
    __dirname,
    "..",
    "..",
    "app",
    "views",
    "home",
    "tour.html"
  );
  res.sendFile(filePath);
});

// Route cho trang chi tiết tour
router.get("/tour-detail", (req, res) => {
  const filePath = path.join(
    __dirname,
    "..",
    "..",
    "app",
    "views",
    "home",
    "tour-detail.html"
  );
  res.sendFile(filePath);
});

// Nếu bạn dùng EJS, có thể render từ views
router.get("/tour", (req, res) => {
  res.render("home/tour"); // Render views/home/tour.ejs nếu bạn đang dùng EJS
});

router.get("/home", (req, res) => {
  const filePath = path.join(
    __dirname,
    "..",
    "..",
    "app",
    "views",
    "home",
    "home.html"
  );
  res.sendFile(filePath);
});

router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Lỗi khi đăng xuất.");
    }
    res.redirect("/login"); // Chuyển hướng đến trang đăng nhập sau khi đăng xuất
  });
});

router.get("/provider-dashboard", (req, res) => {
  console.log("Session user tại provider-dashboard:", req.session.user); // Kiểm tra session

  // Kiểm tra xem có session và role là "provider" không
  if (req.session.user && req.session.user.role === "provider") {
    const filePath = path.join(
      __dirname,
      "..",
      "..",
      "app",
      "views",
      "home",
      "provider-dashboard.html"
    );
    res.sendFile(filePath);
  } else {
    res.redirect("/login"); // Chuyển hướng nếu không phải provider
  }
});

router.get("/api/tours", async (req, res) => {
  try {
    const pool = await connect();
    const result = await pool.request().query("SELECT TourID, ProviderID, TourName AS TenTour, Destination, Price AS Gia, Status, ImageURL AS HinhAnh, SoCho FROM Tours");
    res.json(result.recordset); // Trả dữ liệu dạng JSON
  } catch (err) {
    console.error("Lỗi khi lấy dữ liệu tour:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
});

router.get("/api/tours/:id", async (req, res) => {
  const tourId = req.params.id;
  try {
    const pool = await connect();
    const result = await pool.request()
      .input('tourId', tourId)
      .query("SELECT TourID, ProviderID, TourName AS TenTour, Destination, Price AS Gia, Status, ImageURL AS HinhAnh, SoCho FROM Tours WHERE TourID = @tourId");
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Tour không tồn tại" });
    }
    res.json(result.recordset[0]);
  } catch (err) {
    console.error("Lỗi khi lấy dữ liệu tour theo ID:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
});

module.exports = router;
