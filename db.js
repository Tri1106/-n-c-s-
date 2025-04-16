// db.js
const sql = require("mssql");

const config = {
  user: "sa", // tên đăng nhập SQL Server
  password: "123456", // mật khẩu
  server: "localhost", // hoặc tên máy chủ SQL của bạn
  database: "QuanLyTour", // tên database
  options: {
    encrypt: false, // dùng true nếu chạy Azure
    trustServerCertificate: true, // nếu dùng localhost
  },
};

sql
  .connect(config)
  .then(() => console.log(" Kết nối SQL Server thành công!"))
  .catch((err) => console.error(" Lỗi kết nối SQL:", err));

module.exports = sql;
