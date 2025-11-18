const api = {
  upload: (formData) => fetch('/api/upload', { method: 'POST', body: formData }).then(r => r.json()),
  list: (q = {}) => {
    const params = new URLSearchParams(q);
    return fetch('/api/photos' + (params.toString() ? ('?' + params.toString()) : '')).then(r => r.json());
  }
};

const canvasBoard = document.getElementById('canvasBoard');
const canvasContainer = document.getElementById('canvasContainer');

// Simple state
let photosState = [];

function addPhotoToBoard(photo, x = 20, y = 20) {
  const img = document.createElement('img');
  img.draggable = false;
  img.className = 'photo';
  img.src = `/uploads/${photo.filename}`;
  img.style.left = x + 'px';
  img.style.top = y + 'px';
  img.style.width = '240px';
  img.dataset.id = photo.id;
  canvasBoard.appendChild(img);

  // drag with pointer events
  let startX, startY, origX, origY;
  function onPointerDown(e) {
    img.setPointerCapture(e.pointerId);
    img.classList.add('dragging');
    startX = e.clientX; startY = e.clientY;
    origX = parseFloat(img.style.left);
    origY = parseFloat(img.style.top);
    img._pointerId = e.pointerId;
  }
  function onPointerMove(e) {
    if (img._pointerId !== e.pointerId) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const nx = origX + dx;
    const ny = origY + dy;
    img.style.left = nx + 'px';
    img.style.top = ny + 'px';
    ensureBoardFits(img);
  }
  function onPointerUp(e) {
    if (img._pointerId !== e.pointerId) return;
    img.releasePointerCapture(e.pointerId);
    img.classList.remove('dragging');
    delete img._pointerId;
  }

  img.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
}

function ensureBoardFits(el) {
  const rect = el.getBoundingClientRect();
  const boardRect = canvasBoard.getBoundingClientRect();
  // compute position relative to board's coordinate system
  const relRight = (parseFloat(el.style.left) + el.offsetWidth);
  const relBottom = (parseFloat(el.style.top) + el.offsetHeight);
  let changed = false;
  // if near the right or below, expand
  if (relRight > canvasBoard.clientWidth - 100) {
    canvasBoard.style.width = (relRight + 400) + 'px';
    changed = true;
  }
  if (relBottom > canvasBoard.clientHeight - 100) {
    canvasBoard.style.height = (relBottom + 400) + 'px';
    changed = true;
  }
  // if dragged to negative coordinates, shift everything right/down
  if (parseFloat(el.style.left) < 0) {
    const shift = Math.abs(parseFloat(el.style.left)) + 200;
    shiftAll(shift, 0);
    changed = true;
  }
  if (parseFloat(el.style.top) < 0) {
    const shift = Math.abs(parseFloat(el.style.top)) + 200;
    shiftAll(0, shift);
    changed = true;
  }
  if (changed) {
    // optional: scroll into view
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }
}

function shiftAll(dx, dy) {
  const items = canvasBoard.querySelectorAll('.photo');
  items.forEach(it => {
    const left = parseFloat(it.style.left) + dx;
    const top = parseFloat(it.style.top) + dy;
    it.style.left = left + 'px';
    it.style.top = top + 'px';
  });
  // if shifting negative would require growing board dimensions
  if (dx > 0) canvasBoard.style.width = Math.max(canvasBoard.clientWidth + dx, canvasBoard.clientWidth) + 'px';
  if (dy > 0) canvasBoard.style.height = Math.max(canvasBoard.clientHeight + dy, canvasBoard.clientHeight) + 'px';
}

// Upload form handling
document.getElementById('uploadForm').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const form = ev.target;
  const file = form.photo.files[0];
  if (!file) return alert('Please select or capture a photo first');
  
  const fd = new FormData();
  fd.append('photo', file);
  fd.append('date', form.date.value);
  fd.append('grade', form.grade.value);
  fd.append('order', form.order.value);
  fd.append('student', form.student.value);
  
  const res = await api.upload(fd);
  if (res.error) return alert('Upload failed: ' + res.error);
  // add to board at random position
  addPhotoToBoard(res, Math.random() * 300, Math.random() * 300);
  form.reset();
});

// Camera functionality
const cameraModal = document.getElementById('cameraModal');
const cameraVideo = document.getElementById('cameraVideo');
const captureCanvas = document.getElementById('captureCanvas');
const cameraBtn = document.getElementById('cameraBtn');
const closeCameraModal = document.getElementById('closeCameraModal');
const captureBtn = document.getElementById('captureBtn');
const cancelCameraBtn = document.getElementById('cancelCameraBtn');
const photoInput = document.getElementById('photoInput');

let cameraStream = null;

async function startCamera() {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment' }, // prefer back camera on mobile
      audio: false 
    });
    cameraVideo.srcObject = cameraStream;
    cameraModal.classList.add('active');
  } catch (err) {
    alert('Camera access denied or not available: ' + err.message);
    console.error('Camera error:', err);
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  cameraVideo.srcObject = null;
  cameraModal.classList.remove('active');
}

function capturePhoto() {
  const context = captureCanvas.getContext('2d');
  captureCanvas.width = cameraVideo.videoWidth;
  captureCanvas.height = cameraVideo.videoHeight;
  context.drawImage(cameraVideo, 0, 0);
  
  // Convert canvas to blob and create file
  captureCanvas.toBlob((blob) => {
    const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    photoInput.files = dataTransfer.files;
    
    stopCamera();
    alert('Photo captured! Click Upload to add it to the canvas.');
  }, 'image/jpeg', 0.9);
}

cameraBtn.addEventListener('click', startCamera);
closeCameraModal.addEventListener('click', stopCamera);
cancelCameraBtn.addEventListener('click', stopCamera);
captureBtn.addEventListener('click', capturePhoto);

// Close modal on background click
cameraModal.addEventListener('click', (e) => {
  if (e.target === cameraModal) stopCamera();
});


// Filtering
async function loadPhotos(filter = {}) {
  const photos = await api.list(filter);
  photosState = photos;
  // clear board and re-add
  canvasBoard.innerHTML = '';
  let x = 20, y = 20;
  photos.forEach(p => {
    addPhotoToBoard(p, x, y);
    x += 260; if (x > 1000) { x = 20; y += 260; }
  });
}

document.getElementById('applyFilter').addEventListener('click', () => {
  const field = document.getElementById('filterField').value;
  const value = document.getElementById('filterValue').value.trim();
  if (!field || !value) return loadPhotos();
  loadPhotos({ field, value });
});

document.getElementById('clearFilter').addEventListener('click', () => { 
  document.getElementById('filterField').value = ''; 
  document.getElementById('filterValue').value = ''; 
  loadPhotos(); 
});

// initial load
loadPhotos();
