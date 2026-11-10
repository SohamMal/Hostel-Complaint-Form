const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const seed = require('./seed');

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/* ---------- tiny JSON "database" ---------- */
const DB_FILE = path.join(DATA_DIR, 'db.json');
let db;
try {
  const saved = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  db = { ...structuredClone(seed), ...saved, settings: { ...seed.settings, ...saved.settings } };
} catch { db = structuredClone(seed); }
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
const checkPw = (pw) => crypto.timingSafeEqual(Buffer.from(hashPw(String(pw), auth.salt), 'hex'), Buffer.from(auth.hash, 'hex'));
const sign = (v) => crypto.createHmac('sha256', auth.secret).update(v).digest('base64url');
const makeToken = () => { const exp = String(Date.now() + 8 * 3600 * 1000); return exp + '.' + sign(exp); };
function validToken(t) {
  if (!t) return false;
  const [exp, sig] = t.split('.');
  return !!exp && !!sig && sign(exp) === sig && Number(exp) > Date.now();
}
const getCookie = (req, name) =>
  (req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).find(([k]) => k === name)?.[1];
const requireAdmin = (req, res, next) =>
  validToken(getCookie(req, 'sid')) ? next() : res.status(401).json({ error: 'Please log in' });

const attempts = new Map(); // ip -> {n, t}
const tooManyAttempts = (ip) => { const a = attempts.get(ip); return a && a.n >= 5 && Date.now() - a.t < 10 * 60 * 1000; };

/* ---------- uploads ---------- */
const IMG = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, crypto.randomBytes(12).toString('hex') + (IMG[file.mimetype] || '.pdf')),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'file') return file.mimetype === 'application/pdf' ? cb(null, true) : cb(new Error('Only PDF files are allowed here'));
    return IMG[file.mimetype] ? cb(null, true) : cb(new Error('Only JPG, PNG, WEBP or GIF images are allowed'));
  },
});
const removeFile = (url) => {
  if (typeof url === 'string' && url.startsWith('/uploads/')) fs.rm(path.join(UPLOAD_DIR, path.basename(url)), () => {});
};

/* ---------- app ---------- */
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '200kb' }));
app.use((req, res, next) => { res.set('X-Content-Type-Options', 'nosniff'); next(); });
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));
app.use(express.static(path.join(__dirname, 'public')));

const byDateDesc = (a, b) => (b.date || '').localeCompare(a.date || '');
app.get('/api/site', (req, res) => {
  res.json({ ...db, events: [...db.events].sort(byDateDesc), downloads: [...db.downloads].sort(byDateDesc) });
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

const clean = (v) => String(v ?? '').trim().slice(0, 5000);

// school info (text fields + principal photo)
app.put('/api/settings', requireAdmin, upload.array('principal_photo', 1), (req, res) => {
  for (const k of Object.keys(seed.settings)) {
    if (k !== 'principal_photo' && req.body[k] !== undefined) db.settings[k] = clean(req.body[k]);
  }
  if (req.files?.[0]) { removeFile(db.settings.principal_photo); db.settings.principal_photo = '/uploads/' + req.files[0].filename; }
  save();
  res.json(db.settings);
});

// collections
const COL = {
  notices: { text: ['text_mr', 'text_en'], need: 'text' },
  events: { text: ['title_mr', 'title_en', 'date', 'description_mr', 'description_en'], need: 'title', date: true, file: { field: 'images', max: 12, multi: true } },
  gallery: { text: ['caption_mr', 'caption_en', 'date'], file: { field: 'image', max: 1, required: true } },
  staff: { text: ['name_mr', 'name_en', 'role_mr', 'role_en', 'bio_mr', 'bio_en'], need: 'name', file: { field: 'image', max: 1 } },
  classes: { text: ['name_mr', 'name_en', 'description_mr', 'description_en'], need: 'name' },
  downloads: { text: ['title_mr', 'title_en', 'category', 'date'], need: 'title', date: true, file: { field: 'file', max: 1 } },
};

for (const [name, cfg] of Object.entries(COL)) {
  const f = cfg.file;
  const mw = f ? upload.array(f.field, f.max) : (req, res, next) => next();
  const fresh = (req) => (req.files || []).map((x) => '/uploads/' + x.filename);

  // returns { item, drop } where drop = old files to delete once the save succeeds
  const build = (req, old = {}) => {
    const item = { ...old }, drop = [];
    for (const k of cfg.text) if (req.body[k] !== undefined) item[k] = clean(req.body[k]);
    if (f?.multi) {
      let remove = [];
      try { remove = JSON.parse(req.body.remove || '[]'); } catch {}
      const kept = (old[f.field] || []).filter((u) => !remove.includes(u) || (drop.push(u), false));
      item[f.field] = [...kept, ...fresh(req)].slice(0, 40);
    } else if (f) {
      const up = fresh(req)[0];
      if (up) { if (old[f.field]) drop.push(old[f.field]); item[f.field] = up; }
      else if (item[f.field] === undefined) item[f.field] = '';
    }
    return { item, drop };
  };
  const invalid = (item) => {
    if (cfg.need && !item[cfg.need + '_mr'] && !item[cfg.need + '_en']) return 'Please fill in the ' + cfg.need + ' (Marathi or English)';
    if (cfg.date && !item.date) return 'Please choose a date';
    if (item.date && !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) return 'Invalid date';
    if (f?.required && !item[f.field]) return 'Please choose a file';
    return null;
  };
  const write = (req, res, old, index) => {
    const { item, drop } = build(req, old);
    const err = invalid(item);
    if (err) { fresh(req).forEach(removeFile); return res.status(400).json({ error: err }); }
    drop.forEach(removeFile);
    if (index < 0) { item.id = crypto.randomBytes(6).toString('hex'); db[name].push(item); }
    else db[name][index] = item;
    save();
    res.json(item);
  };

  app.post('/api/' + name, requireAdmin, mw, (req, res) => write(req, res, {}, -1));
  app.put('/api/' + name + '/:id', requireAdmin, mw, (req, res) => {
    const i = db[name].findIndex((x) => x.id === req.params.id);
    if (i < 0) { fresh(req).forEach(removeFile); return res.status(404).json({ error: 'Not found' }); }
    write(req, res, db[name][i], i);
  });
  app.delete('/api/' + name + '/:id', requireAdmin, (req, res) => {
    const i = db[name].findIndex((x) => x.id === req.params.id);
    if (i < 0) return res.status(404).json({ error: 'Not found' });
    if (f) [].concat(db[name][i][f.field] || []).forEach(removeFile);
    db[name].splice(i, 1);
    save();
    res.json({ ok: true });
  });
}

app.use((err, req, res, next) => {
  (req.files || []).forEach((x) => removeFile('/uploads/' + x.filename));
  res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 10 MB)' : err.message || 'Something went wrong' });
});

app.listen(PORT, () => console.log(`School site running:  http://localhost:${PORT}   (admin: /admin/)`));
