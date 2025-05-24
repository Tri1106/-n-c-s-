const express = require("express");
const path = require("path");
const router = express.Router();
const { sql, connect } = require("../../db");

// Middleware kiểm tra đăng nhập customer
function checkCustomerLogin(req, res, next) {
  if (req.session.user && req.session.user.role === "customer") {
    next();
  } else {
    res.redirect("/account/login");
  }
}

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

// Route cho trang đặt tour, có kiểm tra đăng nhập customer
router.get("/booking", checkCustomerLogin, (req, res) => {
  const filePath = path.join(
    __dirname,
    "..",
    "..",
    "app",
    "views",
    "home",
    "booking.html"
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
    res.redirect("/account/login"); // Chuyển hướng đến trang đăng nhập sau khi đăng xuất
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
    res.redirect("/account/login"); // Chuyển hướng nếu không phải provider
  }
});

router.get("/api/tours", async (req, res) => {
  try {
    const pool = await connect();
    const result = await pool
      .request()
      .query(
        "SELECT TourID, ProviderID, TourName AS TenTour, Destination, Price AS Gia, Status, ImageURL AS HinhAnh, SoCho FROM Tours"
      );
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

    // Lấy thông tin tour
    const tourResult = await pool
      .request()
      .input("tourId", sql.VarChar(15), tourId).query(`
        SELECT TourID, ProviderID, TourName AS TenTour, Destination, Price AS Gia, Status, ImageURL AS HinhAnh, SoCho,
          DiemThamQuan, AmThuc, DoiTuongThichHop, ThoiGianLyTuong, PhuongTien, KhuyenMai
        FROM Tours
        WHERE TourID = @tourId
      `);

    if (tourResult.recordset.length === 0) {
      return res.status(404).json({ error: "Tour không tồn tại" });
    }
    const tour = tourResult.recordset[0];

    // Lấy danh sách khách sạn theo tourID
    const hotelsResult = await pool.request().input("tourId", tourId).query(`
        SELECT HotelID, HotelName, Location, PricePerNight, ImageURL
        FROM Hotels
        WHERE TourID = @tourId
      `);

    // Lấy danh sách vé máy bay theo tourID
    const flightsResult = await pool.request().input("tourId", tourId).query(`
        SELECT FlightID, Airline, DeparturePoint, DestinationPoint, Price, DepartureDate, ReturnDate
        FROM Flights
        WHERE TourID = @tourId
      `);

    // Lấy danh sách lịch trình theo tourID
    const itinerariesResult = await pool.request().input("tourId", tourId)
      .query(`
        SELECT ItineraryID, DayNumber AS day, Title, Meals AS meals, Details AS details
        FROM Itineraries
        WHERE TourID = @tourId
        ORDER BY DayNumber ASC
      `);

    res.json({
      tour,
      hotels: hotelsResult.recordset,
      flights: flightsResult.recordset,
      itineraries: itinerariesResult.recordset,
    });
  } catch (err) {
    console.error("Lỗi khi lấy dữ liệu tour theo ID:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
});

// API kiểm tra đăng nhập
router.get("/api/check-login", (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, role: req.session.user.role });
  } else {
    res.json({ loggedIn: false });
  }
});

router.get("/thongtin_thanhtoan", (req, res) => {
  const filePath = path.join(
    __dirname,
    "..",
    "..",
    "app",
    "views",
    "home",
    "thongtin_thanhtoan.html"
  );
  res.sendFile(filePath);
});

router.post("/thanh-toan", async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc." });
    }

    const pool = await connect();

    // Tạo CustomerID mới (ví dụ: timestamp)
    const customerID = "C" + Date.now();

    // Theo thông tin bạn cung cấp, trường id trong session user là UserID
    const userID = req.session.user ? req.session.user.id : null;

    await pool
      .request()
      .input("CustomerID", sql.VarChar, customerID)
      .input("UserID", sql.VarChar, userID)
      .input("Name", sql.NVarChar, name)
      .input("Email", sql.NVarChar, email)
      .input("Phone", sql.NVarChar, phone)
      .input("Address", sql.NVarChar, address || null).query(`
        INSERT INTO Customers (CustomerID, UserID, Name, Email, Phone, Address)
        VALUES (@CustomerID, @UserID, @Name, @Email, @Phone, @Address)
      `);

    // Trả về URL để frontend chuyển hướng sang trang thongtin_thanhtoan
    res.json({
      message: "Đặt tour thành công!",
      redirectUrl: `/thongtin_thanhtoan?customerID=${customerID}`,
      customer: { customerID, name, email, phone, address },
    });
  } catch (err) {
    console.error("Lỗi khi đặt tour:", err);
    res.status(500).json({ message: "Lỗi server khi đặt tour." });
  }
});

router.get("/api/booking-details/:bookingCode", async (req, res) => {
  const bookingCode = req.params.bookingCode;
  try {
    const pool = await connect();

    // Lấy thông tin booking theo BookingID (bookingCode)
    const bookingResult = await pool
      .request()
      .input("bookingCode", sql.VarChar, bookingCode)
      .query(`
        SELECT b.BookingID, b.CustomerID, b.TourID, b.BookingDate, b.TotalAmount, b.PaidAmount, b.RemainingAmount, b.Status, b.PaymentDeadline,
               c.Name AS CustomerName, c.Email, c.Phone, c.Address, c.Note,
               t.TourName, t.ImageURL, t.ThoiGianLyTuong
        FROM Bookings b
        LEFT JOIN Customers c ON b.CustomerID = c.CustomerID
        LEFT JOIN Tours t ON b.TourID = t.TourID
        WHERE b.BookingID = @bookingCode
      `);

    if (bookingResult.recordset.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy booking" });
    }

    const booking = bookingResult.recordset[0];

    // Lấy danh sách vé máy bay theo TourID
    const flightsResult = await pool
      .request()
      .input("tourId", sql.VarChar, booking.TourID)
      .query(`
        SELECT FlightID, Airline, DeparturePoint, DestinationPoint, Price, DepartureDate, ReturnDate
        FROM Flights
        WHERE TourID = @tourId
      `);

    res.json({
      booking,
      tour: {
        TourID: booking.TourID,
        TourName: booking.TourName,
        ImageURL: booking.ImageURL,
        ThoiGianLyTuong: booking.ThoiGianLyTuong,
      },
      flights: flightsResult.recordset,
    });
  } catch (err) {
    console.error("Lỗi khi lấy thông tin booking:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
});

module.exports = router;
