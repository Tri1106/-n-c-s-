const express = require("express");
const router = express.Router();
const multer = require("multer");
const { connect, sql } = require("../../db");

// Cấu hình nơi lưu ảnh
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads"); // Đảm bảo ảnh được lưu trong thư mục 'public/uploads'
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname); // Tên file duy nhất
  },
});
const upload = multer({ storage });

// Route thêm tour
// Route thêm tour
router.post("/add-tour", upload.single("tourImage"), async (req, res) => {
  try {
    const { tourName, destination, price, seats } = req.body;
    let providerID = req.session.user?.providerID;

    if (!providerID) {
      return res.status(400).send("❌ providerID không có.");
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
      .input("TourName", sql.VarChar, tourName)
      .input("Destination", sql.NVarChar, destination)
      .input("Price", sql.Decimal(10, 2), price)
      .input("SoCho", sql.Int, seats)
      .input("Status", sql.Bit, true)
      .input("ImageURL", sql.NVarChar, imagePath).query(`
            INSERT INTO Tours (TourID, ProviderID, TourName, Destination, Price, SoCho, Status, ImageURL)
            VALUES (@TourID, @ProviderID, @TourName, @Destination, @Price, @SoCho, @Status, @ImageURL)
          `);

    res.send("✅ Tour đã được thêm thành công!");
  } catch (err) {
    console.error("❌ Lỗi khi thêm tour:", err);
    res.status(500).send("❌ Lỗi khi thêm tour.");
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
      return res.status(400).send("❌ Chưa đăng nhập.");
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
    const { tourName, destination, price, seats } = req.body;
    const tourID = req.params.tourID;

    const pool = await connect();
    await pool
      .request()
      .input("TourID", sql.VarChar, tourID)
      .input("TourName", sql.VarChar, tourName)
      .input("Destination", sql.NVarChar, destination)
      .input("Price", sql.Decimal(10, 2), price)
      .input("SoCho", sql.Int, seats)
      .query(`
        UPDATE Tours
        SET TourName = @TourName, Destination = @Destination, Price = @Price, SoCho = @SoCho
        WHERE TourID = @TourID
      `);

    res.send("✅ Tour đã được cập nhật thành công!");
  } catch (err) {
    console.error("❌ Lỗi khi cập nhật tour:", err);
    res.status(500).send("❌ Lỗi khi cập nhật tour.");
  }
});

router.delete("/delete-tour/:tourID", async (req, res) => {
  try {
    const tourID = req.params.tourID;

    const pool = await connect();
    await pool
      .request()
      .input("TourID", sql.VarChar, tourID)
      .query(`
        DELETE FROM Tours WHERE TourID = @TourID
      `);

    res.send("✅ Tour đã được xóa thành công!");
  } catch (err) {
    console.error("❌ Lỗi khi xóa tour:", err);
    res.status(500).send("❌ Lỗi khi xóa tour.");
  }
});

module.exports = router;
