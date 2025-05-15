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

    // Tìm user theo email hoặc phone
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
        let providerID = null;

        // Nếu role là provider thì tìm ProviderID theo UserID
        if (user.Role === "provider") {
          const providerResult = await pool
            .request()
            .input("userID", sql.VarChar, user.UserID) // Dùng UserID, không phải ProviderID!
            .query("SELECT ProviderID FROM Providers WHERE UserID = @userID");

          if (providerResult.recordset.length > 0) {
            providerID = providerResult.recordset[0].ProviderID;
          }
        }

        // Lưu session chính xác
        req.session.user = {
          id: user.UserID, // LUÔN luôn lưu UserID vào id
          fullname: user.FullName,
          role: user.Role,
          providerID: providerID, // Nếu là provider thì lưu thêm ProviderID
        };

        console.log("Đăng nhập thành công:", req.session.user);

        res.json(req.session.user);
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

router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Lỗi khi đăng xuất:', err);
      return res.status(500).json({ success: false, message: 'Lỗi khi đăng xuất' });
    }
    res.clearCookie('connect.sid'); // Xóa cookie session
    res.json({ success: true, message: 'Đăng xuất thành công' });
  });
});

module.exports = router;
