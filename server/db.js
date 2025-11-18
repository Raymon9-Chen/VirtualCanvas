const fs = require('fs');
const path = require('path');

const STORE_PATH = path.join(__dirname, 'photos.json');

function ensureStore() {
  if (!fs.existsSync(STORE_PATH)) {
    const init = { lastId: 0, photos: [] };
    fs.writeFileSync(STORE_PATH, JSON.stringify(init, null, 2), 'utf8');
  }
}

function readStore() {
  ensureStore();
  return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
}

function writeStore(data) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function insertPhoto(filename, features) {
  const store = readStore();
  const id = store.lastId + 1;
  const now = new Date().toISOString();
  const photo = { id, filename, features: features || {}, created_at: now };
  store.photos.push(photo);
  store.lastId = id;
  writeStore(store);
  return photo;
}

function getAllPhotos() {
  const store = readStore();
  return store.photos.slice().reverse();
}

module.exports = { insertPhoto, getAllPhotos };
