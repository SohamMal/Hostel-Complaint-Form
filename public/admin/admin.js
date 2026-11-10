const $ = (s) => document.querySelector(s);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const MR = ' (मराठी)', EN = ' (English)';
const both = (name, label, type = 'text') => [[name + '_mr', label + MR, type], [name + '_en', label + EN, type]];
const CATS = [['circular', 'Circular / परिपत्रक'], ['form', 'Form / अर्ज'], ['timetable', 'Timetable / वेळापत्रक'], ['result', 'Result / निकाल'], ['other', 'Other / इतर']];

// field = [name, label, type, required]; a nested array is a Marathi/English pair shown side by side
const TABS = {
  events: { label: 'Events', hint: 'Post an event as soon as it happens. It appears on the Home and Events pages immediately and moves to the Archive automatically after 60 days.', title: 'title', sub: 'date', thumb: 'images',
    fields: [both('title', 'Event name'), ['date', 'Date', 'date', 1], both('description', 'Details', 'textarea'), ['images', 'Photos (you can pick several)', 'images']] },
  gallery: { label: 'Gallery', title: 'caption', sub: 'date', thumb: 'image', fields: [['image', 'Photo', 'image', 1], both('caption', 'Caption'), ['date', 'Date taken (optional)', 'date']] },
  notices: { label: 'Notices', hint: 'Short messages that scroll across the top of every page.', title: 'text', fields: [both('text', 'Notice')] },
  downloads: { label: 'Circulars', title: 'title', sub: 'date', fields: [both('title', 'Title'), ['category', 'Category', 'select', 1], ['date', 'Date', 'date', 1], ['file', 'PDF file', 'pdf']] },
  staff: { label: 'Teachers', title: 'name', sub: 'role_en', thumb: 'image', fields: [both('name', 'Name'), both('role', 'Role'), both('bio', 'About', 'textarea'), ['image', 'Photo', 'image']] },
  classes: { label: 'Classes', title: 'name', fields: [both('name', 'Class name'), both('description', 'Description', 'textarea')] },
  settings: { label: 'School info' },
  password: { label: 'Password' },
};
const SETTINGS = [both('name', 'School name'), both('place', 'City'), both('tagline', 'Tagline'), both('about', 'About the school', 'textarea'), both('vision', 'Vision', 'textarea'), both('mission', 'Mission', 'textarea'),
  both('academics', 'Academics introduction', 'textarea'), both('principal_name', "Principal's name"), both('principal_message', "Principal's message", 'textarea'), ['principal_photo', "Principal's photo", 'image'],
  both('address', 'Address'), ['phone', 'Phone', 'text'], ['email', 'Email', 'text'], both('hours', 'School hours'), ['demo', 'Show the "sample content" strip at the top of the website', 'check']];

async function api(url, opts = {}) {
  const r = await fetch(url, opts);
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && url !== '/api/login') { showLogin(); throw new Error('Please log in'); }
  if (!r.ok) throw new Error(d.error || 'Something went wrong');
  return d;
}
function flash(text, bad) {
  const m = $('#msg'); m.textContent = text; m.className = 'msg' + (bad ? ' bad' : ''); m.hidden = false;
  clearTimeout(flash.t); flash.t = setTimeout(() => (m.hidden = true), 4000);
}
// Shrink large phone photos in the browser before uploading.
async function shrink(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 600 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file), k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.85));
    return blob && blob.size < file.size ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file;
  } catch { return file; }
}
async function formData(form) {
  const fd = new FormData(), remove = [];
  for (const i of form.elements) {
    if (!i.name) continue;
    if (i.type === 'file') for (const f of i.files) fd.append(i.name, await shrink(f));
    else if (i.name === 'remove') { if (i.checked) remove.push(i.value); }
    else if (i.type === 'checkbox') fd.append(i.name, i.checked ? '1' : '');
    else fd.append(i.name, i.value);
  }
  if (remove.length) fd.append('remove', JSON.stringify(remove));
  return fd;
}

/* login */
function showLogin() { $('#login').hidden = false; $('#panel').hidden = true; }
$('#loginForm').onsubmit = async (e) => {
  e.preventDefault(); $('#loginErr').textContent = '';
  try {
    await api('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: $('#pw').value }) });
    $('#pw').value = ''; start();
  } catch (err) { $('#loginErr').textContent = err.message; }
};
$('#logout').onclick = async () => { await fetch('/api/logout', { method: 'POST' }); showLogin(); };

/* panel */
let current = 'events', site;
async function start() {
  $('#login').hidden = true; $('#panel').hidden = false;
  site = await api('/api/site');
  const tabs = $('#tabs'); tabs.textContent = '';
  for (const k of Object.keys(TABS)) {
    const b = el('button', k === current ? 'on' : '', TABS[k].label); b.type = 'button';
    b.onclick = () => { current = k; start(); };
    tabs.append(b);
  }
  const view = $('#view'); view.textContent = '';
  if (current === 'settings') return settingsView(view);
  if (current === 'password') return passwordView(view);
  collectionView(view, current);
}

function field([name, label, type, req], value) {
  if (type === 'check') { const l = el('label', 'check'); const i = el('input'); i.type = 'checkbox'; i.name = name; i.checked = !!value; l.append(i, label); return l; }
  const l = el('label', '', label + (req ? ' *' : ''));
  let i;
  if (type === 'textarea') i = el('textarea');
  else if (type === 'select') { i = el('select'); for (const [v, t] of CATS) { const o = el('option', '', t); o.value = v; i.append(o); } }
  else { i = el('input'); i.type = ['image', 'images', 'pdf'].includes(type) ? 'file' : type; }
  i.name = name;
  if (i.type === 'file') {
    i.accept = type === 'pdf' ? 'application/pdf' : 'image/jpeg,image/png,image/webp,image/gif';
    if (type === 'images') i.multiple = true;
    const has = Array.isArray(value) ? value.length : value;
    l.append(el('span', 'hint', (type === 'pdf' ? 'PDF, up to 10 MB' : 'JPG / PNG, large photos are resized automatically') + (has && type !== 'images' ? ' — leave empty to keep the current file' : '')));
    if (req && !has) i.required = true;
  } else { if (value != null) i.value = value; if (req) i.required = true; }
  l.append(i);
  if (type === 'images' && Array.isArray(value) && value.length) {
    const wrap = el('div', 'thumbs');
    for (const u of value) { const t = el('label'); const im = el('img'); im.src = imgSrc(u); im.alt = ''; const c = el('input'); c.type = 'checkbox'; c.name = 'remove'; c.value = u; t.append(im, c, ' remove'); wrap.append(t); }
    const box = el('div'); box.append(l, el('span', 'hint', 'Current photos (tick to remove):'), wrap); box.style.display = 'grid'; box.style.gap = '6px';
    return box;
  }
  return l;
}
function fields(form, defs, values) {
  for (const d of defs) {
    if (Array.isArray(d[0])) { const p = el('div', 'pair'); d.forEach((f) => p.append(field(f, values?.[f[0]]))); form.append(p); }
    else form.append(field(d, values?.[d[0]]));
  }
}

function collectionView(view, name, editing) {
  const cfg = TABS[name];
  const form = el('form', 'f');
  form.append(el('h3', '', editing ? 'Edit' : 'Add new'));
  if (cfg.hint && !editing) form.append(el('p', 'hint', cfg.hint));
  fields(form, cfg.fields, editing);
  if (!editing && form.elements.date && name !== 'gallery') form.elements.date.value = new Date().toLocaleDateString('en-CA');
  const btns = el('div', 'btns'), go = el('button', 'btn green', editing ? 'Save changes' : 'Publish');
  btns.append(go);
  if (editing) { const c = el('button', 'btn plain', 'Cancel'); c.type = 'button'; c.onclick = () => start(); btns.append(c); }
  form.append(btns);
  form.onsubmit = async (e) => {
    e.preventDefault(); go.disabled = true; go.textContent = 'Uploading…';
    try {
      await api(`/api/${name}${editing ? '/' + editing.id : ''}`, { method: editing ? 'PUT' : 'POST', body: await formData(form) });
      flash(editing ? 'Saved' : 'Published'); start();
    } catch (err) { flash(err.message, true); go.disabled = false; go.textContent = editing ? 'Save changes' : 'Publish'; }
  };
  view.append(form);

  const items = name === 'events' || name === 'downloads' ? site[name] : [...site[name]].reverse();
  if (!items.length) view.append(el('p', 'muted', 'Nothing here yet.'));
  for (const it of items) {
    const row = el('div', 'item');
    const th = cfg.thumb && [].concat(it[cfg.thumb] || [])[0];
    if (th) { const im = el('img'); im.src = imgSrc(th); im.alt = ''; row.append(im); }
    const t = el('div', 't'); t.append(el('b', '', it[cfg.title + '_mr'] || it[cfg.title + '_en'] || '(no caption)'));
    if (cfg.sub && it[cfg.sub]) t.append(el('span', '', it[cfg.sub]));
    row.append(t);
    const eb = el('button', 'mini', 'Edit'); eb.type = 'button';
    eb.onclick = () => { view.textContent = ''; collectionView(view, name, it); scrollTo(0, 0); };
    const del = el('button', 'mini del', 'Delete'); del.type = 'button';
    del.onclick = async () => {
      if (!confirm('Delete this? This cannot be undone.')) return;
      try { await api(`/api/${name}/${it.id}`, { method: 'DELETE' }); flash('Deleted'); start(); } catch (err) { flash(err.message, true); }
    };
    row.append(eb, del); view.append(row);
  }
}

function settingsView(view) {
  const form = el('form', 'f');
  fields(form, SETTINGS, site.settings);
  form.append(el('button', 'btn green', 'Save'));
  form.onsubmit = async (e) => {
    e.preventDefault();
    try { await api('/api/settings', { method: 'PUT', body: await formData(form) }); flash('Saved'); scrollTo(0, 0); }
    catch (err) { flash(err.message, true); scrollTo(0, 0); }
  };
  view.append(form);
}

function passwordView(view) {
  const form = el('form', 'f');
  fields(form, [['current', 'Current password', 'password', 1], ['next', 'New password (at least 6 characters)', 'password', 1]]);
  form.append(el('button', 'btn green', 'Change password'));
  form.onsubmit = async (e) => {
    e.preventDefault();
    try { await api('/api/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ current: form.elements.current.value, next: form.elements.next.value }) }); flash('Password changed'); form.reset(); }
    catch (err) { flash(err.message, true); }
  };
  view.append(form);
}

fetch('/api/me').then((r) => r.json()).then((d) => (d.admin ? start() : showLogin()));
