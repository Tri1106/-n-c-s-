const express = require('express');
const path = require('path');
const router = express.Router();
const sql = require("../../db");

router.get("/", async (req, res) => {
  try {
    const request = new sql.Request();
    const result = await request.query("SELECT * FROM Tours");

    // Đảm bảo đường dẫn tới file home.html trong app/views/home
    const filePath = path.join(__dirname, '..', '..', 'app', 'views', 'home', 'home.html');
    
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

module.exports = router;
