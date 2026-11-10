// Builds a single self-contained HTML file of the public site with the sample content baked in
// (no server, no admin). Usage: node scripts/build-preview.js [output.html]
const fs = require('fs');
const path = require('path');
const pub = (f) => fs.readFileSync(path.join(__dirname, '..', 'public', f), 'utf8');
const seed = require('../seed');
const byDateDesc = (a, b) => (b.date || '').localeCompare(a.date || '');
const site = { ...seed, events: [...seed.events].sort(byDateDesc), downloads: [...seed.downloads].sort(byDateDesc) };
const fonts = pub('index.html').match(/<link rel="stylesheet" href="https:\/\/fonts[^>]+>/)[0];
const out = `<title>NMV Primary Solapur</title>
<meta name="claude:viewport-fit-sides" content="cover">
${fonts}
<style>
${pub('styles.css')}
</style>
<div id="app"></div>
<script>window.__SITE__ = ${JSON.stringify(site).replace(/</g, '\\u003c')};</script>
<script>
${pub('ph.js')}
${pub('app.js')}
</script>
`;
const target = process.argv[2] || path.join(__dirname, '..', 'preview.html');
fs.writeFileSync(target, out);
console.log('Wrote', target, (out.length / 1024).toFixed(0) + ' KB');
