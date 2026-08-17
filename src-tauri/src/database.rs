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
                status TEXT NOT NULL DEFAULT 'waiting_for_device',
                payload TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
                status_changed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
            );

            CREATE INDEX IF NOT EXISTS idx_service_requests_created_at
                ON service_requests(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_service_requests_status
                ON service_requests(status);

            UPDATE service_requests
            SET status = 'in_repair'
            WHERE status IN ('new', 'in_progress');
            ",
        )?;

        let has_status_changed_at = {
            let mut statement = connection.prepare("PRAGMA table_info(service_requests)")?;
            let columns = statement.query_map([], |row| row.get::<_, String>(1))?;
            let mut found = false;

            for column in columns {
                if column? == "status_changed_at" {
                    found = true;
                    break;
                }
            }

            found
        };

        if !has_status_changed_at {
            connection.execute(
                "ALTER TABLE service_requests ADD COLUMN status_changed_at TEXT",
                [],
            )?;
        }

        connection.execute(
            "UPDATE service_requests SET status_changed_at = created_at WHERE status_changed_at IS NULL",
            [],
        )?;

        Ok(Self {
            connection: Mutex::new(connection),
        })
    }
}
