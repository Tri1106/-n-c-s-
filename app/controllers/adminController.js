const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const path = require("path"); // Import path
const db = require("../../db"); // Chỉ gọi 1 lần db, tránh trùng
const session = require("express-session");
const { error } = require("console");
const { getSystemErrorMessage } = require("util");

// Route cho admin-dashboard
router.get("/admin-dashboard", async (req, res) => {
  console.log("Session user tại admin-dashboard:", req.session.user); // Kiểm tra session

  // Kiểm tra xem có session và role là "admin" không
  if (req.session.user && req.session.user.role === "admin") {
    const filePath = path.join(
      __dirname,
      "..",
      "..",
      "app",
      "views",
      "home",
      "admin-dashboard.html" // Đảm bảo đường dẫn đúng đến file HTML của Admin Dashboard
    );
    res.sendFile(filePath);
  } else {
    res.redirect("/login"); // Chuyển hướng nếu không phải admin
  }
});

// Route đăng ký nhà cung cấp
router.post("/register-provider", async (req, res) => {
  const { fullName, email, password, phone } = req.body;
  const providerName = fullName; // ✅ Sử dụng fullName làm providerName
  const userID = "U" + Date.now();
  const providerID = "P" + Date.now();

  try {
    await db.connect(); // kết nối DB

    const hashedPassword = await bcrypt.hash(password, 10);

    // Thêm vào bảng Users
    const userResult = await db.sql.query(`
        INSERT INTO Users (UserID, FullName, Email, Phone, Password, Role)
        OUTPUT INSERTED.UserID
        VALUES (
          '${userID}',
          N'${fullName}',
          '${email}',
          '${phone}',
          '${hashedPassword}',
          'provider'
        )
      `);

    const insertedUserID = userResult.recordset[0].UserID;

    // Thêm vào bảng Providers
    await db.sql.query(`
        INSERT INTO Providers (ProviderID, UserID, ProviderName, ProviderPhone)
        VALUES (
          '${providerID}',
          '${insertedUserID}',
          N'${providerName}',
          '${phone}'
        )
      `);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, errorMessage: "❌ Lỗi khi tạo nhà cung cấp" });
  }
});

router.get("/user", (req, res) => {
  const filePath = path.join(
    __dirname,
    "..",
    "..",
    "app",
    "views",
    "home",
    "qlyuser.html"
  );
  res.sendFile(filePath);
});

// API lấy dữ liệu user
router.get("/user/data", async (req, res) => {
  try {
    const pool = await db.connect();
    const result = await pool.request().query("SELECT * FROM dbo.Users");
    res.json(result.recordset); // Trả dữ liệu JSON về phía frontend
  } catch (err) {
    console.error("Lỗi lấy dữ liệu Users:", err);
    res.status(500).json({ error: err.message });
  }
});

router.put("/user/:id", async (req, res) => {
  const userID = req.params.id;
  const { Email, Phone, FullName } = req.body;

  try {
    const pool = await db.connect();
    await pool
      .request()
      .input("Email", db.sql.VarChar, Email)
      .input("Phone", db.sql.VarChar, Phone)
      .input("FullName", db.sql.NVarChar, FullName)
      .input("UserID", db.sql.VarChar, userID).query(`
        UPDATE Users
        SET Email = @Email, Phone = @Phone, FullName = @FullName
        WHERE UserID = @UserID
      `);

    res.json({ message: "✅ Cập nhật người dùng thành công!" });
  } catch (err) {
    console.error("❌ Lỗi cập nhật user:", err);
    res.status(500).json({ message: "❌ Cập nhật thất bại" });
  }
});

router.delete("/user/:id", async (req, res) => {
  const userID = req.params.id;

  try {
    const pool = await db.connect();
    await pool
      .request()
      .input("UserID", db.sql.VarChar, userID)
      .query("DELETE FROM Providers WHERE UserID = @UserID");
    await pool
      .request()
      .input("UserID", db.sql.VarChar, userID)
      .query("DELETE FROM Users WHERE UserID = @UserID");

    res.json({ message: "✅ Xóa người dùng thành công!" });
  } catch (err) {
    console.error("❌ Lỗi xóa người dùng:", err);
    res.status(500).json({ message: "❌ Xóa thất bại" });
  }
});

router.get("/tours", (req, res) => {
  const filePath = path.join(
    __dirname,
    "..",
    "..",
    "app",
    "views",
    "home",
    "listtour.html"
  );
  res.sendFile(filePath);
});

// API lấy dữ liệu user
router.get("/tours/data", async (req, res) => {
  try {
    const pool = await db.connect();
    const result = await pool.request().query(`
      SELECT TourName, Destination, Price, ImageURL, SoCho
      FROM Tours
    `);
    res.json(result.recordset); // Trả dữ liệu JSON về phía frontend
  } catch (err) {
    console.error("Lỗi lấy dữ liệu tour:", err);
    res.status(500).json({ error: err.message });
  }
});
module.exports = router;
