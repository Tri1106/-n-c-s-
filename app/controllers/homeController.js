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
    const itinerariesResult = await pool.request().input("tourId", tourId).query(`
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
router.get('/api/check-login', (req, res) => {
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

module.exports = router;