// Shared helpers: sunflower mark + generated sample photos ("ph:N" image tokens in the sample content).
(() => {
  const petals = (n, rx, ry, d, fill) => Array.from({ length: n }, (_, i) => `<ellipse cx="50" cy="${50 - d}" rx="${rx}" ry="${ry}" fill="${fill}" transform="rotate(${(360 / n) * i} 50 50)"/>`).join('');
  window.sunflower = (petal = '#e3a814', petal2 = '#c98f0a', centre = '#4a3215') =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden="true">${petals(14, 7, 17, 29, petal2).replace(/rotate\(([\d.]+)/g, (m, a) => `rotate(${+a + 12.86}`)}${petals(14, 7.5, 18, 28, petal)}<circle cx="50" cy="50" r="17" fill="${centre}"/><circle cx="50" cy="50" r="11" fill="none" stroke="#000" stroke-opacity=".18" stroke-width="2" stroke-dasharray="1.5 3"/></svg>`;
  const PAL = [['#2c5a3a', '#9bb86a'], ['#b8860b', '#f3d573'], ['#3f6b4c', '#e9c95a'], ['#7c5b12', '#e6c56a'], ['#24503a', '#6f9a63'], ['#c79a1a', '#f7e7a8']];
  const cache = {};
  window.imgSrc = (u) => {
    if (!u || !u.startsWith('ph:')) return u;
    if (cache[u]) return cache[u];
    const n = +u.slice(3) || 0, [a, b] = PAL[n % PAL.length];
    const x = 60 + ((n * 97) % 280), y = 70 + ((n * 53) % 120), s = 0.9 + (n % 3) * 0.35;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="400" height="300" fill="url(#g)"/><path d="M0 ${230 - (n % 4) * 12} Q100 ${180 + (n % 5) * 8} 200 ${225 - (n % 3) * 10} T400 ${215 - (n % 4) * 6} V300 H0Z" fill="#fff" fill-opacity=".14"/><g transform="translate(${x} ${y}) scale(${s}) translate(-50 -50)" opacity=".55">${window.sunflower('#fff', '#fff', a).replace(/<\/?svg[^>]*>/g, '')}</g><text x="16" y="284" font-family="Arial, sans-serif" font-size="13" fill="#fff" fill-opacity=".85">Sample photo ${n}</text></svg>`;
    return (cache[u] = 'data:image/svg+xml,' + encodeURIComponent(svg));
  };
})();
