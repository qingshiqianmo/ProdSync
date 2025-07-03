const bcrypt = require('bcryptjs');
const { db } = require('./src/database-v3');

const resetAdminPassword = async () => {
  try {
    console.log('==========================================');
    console.log('🔧 管理员密码重置工具');
    console.log('==========================================');
    
    // 检查管理员账户是否存在
    const admin = db.prepare('SELECT id, username, name FROM users_v3 WHERE username = ?').get('admin');
    
    if (!admin) {
      console.log('❌ 管理员账户不存在');
      return;
    }
    
    // 重置为默认密码
    const defaultPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    
    db.prepare('UPDATE users_v3 SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?')
      .run(hashedPassword, 'admin');
    
    console.log('✅ 管理员密码重置成功');
    console.log(`👤 用户名: admin`);
    console.log(`🔑 新密码: ${defaultPassword}`);
    console.log(`💡 提示: 请登录后及时修改密码`);
    console.log('==========================================');
    
  } catch (error) {
    console.error('❌ 重置密码失败:', error);
  } finally {
    process.exit(0);
  }
};

resetAdminPassword(); 