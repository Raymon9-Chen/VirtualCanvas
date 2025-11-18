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

// Upload endpoint: multipart form with 'photo' file and optional 'features' JSON string
app.post('/api/upload', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file required as `photo`' });
  let features = {};
  try {
    if (req.body.features) features = JSON.parse(req.body.features);
  } catch (e) {
    return res.status(400).json({ error: 'features must be JSON' });
  }

  const photo = db.insertPhoto(req.file.filename, features);
  res.json(photo);
});

// List photos with optional filter query parameters: featureKey, featureValue
app.get('/api/photos', (req, res) => {
  const photos = db.getAllPhotos();

  const { featureKey, featureValue } = req.query;
  let filtered = photos;
  if (featureKey) {
    filtered = filtered.filter(p => Object.prototype.hasOwnProperty.call(p.features, featureKey));
    if (featureValue !== undefined) {
      filtered = filtered.filter(p => String(p.features[featureKey]) === featureValue);
    }
  }

  res.json(filtered);
});

app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
