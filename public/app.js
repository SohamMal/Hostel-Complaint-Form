(() => {
  const STATIC = !!window.__SITE__; // true in the shareable preview build (no server, no admin)
  const ROUTES = ['home', 'about', 'academics', 'events', 'archive', 'gallery', 'teachers', 'circulars', 'contact'];
  const RECENT_DAYS = 60; // events older than this move to the archive
  const T = {
    mr: {
      home: 'मुख्यपृष्ठ', about: 'शाळेविषयी', academics: 'शैक्षणिक', events: 'उपक्रम', archive: 'उपक्रम संग्रह', gallery: 'छायाचित्रे', teachers: 'शिक्षकवृंद', circulars: 'परिपत्रके', contact: 'संपर्क',
      menu: 'मेनू', other: 'English', news: 'सूचना', demo: 'नमुना आवृत्ती — येथील नावे, छायाचित्रे व माहिती तात्पुरती (नमुना) आहे.',
      latest: 'ताजे उपक्रम', allEvents: 'सर्व उपक्रम पहा', upcoming: 'आगामी', aboutBtn: 'शाळेविषयी', eventsBtn: 'ताजे उपक्रम',
      pMsg: 'मुख्याध्यापकांचे मनोगत', pRole: 'मुख्याध्यापिका', readMore: 'पुढे वाचा', quick: 'महत्त्वाचे दुवे',
      qAcad: 'इयत्ता व अभ्यासक्रम', qCirc: 'परिपत्रके, अर्ज व वेळापत्रके', qCont: 'पत्ता, दूरध्वनी व वेळ',
      aboutH: 'शाळेची ओळख', vision: 'दृष्टी', mission: 'ध्येय', classes: 'इयत्ता', acadH: 'अभ्यासक्रम',
      tabLatest: 'ताजे', tabCal: 'दिनदर्शिका', tabArchive: 'संग्रह', noEvents: 'अद्याप कोणतेही उपक्रम प्रकाशित केलेले नाहीत.', noMatch: 'काहीही आढळले नाही.',
      year: 'शैक्षणिक वर्ष', allYears: 'सर्व वर्षे', search: 'उपक्रम शोधा…', photos: 'छायाचित्रे', all: 'सर्व', monthNone: 'या महिन्यात उपक्रम नाहीत.',
      noPhotos: 'छायाचित्रे लवकरच उपलब्ध होतील.', noStaff: 'माहिती लवकरच उपलब्ध होईल.', noDocs: 'अद्याप कोणतेही दस्तऐवज नाहीत.',
      open: 'PDF उघडा', sample: 'नमुना', cat_circular: 'परिपत्रक', cat_form: 'अर्ज', cat_timetable: 'वेळापत्रक', cat_result: 'निकाल', cat_other: 'इतर',
      address: 'पत्ता', phone: 'दूरध्वनी', email: 'ई-मेल', hours: 'शाळेची वेळ', map: 'Google Maps वर पहा', staffLogin: 'कर्मचारी लॉगिन', rights: 'सर्व हक्क राखीव', close: 'बंद करा', prev: 'मागील', next: 'पुढील',
    },
    en: {
      home: 'Home', about: 'About', academics: 'Academics', events: 'Events', archive: 'Events Archive', gallery: 'Gallery', teachers: 'Teachers', circulars: 'Circulars', contact: 'Contact',
      menu: 'Menu', other: 'मराठी', news: 'Notices', demo: 'Preview version — names, photographs and details shown here are sample content.',
      latest: 'Recent Events', allEvents: 'View all events', upcoming: 'Upcoming', aboutBtn: 'About the school', eventsBtn: 'Recent events',
      pMsg: "Principal's Message", pRole: 'Head Teacher', readMore: 'Read more', quick: 'Quick Links',
      qAcad: 'Classes and curriculum', qCirc: 'Circulars, forms and timetables', qCont: 'Address, phone and timings',
      aboutH: 'About the School', vision: 'Vision', mission: 'Mission', classes: 'Classes', acadH: 'Curriculum',
      tabLatest: 'Recent', tabCal: 'Calendar', tabArchive: 'Archive', noEvents: 'No events have been published yet.', noMatch: 'Nothing found.',
      year: 'Academic year', allYears: 'All years', search: 'Search events…', photos: 'photos', all: 'All', monthNone: 'No events this month.',
      noPhotos: 'Photographs will be added soon.', noStaff: 'Details will be published soon.', noDocs: 'No documents yet.',
      open: 'Open PDF', sample: 'Sample', cat_circular: 'Circular', cat_form: 'Form', cat_timetable: 'Timetable', cat_result: 'Result', cat_other: 'Other',
      address: 'Address', phone: 'Phone', email: 'Email', hours: 'School hours', map: 'View on Google Maps', staffLogin: 'Staff login', rights: 'All rights reserved', close: 'Close', prev: 'Previous', next: 'Next',
    },
  };

  let site, lang = 'mr', route = 'home';
  const ui = { tab: 'latest', calMonth: null, year: '', q: '', galYear: '', cat: '' };
  try { lang = localStorage.getItem('lang') === 'en' ? 'en' : 'mr'; } catch {}

  /* ---------- helpers ---------- */
  const t = (k) => T[lang][k] ?? T.en[k] ?? k;
  const L = (o, k) => (o && (o[k + '_' + lang] || o[k + '_' + (lang === 'mr' ? 'en' : 'mr')])) || '';
  const loc = () => (lang === 'mr' ? 'mr-IN' : 'en-IN');
  const num = (n) => new Intl.NumberFormat(loc(), { useGrouping: false }).format(n);
  const toDate = (s) => new Date(s + 'T00:00:00');
  const fmt = (s, o = { day: 'numeric', month: 'long', year: 'numeric' }) => (s ? toDate(s).toLocaleDateString(loc(), o) : '');
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = iso(new Date());
  const cutoff = (() => { const d = new Date(); d.setDate(d.getDate() - RECENT_DAYS); return iso(d); })();
  const acadYear = (s) => { const d = toDate(s); return d.getMonth() >= 5 ? d.getFullYear() : d.getFullYear() - 1; }; // June–May
  const yearLabel = (y) => `${num(y)}–${num((y + 1) % 100).padStart(2, num(0))}`;

  function h(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v; // only ever used with our own SVG markup
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat(Infinity)) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(c));
    return e;
  }
  const paras = (text) => h('div', { class: 'prose' }, String(text || '').split(/\n\s*\n/).filter(Boolean).map((p) => h('p', null, p)));
  const img = (u, alt) => h('img', { src: window.imgSrc(u), alt: alt || '', loading: 'lazy' });
  const avatar = (photo, name) => (photo ? h('img', { class: 'avatar', src: window.imgSrc(photo), alt: name }) : h('div', { class: 'avatar', 'aria-hidden': 'true' }, (name.replace(/^(श्री|सौ|श्रीमती|कु|Mr|Mrs|Ms|Miss)\.?\s*/u, '') || name).slice(0, 1)));
  const head = (title, more) => h('div', { class: 'head' }, h('h2', null, title), more);
  const banner = (title, cls) => h('section', { class: 'banner ' + (cls || '') }, h('div', { class: 'in' }, h('div', { class: 'wm', html: window.sunflower('#fff', '#fff', '#234a30') }), title));

  /* ---------- shared pieces ---------- */
  function eventCard(e) {
    const pics = e.images || [];
    return h('button', { class: 'event', type: 'button', onclick: () => openEvent(e) },
      h('div', { class: 'pic' }, pics[0] && img(pics[0], L(e, 'title')), pics.length > 1 && h('span', { class: 'count' }, `${num(pics.length)} ${t('photos')}`)),
      h('div', { class: 'body' },
        h('span', { class: 'date' }, fmt(e.date), e.date > today && h('span', { class: 'badge' }, t('upcoming'))),
        h('h3', null, L(e, 'title')), h('p', { class: 'clamp' }, L(e, 'description'))));
  }
  function overlay(cls, build) {
    const prev = document.activeElement;
    const close = () => { o.remove(); document.removeEventListener('keydown', key); prev?.focus?.(); };
    const key = (ev) => { if (ev.key === 'Escape') close(); else o.onkey?.(ev); };
    const o = h('div', { class: cls, role: 'dialog', 'aria-modal': 'true', onclick: (ev) => ev.target === o && close() });
    build(o, close);
    document.addEventListener('keydown', key);
    document.body.append(o);
    o.querySelector('.close')?.focus();
    return o;
  }
  function openEvent(e) {
    const pics = (e.images || []).map((u) => ({ src: u, caption: L(e, 'title') }));
    overlay('over', (o, close) => o.append(h('div', { class: 'sheet' },
      h('button', { class: 'close', type: 'button', 'aria-label': t('close'), onclick: close }, '✕'),
      h('span', { class: 'date' }, fmt(e.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })),
      h('h2', null, L(e, 'title')), paras(L(e, 'description')),
      pics.length ? h('div', { class: 'gal' }, pics.map((p, i) => h('button', { type: 'button', onclick: () => lightbox(pics, i) }, img(p.src, p.caption)))) : null)));
  }
  function lightbox(items, i) {
    overlay('light', (o, close) => {
      const pic = h('img', { alt: '' }), cap = h('figcaption');
      const show = (n) => { i = (n + items.length) % items.length; pic.src = window.imgSrc(items[i].src); pic.alt = items[i].caption || ''; cap.textContent = items[i].caption || ''; };
      const many = items.length > 1;
      o.append(
        h('button', { type: 'button', 'aria-label': t('prev'), onclick: () => show(i - 1), style: many ? null : 'visibility:hidden' }, '‹'),
        h('figure', null, pic, cap),
        h('button', { type: 'button', 'aria-label': t('next'), onclick: () => show(i + 1), style: many ? null : 'visibility:hidden' }, '›'),
        h('button', { class: 'close', type: 'button', 'aria-label': t('close'), onclick: close }, '✕'));
      o.onkey = (ev) => { if (ev.key === 'ArrowLeft') show(i - 1); if (ev.key === 'ArrowRight') show(i + 1); };
      show(i);
    });
  }
  const principalBox = (s, full) => h('div', { class: 'principal' },
    h('div', { class: 'who' }, avatar(s.principal_photo, L(s, 'principal_name')), h('b', null, L(s, 'principal_name')), h('span', null, t('pRole'))),
    h('div', { class: 'stack' }, full ? paras(L(s, 'principal_message')) : [paras(L(s, 'principal_message').split(/\n\s*\n/).slice(0, 2).join('\n\n')), h('a', { class: 'more', href: '#about' }, t('readMore') + ' →')]));
  function docRow(d) {
    return h('div', { class: 'row' }, h('span', { class: 'date' }, fmt(d.date)),
      h('span', { class: 't' }, L(d, 'title'), h('span', { class: 'cat' }, t('cat_' + (d.category || 'other')))),
      d.file ? h('a', { href: d.file, target: '_blank', rel: 'noopener' }, t('open')) : h('span', { class: 'na' }, t('sample')));
  }

  /* ---------- pages ---------- */
  const pages = {
    home(s) {
      const recent = site.events.slice(0, 3);
      return [
        h('section', { class: 'banner hero' }, h('div', { class: 'in' },
          h('div', { class: 'wm', html: window.sunflower('#f1c232', '#d9a514', '#16321f') }),
          h('p', { class: 'place' }, L(s, 'place')), h('h1', null, L(s, 'name')), h('p', { class: 'tag' }, L(s, 'tagline')),
          h('div', { class: 'btns' }, h('a', { class: 'btn', href: '#events' }, t('eventsBtn')), h('a', { class: 'btn line', href: '#about' }, t('aboutBtn'))))),
        h('div', { class: 'in' },
          h('section', { class: 'sec' }, head(t('latest'), h('a', { class: 'more', href: '#events' }, t('allEvents') + ' →')),
            recent.length ? h('div', { class: 'grid' }, recent.map(eventCard)) : h('p', { class: 'empty' }, t('noEvents'))),
          h('section', { class: 'sec' }, head(t('pMsg')), principalBox(s, false)),
          h('section', { class: 'sec two' },
            h('div', null, head(t('circulars'), h('a', { class: 'more', href: '#circulars' }, t('all') + ' →')), h('div', { class: 'rows', style: 'margin-top:0' }, site.downloads.slice(0, 3).map(docRow))),
            h('div', null, head(t('quick')), h('div', { class: 'links', style: 'grid-template-columns:1fr' },
              [['academics', 'qAcad'], ['circulars', 'qCirc'], ['contact', 'qCont']].map(([r, d]) => h('a', { href: '#' + r }, h('b', null, t(r)), h('span', null, t(d)))))))),
      ];
    },
    about(s) {
      return [banner(h('h1', null, t('aboutH'))), h('div', { class: 'in' },
        h('section', { class: 'sec' }, paras(L(s, 'about'))),
        h('section', { class: 'sec two' }, h('div', { class: 'panel' }, h('h3', null, t('vision')), h('p', null, L(s, 'vision'))), h('div', { class: 'panel' }, h('h3', null, t('mission')), h('p', null, L(s, 'mission')))),
        h('section', { class: 'sec' }, head(t('pMsg')), principalBox(s, true)))];
    },
    academics(s) {
      return [banner(h('h1', null, t('academics'))), h('div', { class: 'in' },
        h('section', { class: 'sec' }, head(t('acadH')), paras(L(s, 'academics'))),
        h('section', { class: 'sec' }, head(t('classes')), h('div', { class: 'cls' }, site.classes.map((c) => h('div', { class: 'panel' }, h('h3', null, L(c, 'name')), h('p', { class: 'muted' }, L(c, 'description')))))))];
    },
    events() { return eventsPage(ui.tab === 'calendar' ? 'calendar' : 'latest'); },
    archive() { return eventsPage('archive'); },
    gallery() {
      const years = [...new Set(site.gallery.filter((g) => g.date).map((g) => acadYear(g.date)))].sort((a, b) => b - a);
      const list = [...site.gallery].reverse().filter((g) => !ui.galYear || (g.date && acadYear(g.date) === +ui.galYear));
      const items = list.map((g) => ({ src: g.image, caption: L(g, 'caption') }));
      const chip = (v, label) => h('button', { class: 'chip' + (String(ui.galYear) === String(v) ? ' on' : ''), type: 'button', onclick: () => { ui.galYear = v; render(true); } }, label);
      return [banner(h('h1', null, t('gallery'))), h('div', { class: 'in' }, h('section', { class: 'sec' },
        years.length > 1 && h('div', { class: 'chips' }, chip('', t('all')), years.map((y) => chip(y, yearLabel(y)))),
        list.length ? h('div', { class: 'gal' }, items.map((p, i) => h('button', { type: 'button', onclick: () => lightbox(items, i) }, img(p.src, p.caption), p.caption && h('span', null, p.caption)))) : h('p', { class: 'empty' }, t('noPhotos'))))];
    },
    teachers() {
      return [banner(h('h1', null, t('teachers'))), h('div', { class: 'in' }, h('section', { class: 'sec' },
        site.staff.length ? h('div', { class: 'staff' }, site.staff.map((p) => h('div', { class: 'panel' }, avatar(p.image, L(p, 'name')), h('h3', null, L(p, 'name')), h('p', { class: 'role' }, L(p, 'role')), h('p', { class: 'muted' }, L(p, 'bio'))))) : h('p', { class: 'empty' }, t('noStaff'))))];
    },
    circulars() {
      const cats = ['circular', 'form', 'timetable', 'result', 'other'].filter((c) => site.downloads.some((d) => (d.category || 'other') === c));
      const list = site.downloads.filter((d) => !ui.cat || (d.category || 'other') === ui.cat);
      const chip = (v, label) => h('button', { class: 'chip' + (ui.cat === v ? ' on' : ''), type: 'button', onclick: () => { ui.cat = v; render(true); } }, label);
      return [banner(h('h1', null, t('circulars'))), h('div', { class: 'in' }, h('section', { class: 'sec' },
        cats.length > 1 && h('div', { class: 'chips' }, chip('', t('all')), cats.map((c) => chip(c, t('cat_' + c)))),
        list.length ? h('div', { class: 'rows', style: 'margin-top:0' }, list.map(docRow)) : h('p', { class: 'empty' }, t('noDocs'))))];
    },
    contact(s) {
      const q = encodeURIComponent(`${s.name_en}, ${s.address_en}`);
      return [banner(h('h1', null, t('contact'))), h('div', { class: 'in' }, h('section', { class: 'sec two' },
        h('div', { class: 'panel' }, h('dl', { class: 'kv' },
          h('dt', null, t('address')), h('dd', null, L(s, 'address')), h('dt', null, t('phone')), h('dd', null, s.phone),
          h('dt', null, t('email')), h('dd', null, s.email), h('dt', null, t('hours')), h('dd', null, L(s, 'hours'))),
          h('p', { style: 'margin-top:18px' }, h('a', { class: 'btn green', href: 'https://www.google.com/maps/search/?api=1&query=' + q, target: '_blank', rel: 'noopener' }, t('map')))),
        STATIC ? null : h('iframe', { class: 'map', title: 'Map', loading: 'lazy', src: `https://www.google.com/maps?q=${q}&output=embed` })))];
    },
  };

  function eventsPage(tab) {
    const tabs = h('div', { class: 'tabs' },
      h('a', { href: '#events', class: tab === 'latest' ? 'on' : '', onclick: () => { ui.tab = 'latest'; if (route === 'events') render(true); } }, t('tabLatest')),
      h('a', { href: '#events', class: tab === 'calendar' ? 'on' : '', onclick: () => { ui.tab = 'calendar'; if (route === 'events') render(true); } }, t('tabCal')),
      h('a', { href: '#archive', class: tab === 'archive' ? 'on' : '' }, t('tabArchive')));
    let body;
    if (tab === 'latest') {
      const list = site.events.filter((e) => e.date >= cutoff);
      body = list.length ? h('div', { class: 'grid' }, list.map(eventCard)) : h('p', { class: 'empty' }, t('noEvents'));
    } else if (tab === 'calendar') body = calendar();
    else {
      const old = site.events.filter((e) => e.date < cutoff);
      const years = [...new Set(old.map((e) => acadYear(e.date)))].sort((a, b) => b - a);
      const q = ui.q.trim().toLowerCase();
      const list = old.filter((e) => (!ui.year || acadYear(e.date) === +ui.year) && (!q || [e.title_mr, e.title_en, e.description_mr, e.description_en].join(' ').toLowerCase().includes(q)));
      const results = h('div', null, list.length ? h('div', { class: 'grid' }, list.map(eventCard)) : h('p', { class: 'empty' }, old.length ? t('noMatch') : t('noEvents')));
      const sel = h('select', { id: 'arch-year', 'aria-label': t('year'), onchange: (ev) => { ui.year = ev.target.value; render(true); } },
        h('option', { value: '' }, t('allYears')), years.map((y) => h('option', { value: y, selected: String(ui.year) === String(y) }, `${t('year')} ${yearLabel(y)}`)));
      const box = h('input', { id: 'arch-q', type: 'search', placeholder: t('search'), 'aria-label': t('search'), value: ui.q,
        oninput: (ev) => { ui.q = ev.target.value; render(true); const n = document.getElementById('arch-q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); } });
      body = [h('div', { class: 'filters' }, sel, box), results];
    }
    return [banner(h('h1', null, tab === 'archive' ? t('archive') : t('events'))), h('div', { class: 'in' }, h('section', { class: 'sec' }, tabs, body))];
  }

  function calendar() {
    if (!ui.calMonth) ui.calMonth = today.slice(0, 7);
    const [y, m] = ui.calMonth.split('-').map(Number);
    const first = new Date(y, m - 1, 1), days = new Date(y, m, 0).getDate();
    const inMonth = site.events.filter((e) => e.date.startsWith(ui.calMonth)).sort((a, b) => a.date.localeCompare(b.date));
    const move = (n) => { ui.calMonth = iso(new Date(y, m - 1 + n, 1)).slice(0, 7); render(true); };
    const cells = [];
    for (let i = 0; i < 7; i++) cells.push(h('div', { class: 'dn' }, new Date(2024, 0, 7 + i).toLocaleDateString(loc(), { weekday: 'short' }))); // 7 Jan 2024 is a Sunday
    for (let i = 0; i < first.getDay(); i++) cells.push(h('div', { class: 'd x' }));
    for (let d = 1; d <= days; d++) {
      const key = `${ui.calMonth}-${String(d).padStart(2, '0')}`, ev = inMonth.find((e) => e.date === key), cls = 'd' + (key === today ? ' today' : '');
      cells.push(ev ? h('button', { class: cls, type: 'button', title: L(ev, 'title'), onclick: () => openEvent(ev) }, num(d)) : h('div', { class: cls }, num(d)));
    }
    return h('div', { class: 'cal' },
      h('div', { class: 'bar' }, h('button', { type: 'button', 'aria-label': t('prev'), onclick: () => move(-1) }, '‹'), h('b', null, first.toLocaleDateString(loc(), { month: 'long', year: 'numeric' })), h('button', { type: 'button', 'aria-label': t('next'), onclick: () => move(1) }, '›')),
      h('div', { class: 'days' }, cells),
      h('div', { class: 'rows' }, inMonth.length ? inMonth.map((e) => h('button', { class: 'row', type: 'button', onclick: () => openEvent(e) }, h('span', { class: 'date' }, fmt(e.date)), h('span', { class: 't' }, L(e, 'title')), h('span', { class: 'more' }, '→'))) : h('p', { class: 'empty' }, t('monthNone'))));
  }

  /* ---------- shell ---------- */
  const NAV = ['home', 'about', 'academics', 'events', 'gallery', 'teachers', 'circulars', 'contact'];
  function render(keepScroll) {
    const s = site.settings, app = document.getElementById('app');
    document.documentElement.lang = lang;
    if (!STATIC) document.title = `${L(s, 'name')}, ${L(s, 'place')}`;
    const active = route === 'archive' ? 'events' : route;
    const menu = h('nav', { class: 'menu', id: 'menu' }, NAV.map((r) => h('a', { href: '#' + r, class: r === active ? 'on' : '', 'aria-current': r === active ? 'page' : null }, t(r))));
    app.replaceChildren(
      s.demo ? h('div', { class: 'demo' }, h('div', { class: 'in' }, t('demo'))) : '',
      site.notices.length ? h('div', { class: 'ticker' }, h('div', { class: 'in' }, h('b', null, t('news')), h('div', { class: 'track' }, h('div', null, site.notices.map((n) => L(n, 'text')).join('   •   '))))) : '',
      h('header', { class: 'mast' }, h('div', { class: 'in' },
        h('a', { class: 'brand', href: '#home' }, h('span', { html: window.sunflower(), style: 'display:contents' }), h('div', null, h('strong', null, L(s, 'name')), h('span', null, L(s, 'place')))),
        h('button', { class: 'lang', type: 'button', onclick: () => { lang = lang === 'mr' ? 'en' : 'mr'; try { localStorage.setItem('lang', lang); } catch {} render(true); } }, t('other')),
        h('button', { class: 'burger', type: 'button', 'aria-controls': 'menu', onclick: () => menu.classList.toggle('open') }, t('menu')),
        menu)),
      h('main', null, pages[route](s)),
      h('footer', { class: 'foot' }, h('div', { class: 'in' },
        h('div', { class: 'cols' },
          h('div', null, h('h3', null, L(s, 'name')), h('p', null, L(s, 'address'))),
          h('div', null, h('h3', null, t('contact')), h('p', null, `${t('phone')}: ${s.phone}`), h('p', null, `${t('email')}: ${s.email}`), h('p', null, L(s, 'hours'))),
          h('nav', { 'aria-label': t('quick') }, h('h3', null, t('quick')), ['about', 'events', 'circulars', 'contact'].map((r) => h('a', { href: '#' + r }, t(r))))),
        h('div', { class: 'fine' }, h('span', null, `© ${num(new Date().getFullYear())} ${L(s, 'name')} · ${t('rights')}`), STATIC ? null : h('a', { href: '/admin/' }, t('staffLogin'))))));
    if (!keepScroll) window.scrollTo(0, 0);
  }
  function onHash() {
    const r = location.hash.slice(1);
    const next = ROUTES.includes(r) ? r : 'home';
    document.querySelectorAll('.over,.light').forEach((n) => n.remove());
    route = next;
    render();
  }
  window.addEventListener('hashchange', onHash);
  (async () => {
    site = window.__SITE__ || (await (await fetch('/api/site')).json());
    onHash();
  })();
})();
