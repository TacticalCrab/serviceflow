use rusqlite::{params, Connection, OptionalExtension};
use tauri::State;

use crate::{
    database::Database,
    models::{NewServiceRequest, ServiceRequest},
};

const SERVICE_STATUSES: [&str; 8] = [
    "waiting_for_device",
    "diagnosis",
    "waiting_for_approval",
    "in_repair",
    "waiting_for_parts",
    "ready_for_return",
    "closed",
    "cancelled",
];

fn validate_request(request: &NewServiceRequest) -> Result<(), String> {
    if request.client.name.trim().is_empty() {
        return Err("Imię klienta jest wymagane".into());
    }

    if request.device.name.trim().is_empty() {
        return Err("Nazwa urządzenia jest wymagana".into());
    }

    if request.cost_estimate.is_some_and(|cost| cost < 0.0) {
        return Err("Szacowany koszt nie może być ujemny".into());
    }

    if let Some(costs) = &request.additional_costs {
        if costs
            .iter()
            .any(|cost| cost.description.trim().is_empty() || cost.price < 0.0)
        {
            return Err("Dodatkowe koszty zawierają nieprawidłowe dane".into());
        }
    }

    Ok(())
}

fn deserialize_request(
    id: i64,
    status: String,
    created_at: String,
    status_changed_at: String,
    payload: String,
) -> Result<ServiceRequest, String> {
    let request = serde_json::from_str(&payload)
        .map_err(|error| format!("Nie udało się odczytać danych zlecenia: {error}"))?;

    Ok(ServiceRequest {
        id,
        status,
        created_at,
        status_changed_at,
        request,
    })
}

fn find_by_id(connection: &Connection, id: i64) -> Result<Option<ServiceRequest>, String> {
    let row = connection
        .query_row(
            "SELECT id, status, created_at, status_changed_at, payload FROM service_requests WHERE id = ?1",
            [id],
            |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, String>(4)?,
                ))
            },
        )
        .optional()
        .map_err(|error| format!("Nie udało się pobrać zlecenia: {error}"))?;

    row.map(|(id, status, created_at, status_changed_at, payload)| {
        deserialize_request(id, status, created_at, status_changed_at, payload)
    })
    .transpose()
}

fn insert_request(
    connection: &Connection,
    request: NewServiceRequest,
) -> Result<ServiceRequest, String> {
    validate_request(&request)?;

    let payload = serde_json::to_string(&request)
        .map_err(|error| format!("Nie udało się przygotować zlecenia: {error}"))?;

    connection
        .execute(
            "
            INSERT INTO service_requests (
                client_name,
                client_phone,
                device_name,
                status,
                payload
            ) VALUES (?1, ?2, ?3, 'waiting_for_device', ?4)
            ",
            params![
                request.client.name.trim(),
                request.client.phone.as_deref(),
                request.device.name.trim(),
                payload,
            ],
        )
        .map_err(|error| format!("Nie udało się zapisać zlecenia: {error}"))?;

    let id = connection.last_insert_rowid();
    find_by_id(connection, id)?.ok_or_else(|| "Nie odnaleziono zapisanego zlecenia".into())
}

fn update_request(
    connection: &Connection,
    id: i64,
    request: NewServiceRequest,
) -> Result<ServiceRequest, String> {
    validate_request(&request)?;

    let payload = serde_json::to_string(&request)
        .map_err(|error| format!("Nie udało się przygotować zlecenia: {error}"))?;
    let changed = connection
        .execute(
            "
            UPDATE service_requests
            SET client_name = ?1,
                client_phone = ?2,
                device_name = ?3,
                payload = ?4
            WHERE id = ?5
            ",
            params![
                request.client.name.trim(),
                request.client.phone.as_deref(),
                request.device.name.trim(),
                payload,
                id,
            ],
        )
        .map_err(|error| format!("Nie udało się zaktualizować zlecenia: {error}"))?;

    if changed == 0 {
        return Err(format!("Nie znaleziono zlecenia #{id}"));
    }

    find_by_id(connection, id)?.ok_or_else(|| "Nie odnaleziono zaktualizowanego zlecenia".into())
}

fn close_request(connection: &Connection, id: i64) -> Result<ServiceRequest, String> {
    update_request_status(connection, id, "closed")
}

fn update_request_status(
    connection: &Connection,
    id: i64,
    status: &str,
) -> Result<ServiceRequest, String> {
    if !SERVICE_STATUSES.contains(&status) {
        return Err(format!("Nieprawidłowy status zlecenia: {status}"));
    }

    connection
        .execute(
            "
            UPDATE service_requests
            SET status = ?1,
                status_changed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
            WHERE id = ?2
            ",
            params![status, id],
        )
        .map_err(|error| format!("Nie udało się zmienić statusu zlecenia: {error}"))?;

    find_by_id(connection, id)?.ok_or_else(|| format!("Nie znaleziono zlecenia #{id}"))
}

fn reopen_request(connection: &Connection, id: i64) -> Result<ServiceRequest, String> {
    update_request_status(connection, id, "in_repair")
}

fn find_all(connection: &Connection) -> Result<Vec<ServiceRequest>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT id, status, created_at, status_changed_at, payload
            FROM service_requests
            ORDER BY created_at DESC, id DESC
            ",
        )
        .map_err(|error| format!("Nie udało się przygotować listy zleceń: {error}"))?;
    let rows = statement
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
            ))
        })
        .map_err(|error| format!("Nie udało się pobrać listy zleceń: {error}"))?;

    let mut requests = Vec::new();
    for row in rows {
        let (id, status, created_at, status_changed_at, payload) =
            row.map_err(|error| format!("Nie udało się odczytać zlecenia: {error}"))?;
        requests.push(deserialize_request(
            id,
            status,
            created_at,
            status_changed_at,
            payload,
        )?);
    }

    Ok(requests)
}

#[tauri::command]
pub fn create_service_request(
    request: NewServiceRequest,
    database: State<'_, Database>,
) -> Result<ServiceRequest, String> {
    let connection = database
        .connection
        .lock()
        .map_err(|_| "Baza danych jest chwilowo niedostępna".to_string())?;

    insert_request(&connection, request)
}

#[tauri::command]
pub fn list_service_requests(database: State<'_, Database>) -> Result<Vec<ServiceRequest>, String> {
    let connection = database
        .connection
        .lock()
        .map_err(|_| "Baza danych jest chwilowo niedostępna".to_string())?;

    find_all(&connection)
}

#[tauri::command]
pub fn update_service_request(
    id: i64,
    request: NewServiceRequest,
    database: State<'_, Database>,
) -> Result<ServiceRequest, String> {
    let connection = database
        .connection
        .lock()
        .map_err(|_| "Baza danych jest chwilowo niedostępna".to_string())?;

    update_request(&connection, id, request)
}

#[tauri::command]
pub fn close_service_request(
    id: i64,
    database: State<'_, Database>,
) -> Result<ServiceRequest, String> {
    let connection = database
        .connection
        .lock()
        .map_err(|_| "Baza danych jest chwilowo niedostępna".to_string())?;

    close_request(&connection, id)
}

#[tauri::command]
pub fn reopen_service_request(
    id: i64,
    database: State<'_, Database>,
) -> Result<ServiceRequest, String> {
    let connection = database
        .connection
        .lock()
        .map_err(|_| "Baza danych jest chwilowo niedostępna".to_string())?;

    reopen_request(&connection, id)
}

#[tauri::command]
pub fn update_service_request_status(
    id: i64,
    status: String,
    database: State<'_, Database>,
) -> Result<ServiceRequest, String> {
    let connection = database
        .connection
        .lock()
        .map_err(|_| "Baza danych jest chwilowo niedostępna".to_string())?;

    update_request_status(&connection, id, &status)
}

#[tauri::command]
pub fn get_service_request(
    id: i64,
    database: State<'_, Database>,
) -> Result<Option<ServiceRequest>, String> {
    let connection = database
        .connection
        .lock()
        .map_err(|_| "Baza danych jest chwilowo niedostępna".to_string())?;

    find_by_id(&connection, id)
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    use super::{
        close_request, find_all, insert_request, reopen_request, update_request,
        update_request_status,
    };
    use crate::{
        database::Database,
        models::{Client, Device, NewServiceRequest},
    };

    fn sample_request() -> NewServiceRequest {
        NewServiceRequest {
            client: Client {
                name: "Anna".into(),
                surname: Some("Nowak".into()),
                phone: Some("123456789".into()),
                email: None,
                address: None,
                preferences: None,
            },
            device: Device {
                name: "Ekspres".into(),
                model: Some("Cafe Pro".into()),
                defect: Some("Nie podgrzewa wody".into()),
            },
            repair_time: Some("2 dni".into()),
            repair_steps: Some(vec!["Diagnostyka".into()]),
            additional_costs: Some(vec![]),
            cost_estimate: Some(250.0),
        }
    }

    #[test]
    fn stores_and_reads_service_requests() {
        let database = Database::open(Path::new(":memory:")).expect("database should initialize");
        let connection = database.connection.lock().expect("database should lock");

        let created = insert_request(&connection, sample_request()).expect("request should save");
        let requests = find_all(&connection).expect("requests should load");

        assert_eq!(created.id, 1);
        assert_eq!(created.status, "waiting_for_device");
        let serialized = serde_json::to_value(&created).expect("request should serialize");
        assert!(serialized["client"].get("email").is_none());
        assert!(serialized["client"].get("address").is_none());
        assert_eq!(requests.len(), 1);
        assert_eq!(requests[0].request.client.name, "Anna");
        assert_eq!(requests[0].request.device.name, "Ekspres");

        let mut updated_request = sample_request();
        updated_request.client.name = "Maria".into();
        let updated = update_request(&connection, created.id, updated_request)
            .expect("request should update");

        assert_eq!(updated.request.client.name, "Maria");
        assert_eq!(
            find_all(&connection).expect("requests should reload").len(),
            1
        );

        let closed = close_request(&connection, created.id).expect("request should close");
        assert_eq!(closed.status, "closed");

        let reopened = reopen_request(&connection, created.id).expect("request should reopen");
        assert_eq!(reopened.status, "in_repair");

        let waiting = update_request_status(&connection, created.id, "waiting_for_parts")
            .expect("request status should update");
        assert_eq!(waiting.status, "waiting_for_parts");
        assert!(update_request_status(&connection, created.id, "unknown").is_err());
    }
}
