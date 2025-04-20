const express = require("express");
const path = require("path");
const router = express.Router();
const { sql, connect } = require("../../db");
const session = require("express-session");
const bcrypt = require("bcryptjs");

// Hiển thị trang login
router.get("/login", (req, res) => {
  const filePath = path.join(
    __dirname,
    "..",
    "..",
    "app",
    "views",
    "account",
    "login.html"
  );
  res.sendFile(filePath);
});

// Hiển thị trang register
router.get("/register", (req, res) => {
  const filePath = path.join(
    __dirname,
    "..",
    "..",
    "app",
    "views",
    "account",
    "register.html"
  );
  res.sendFile(filePath);
});

// Xử lý đăng ký
router.post(
  "/register",
  express.urlencoded({ extended: true }),
  async (req, res) => {
    const { fullname, email, phone, password, role } = req.body; // Đảm bảo role có trong body
    const userID = "U" + Date.now();

    try {
      const pool = await connect();
      const hashedPassword = await bcrypt.hash(password, 10);

      // Nếu không có role trong body, mặc định là 'customer'
      const userRole = "customer";

      await pool
        .request()
        .input("userID", sql.VarChar, userID)
        .input("fullname", sql.NVarChar, fullname)
        .input("email", sql.VarChar, email)
        .input("phone", sql.VarChar, phone)
        .input("password", sql.VarChar, hashedPassword)
        .input("role", sql.VarChar, userRole) // Sử dụng userRole
        .query(`
        INSERT INTO Users (UserID, FullName, Email, Phone, Password, Role)
        VALUES (@userID, @fullname, @email, @phone, @password, @role)
      `);

      res.redirect("/account/login"); // Redirect đúng path sau khi đăng ký thành công
    } catch (err) {
      console.error(err);
      res.status(500).send("Lỗi khi đăng ký.");
    }
  }
);

// Xử lý đăng nhập
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const pool = await connect();

    const result = await pool
      .request()
      .input("username", sql.VarChar, username)
      .query(
        "SELECT * FROM Users WHERE Email = @username OR Phone = @username"
      );

    const user = result.recordset[0];

    if (user) {
      const isMatch = await bcrypt.compare(password, user.Password);

      if (isMatch) {
        req.session.user = {
          id: user.UserID,
          fullname: user.FullName,
          role: user.Role,
        };
        console.log("Đăng nhập thành công:", req.session.user);

        // Trả về thông tin người dùng dưới dạng JSON để frontend sử dụng
        res.json(req.session.user); // Trả về session user để dùng trên frontend
      } else {
        res.status(401).send("Sai tài khoản hoặc mật khẩu");
      }
    } else {
      res.status(401).send("Sai tài khoản hoặc mật khẩu");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Lỗi server");
  }
});

module.exports = router;
