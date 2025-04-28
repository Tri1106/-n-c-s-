const sql = require("mssql"); // Import thư viện mssql

const config = {
  user: "sa", // Tên user SQL Server
  password: "123456", // Mật khẩu của user
  server: "localhost", // Địa chỉ của SQL Server
  database: "QuanLyTour", // Tên cơ sở dữ liệu
  options: {
    encrypt: false, // Đảm bảo sử dụng kết nối không mã hóa
    trustServerCertificate: true, // Bật hoặc tắt xác thực chứng chỉ của server
  },
};

// Hàm kết nối và xuất pool kết nối để sử dụng trong các phần khác của ứng dụng
async function connect() {
  try {
    const pool = await sql.connect(config); // Kết nối đến SQL Server
    console.log("Kết nối SQL Server thành công!");
    return pool; // Trả về đối tượng pool để dùng trong các truy vấn sau
  } catch (err) {
    console.error("Lỗi kết nối SQL:", err); // Log ra lỗi nếu kết nối thất bại
    throw err; // Ném lỗi ra nếu kết nối không thành công
  }
}

module.exports = { sql, connect }; // Xuất ra các hàm và đối tượng cần thiết để sử dụng
