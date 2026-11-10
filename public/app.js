const $ = (s) => document.querySelector(s);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

async function load() {
  const { settings: s, notices, events, gallery, staff } = await (await fetch('/api/site')).json();
  document.title = s.name;
  for (const id of ['navName', 'heroName', 'footName']) $('#' + id).textContent = s.name;
  $('#heroTag').textContent = s.tagline;
  $('#aboutText').textContent = s.about;
  $('#cAddr').textContent = 'Address: ' + s.address;
  $('#cPhone').textContent = 'Phone: ' + s.phone;
  $('#cMail').textContent = 'Email: ' + s.email;
  $('#year').textContent = new Date().getFullYear();

  if (notices.length) { $('#ticker').hidden = false; $('#tickerText').textContent = notices.map((n) => n.text).join('     •     '); }

  const today = new Date().toISOString().slice(0, 10);
  const eg = $('#eventsGrid');
  const ordered = [...events.filter((e) => e.date >= today), ...events.filter((e) => e.date < today).reverse()];
  if (!ordered.length) eg.append(el('p', 'empty', 'No events have been published yet.'));
  for (const e of ordered) {
    const c = el('div', 'card');
    if (e.image) { const i = el('img'); i.src = e.image; i.alt = e.title; i.loading = 'lazy'; c.append(i); }
    const b = el('div', 'body');
    b.append(el('span', 'date' + (e.date < today ? ' past' : ''), fmtDate(e.date)), el('h3', '', e.title), el('p', '', e.description || ''));
    c.append(b); eg.append(c);
  }

  const gg = $('#galleryGrid');
  if (!gallery.length) gg.append(el('p', 'empty', 'Photographs will be added soon.'));
  for (const g of [...gallery].reverse()) {
    const f = el('figure'); const i = el('img'); i.src = g.image; i.alt = g.caption || 'School photo'; i.loading = 'lazy';
    f.append(i); if (g.caption) f.append(el('figcaption', '', g.caption));
    f.onclick = () => openBox(g); gg.append(f);
  }

  const sg = $('#staffGrid');
  if (!staff.length) sg.append(el('p', 'empty', 'Staff details will be published soon.'));
  for (const t of staff) {
    const c = el('div', 'card');
    if (t.image) { const i = el('img', 'avatar'); i.src = t.image; i.alt = t.name; c.append(i); } else c.append(el('div', 'avatar', (t.name||'T')[0].toUpperCase()));
    const b = el('div', 'body'); b.append(el('h3', '', t.name), el('div', 'role', t.role || ''), el('p', 'muted', t.bio || ''));
    c.append(b); sg.append(c);
  }
}

/* lightbox */
const box = $('#lightbox');
function openBox(g) { box.querySelector('img').src = g.image; box.querySelector('p').textContent = g.caption || ''; box.hidden = false; }
box.onclick = () => (box.hidden = true);
document.addEventListener('keydown', (e) => e.key === 'Escape' && (box.hidden = true));

/* memory game */
const EMOJI = ['A','B','C','D','E','F','G','H'];
function memory() {
  const grid = $('#memory'); grid.textContent = ''; $('#moves').textContent = 0;
  const cards = [...EMOJI.slice(0, 8), ...EMOJI.slice(0, 8)].sort(() => Math.random() - 0.5);
  let first = null, lock = false, moves = 0, found = 0;
  cards.forEach((em) => {
    const t = el('button', 'tile', '?'); t.setAttribute('aria-label', 'card');
    t.onclick = () => {
      if (lock || t === first || t.classList.contains('done')) return;
      t.textContent = em; t.classList.add('open');
      if (!first) { first = t; return; }
      $('#moves').textContent = ++moves;
      if (first.textContent === em) {
        first.classList.add('done'); t.classList.add('done'); first = null;
        if (++found === 8) setTimeout(() => alert('Well done. Completed in ' + moves + ' moves.'), 300);
      } else {
        lock = true; const a = first; first = null;
        setTimeout(() => { for (const x of [a, t]) { x.textContent = '?'; x.classList.remove('open'); } lock = false; }, 700);
      }
    };
    grid.append(t);
  });
}
$('#memReset').onclick = memory;

/* quiz */
const QUIZ = [
  ['How many days are in a week?', ['5', '7', '10'], 1],
  ['What colour do you get mixing blue and yellow?', ['Green', 'Purple', 'Orange'], 0],
  ['Which animal says "Moo"?', ['Dog', 'Cow', 'Duck'], 1],
  ['How many legs does a spider have?', ['6', '8', '4'], 1],
  ['What is 7 + 5?', ['11', '12', '13'], 1],
  ['Which planet do we live on?', ['Mars', 'Venus', 'Earth'], 2],
  ['What do bees make?', ['Honey', 'Milk', 'Bread'], 0],
];
function quiz() {
  const root = $('#quiz'); const qs = [...QUIZ].sort(() => Math.random() - 0.5).slice(0, 5); let i = 0, score = 0;
  (function show() {
    root.textContent = '';
    if (i >= qs.length) {
      root.append(el('p', 'q', `You scored ${score} / ${qs.length} `));
      const b = el('button', 'btn small', 'Play again'); b.onclick = () => { i = 0; score = 0; quiz(); }; root.append(b); return;
    }
    const [q, opts, ans] = qs[i];
    root.append(el('p', 'muted', `Question ${i + 1} of ${qs.length}`), el('p', 'q', q));
    const wrap = el('div', 'opts');
    opts.forEach((o, n) => {
      const b = el('button', 'opt', o);
      b.onclick = () => {
        wrap.querySelectorAll('button').forEach((x) => (x.disabled = true));
        b.classList.add(n === ans ? 'right' : 'wrong');
        if (n === ans) score++; else wrap.children[ans].classList.add('right');
        setTimeout(() => { i++; show(); }, 900);
      };
      wrap.append(b);
    });
    root.append(wrap);
  })();
}
load(); memory(); quiz();
