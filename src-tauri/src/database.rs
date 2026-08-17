use std::{path::Path, sync::Mutex, time::Duration};

use rusqlite::Connection;

pub struct Database {
    pub connection: Mutex<Connection>,
}

impl Database {
    pub fn open(path: &Path) -> Result<Self, rusqlite::Error> {
        let connection = Connection::open(path)?;
        connection.busy_timeout(Duration::from_secs(5))?;
        connection.execute_batch(
            "
            PRAGMA foreign_keys = ON;
            PRAGMA journal_mode = WAL;

            CREATE TABLE IF NOT EXISTS service_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_name TEXT NOT NULL,
                client_phone TEXT,
                device_name TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'new',
                payload TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
            );

            CREATE INDEX IF NOT EXISTS idx_service_requests_created_at
                ON service_requests(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_service_requests_status
                ON service_requests(status);
            ",
        )?;

        Ok(Self {
            connection: Mutex::new(connection),
        })
    }
}
