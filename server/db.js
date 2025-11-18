const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

// Initialize SQL.js (pure JavaScript SQLite - no native compilation needed!)
let db = null;
const DB_PATH = path.join(__dirname, 'photos.db');

async function initDatabase() {
  const SQL = await initSqlJs();
  
  // Load existing database or create new one
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
    console.log('[SQL] Loaded existing database from', DB_PATH);
  } else {
    db = new SQL.Database();
    console.log('[SQL] Created new database');
  }
  
  // Create photos table with fixed feature columns
  db.run(`
    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      date TEXT,
      grade TEXT,
      order_name TEXT,
      is_student INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  saveDatabase();
}

function saveDatabase() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

/**
 * Insert a new photo into the database
 * @param {string} filename - The photo filename
 * @param {object} features - Features object with date, grade, order, student
 * @returns {object} The inserted photo with id and created_at
 */
function insertPhoto(filename, features) {
  if (!db) throw new Error('Database not initialized');
  
  const now = new Date().toISOString();
  const date = features.date || null;
  const grade = features.grade || null;
  const order = features.order || null;
  const isStudent = features.student ? 1 : 0; // Convert boolean to integer
  
  db.run(
    'INSERT INTO photos (filename, date, grade, order_name, is_student, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [filename, date, grade, order, isStudent, now]
  );
  
  // Get the last inserted ID
  const result = db.exec('SELECT last_insert_rowid() as id');
  const id = result[0].values[0][0];
  
  saveDatabase();
  
  return {
    id,
    filename,
    date,
    grade,
    order,
    student: Boolean(isStudent),
    created_at: now
  };
}

/**
 * Get all photos from the database
 * @returns {Array} Array of photo objects with fixed features
 */
function getAllPhotos() {
  if (!db) throw new Error('Database not initialized');
  
  const result = db.exec(`
    SELECT id, filename, date, grade, order_name, is_student, created_at
    FROM photos
    ORDER BY id DESC
  `);
  
  if (!result.length || !result[0].values.length) return [];
  
  const rows = result[0].values;
  
  return rows.map(row => ({
    id: row[0],
    filename: row[1],
    date: row[2],
    grade: row[3],
    order: row[4],
    student: Boolean(row[5]),
    created_at: row[6]
  }));
}

/**
 * Get a single photo by ID
 * @param {number} id - Photo ID
 * @returns {object|null} Photo object or null if not found
 */
function getPhotoById(id) {
  if (!db) throw new Error('Database not initialized');
  
  const result = db.exec(
    'SELECT id, filename, date, grade, order_name, is_student, created_at FROM photos WHERE id = ?',
    [id]
  );
  
  if (!result.length || !result[0].values.length) return null;
  
  const row = result[0].values[0];
  
  return {
    id: row[0],
    filename: row[1],
    date: row[2],
    grade: row[3],
    order: row[4],
    student: Boolean(row[5]),
    created_at: row[6]
  };
}

/**
 * Delete a photo by ID
 * @param {number} id - Photo ID
 * @returns {boolean} True if deleted, false if not found
 */
function deletePhoto(id) {
  if (!db) throw new Error('Database not initialized');
  
  db.run('DELETE FROM photos WHERE id = ?', [id]);
  saveDatabase();
  
  return true; // sql.js doesn't provide affected rows count easily
}

/**
 * Query photos by specific field and value using SQL WHERE clause
 * @param {string} field - The field to filter by (date, grade, order, student)
 * @param {string|boolean} value - Value to match
 * @returns {Array} Filtered photos
 */
function queryPhotosByField(field, value) {
  if (!db) throw new Error('Database not initialized');
  
  // Map frontend field names to database column names
  const fieldMap = {
    'date': 'date',
    'grade': 'grade',
    'order': 'order_name',
    'student': 'is_student'
  };
  
  const dbField = fieldMap[field];
  if (!dbField) {
    return []; // Invalid field
  }
  
  // Convert boolean string to integer for student field
  let queryValue = value;
  if (field === 'student') {
    queryValue = (value === 'true' || value === true) ? 1 : 0;
  }
  
  const result = db.exec(
    `SELECT id, filename, date, grade, order_name, is_student, created_at 
     FROM photos 
     WHERE ${dbField} = ? 
     ORDER BY id DESC`,
    [queryValue]
  );
  
  if (!result.length || !result[0].values.length) return [];
  
  const rows = result[0].values;
  
  return rows.map(row => ({
    id: row[0],
    filename: row[1],
    date: row[2],
    grade: row[3],
    order: row[4],
    student: Boolean(row[5]),
    created_at: row[6]
  }));
}

/**
 * Get database statistics
 * @returns {object} Stats about the database
 */
function getStats() {
  if (!db) throw new Error('Database not initialized');
  
  const result = db.exec('SELECT COUNT(*) as count FROM photos');
  const count = result.length ? result[0].values[0][0] : 0;
  
  return {
    totalPhotos: count,
    dbPath: DB_PATH,
    engine: 'sql.js (Pure JavaScript SQLite)'
  };
}

// Graceful shutdown - save database before exit
process.on('exit', () => {
  console.log('[SQL] Saving database on exit...');
  saveDatabase();
});
process.on('SIGHUP', () => process.exit(128 + 1));
process.on('SIGINT', () => {
  console.log('[SQL] Received SIGINT, saving database...');
  saveDatabase();
  process.exit(128 + 2);
});
process.on('SIGTERM', () => {
  console.log('[SQL] Received SIGTERM, saving database...');
  saveDatabase();
  process.exit(128 + 15);
});

module.exports = {
  initDatabase,
  insertPhoto,
  getAllPhotos,
  getPhotoById,
  deletePhoto,
  queryPhotosByField,
  getStats
};


