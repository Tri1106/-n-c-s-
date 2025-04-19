const sql = require('mssql');
const bcrypt = require('bcryptjs');

// Cấu hình kết nối cơ sở dữ liệu
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

// Hàm cập nhật mật khẩu
async function updatePasswords() {
  try {
    // Kết nối tới cơ sở dữ liệu
    const pool = await sql.connect(config);

    // Lấy danh sách người dùng chưa mã hóa mật khẩu (hoặc cần cập nhật)
    const result = await pool.request().query('SELECT UserID, Password FROM Users');

    const users = result.recordset;

    for (let user of users) {
      // Kiểm tra nếu mật khẩu đã được mã hóa (hoặc có thể cần mã hóa lại)
      const hashedPassword = await bcrypt.hash(user.Password, 10); // Mã hóa mật khẩu

      // Cập nhật mật khẩu đã mã hóa vào cơ sở dữ liệu
      await pool
        .request()
        .input('userID', sql.VarChar, user.UserID)
        .input('hashedPassword', sql.VarChar, hashedPassword)
        .query('UPDATE Users SET Password = @hashedPassword WHERE UserID = @userID');

      console.log(`Mật khẩu của người dùng ${user.UserID} đã được cập nhật.`);
    }

    console.log('Cập nhật mật khẩu hoàn tất.');
  } catch (err) {
    console.error('Lỗi khi cập nhật mật khẩu:', err);
  } finally {
    // Đóng kết nối
    sql.close();
  }
}

// Chạy script cập nhật mật khẩu
updatePasswords();
