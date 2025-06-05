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
    const { departure, destination, date, budget, transport } = req.query;
    const pool = await connect();

    let query = `
      SELECT TourID, ProviderID, TourName AS TenTour, Destination, Price AS Gia, Status, ImageURL AS HinhAnh, SoCho, IsFeatured
      FROM Tours
      WHERE 1=1
    `;

    if (departure) {
      query += ` AND Destination LIKE '%' + @departure + '%'`;
    }
    if (destination) {
      query += ` AND Destination LIKE '%' + @destination + '%'`;
    }
    if (date) {
      query += ` AND CONVERT(date, DepartureDate) = @date`; // Assuming Tours has DepartureDate column
    }
    if (budget) {
      if (budget === "1") {
        query += ` AND Price < 5000000`;
      } else if (budget === "2") {
        query += ` AND Price BETWEEN 5000000 AND 10000000`;
      } else if (budget === "3") {
        query += ` AND Price > 10000000`;
      }
    }
    if (transport) {
      query += ` AND Transport = @transport`; // Assuming Tours has Transport column
    }

    const request = pool.request();

    if (departure) {
      request.input("departure", departure);
    }
    if (destination) {
      request.input("destination", destination);
    }
    if (date) {
      request.input("date", date);
    }
    if (transport) {
      request.input("transport", transport);
    }

    const result = await request.query(query);
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
      const userID = req.session.user ? req.session.user.id : null;
      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      try {
        const request = new sql.Request(transaction);

        // Kiểm tra xem UserID đã tồn tại trong Customers chưa
        const existingCustomerResult = await request
          .input("UserIDCheck", sql.VarChar, userID)
          .query("SELECT CustomerID FROM Customers WHERE UserID = @UserIDCheck");

        let customerID;
        if (existingCustomerResult.recordset.length > 0) {
          // Nếu đã tồn tại, lấy CustomerID hiện tại
          customerID = existingCustomerResult.recordset[0].CustomerID;
        } else {
          // Nếu chưa tồn tại, tạo CustomerID mới và insert
          customerID = "C" + Date.now();
          await request
            .input("CustomerID", sql.VarChar, customerID)
            .input("UserIDInsert", sql.VarChar, userID)
            .input("Name", sql.NVarChar, name)
            .input("Email", sql.NVarChar, email)
            .input("Phone", sql.NVarChar, phone)
            .input("Address", sql.NVarChar, address || null).query(`
              INSERT INTO Customers (CustomerID, UserID, Name, Email, Phone, Address)
              VALUES (@CustomerID, @UserIDInsert, @Name, @Email, @Phone, @Address)
            `);
        }

        const bookingID = "B" + Date.now();
        const bookingDate = new Date();

        await request
          .input("BookingID_param1", sql.VarChar, bookingID)
          .input("CustomerID_param", sql.VarChar, customerID)
          .input("TourID", sql.VarChar, tourID)
          .input("BookingDate", sql.DateTime, bookingDate).query(`
            INSERT INTO Bookings (BookingID, CustomerID, TourID, BookingDate)
            VALUES (@BookingID_param1, @CustomerID_param, @TourID, @BookingDate)
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
        // Lưu tổng số khách vào bảng Bookings
        await request
          .input("BookingID_param2", sql.VarChar, bookingID)
          .input("NumberOfGuests", sql.Int, totalPeople)
          .query(`
            UPDATE Bookings
            SET NumberOfGuests = @NumberOfGuests
            WHERE BookingID = @BookingID_param2
          `);

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

router.post("/user/bookings/:bookingID/cancel", checkCustomerLogin, async (req, res) => {
  const bookingID = req.params.bookingID;
  try {
    const pool = await connect();

    // Kiểm tra trạng thái thanh toán của booking và lấy CustomerID
    const paymentResult = await pool.request()
      .input("BookingID", bookingID)
      .query(`
        SELECT TOP 1 PaymentStatus, CustomerID FROM Payments p
        JOIN Bookings b ON p.BookingID = b.BookingID
        WHERE p.BookingID = @BookingID ORDER BY p.PaymentID DESC
      `);

    const paymentStatusRaw = paymentResult.recordset.length > 0 ? paymentResult.recordset[0].PaymentStatus : null;
    const customerID = paymentResult.recordset.length > 0 ? paymentResult.recordset[0].CustomerID : null;
    const paymentStatus = paymentStatusRaw ? paymentStatusRaw.normalize("NFC").replace(/Ð/g, "Đ").replace(/ð/g, "đ").trim() : "Chua thanh toán";

    if (paymentStatus === "Đã thanh toán") {
      return res.status(400).json({ success: false, message: "Đơn đã thanh toán, không thể hủy." });
    }

    // Xóa booking
    await pool.request()
      .input("BookingID", bookingID)
      .query("DELETE FROM Bookings WHERE BookingID = @BookingID");

    // Kiểm tra số lượng booking của customer sau khi xóa booking
    const bookingCountResult = await pool.request()
      .input("CustomerID", customerID)
      .query("SELECT COUNT(*) AS count FROM Bookings WHERE CustomerID = @CustomerID");

    res.json({ success: true, message: "Đơn đặt đã được hủy thành công." });
  } catch (err) {
    console.error("Lỗi khi hủy đơn đặt:", err);
    res.status(500).json({ success: false, message: "Lỗi server khi hủy đơn đặt." });
  }
});

router.get("/api/popular-tours", async (req, res) => {
  try {
    const pool = await connect();
    const result = await pool
      .request()
      .query(
        "SELECT TourID, TourName, Destination, Price, ImageURL FROM Tours WHERE IsFeatured = 1"
      );
    res.json(result.recordset);
  } catch (err) {
    console.error("Lỗi khi lấy dữ liệu điểm đến phổ biến:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
});

const { v4: uuidv4 } = require('uuid');

// API lưu đánh giá tour
router.post('/api/reviews', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Bạn cần đăng nhập để đánh giá' });
  }
  const { bookingID, tourID, rating, comment } = req.body;
  const userID = req.session.user.id;

  if (!bookingID || !rating) {
    return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
  }

  try {
    const pool = await connect();
    const reviewID = uuidv4();

    // Lấy CustomerID từ bảng Customers dựa trên userID
    const customerResult = await pool.request()
      .input('UserID', sql.VarChar(50), userID)
      .query('SELECT CustomerID FROM Customers WHERE UserID = @UserID');

    if (customerResult.recordset.length === 0) {
      return res.status(400).json({ error: 'Không tìm thấy khách hàng tương ứng' });
    }

    const customerID = customerResult.recordset[0].CustomerID;

    // Lấy TourID từ bảng Bookings dựa trên bookingID
    const bookingResult = await pool.request()
      .input('BookingID', sql.VarChar(50), bookingID)
      .query('SELECT TourID FROM Bookings WHERE BookingID = @BookingID');

    if (bookingResult.recordset.length === 0) {
      return res.status(400).json({ error: 'Không tìm thấy đơn đặt tương ứng' });
    }

    const actualTourID = bookingResult.recordset[0].TourID;

    await pool.request()
      .input('ReviewID', sql.NVarChar(36), reviewID)
      .input('CustomerID', sql.VarChar(15), customerID)
      .input('TourID', sql.NVarChar(50), actualTourID)
      .input('Rating', sql.Int, rating)
      .input('Comment', sql.NVarChar(255), comment || null)
      .query(`
        INSERT INTO Reviews (ReviewID, CustomerID, TourID, Rating, Comment)
        VALUES (@ReviewID, @CustomerID, @TourID, @Rating, @Comment)
      `);

    res.json({ success: true, message: 'Đánh giá đã được lưu' });
  } catch (err) {
    console.error('Lỗi khi lưu đánh giá:', err);
    res.status(500).json({ error: 'Lỗi server khi lưu đánh giá' });
  }
});

router.get('/api/reviews/:tourId', async (req, res) => {
  const tourId = req.params.tourId;
  try {
    const pool = await connect();
    const result = await pool.request()
      .input('TourID', sql.VarChar(50), tourId)
      .query(`
        SELECT r.ReviewID, r.Rating, r.Comment, c.Name AS CustomerName
        FROM Reviews r
        JOIN Customers c ON r.CustomerID = c.CustomerID
        WHERE r.TourID = @TourID        
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Lỗi khi lấy đánh giá:', err);
    res.status(500).json({ error: 'Lỗi server khi lấy đánh giá' });
  }
});

module.exports = router;
