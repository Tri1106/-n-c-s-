const express = require("express");
const path = require("path");
const router = express.Router();
const sql = require("../../db");

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
    const { fullname, email, phone, password } = req.body;
    const userID = "U" + Date.now();

    try {
      const pool = await sql.connect();
      await pool
        .request()
        .input("userID", sql.VarChar, userID)
        .input("fullname", sql.NVarChar, fullname)
        .input("email", sql.VarChar, email)
        .input("phone", sql.VarChar, phone)
        .input("password", sql.VarChar, password)
        .input("role", sql.VarChar, "customer")
        .query(`
          INSERT INTO Users (UserID, FullName, Email, Phone, Password, Role)
          VALUES (@userID, @fullname, @email, @phone, @password, @role)
        `);

      res.send("Đăng ký thành công!");
    } catch (err) {
      console.error(err);
      res.status(500).send("Lỗi khi đăng ký.");
    }
  }
);

// Xử lý đăng nhập
router.post(
  "/login",
  express.urlencoded({ extended: true }),
  async (req, res) => {
    const { username, password } = req.body; // username ở đây là email hoặc sđt

    try {
      const pool = await sql.connect();
      const result = await pool
        .request()
        .input("username", sql.VarChar, username)
        .input("password", sql.VarChar, password).query(`
          SELECT * FROM Users
          WHERE (email = @username OR phone = @username) AND password = @password
        `);

      if (result.recordset.length > 0) {
        res.send("Đăng nhập thành công!");
      } else {
        res.send("Sai email/sđt hoặc mật khẩu!");
      }
    } catch (err) {
      console.error(err);
      res.status(500).send("Lỗi khi đăng nhập.");
    }
  }
);

module.exports = router;
