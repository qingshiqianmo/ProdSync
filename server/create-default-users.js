const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'prodsync.db');

const createDefaultUsers = async () => {
  try {
    console.log('创建默认用户配置...');
    const db = new Database(dbPath);
    
    // 清除现有用户（除了管理员）
    console.log('清除现有用户数据（保留管理员）...');
    db.prepare("DELETE FROM users_v3 WHERE identity != 'admin'").run();
    
    const password = 'test123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const defaultUsers = [
      // 1名生产调度员
      {
        username: 'scheduler01',
        name: '张调度',
        identity: 'production_scheduler',
        department: '生产调度部',
        email: 'scheduler01@company.com'
      },
      
      // 2名生产所领导
      {
        username: 'leader01',
        name: '李所长',
        identity: 'production_leader',
        department: '第一生产所',
        email: 'leader01@company.com'
      },
      {
        username: 'leader02',
        name: '王副所长',
        identity: 'production_leader',
        department: '第二生产所',
        email: 'leader02@company.com'
      },
      
      // 10名职员
      {
        username: 'staff01',
        name: '陈工程师',
        identity: 'staff',
        department: '技术部',
        email: 'staff01@company.com'
      },
      {
        username: 'staff02',
        name: '刘设计师',
        identity: 'staff',
        department: '设计部',
        email: 'staff02@company.com'
      },
      {
        username: 'staff03',
        name: '赵技术员',
        identity: 'staff',
        department: '技术部',
        email: 'staff03@company.com'
      },
      {
        username: 'staff04',
        name: '钱质检员',
        identity: 'staff',
        department: '质检部',
        email: 'staff04@company.com'
      },
      {
        username: 'staff05',
        name: '孙操作工',
        identity: 'staff',
        department: '生产车间',
        email: 'staff05@company.com'
      },
      {
        username: 'staff06',
        name: '周维修工',
        identity: 'staff',
        department: '设备部',
        email: 'staff06@company.com'
      },
      {
        username: 'staff07',
        name: '吴文员',
        identity: 'staff',
        department: '办公室',
        email: 'staff07@company.com'
      },
      {
        username: 'staff08',
        name: '郑采购员',
        identity: 'staff',
        department: '采购部',
        email: 'staff08@company.com'
      },
      {
        username: 'staff09',
        name: '冯仓管员',
        identity: 'staff',
        department: '仓储部',
        email: 'staff09@company.com'
      },
      {
        username: 'staff10',
        name: '褚安全员',
        identity: 'staff',
        department: '安全部',
        email: 'staff10@company.com'
      }
    ];
    
    console.log('开始创建用户...');
    let createdCount = 0;
    
    const insertStmt = db.prepare(`
      INSERT INTO users_v3 (username, password, name, identity, department, email)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    for (const user of defaultUsers) {
      try {
        insertStmt.run(
          user.username,
          hashedPassword,
          user.name,
          user.identity,
          user.department,
          user.email
        );
        console.log(`✓ 创建用户: ${user.name} (${user.username}) - ${user.identity}`);
        createdCount++;
      } catch (error) {
        console.error(`✗ 创建用户失败: ${user.name}`, error.message);
      }
    }
    
    console.log(`\n用户创建完成！总共创建了 ${createdCount} 个用户`);
    console.log('所有用户默认密码: test123');
    
    // 显示用户统计
    const userStats = db.prepare(`
      SELECT identity, COUNT(*) as count 
      FROM users_v3 
      GROUP BY identity 
      ORDER BY 
        CASE identity 
          WHEN 'admin' THEN 1 
          WHEN 'production_scheduler' THEN 2 
          WHEN 'production_leader' THEN 3 
          WHEN 'staff' THEN 4 
        END
    `).all();
    
    console.log('\n用户统计:');
    userStats.forEach(stat => {
      const identityNames = {
        'admin': '系统管理员',
        'production_scheduler': '生产调度员',
        'production_leader': '生产所领导',
        'staff': '职员'
      };
      console.log(`${identityNames[stat.identity]}: ${stat.count}名`);
    });
    
    db.close();
    console.log('\n数据库连接已关闭');
    
  } catch (error) {
    console.error('创建默认用户失败:', error);
  }
};

createDefaultUsers(); 