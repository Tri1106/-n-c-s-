const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const db = require("../../db"); 
const session = require("express-session");
const { error } = require("console");
const { getSystemErrorMessage } = require("util");

// Route cho admin-dashboard
router.get("/admin-dashboard", async (req, res) => {
  console.log("Session user tại admin-dashboard:", req.session.user); 
  if (req.session.user && req.session.user.role === "admin") {
    const filePath = path.join(
      __dirname,
      "..",
      "..",
      "app",
      "views",
      "home",
      "admin-dashboard.html" 
    );
    res.sendFile(filePath);
  } else {
    res.redirect("/login"); 
  }
});

// API lấy danh sách booking cho admin quản lý đơn đặt tour
router.get("/admin/bookings", async (req, res) => {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).json({ error: "Không có quyền truy cập" });
  }
  try {
    const pool = await db.connect();
    const result = await pool.request().query(`
      SELECT b.BookingID, b.BookingDate, b.TourID, b.CustomerID,
             c.Name AS CustomerName,
             t.TourName,
             (SELECT TOP 1 PaymentStatus FROM Payments p WHERE p.BookingID = b.BookingID ORDER BY p.PaymentID DESC) AS PaymentStatus
      FROM Bookings b
      JOIN Customers c ON b.CustomerID = c.CustomerID
      JOIN Tours t ON b.TourID = t.TourID
      ORDER BY b.BookingDate DESC
    `);
    // Log chi tiết PaymentStatus thô và chuẩn hóa
    result.recordset.forEach(r => {
      const raw = r.PaymentStatus;
      const normalized = raw ? raw.normalize("NFC").replace(/Ð/g, "Đ").replace(/ð/g, "đ").trim() : "";
      // So sánh trực tiếp với "Đã thanh toán"
      r.PaymentStatus = (normalized === "Đã thanh toán") ? "Đã thanh toán" : "Chưa thanh toán";
      console.log(`BookingID: ${r.BookingID}, PaymentStatus raw: '${raw}', normalized: '${normalized}', final: '${r.PaymentStatus}'`);
    });

    // Thêm log tất cả PaymentStatus của từng Booking
    for (const r of result.recordset) {
      const payments = await pool.request()
        .input("BookingID", r.BookingID)
        .query("SELECT PaymentID, PaymentStatus FROM Payments WHERE BookingID = @BookingID ORDER BY PaymentID DESC");
      console.log(`BookingID: ${r.BookingID}, Payments:`, payments.recordset);
    }

    console.log("DEBUG /admin/bookings result:", result.recordset);
    res.json(result.recordset);
  } catch (err) {
    console.error("Lỗi lấy danh sách booking:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
});

router.post("/admin/bookings/:bookingID/confirm", async (req, res) => {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).json({ error: "Không có quyền truy cập" });
  }
  const bookingID = req.params.bookingID;
  try {
    const pool = await db.connect();

    // Lấy thông tin số tiền thanh toán và email khách hàng từ bảng Bookings và Customers
    const bookingResult = await pool
      .request()
      .input("BookingID", db.sql.VarChar, bookingID)
      .query(`
        SELECT b.BookingID, b.TourID, c.Email, c.Name
        FROM Bookings b
        JOIN Customers c ON b.CustomerID = c.CustomerID
        WHERE b.BookingID = @BookingID
      `);

    if (bookingResult.recordset.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy booking" });
    }

    const booking = bookingResult.recordset[0];

    // Lấy số tiền từ bảng Tours theo TourID
    const tourResult = await pool
      .request()
      .input("TourID", db.sql.VarChar, booking.TourID)
      .query("SELECT Price FROM Tours WHERE TourID = @TourID");

    if (tourResult.recordset.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy tour" });
    }

    const amount = tourResult.recordset[0].Price;

    // Thêm bản ghi vào bảng Payments
    const paymentID = "P" + Date.now();

    const transaction = new db.sql.Transaction(pool);
    await transaction.begin();
    try {
      const request = new db.sql.Request(transaction);
      await request
        .input("PaymentID", db.sql.VarChar, paymentID)
        .input("BookingID", db.sql.VarChar, bookingID)
        .input("Amount", db.sql.Decimal, amount)
        .input("PaymentStatus", db.sql.VarChar, "Đã thanh toán")
        .query(`
          INSERT INTO Payments (PaymentID, BookingID, Amount, PaymentStatus)
          VALUES (@PaymentID, @BookingID, @Amount, N'Đã thanh toán')
        `);

      // Bỏ cập nhật trạng thái thanh toán trong bảng Bookings vì không có cột PaymentStatus
      // await request
      //   .input("BookingID2", db.sql.VarChar, bookingID)
      //   .query(`
      //     UPDATE Bookings
      //     SET PaymentStatus = N'Đã thanh toán'
      //     WHERE BookingID = @BookingID2
      //   `);

      await transaction.commit();
      console.log(`Đã thêm bản ghi thanh toán mới với PaymentID: ${paymentID}, BookingID: ${bookingID}, Amount: ${amount} và cập nhật trạng thái thanh toán trong Bookings`);
      res.json({ success: true });
    } catch (err) {
      await transaction.rollback();
      console.error("Lỗi trong transaction xác nhận thanh toán:", err);
      res.status(500).json({ success: false, message: "Lỗi server" });
    }
  } catch (err) {
    console.error("Lỗi xác nhận thanh toán:", err);
    res.status(500).json({ success: false, message: "Lỗi server" });
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
      SELECT TourID, TourName, Destination, Price, ImageURL, SoCho
      FROM Tours
    `);
    res.json(result.recordset); // Trả dữ liệu JSON về phía frontend
  } catch (err) {
    console.error("Lỗi lấy dữ liệu tour:", err);
    res.status(500).json({ error: err.message });
  }
});
router.put("/tours/:tourID", async (req, res) => {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res
      .status(403)
      .json({ success: false, message: "Không có quyền truy cập" });
  }
  const tourID = req.params.tourID;
  const { TourName, Destination, Price, ImageURL, SoCho } = req.body;
  try {
    const pool = await db.connect();
    const result = await pool
      .request()
      .input("TourName", db.sql.NVarChar, TourName)
      .input("Destination", db.sql.NVarChar, Destination)
      .input("Price", db.sql.Decimal, Price)
      .input("ImageURL", db.sql.NVarChar, ImageURL)
      .input("SoCho", db.sql.Int, SoCho)
      .input("TourID", db.sql.VarChar, tourID).query(`
        UPDATE Tours
        SET TourName = @TourName,
            Destination = @Destination,
            Price = @Price,
            ImageURL = @ImageURL,
            SoCho = @SoCho
        WHERE TourID = @TourID
      `);
    if (result.rowsAffected[0] === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy tour" });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Lỗi cập nhật tour:", err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

router.delete("/tours/:tourName", async (req, res) => {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res
      .status(403)
      .json({ success: false, message: "Không có quyền truy cập" });
  }
  const tourName = req.params.tourName;
  try {
    const pool = await db.connect();

    // Lấy TourID theo TourName
    const tourResult = await pool
      .request()
      .input("TourName", db.sql.NVarChar, tourName)
      .query("SELECT TourID FROM Tours WHERE TourName = @TourName");

    if (tourResult.recordset.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy tour" });
    }

    const tourID = tourResult.recordset[0].TourID;

    // Xóa các lịch trình liên quan trong bảng Itineraries
    await pool
      .request()
      .input("TourID", db.sql.VarChar, tourID)
      .query("DELETE FROM Itineraries WHERE TourID = @TourID");

    // Xóa tour
    const result = await pool
      .request()
      .input("TourName", db.sql.NVarChar, tourName)
      .query("DELETE FROM Tours WHERE TourName = @TourName");

    if (result.rowsAffected[0] === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy tour" });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Lỗi xóa tour:", err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

router.get("/admin-bookings.html", (req, res) => {
  const filePath = path.join(
    __dirname,
    "..",
    "..",
    "app",
    "views",
    "home",
    "admin-bookings.html"
  );
  res.sendFile(filePath);
});

const path = require("path");

router.get("/thongke", (req, res) => {
  const filePath = path.join(
    __dirname,
    "..",
    "..",
    "app",
    "views",
    "home",
    "thongke.html"
  );
  res.sendFile(filePath);
});

// API lấy dữ liệu thống kê booking cho admin với bộ lọc
router.get("/api/admin/bookings-summary", async (req, res) => {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).json({ error: "Không có quyền truy cập" });
  }
  try {
    const { month, tourName, paymentStatus } = req.query;
    const pool = await db.connect();

    let query = `
      SELECT 
        b.BookingID,
        c.Name AS CustomerName,
        t.TourName,
        b.BookingDate,
        ISNULL(b.NumberOfGuests, 0) AS NumberOfGuests,
        (SELECT TOP 1 PaymentStatus FROM Payments p WHERE p.BookingID = b.BookingID ORDER BY p.PaymentID DESC) AS PaymentStatusRaw
      FROM Bookings b
      JOIN Customers c ON b.CustomerID = c.CustomerID
      JOIN Tours t ON b.TourID = t.TourID
      WHERE 1=1
    `;

    if (month) {
      // Lọc theo tháng (YYYY-MM)
      query += ` AND FORMAT(b.BookingDate, 'yyyy-MM') = @month`;
    }
    if (tourName) {
      query += ` AND t.TourName LIKE '%' + @tourName + '%'`;
    }

    query += ` ORDER BY b.BookingDate DESC`;

    const request = pool.request();

    if (month) {
      request.input("month", db.sql.VarChar, month);
    }
    if (tourName) {
      request.input("tourName", db.sql.NVarChar, tourName);
    }

    const result = await request.query(query);

    // Chuẩn hóa PaymentStatus trước khi trả về
    result.recordset.forEach(r => {
      const raw = r.PaymentStatusRaw;
      const normalized = raw ? raw.normalize("NFC").replace(/Ð/g, "Đ").replace(/ð/g, "đ").trim() : "";
      r.PaymentStatus = (normalized === "Đã thanh toán") ? "Đã thanh toán" : "Chưa thanh toán";
      delete r.PaymentStatusRaw;
    });

    // Lọc theo trạng thái thanh toán nếu có
    let filtered = result.recordset;
    if (paymentStatus && paymentStatus !== "Tất cả") {
      filtered = filtered.filter(r => r.PaymentStatus === paymentStatus);
    }

    res.json(filtered);
  } catch (err) {
    console.error("Lỗi lấy dữ liệu thống kê booking:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
});

module.exports = router;
