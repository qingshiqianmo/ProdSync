const Database = require('better-sqlite3');

try {
  const db = new Database('prodsync.db');
  console.log('数据库表结构:');
  
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  tables.forEach(t => {
    console.log('- ' + t.name);
    
    // 显示表结构
    const columns = db.prepare(`PRAGMA table_info(${t.name})`).all();
    console.log('  列:');
    columns.forEach(col => {
      console.log(`    ${col.name} (${col.type})`);
    });
    console.log('');
  });
  
  db.close();
} catch (error) {
  console.error('检查数据库失败:', error.message);
} 