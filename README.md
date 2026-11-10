# School Website 🏫

A colourful display website for a primary school, with a simple admin panel for teachers.

**Public site** (`/`): news ticker, about, events, photo gallery with lightbox, teachers, and a Fun Corner (memory game + quiz).
**Admin** (`/admin/`): log in to add/edit/delete events, gallery photos, news ticker messages, teachers, school info, and change the password.

## Run it

```bash
npm install
npm start          # http://localhost:3000
```

On first run a random admin password is printed in the terminal (or set `ADMIN_PASSWORD` before first run). Change it in Admin → Password.

## Notes
- Content lives in `data/db.json`; uploaded photos in `uploads/`. **Back up both** (they are git-ignored).
- Env vars: `PORT`, `ADMIN_PASSWORD`, `DATA_DIR`, `UPLOAD_DIR`.
- To host it online you need a Node host with persistent disk (e.g. Render, Railway, Fly.io) – GitHub Pages cannot run the admin.
