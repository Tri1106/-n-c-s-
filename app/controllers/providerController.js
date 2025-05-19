const express = require("express");
const router = express.Router();
const multer = require("multer");
const { connect, sql } = require("../../db");

// Cấu hình nơi lưu ảnh
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// Route thêm tour
router.post("/add-tour", upload.single("tourImage"), async (req, res) => {
  try {
    const {
      tourName,
      destination,
      price,
      seats,
      diemThamQuan,
      amThuc,
      doiTuongThichHop,
      thoiGianLyTuong,
      phuongTien,
      khuyenMai,
    } = req.body;
    let providerID = req.session.user?.providerID;

    if (!providerID) {
      return res.status(400).send(" providerID không có.");
    }
    if (providerID.length > 15) {
      providerID = providerID.substring(0, 15); // sửa 20 nếu cần
    }
    const imagePath = req.file ? "/uploads/" + req.file.filename : null;
    const tourID = "T" + Date.now();

    const pool = await connect();
    await pool
      .request()
      .input("TourID", sql.VarChar, tourID)
      .input("ProviderID", sql.VarChar, providerID)
      .input("TourName", sql.NVarChar, tourName)
      .input("Destination", sql.NVarChar, destination)
      .input("Price", sql.Decimal(10, 2), price)
      .input("SoCho", sql.Int, seats)
      .input("DiemThamQuan", sql.NVarChar, diemThamQuan)
      .input("AmThuc", sql.NVarChar, amThuc)
      .input("DoiTuongThichHop", sql.NVarChar, doiTuongThichHop)
      .input("ThoiGianLyTuong", sql.NVarChar, thoiGianLyTuong)
      .input("PhuongTien", sql.NVarChar, phuongTien)
      .input("KhuyenMai", sql.NVarChar, khuyenMai)
      .input("Status", sql.Bit, true)
      .input("ImageURL", sql.NVarChar, imagePath).query(`
            INSERT INTO Tours (TourID, ProviderID, TourName, Destination, Price, SoCho, DiemThamQuan, AmThuc, DoiTuongThichHop, ThoiGianLyTuong, PhuongTien, KhuyenMai, Status, ImageURL)
            VALUES (@TourID, @ProviderID, @TourName, @Destination, @Price, @SoCho, @DiemThamQuan, @AmThuc, @DoiTuongThichHop, @ThoiGianLyTuong, @PhuongTien, @KhuyenMai, @Status, @ImageURL)
          `);

    res.send(" Tour đã được thêm thành công!");
  } catch (err) {
    console.error("❌ Lỗi khi thêm tour:", err);
    res.status(500).send(" Lỗi khi thêm tour.");
    console.log(
      "ProviderID nhận được:",
      req.body.providerID || req.session.providerID
    );
  }
});

router.get("/tours", async (req, res) => {
  try {
    const providerID = req.session.user?.providerID; // đúng chỗ, vì bạn lưu providerID trong session user
    if (!providerID) {
      return res.status(400).send(" Chưa đăng nhập.");
    }

    const pool = await connect(); // <-- dùng connect để lấy pool
    const result = await pool
      .request()
      .input("providerID", sql.VarChar, providerID).query(`
        SELECT TourID, TourName, Destination, Price, SoCho, ImageURL
        FROM Tours
        WHERE ProviderID = @providerID
      `);

    res.json(result.recordset); // Gửi danh sách tours về frontend
  } catch (error) {
    console.error("Lỗi lấy danh sách tour:", error);
    res.status(500).send("Server error");
  }
});

router.put("/edit-tour/:tourID", async (req, res) => {
  try {
    const {
      tourName,
      destination,
      price,
      seats,
      diemThamQuan,
      amThuc,
      doiTuongThichHop,
      thoiGianLyTuong,
      phuongTien,
      khuyenMai,
    } = req.body;
    const tourID = req.params.tourID;

    const pool = await connect();
    await pool
      .request()
      .input("TourID", sql.VarChar, tourID)
      .input("TourName", sql.NVarChar, tourName)
      .input("Destination", sql.NVarChar, destination)
      .input("Price", sql.Decimal(10, 2), price)
      .input("SoCho", sql.Int, seats)
      .input("DiemThamQuan", sql.NVarChar, diemThamQuan)
      .input("AmThuc", sql.NVarChar, amThuc)
      .input("DoiTuongThichHop", sql.NVarChar, doiTuongThichHop)
      .input("ThoiGianLyTuong", sql.NVarChar, thoiGianLyTuong)
      .input("PhuongTien", sql.NVarChar, phuongTien)
      .input("KhuyenMai", sql.NVarChar, khuyenMai).query(`
        UPDATE Tours
        SET TourName = @TourName, Destination = @Destination, Price = @Price, SoCho = @SoCho,
            DiemThamQuan = @DiemThamQuan, AmThuc = @AmThuc, DoiTuongThichHop = @DoiTuongThichHop,
            ThoiGianLyTuong = @ThoiGianLyTuong, PhuongTien = @PhuongTien, KhuyenMai = @KhuyenMai
        WHERE TourID = @TourID
      `);

    res.send(" Tour đã được cập nhật thành công!");
  } catch (err) {
    console.error(" Lỗi khi cập nhật tour:", err);
    res.status(500).send(" Lỗi khi cập nhật tour.");
  }
});

router.delete("/delete-tour/:tourID", async (req, res) => {
  try {
    const tourID = req.params.tourID;

    const pool = await connect();
    await pool.request().input("TourID", sql.VarChar, tourID).query(`
        DELETE FROM Tours WHERE TourID = @TourID
      `);

    res.send(" Tour đã được xóa thành công!");
  } catch (err) {
    console.error(" Lỗi khi xóa tour:", err);
    res.status(500).send(" Lỗi khi xóa tour.");
  }
});

// Route thêm khách sạn
router.post("/add-hotel", (req, res) => {
  upload.single("hotelImage")(req, res, async (err) => {
    if (err) {
      console.error("❌ Lỗi multer khi thêm khách sạn:", err);
      return res.status(500).send(" Lỗi khi tải ảnh khách sạn.");
    }

    try {
      let { tourID, hotelName, location, pricePerNight } = req.body;
      const imagePath = req.file ? "/uploads/" + req.file.filename : null;

      if (!tourID || !hotelName || !location || !pricePerNight) {
        return res.status(400).send(" Thiếu thông tin khách sạn.");
      }

      if (Array.isArray(tourID)) {
        tourID = tourID[0];
      }
      if (typeof tourID !== "string") {
        tourID = String(tourID);
      }
      tourID = tourID.trim();
      if (tourID.length === 0) {
        return res.status(400).send(" tourID không hợp lệ.");
      }

      console.log("Received tourID:", tourID);

      const pool = await connect();
      const hotelID = "H" + Date.now();

      await pool
        .request()
        .input("HotelID", sql.VarChar, hotelID)
        .input("TourID", sql.VarChar, tourID)
        .input("HotelName", sql.NVarChar, hotelName)
        .input("Location", sql.NVarChar, location)
        .input("PricePerNight", sql.Decimal(10, 2), pricePerNight)
        .input("ImageURL", sql.NVarChar, imagePath).query(`
          INSERT INTO Hotels (HotelID, TourID, HotelName, Location, PricePerNight, ImageURL)
          VALUES (@HotelID, @TourID, @HotelName, @Location, @PricePerNight, @ImageURL)
        `);

      res.send(" Khách sạn đã được thêm thành công!");
    } catch (err) {
      console.error(" Lỗi khi thêm khách sạn:", err);
      res.status(500).send(" Lỗi khi thêm khách sạn.");
    }
  });
});

router.post("/add-flight", upload.none(), async (req, res) => {
  try {
    let {
      tourID,
      airline,
      departurePoint,
      destinationPoint,
      flightPrice,
      departTime,
      returnTime,
    } = req.body;

    // Validate required fields
    if (
      !tourID ||
      !airline ||
      !departurePoint ||
      !destinationPoint ||
      !flightPrice ||
      !departTime ||
      !returnTime
    ) {
      return res.status(400).send(" Thiếu thông tin vé máy bay.");
    }

    // Normalize inputs if arrays
    tourID = Array.isArray(tourID) ? tourID[0] : tourID;
    airline = Array.isArray(airline) ? airline[0] : airline;
    departurePoint = Array.isArray(departurePoint)
      ? departurePoint[0]
      : departurePoint;
    destinationPoint = Array.isArray(destinationPoint)
      ? destinationPoint[0]
      : destinationPoint;
    flightPrice = Array.isArray(flightPrice) ? flightPrice[0] : flightPrice;
    departTime = Array.isArray(departTime) ? departTime[0] : departTime;
    returnTime = Array.isArray(returnTime) ? returnTime[0] : returnTime;

    // Trim strings
    tourID = String(tourID).trim();
    airline = String(airline).trim();
    departurePoint = String(departurePoint).trim();
    destinationPoint = String(destinationPoint).trim();
    flightPrice = String(flightPrice).trim();
    departTime = String(departTime).trim();
    returnTime = String(returnTime).trim();

    // Validate non-empty strings
    if (!tourID) return res.status(400).send(" tourID không hợp lệ.");
    if (!airline) return res.status(400).send(" airline không hợp lệ.");
    if (!departurePoint)
      return res.status(400).send(" departurePoint không hợp lệ.");
    if (!destinationPoint)
      return res.status(400).send(" destinationPoint không hợp lệ.");

    // Validate departTime format and parse
    const dateTimeParts = departTime.split("T");
    if (dateTimeParts.length !== 2) {
      return res.status(400).send(" departTime không hợp lệ.");
    }
    const dateParts = dateTimeParts[0].split("-");
    const timeParts = dateTimeParts[1].split(":");
    if (
      dateParts.length !== 3 ||
      (timeParts.length !== 2 && timeParts.length !== 3)
    ) {
      return res.status(400).send(" departTime không hợp lệ.");
    }
    const year = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10);
    const day = parseInt(dateParts[2], 10);
    const hour = parseInt(timeParts[0], 10);
    const minute = parseInt(timeParts[1], 10);
    const second = timeParts.length === 3 ? parseInt(timeParts[2], 10) : 0;
    if (
      isNaN(year) ||
      isNaN(month) ||
      isNaN(day) ||
      isNaN(hour) ||
      isNaN(minute) ||
      isNaN(second)
    ) {
      return res.status(400).send(" departTime không hợp lệ.");
    }
    const departDateObj = new Date(year, month - 1, day, hour, minute, second);
    if (isNaN(departDateObj.getTime())) {
      return res.status(400).send(" departTime không hợp lệ.");
    }

    // Validate returnTime format and parse
    const returnDateTimeParts = returnTime.split("T");
    if (returnDateTimeParts.length !== 2) {
      return res.status(400).send(" returnTime không hợp lệ.");
    }
    const returnDateParts = returnDateTimeParts[0].split("-");
    const returnTimeParts = returnDateTimeParts[1].split(":");
    if (
      returnDateParts.length !== 3 ||
      (returnTimeParts.length !== 2 && returnTimeParts.length !== 3)
    ) {
      return res.status(400).send(" returnTime không hợp lệ.");
    }
    const returnYear = parseInt(returnDateParts[0], 10);
    const returnMonth = parseInt(returnDateParts[1], 10);
    const returnDay = parseInt(returnDateParts[2], 10);
    const returnHour = parseInt(returnTimeParts[0], 10);
    const returnMinute = parseInt(returnTimeParts[1], 10);
    const returnSecond =
      returnTimeParts.length === 3 ? parseInt(returnTimeParts[2], 10) : 0;
    if (
      isNaN(returnYear) ||
      isNaN(returnMonth) ||
      isNaN(returnDay) ||
      isNaN(returnHour) ||
      isNaN(returnMinute) ||
      isNaN(returnSecond)
    ) {
      return res.status(400).send(" returnTime không hợp lệ.");
    }
    const returnDateObj = new Date(
      returnYear,
      returnMonth - 1,
      returnDay,
      returnHour,
      returnMinute,
      returnSecond
    );
    if (isNaN(returnDateObj.getTime())) {
      return res.status(400).send(" returnTime không hợp lệ.");
    }

    // Validate flightPrice as number
    const flightPriceNum = Number(flightPrice);
    if (isNaN(flightPriceNum)) {
      return res.status(400).send(" flightPrice không hợp lệ.");
    }

    const pool = await connect();
    const flightID = "F" + Date.now();

    await pool
      .request()
      .input("FlightID", sql.VarChar, flightID)
      .input("TourID", sql.VarChar, tourID)
      .input("Airline", sql.NVarChar, airline)
      .input("DeparturePoint", sql.NVarChar, departurePoint)
      .input("DestinationPoint", sql.NVarChar, destinationPoint)
      .input("Price", sql.Decimal(10, 2), flightPriceNum)
      .input("DepartureDate", sql.DateTime, departDateObj)
      .input("ReturnDate", sql.DateTime, returnDateObj).query(`
        INSERT INTO Flights (FlightID, TourID, Airline, DeparturePoint, DestinationPoint, Price, DepartureDate, ReturnDate)
        VALUES (@FlightID, @TourID, @Airline, @DeparturePoint, @DestinationPoint, @Price, @DepartureDate, @ReturnDate)
      `);

    res.send(" Vé máy bay đã được thêm thành công!");
  } catch (err) {
    console.error(" Lỗi khi thêm vé máy bay:", err);
    res.status(500).send(" Lỗi khi thêm vé máy bay.");
  }
});

// Route lấy chi tiết tour, khách sạn và vé máy bay theo tourID
router.get("/tour-details/:tourID", async (req, res) => {
  try {
    const tourID = req.params.tourID;
    const pool = await connect();

    // Lấy thông tin tour
    const tourResult = await pool.request().input("TourID", sql.VarChar, tourID)
      .query(`
        SELECT TourID, TourName, Destination, Price, SoCho, DiemThamQuan, AmThuc, DoiTuongThichHop, ThoiGianLyTuong, PhuongTien, KhuyenMai, ImageURL
        FROM Tours
        WHERE TourID = @TourID
      `);

    if (tourResult.recordset.length === 0) {
      return res.status(404).send("Tour không tồn tại");
    }
    const tour = tourResult.recordset[0];

    // Lấy danh sách khách sạn theo tourID
    const hotelsResult = await pool
      .request()
      .input("TourID", sql.VarChar, tourID).query(`
        SELECT HotelID, HotelName, Location, PricePerNight, ImageURL
        FROM Hotels
        WHERE TourID = @TourID
      `);

    // Lấy danh sách vé máy bay theo tourID
    const flightsResult = await pool
      .request()
      .input("TourID", sql.VarChar, tourID).query(`
        SELECT FlightID, Airline, DeparturePoint, DestinationPoint, Price, DepartureDate
        FROM Flights
        WHERE TourID = @TourID
      `);

    res.json({
      tour,
      hotels: hotelsResult.recordset,
      flights: flightsResult.recordset,
    });
  } catch (err) {
    console.error("Lỗi lấy chi tiết tour:", err);
    res.status(500).send("Lỗi server khi lấy chi tiết tour");
  }
});

module.exports = router;
