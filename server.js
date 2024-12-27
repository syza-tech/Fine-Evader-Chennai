const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const Database = require('better-sqlite3');

// Initialize the app and database
const app = express();
const db = new Database('./data/markers.db');

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from 'public' folder

// Create the markers table if it doesn’t exist
db.exec(`
    CREATE TABLE IF NOT EXISTS markers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        note TEXT
    );
`);

// API: Get all markers
app.get('/api/markers', (req, res) => {
    try {
        const markers = db.prepare('SELECT * FROM markers').all();
        res.json(markers);
    } catch (error) {
        console.error('Error fetching markers:', error);
        res.status(500).json({ error: 'Failed to fetch markers' });
    }
});

// API: Add a new marker
app.post('/api/markers', (req, res) => {
    const { lat, lng, note } = req.body;
    try {
        const result = db.prepare('INSERT INTO markers (lat, lng, note) VALUES (?, ?, ?)').run(lat, lng, note || "No note");
        res.json({ id: result.lastInsertRowid, lat, lng, note });
    } catch (error) {
        console.error('Error adding marker:', error);
        res.status(500).json({ error: 'Failed to add marker' });
    }
});

// API: Edit a marker
app.put('/api/markers/:id', (req, res) => {
    const { id } = req.params;
    const { note } = req.body;

    try {
        const result = db.prepare('UPDATE markers SET note = ? WHERE id = ?').run(note, id);

        if (result.changes > 0) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Marker not found' });
        }
    } catch (error) {
        console.error('Error editing marker:', error);
        res.status(500).json({ error: 'Failed to edit marker' });
    }
});

// API: Delete a marker
app.delete('/api/markers/:id', (req, res) => {
    const { id } = req.params;

    try {
        const result = db.prepare('DELETE FROM markers WHERE id = ?').run(id);
        if (result.changes > 0) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Marker not found' });
        }
    } catch (error) {
        console.error('Error deleting marker:', error);
        res.status(500).json({ error: 'Failed to delete marker' });
    }
});

// Catch-all route to serve the frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
