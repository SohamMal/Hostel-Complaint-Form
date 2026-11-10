const $ = (s) => document.querySelector(s);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

const TABS = {
  events:  { label: 'Events',   title: 'title',   sub: 'date',  fields: [['title', 'Event name', 'text', 1], ['date', 'Date', 'date', 1], ['description', 'Details', 'textarea'], ['image', 'Photo', 'file']] },
  gallery: { label: 'Gallery',  title: 'caption', sub: null,    fields: [['image', 'Photo', 'file', 1], ['caption', 'Caption', 'text']] },
  notices: { label: 'News ticker', title: 'text', sub: null,    fields: [['text', 'Message (scrolls across the top)', 'text', 1]] },
  staff:   { label: 'Teachers', title: 'name',    sub: 'role',  fields: [['name', 'Name', 'text', 1], ['role', 'Role (e.g. Class 3 Teacher)', 'text'], ['bio', 'About them', 'textarea'], ['image', 'Photo', 'file']] },
  settings:{ label: 'School info' },
  password:{ label: 'Password' },
};

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

/* login */
function showLogin() { $('#login').hidden = false; $('#panel').hidden = true; }
$('#loginForm').onsubmit = async (e) => {
  e.preventDefault(); $('#loginErr').textContent = '';
  try {
    await api('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: $('#pw').value }) });
    $('#pw').value = ''; start();
  } catch (err) { $('#loginErr').textContent = err.message; }
};
$('#logout').onclick = async (e) => { e.preventDefault(); await fetch('/api/logout', { method: 'POST' }); showLogin(); };

/* panel */
let current = 'events', site;
async function start() {
  $('#login').hidden = true; $('#panel').hidden = false;
  site = await api('/api/site');
  const tabs = $('#tabs'); tabs.textContent = '';
  for (const k of Object.keys(TABS)) {
    const b = el('button', 'tab' + (k === current ? ' on' : ''), TABS[k].label);
    b.onclick = () => { current = k; start(); };
    tabs.append(b);
  }
  const view = $('#view'); view.textContent = '';
  if (current === 'settings') return settingsView(view);
  if (current === 'password') return passwordView(view);
  collectionView(view, current);
}

function field(f, value) {
  const [name, label, type, req] = f;
  const l = el('label', '', label + (req ? ' *' : ''));
  const i = el(type === 'textarea' ? 'textarea' : 'input');
  i.name = name;
  if (type === 'file') { i.type = 'file'; i.accept = 'image/jpeg,image/png,image/webp,image/gif'; l.append(el('span', 'hint', 'JPG/PNG/WEBP/GIF, up to 8 MB' + (value ? ' – leave empty to keep the current photo' : ''))); }
  else if (type !== 'textarea') i.type = type;
  if (type !== 'file' && value != null) i.value = value;
  if (req && !(type === 'file' && value)) i.required = true;
  l.append(i); return l;
}

function collectionView(view, name, editing) {
  const cfg = TABS[name];
  const form = el('form', 'f');
  form.append(el('h3', '', editing ? 'Edit' : 'Add new'));
  cfg.fields.forEach((f) => form.append(field(f, editing ? editing[f[0]] : null)));
  const btns = el('div', 'btns'); btns.append(el('button', 'btn small', editing ? 'Save changes' : 'Add'));
  if (editing) { const c = el('button', 'btn small ghost', 'Cancel'); c.type = 'button'; c.style.color = 'var(--ink)'; c.style.borderColor = 'var(--ink)'; c.onclick = () => start(); btns.append(c); }
  form.append(btns);
  form.onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api(`/api/${name}${editing ? '/' + editing.id : ''}`, { method: editing ? 'PUT' : 'POST', body: new FormData(form) });
      flash(editing ? 'Saved ✔' : 'Added ✔'); start();
    } catch (err) { flash(err.message, true); }
  };
  view.append(form);

  const items = [...site[name]].reverse();
  if (!items.length) view.append(el('p', 'muted', 'Nothing here yet.'));
  for (const it of items) {
    const row = el('div', 'row');
    if (it.image) { const im = el('img'); im.src = it.image; im.alt = ''; row.append(im); }
    const t = el('div', 't'); t.append(el('b', '', it[cfg.title] || '(no caption)'));
    if (cfg.sub && it[cfg.sub]) t.append(el('span', '', it[cfg.sub]));
    row.append(t);
    if (name !== 'gallery') { const eb = el('button', 'mini', 'Edit'); eb.onclick = () => { view.textContent = ''; collectionView(view, name, it); scrollTo(0, 0); }; row.append(eb); }
    const del = el('button', 'mini del', 'Delete');
    del.onclick = async () => {
      if (!confirm('Delete this? This cannot be undone.')) return;
      try { await api(`/api/${name}/${it.id}`, { method: 'DELETE' }); flash('Deleted'); start(); } catch (err) { flash(err.message, true); }
    };
    row.append(del); view.append(row);
  }
}

function settingsView(view) {
  const s = site.settings;
  const form = el('form', 'f');
  for (const [k, label, type] of [['name', 'School name'], ['tagline', 'Tagline (under the name)'], ['about', 'About the school', 'textarea'], ['address', 'Address'], ['phone', 'Phone'], ['email', 'Email']]) form.append(field([k, label, type || 'text'], s[k]));
  form.append(el('button', 'btn small', 'Save'));
  form.onsubmit = async (e) => {
    e.preventDefault();
    try { await api('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) }); flash('Saved ✔'); }
    catch (err) { flash(err.message, true); }
  };
  view.append(form);
}

function passwordView(view) {
  const form = el('form', 'f');
  form.append(field(['current', 'Current password', 'password', 1]), field(['next', 'New password (min 6 characters)', 'password', 1]), el('button', 'btn small', 'Change password'));
  form.onsubmit = async (e) => {
    e.preventDefault();
    try { await api('/api/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) }); flash('Password changed ✔'); form.reset(); }
    catch (err) { flash(err.message, true); }
  };
  view.append(form);
}

fetch('/api/me').then((r) => r.json()).then((d) => (d.admin ? start() : showLogin()));
