use std::{path::Path, sync::Mutex, time::Duration};

use rusqlite::Connection;

pub struct Database {
    pub connection: Mutex<Connection>,
}

fn ensure_document_font_column(connection: &Connection) -> Result<(), rusqlite::Error> {
    let has_document_font = {
        let mut statement = connection.prepare("PRAGMA table_info(firm_settings)")?;
        let columns = statement.query_map([], |row| row.get::<_, String>(1))?;
        let mut found = false;

        for column in columns {
            if column? == "document_font" {
                found = true;
                break;
            }
        }

        found
    };

    if !has_document_font {
        connection.execute(
            "
            ALTER TABLE firm_settings
            ADD COLUMN document_font TEXT NOT NULL DEFAULT 'times_new_roman'
                CHECK (document_font IN ('times_new_roman', 'georgia', 'arial', 'geist'))
            ",
            [],
        )?;
    }

    Ok(())
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

            CREATE TABLE IF NOT EXISTS firm_settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                company_name TEXT NOT NULL,
                owner_name TEXT,
                street TEXT,
                postal_code TEXT,
                city TEXT,
                tax_id TEXT,
                phone TEXT,
                email TEXT,
                document_font TEXT NOT NULL DEFAULT 'times_new_roman' CHECK (
                    document_font IN ('times_new_roman', 'georgia', 'arial', 'geist')
                ),
                stamp_data BLOB,
                stamp_mime TEXT CHECK (
                    stamp_mime IS NULL OR
                    stamp_mime IN ('image/png', 'image/jpeg', 'image/webp')
                ),
                updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
                CHECK (
                    (stamp_data IS NULL AND stamp_mime IS NULL) OR
                    (stamp_data IS NOT NULL AND stamp_mime IS NOT NULL)
                )
            );

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

        ensure_document_font_column(&connection)?;

        Ok(Self {
            connection: Mutex::new(connection),
        })
    }
}

#[cfg(test)]
mod tests {
    use rusqlite::{params, Connection};

    use super::ensure_document_font_column;

    #[test]
    fn adds_default_document_font_to_existing_firm_settings() {
        let connection = Connection::open_in_memory().expect("database should open");
        connection
            .execute_batch(
                "
                CREATE TABLE firm_settings (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    company_name TEXT NOT NULL
                );
                INSERT INTO firm_settings (id, company_name) VALUES (1, 'Cafe Serwis');
                ",
            )
            .expect("legacy settings should be created");

        ensure_document_font_column(&connection).expect("font column should be migrated");

        let (company_name, document_font): (String, String) = connection
            .query_row(
                "SELECT company_name, document_font FROM firm_settings WHERE id = ?1",
                params![1],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .expect("migrated settings should load");

        assert_eq!(company_name, "Cafe Serwis");
        assert_eq!(document_font, "times_new_roman");
    }
}
