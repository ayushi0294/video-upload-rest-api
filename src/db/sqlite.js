// src/db/sqlite.js
import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./videos.db');

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS videos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT,
            filepath TEXT,
            size INTEGER,
            duration INTEGER
        )
    `);
});

export default db;
