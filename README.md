# Virtual Canvas (Prototype)

This is a minimal fullstack prototype for a dynamic photo canvas with SQL database backend.

Features
- Upload photos (backend stores images on disk and metadata in SQLite database)
- Drag photos around on a large canvas
- Canvas expands dynamically when photos are dragged near edges
- Filter photos by feature key/value using SQL queries
- Camera capture support for direct photo taking
- Modern, gradient-themed UI

Quick start

1. Install Node dependencies for the server

```bash
cd server
npm install
```

2. Start the server

```bash
npm start
```

3. Open http://localhost:3000 in your browser.

## API Endpoints

### Photo Management
- **POST** `/api/upload` - Upload a new photo
  - Form-data: `photo` (file), `date`, `grade`, `order`, `student`
  - SQL: `INSERT INTO photos (filename, date, grade, order_name, is_student, created_at) VALUES (?, ?, ?, ?, ?, ?)`
  
- **GET** `/api/photos` - List all photos (newest first)
  - SQL: `SELECT * FROM photos ORDER BY id DESC`
  - Optional query params: `field` (date/grade/order/student), `value` for filtering
  - Example: `/api/photos?field=grade&value=Freshman`
  
- **GET** `/api/photos/:id` - Get single photo by ID
  - SQL: `SELECT * FROM photos WHERE id = ?`
  
- **DELETE** `/api/photos/:id` - Delete a photo
  - SQL: `DELETE FROM photos WHERE id = ?`
  
- **GET** `/api/stats` - Get database statistics
  - SQL: `SELECT COUNT(*) FROM photos`

## Database Schema

```sql
CREATE TABLE photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  date TEXT,           -- Date field (YYYY-MM-DD format)
  grade TEXT,          -- Freshman, Sophomore, Junior, Senior, Graduate, Alumni, Faculty, Other
  order_name TEXT,     -- Order/Organization name (e.g., Alpha, Beta)
  is_student INTEGER,  -- 1 for student, 0 for non-student
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Fixed Feature Fields
- **Date**: Date picker field (YYYY-MM-DD)
- **Grade**: Dropdown (Freshman, Sophomore, Junior, Senior, Graduate, Alumni, Faculty, Other)
- **Order**: Text field for organization/order name
- **Student**: Yes/No dropdown (stored as 1/0 in database)

## Technical Details

### Backend
- **Express.js** - Web framework
- **sql.js** - Pure JavaScript SQLite (no native compilation required!)
- **Multer** - File upload handling
- All database operations use **SQL statements** for security
- Database auto-saves to disk after each operation

### Database Operations
- `insertPhoto()` - SQL INSERT statement
- `getAllPhotos()` - SQL SELECT with ORDER BY
- `getPhotoById()` - SQL SELECT with WHERE
- `deletePhoto()` - SQL DELETE statement
- `queryPhotosByFeature()` - SELECT with filtering logic

### Storage
- Images: `uploads/` directory on disk
- Metadata: `server/photos.db` SQLite database (pure JavaScript implementation)
- JSON features stored as TEXT in database

## Notes and next steps
- SQLite database auto-created on first run at `server/photos.db`
- Uses **sql.js** (pure JavaScript) - no native compilation needed, works on all platforms
- For production: migrate to PostgreSQL/MySQL with connection pooling
- Consider adding indexes on frequently queried feature columns
- Add database migrations system for schema changes
- Implement full-text search on features
