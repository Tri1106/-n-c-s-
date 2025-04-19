const sql = require('mssql');

const config = {
  user: 'sa', 
  password: '123456', 
  server: 'localhost', 
  database: 'QuanLyTour', 
  options: {
    encrypt: false, 
    trustServerCertificate: true, 
  },
};

// Hàm kết nối và xuất pool kết nối để sử dụng trong các phần khác của ứng dụng
async function connect() {
  try {
    const pool = await sql.connect(config);
    console.log('Kết nối SQL Server thành công!');
    return pool; // Trả về đối tượng pool
  } catch (err) {
    console.error('Lỗi kết nối SQL:', err);
    throw err; // Ném lỗi nếu không kết nối được
  }
}


module.exports = { sql, connect };
