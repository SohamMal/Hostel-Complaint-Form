const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/* ---------- tiny JSON "database" ---------- */
const DB_FILE = path.join(DATA_DIR, 'db.json');
const DEFAULT_DB = {
  settings: {
    name: 'Your Primary School',
    tagline: 'Nurturing knowledge, character and curiosity',
    about: 'We provide a caring and structured learning environment in which every child is encouraged to achieve their full potential. Our dedicated teachers support academic growth alongside good character and respect for others.',
    address: '12 School Road, Your Town',
    phone: '+00 000 000 0000',
    email: 'hello@example.com',
  },
  notices: [{ id: 'n1', text: 'Welcome to our new school website.' }],
  events: [],
  gallery: [],
  staff: [],
};
let db;
try { db = { ...DEFAULT_DB, ...JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) }; }
catch { db = structuredClone(DEFAULT_DB); }
function save() {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}
save();

/* ---------- admin credentials & sessions ---------- */
const AUTH_FILE = path.join(DATA_DIR, 'admin.json');
const hashPw = (pw, salt) => crypto.scryptSync(pw, salt, 64).toString('hex');
let auth;
try { auth = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8')); }
catch {
  const pw = process.env.ADMIN_PASSWORD || crypto.randomBytes(6).toString('base64url');
  const salt = crypto.randomBytes(16).toString('hex');
  auth = { salt, hash: hashPw(pw, salt), secret: crypto.randomBytes(32).toString('hex') };
  fs.writeFileSync(AUTH_FILE, JSON.stringify(auth));
  console.log('\n  First run: admin password is  ' + pw + '\n  (change it in the admin panel after logging in)\n');
}
const checkPw = (pw) => {
  const a = Buffer.from(hashPw(String(pw), auth.salt), 'hex');
  return crypto.timingSafeEqual(a, Buffer.from(auth.hash, 'hex'));
};
const sign = (v) => crypto.createHmac('sha256', auth.secret).update(v).digest('base64url');
function makeToken() {
  const exp = String(Date.now() + 8 * 3600 * 1000);
  return exp + '.' + sign(exp);
}
function validToken(t) {
  if (!t) return false;
  const [exp, sig] = t.split('.');
  if (!exp || !sig || sign(exp) !== sig) return false;
  return Number(exp) > Date.now();
}
const getCookie = (req, name) =>
  (req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).find(([k]) => k === name)?.[1];
const requireAdmin = (req, res, next) =>
  validToken(getCookie(req, 'sid')) ? next() : res.status(401).json({ error: 'Please log in' });

const attempts = new Map(); // ip -> {n, t}
function tooManyAttempts(ip) {
  const a = attempts.get(ip);
  return a && a.n >= 5 && Date.now() - a.t < 10 * 60 * 1000;
}

/* ---------- uploads ---------- */
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, crypto.randomBytes(12).toString('hex') + EXT[file.mimetype]),
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(EXT[file.mimetype] ? null : new Error('Only JPG, PNG, WEBP or GIF images are allowed'), !!EXT[file.mimetype]),
});
const removeImage = (url) => {
  if (url && url.startsWith('/uploads/')) fs.rm(path.join(UPLOAD_DIR, path.basename(url)), () => {});
};

/* ---------- app ---------- */
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  next();
});
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));
app.use(express.static(path.join(__dirname, 'public')));

// public data
app.get('/api/site', (req, res) => {
  const events = [...db.events].sort((a, b) => a.date.localeCompare(b.date));
  res.json({ settings: db.settings, notices: db.notices, events, gallery: db.gallery, staff: db.staff });
});

// auth
app.post('/api/login', (req, res) => {
  const ip = req.ip;
  if (tooManyAttempts(ip)) return res.status(429).json({ error: 'Too many attempts. Try again in a few minutes.' });
  if (!checkPw(req.body.password || '')) {
    const a = attempts.get(ip) || { n: 0 };
    attempts.set(ip, { n: a.n + 1, t: Date.now() });
    return res.status(401).json({ error: 'Wrong password' });
  }
  attempts.delete(ip);
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  res.set('Set-Cookie', `sid=${makeToken()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${secure}`);
  res.json({ ok: true });
});
app.post('/api/logout', (req, res) => {
  res.set('Set-Cookie', 'sid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
  res.json({ ok: true });
});
app.get('/api/me', (req, res) => res.json({ admin: validToken(getCookie(req, 'sid')) }));
app.post('/api/password', requireAdmin, (req, res) => {
  const { current, next } = req.body;
  if (!checkPw(current || '')) return res.status(400).json({ error: 'Current password is wrong' });
  if (!next || next.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });
  auth.salt = crypto.randomBytes(16).toString('hex');
  auth.hash = hashPw(next, auth.salt);
  fs.writeFileSync(AUTH_FILE, JSON.stringify(auth));
  res.json({ ok: true });
});

// settings
app.put('/api/settings', requireAdmin, (req, res) => {
  for (const k of Object.keys(DEFAULT_DB.settings)) {
    if (typeof req.body[k] === 'string') db.settings[k] = req.body[k].trim().slice(0, 1000);
  }
  save();
  res.json(db.settings);
});

// collections: events, gallery, notices, staff
const COLLECTIONS = {
  events: { fields: ['title', 'date', 'description'], image: true, required: ['title', 'date'] },
  gallery: { fields: ['caption'], image: true, required: [], imageRequired: true },
  notices: { fields: ['text'], image: false, required: ['text'] },
  staff: { fields: ['name', 'role', 'bio'], image: true, required: ['name'] },
};
const clean = (v) => String(v ?? '').trim().slice(0, 2000);

for (const [name, cfg] of Object.entries(COLLECTIONS)) {
  const mw = cfg.image ? upload.single('image') : (req, res, next) => next();
  const build = (req, existing = {}) => {
    const item = { ...existing };
    for (const f of cfg.fields) if (req.body[f] !== undefined) item[f] = clean(req.body[f]);
    if (cfg.image && req.file) item.image = '/uploads/' + req.file.filename;
    return item;
  };
  const invalid = (item) =>
    cfg.required.find((f) => !item[f]) ? 'Please fill in: ' + cfg.required.find((f) => !item[f]) :
    cfg.imageRequired && !item.image ? 'Please choose an image' :
    item.date && !/^\d{4}-\d{2}-\d{2}$/.test(item.date) ? 'Invalid date' : null;

  app.post('/api/' + name, requireAdmin, mw, (req, res) => {
    const item = build(req);
    const err = invalid(item);
    if (err) { if (req.file) removeImage('/uploads/' + req.file.filename); return res.status(400).json({ error: err }); }
    item.id = crypto.randomBytes(6).toString('hex');
    db[name].push(item);
    save();
    res.json(item);
  });
  app.put('/api/' + name + '/:id', requireAdmin, mw, (req, res) => {
    const i = db[name].findIndex((x) => x.id === req.params.id);
    if (i < 0) return res.status(404).json({ error: 'Not found' });
    const old = db[name][i];
    const item = build(req, old);
    const err = invalid(item);
    if (err) { if (req.file) removeImage('/uploads/' + req.file.filename); return res.status(400).json({ error: err }); }
    if (req.file) removeImage(old.image);
    db[name][i] = item;
    save();
    res.json(item);
  });
  app.delete('/api/' + name + '/:id', requireAdmin, (req, res) => {
    const i = db[name].findIndex((x) => x.id === req.params.id);
    if (i < 0) return res.status(404).json({ error: 'Not found' });
    removeImage(db[name][i].image);
    db[name].splice(i, 1);
    save();
    res.json({ ok: true });
  });
}

app.use((err, req, res, next) => {
  res.status(400).json({ error: err.message || 'Something went wrong' });
});

app.listen(PORT, () => console.log(`School site running:  http://localhost:${PORT}   (admin: /admin/)`));
