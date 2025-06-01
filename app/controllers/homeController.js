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

// Thêm route dẫn đến trang lịch sử đơn đặt cho khách hàng
router.get("/booking-history", checkCustomerLogin, (req, res) => {
  const filePath = path.join(
    __dirname,
    "..",
    "..",
    "app",
    "views",
    "home",
    "booking-history.html"
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
        "SELECT TourID, ProviderID, TourName AS TenTour, Destination, Price AS Gia, Status, ImageURL AS HinhAnh, SoCho, IsFeatured FROM Tours"
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
          DiemThamQuan, AmThuc, DoiTuongThichHop, ThoiGianLyTuong, PhuongTien, KhuyenMai, IsFeatured
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
  const tourId = req.query.tourId || req.query.tourid; // hỗ trợ cả tourId hoặc tourid
  if (!tourId) {
    return res.status(400).send("Thiếu tham số tourId");
  }
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

router.get("/thanhtoan", (req, res) => {
  const filePath = path.join(
    __dirname,
    "..",
    "..",
    "app",
    "views",
    "home",
    "thanhtoan.html"
  );
  res.sendFile(filePath);
});

// Thêm route GET /payment-page để trả về file HTML payment-page.html
router.get("/payment-page", (req, res) => {
  const filePath = path.join(
    __dirname,
    "..",
    "..",
    "app",
    "views",
    "home",
    "payment-page.html"
  );
  res.sendFile(filePath);
});


router.post("/thanh-toan", async (req, res) => {
  try {
    const { name, email, phone, address, tourID, bookingCode, amount, adults, children } = req.body;

    const pool = await connect();

    if (name && email && phone && tourID) {
      // Xử lý đặt chỗ mới
      const customerID = "C" + Date.now();
      const userID = req.session.user ? req.session.user.id : null;
      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      try {
        const request = new sql.Request(transaction);

        await request
          .input("CustomerID", sql.VarChar, customerID)
          .input("UserID", sql.VarChar, userID)
          .input("Name", sql.NVarChar, name)
          .input("Email", sql.NVarChar, email)
          .input("Phone", sql.NVarChar, phone)
          .input("Address", sql.NVarChar, address || null).query(`
            INSERT INTO Customers (CustomerID, UserID, Name, Email, Phone, Address)
            VALUES (@CustomerID, @UserID, @Name, @Email, @Phone, @Address)
          `);

        const bookingID = "B" + Date.now();
        const bookingDate = new Date();

        await request
          .input("BookingID", sql.VarChar, bookingID)
          .input("CustomerID_param", sql.VarChar, customerID)
          .input("TourID", sql.VarChar, tourID)
          .input("BookingDate", sql.DateTime, bookingDate).query(`
            INSERT INTO Bookings (BookingID, CustomerID, TourID, BookingDate)
            VALUES (@BookingID, @CustomerID_param, @TourID, @BookingDate)
          `);

        // Trừ số chỗ trong Tours dựa trên số người lớn và trẻ em
        const totalPeople = (parseInt(adults) || 0) + (parseInt(children) || 0);
        if (totalPeople > 0) {
          await request
            .input("TourID_param", sql.VarChar, tourID)
            .input("SeatsToReduce", sql.Int, totalPeople)
            .query(`
              UPDATE Tours
              SET SoCho = CASE WHEN SoCho >= @SeatsToReduce THEN SoCho - @SeatsToReduce ELSE 0 END
              WHERE TourID = @TourID_param
            `);
        }

        await transaction.commit();

        res.json({
          message: "Đặt tour thành công!",
          redirectUrl: `/thanhtoan?bookingID=${bookingID}&bookingDate=${bookingDate.toISOString()}&tourId=${tourID}`,
          booking: { bookingID, bookingDate },
          customer: { customerID, name, email, phone, address },
        });
      } catch (err) {
        await transaction.rollback();
        throw err;
      }
    } else if (bookingCode && amount) {
      await pool.request()
        .input("BookingID", sql.VarChar, bookingCode)
        .input("Amount", sql.Decimal, amount)
        .query("UPDATE Bookings SET PaidAmount = ISNULL(PaidAmount, 0) + @Amount, Status = 'Đã thanh toán' WHERE BookingID = @BookingID");

      // Trả về phản hồi thành công
      res.json({ message: "Thanh toán thành công!" });
    } else {
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc." });
    }
  } catch (err) {
    console.error("Lỗi khi xử lý đặt chỗ hoặc thanh toán:", err);
    res.status(500).json({ message: "Lỗi server khi xử lý đặt chỗ hoặc thanh toán." });
  }
});

router.get("/api/bookings/:bookingID", async (req, res) => {
  const bookingID = req.params.bookingID;
  try {
    const pool = await connect();

    // Lấy thông tin booking
    const bookingResult = await pool
      .request()
      .input("bookingID", sql.VarChar, bookingID)
      .query(`
        SELECT b.BookingID, b.BookingDate, b.TourID, b.CustomerID,
               c.Name AS CustomerName, c.Email, c.Phone, c.Address,
               t.TourName, t.Price, t.ImageURL, t.ThoiGianLyTuong
        FROM Bookings b
        JOIN Customers c ON b.CustomerID = c.CustomerID
        JOIN Tours t ON b.TourID = t.TourID
        WHERE b.BookingID = @bookingID
      `);

    if (bookingResult.recordset.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy mã đặt chỗ." });
    }

    const booking = bookingResult.recordset[0];

    // Lấy thông tin chuyến bay (Flights) theo TourID
    const flightsResult = await pool
      .request()
      .input("tourID", sql.VarChar, booking.TourID)
      .query(`
        SELECT FlightID, Airline, DeparturePoint, DestinationPoint, Price, DepartureDate, ReturnDate
        FROM Flights
        WHERE TourID = @tourID
      `);

    booking.Flights = flightsResult.recordset;

    res.json(booking);
  } catch (err) {
    console.error("Lỗi khi lấy thông tin booking:", err);
    res.status(500).json({ error: "Lỗi server khi lấy thông tin booking." });
  }
});

router.get("/user/bookings", checkCustomerLogin, async (req, res) => {
  try {
    const pool = await connect();
    const userId = req.session.user.id;

    // Lấy danh sách booking của user
    const result = await pool
      .request()
      .input("userId", userId)
      .query(`
        SELECT b.BookingID, t.TourName, b.BookingDate, 
               ISNULL(p.PaymentStatus, 'Chưa thanh toán') AS PaymentStatus
        FROM Bookings b
        JOIN Customers c ON b.CustomerID = c.CustomerID
        JOIN Tours t ON b.TourID = t.TourID
        LEFT JOIN Payments p ON b.BookingID = p.BookingID
        WHERE c.UserID = @userId
        ORDER BY b.BookingDate DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error("Lỗi khi lấy lịch sử đơn đặt:", err);
    res.status(500).json({ error: "Lỗi server khi lấy lịch sử đơn đặt." });
  }
});

router.post("/user/review", checkCustomerLogin, async (req, res) => {
  try {
    const { bookingID, rating, comment } = req.body;
    const userId = req.session.user.id;

    if (!bookingID || !rating) {
      return res.status(400).json({ error: "Thiếu thông tin bắt buộc." });
    }

    const pool = await connect();

    // Kiểm tra ngày kết thúc tour (giả sử có trường EndDate trong bảng Tours)
    const checkTourQuery = `
      SELECT t.TourID, t.TourName, b.BookingDate, DATEADD(day, DATEDIFF(day, 0, t.Duration), b.BookingDate) AS EndDate
      FROM Bookings b
      JOIN Tours t ON b.TourID = t.TourID
      WHERE b.BookingID = @bookingID AND b.CustomerID = (
        SELECT CustomerID FROM Customers WHERE UserID = @userId
      )
    `;

    const tourResult = await pool.request()
      .input("bookingID", bookingID)
      .input("userId", userId)
      .query(checkTourQuery);

    if (tourResult.recordset.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy đơn đặt hoặc không có quyền đánh giá." });
    }

    const endDate = tourResult.recordset[0].EndDate;
    const now = new Date();

    if (now < endDate) {
      return res.status(400).json({ error: "Chưa đến thời điểm đánh giá tour." });
    }

    // Thêm đánh giá vào bảng Reviews
    const insertReviewQuery = `
      INSERT INTO Reviews (ReviewID, CustomerID, TourID, Rating, Comment, CreatedAt)
      VALUES (NEWID(), (SELECT CustomerID FROM Customers WHERE UserID = @userId), @tourID, @rating, @comment, GETDATE())
    `;

    await pool.request()
      .input("userId", userId)
      .input("tourID", tourResult.recordset[0].TourID)
      .input("rating", rating)
      .input("comment", comment || null)
      .query(insertReviewQuery);

    res.json({ message: "Đánh giá đã được lưu thành công." });
  } catch (err) {
    console.error("Lỗi khi lưu đánh giá:", err);
    res.status(500).json({ error: "Lỗi server khi lưu đánh giá." });
  }
});

router.get("/api/reviews/:tourID", async (req, res) => {
  const tourID = req.params.tourID;
  try {
    const pool = await connect();
    const result = await pool.request()
      .input("tourID", tourID)
      .query(`
        SELECT r.Rating, r.Comment, r.CreatedAt, c.Name AS CustomerName
        FROM Reviews r
        JOIN Customers c ON r.CustomerID = c.CustomerID
        WHERE r.TourID = @tourID
        ORDER BY r.CreatedAt DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Lỗi khi lấy đánh giá:", err);
    res.status(500).json({ error: "Lỗi server khi lấy đánh giá." });
  }
});

router.get("/api/popular-tours", async (req, res) => {
  try {
    const pool = await connect();
    const result = await pool.request()
      .query(`
        SELECT TourID, TourName, Destination, Price, ImageURL, IsFeatured
        FROM Tours
        ORDER BY IsFeatured DESC, TourName ASC
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Lỗi khi lấy tour phổ biến:", err);
    res.status(500).json({ error: "Lỗi server khi lấy tour phổ biến." });
  }
});

router.put("/tours/:id", async (req, res) => {
  const tourId = req.params.id;
  const { TourName, Destination, Price, ImageURL, SoCho, IsFeatured } = req.body;

  console.log("PUT /tours/:id called with IsFeatured:", IsFeatured);

  // Ép kiểu IsFeatured thành boolean 0 hoặc 1
  const isFeaturedBit = IsFeatured ? 1 : 0;

  try {
    const pool = await connect();
    const request = pool.request();

    await request
      .input("TourID", sql.VarChar, tourId)
      .input("TourName", sql.NVarChar, TourName)
      .input("Destination", sql.NVarChar, Destination)
      .input("Price", sql.Decimal, Price)
      .input("ImageURL", sql.NVarChar, ImageURL)
      .input("SoCho", sql.Int, SoCho)
      .input("IsFeatured", sql.Bit, isFeaturedBit)
      .query(`
        UPDATE Tours
        SET TourName = @TourName,
            Destination = @Destination,
            Price = @Price,
            ImageURL = @ImageURL,
            SoCho = @SoCho,
            IsFeatured = @IsFeatured
        WHERE TourID = @TourID
      `);

    res.json({ success: true, message: "Cập nhật tour thành công" });
  } catch (err) {
    console.error("Lỗi khi cập nhật tour:", err);
    res.status(500).json({ success: false, message: "Lỗi server khi cập nhật tour" });
  }
});

module.exports = router;
