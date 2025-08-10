const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

// DB (file markers.db in project root)
const db = new Database(path.join(__dirname, 'markers.db'));

// Ensure table exists
db.exec(`
  CREATE TABLE IF NOT EXISTS markers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    note TEXT
  );
`);

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// API: get all markers
app.get('/api/markers', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM markers').all();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch markers' });
  }
});

// API: create marker
app.post('/api/markers', (req, res) => {
  const { lat, lng, note } = req.body;
  try {
    const stmt = db.prepare('INSERT INTO markers (lat, lng, note) VALUES (?, ?, ?)');
    const info = stmt.run(lat, lng, note || 'No note');
    res.json({ id: info.lastInsertRowid, lat, lng, note: note || 'No note' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add marker' });
  }
});

// API: update marker note
app.put('/api/markers/:id', (req, res) => {
  const { id } = req.params;
  const { note } = req.body;
  try {
    const stmt = db.prepare('UPDATE markers SET note = ? WHERE id = ?');
    const info = stmt.run(note, id);
    if (info.changes > 0) res.json({ success: true });
    else res.status(404).json({ error: 'Marker not found' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update marker' });
  }
});

// API: delete marker
app.delete('/api/markers/:id', (req, res) => {
  const { id } = req.params;
  try {
    const stmt = db.prepare('DELETE FROM markers WHERE id = ?');
    const info = stmt.run(id);
    if (info.changes > 0) res.json({ success: true });
    else res.status(404).json({ error: 'Marker not found' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete marker' });
  }
});

// Catch-all to serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
