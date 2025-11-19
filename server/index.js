const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safe = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
    cb(null, safe);
  }
});
const upload = multer({ storage });

app.use(express.json());

// Serve uploads and frontend static
app.use('/uploads', express.static(UPLOAD_DIR));
app.use('/', express.static(path.join(__dirname, '..', 'public')));

// Upload endpoint: multipart form with 'photo' file and fixed feature fields
app.post('/api/upload', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file required as `photo`' });
  
  // Parse fixed feature fields from request body
  const features = {
    date: req.body.date || null,
    grade: req.body.grade || null,
    order: req.body.order || null,
    student: req.body.student === 'true' || req.body.student === true
  };

  try {
    // Use SQL INSERT with fixed columns
    const photo = db.insertPhoto(req.file.filename, features);
    console.log(`[SQL INSERT] Photo uploaded: ID=${photo.id}, Grade=${photo.grade}, Student=${photo.student}`);
    res.json(photo);
  } catch (err) {
    console.error('[SQL ERROR]', err);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

// List photos with optional filter query parameters: field, value
app.get('/api/photos', (req, res) => {
  try {
    const { field, value } = req.query;
    
    let photos;
    if (field && value !== undefined) {
      // Use SQL query with WHERE clause filtering
      photos = db.queryPhotosByField(field, value);
      console.log(`[SQL QUERY] Filter by ${field}=${value}, found ${photos.length} photos`);
    } else {
      // Use SQL SELECT to get all photos
      photos = db.getAllPhotos();
      console.log(`[SQL QUERY] Retrieved all photos: ${photos.length} total`);
    }

    res.json(photos);
  } catch (err) {
    console.error('[SQL ERROR]', err);
    res.status(500).json({ error: 'Database query error: ' + err.message });
  }
});

// Get single photo by ID
app.get('/api/photos/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const photo = db.getPhotoById(id);
    
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    console.log(`[SQL QUERY] Retrieved photo ID=${id}`);
    res.json(photo);
  } catch (err) {
    console.error('[SQL ERROR]', err);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

// Delete photo endpoint
app.delete('/api/photos/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const photo = db.getPhotoById(id);
    
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    // Delete from database using SQL DELETE
    const deleted = db.deletePhoto(id);
    
    if (deleted) {
      // Also delete the file from disk
      const filePath = path.join(UPLOAD_DIR, photo.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      console.log(`[SQL DELETE] Deleted photo ID=${id}, filename=${photo.filename}`);
      res.json({ success: true, message: 'Photo deleted' });
    } else {
      res.status(500).json({ error: 'Failed to delete photo' });
    }
  } catch (err) {
    console.error('[SQL ERROR]', err);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

// Database stats endpoint
app.get('/api/stats', (req, res) => {
  try {
    const stats = db.getStats();
    console.log(`[SQL QUERY] Database stats retrieved`);
    res.json(stats);
  } catch (err) {
    console.error('[SQL ERROR]', err);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

// Initialize database and start server
async function startServer() {
  try {
    console.log('[Server] Initializing database...');
    await db.initDatabase();
    console.log('[Server] Database ready!');
    
    app.listen(PORT, () => {
      console.log(`[Server] Listening on http://localhost:${PORT}`);
      console.log('[Server] Ready to accept requests');
    });
  } catch (err) {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
  }
}

startServer();