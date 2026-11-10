# नूतन मराठी विद्यालय (प्राथमिक), सोलापूर — School Website

An official display website for the school, in Marathi and English, with an admin panel for teachers.

## Public site (`/`)
Pages: Home, About (with Principal's message), Academics, Events (Recent / Calendar / Archive), Gallery, Teachers, Circulars (PDF downloads), Contact.
- Language toggle (Marathi is the default; the choice is remembered).
- Events older than 60 days move to the Archive automatically, browsable by academic year with search.

## Admin (`/admin/`)
Log in to manage events (multiple photos), gallery, notices, circulars (PDF), teachers, classes, school info and the password.
Every text has a Marathi and an English field; if only one is filled, it is shown in both languages.
Large phone photos are resized in the browser before upload.

## Run it
```bash
npm install
npm start          # http://localhost:3000
```
On first run a random admin password is printed in the terminal (or set `ADMIN_PASSWORD` before the first run).

## Notes
- The site starts with **sample content** from `seed.js`. Replace it in the admin panel, then untick "Show the sample content strip" in School info.
- Content lives in `data/db.json`, uploads in `uploads/` — both git-ignored, so **back them up**.
- Env vars: `PORT`, `ADMIN_PASSWORD`, `DATA_DIR`, `UPLOAD_DIR`.
- Hosting needs a Node host with a persistent disk (Render, Railway, Fly.io). GitHub Pages cannot run the admin.
- `node scripts/build-preview.js out.html` builds a single-file, read-only preview of the public site with the sample content.
