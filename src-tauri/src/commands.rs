use base64::{engine::general_purpose::STANDARD as BASE64_STANDARD, Engine as _};
use image::{ImageFormat, ImageReader};
use rusqlite::{params, Connection, OptionalExtension};
use std::io::Cursor;
use tauri::State;

use crate::{
    database::Database,
    models::{DocumentFont, FirmSettings, InputDefault, NewServiceRequest, ServiceRequest},
};

const MAX_STAMP_BYTES: usize = 2 * 1024 * 1024;
const MAX_STAMP_BASE64_LENGTH: usize = MAX_STAMP_BYTES.div_ceil(3) * 4;
const MAX_STAMP_DIMENSION: u32 = 4096;
const MAX_STAMP_PIXELS: u64 = 8_000_000;

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
    if request
        .requested_created_at
        .as_deref()
        .is_some_and(|created_at| created_at.trim().is_empty())
    {
        return Err("Data utworzenia zlecenia nie może być pusta".into());
    }

    if request
        .requested_ended_at
        .as_deref()
        .is_some_and(|ended_at| ended_at.trim().is_empty())
    {
        return Err("Pole „Zakończono” nie może być puste".into());
    }

    if request.client.name.trim().is_empty() {
        return Err("Imię klienta jest wymagane".into());
    }

    if request.device.name.trim().is_empty() {
        return Err("Nazwa urządzenia jest wymagana".into());
    }

    if request.cost_estimate.is_some_and(|cost| cost < 0.0) {
        return Err("Robocizna nie może być ujemna".into());
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
    ended_at: Option<String>,
    payload: String,
) -> Result<ServiceRequest, String> {
    let request = serde_json::from_str(&payload)
        .map_err(|error| format!("Nie udało się odczytać danych zlecenia: {error}"))?;

    Ok(ServiceRequest {
        id,
        status,
        created_at,
        status_changed_at,
        ended_at,
        request,
    })
}

fn find_by_id(connection: &Connection, id: i64) -> Result<Option<ServiceRequest>, String> {
    let row = connection
        .query_row(
            "SELECT id, status, created_at, COALESCE(status_changed_at, created_at), ended_at, payload FROM service_requests WHERE id = ?1",
            [id],
            |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, Option<String>>(4)?,
                    row.get::<_, String>(5)?,
                ))
            },
        )
        .optional()
        .map_err(|error| format!("Nie udało się pobrać zlecenia: {error}"))?;

    row.map(|(id, status, created_at, status_changed_at, ended_at, payload)| {
        deserialize_request(id, status, created_at, status_changed_at, ended_at, payload)
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
                payload,
                created_at
            ) VALUES (?1, ?2, ?3, 'waiting_for_device', ?4, COALESCE(?5, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))
            ",
            params![
                request.client.name.trim(),
                request.client.phone.as_deref(),
                request.device.name.trim(),
                payload,
                request.requested_created_at.as_deref(),
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
                payload = ?4,
                created_at = COALESCE(?5, created_at),
                ended_at = CASE
                    WHEN status IN ('closed', 'cancelled') THEN ?6
                    ELSE NULL
                END
            WHERE id = ?7
            ",
            params![
                request.client.name.trim(),
                request.client.phone.as_deref(),
                request.device.name.trim(),
                payload,
                request.requested_created_at.as_deref(),
                request.requested_ended_at.as_deref(),
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
                status_changed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
                ended_at = CASE
                    WHEN ?1 IN ('closed', 'cancelled') THEN strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                    ELSE NULL
                END
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

fn delete_request(connection: &Connection, id: i64) -> Result<(), String> {
    let deleted = connection
        .execute("DELETE FROM service_requests WHERE id = ?1", [id])
        .map_err(|error| format!("Nie udało się usunąć zlecenia: {error}"))?;

    if deleted == 0 {
        return Err(format!("Nie znaleziono zlecenia #{id}"));
    }

    Ok(())
}

fn find_all(connection: &Connection) -> Result<Vec<ServiceRequest>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT id, status, created_at, COALESCE(status_changed_at, created_at), ended_at, payload
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
                row.get::<_, Option<String>>(4)?,
                row.get::<_, String>(5)?,
            ))
        })
        .map_err(|error| format!("Nie udało się pobrać listy zleceń: {error}"))?;

    let mut requests = Vec::new();
    for row in rows {
        let (id, status, created_at, status_changed_at, ended_at, payload) =
            row.map_err(|error| format!("Nie udało się odczytać zlecenia: {error}"))?;
        requests.push(deserialize_request(
            id,
            status,
            created_at,
            status_changed_at,
            ended_at,
            payload,
        )?);
    }

    Ok(requests)
}

fn trimmed_optional(value: Option<String>) -> Option<String> {
    value
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn validate_input_default_key(key: &str) -> Result<(), String> {
    if key.is_empty()
        || key.len() > 128
        || !key
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || matches!(character, '.' | '-' | '_'))
    {
        return Err("Nieprawidłowy klucz wartości domyślnej".into());
    }

    Ok(())
}

#[tauri::command]
pub fn get_input_default(
    key: String,
    database: State<'_, Database>,
) -> Result<Option<String>, String> {
    validate_input_default_key(&key)?;
    let connection = database
        .connection
        .lock()
        .map_err(|_| "Baza danych jest chwilowo niedostępna".to_string())?;

    connection
        .query_row("SELECT value FROM input_defaults WHERE key = ?1", [&key], |row| row.get(0))
        .optional()
        .map_err(|error| format!("Nie udało się pobrać wartości domyślnej: {error}"))
}

#[tauri::command]
pub fn save_input_default(
    key: String,
    value: String,
    database: State<'_, Database>,
) -> Result<InputDefault, String> {
    validate_input_default_key(&key)?;
    if value.len() > 1_000 {
        return Err("Wartość domyślna może mieć maksymalnie 1000 znaków".into());
    }

    let connection = database
        .connection
        .lock()
        .map_err(|_| "Baza danych jest chwilowo niedostępna".to_string())?;
    connection
        .execute(
            "
            INSERT INTO input_defaults (key, value)
            VALUES (?1, ?2)
            ON CONFLICT(key) DO UPDATE SET
                value = excluded.value,
                updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
            ",
            params![&key, &value],
        )
        .map_err(|error| format!("Nie udało się zapisać wartości domyślnej: {error}"))?;

    Ok(InputDefault { key, value })
}

fn validate_stamp_image(mime: &str, data: &[u8]) -> Result<(), String> {
    let expected_format = match mime {
        "image/png" => ImageFormat::Png,
        "image/jpeg" => ImageFormat::Jpeg,
        "image/webp" => ImageFormat::WebP,
        _ => return Err("Pieczątka musi być obrazem PNG, JPEG lub WebP".into()),
    };
    let detected_format = image::guess_format(data)
        .map_err(|_| "Dane pieczątki nie są prawidłowym obrazem".to_string())?;
    if detected_format != expected_format {
        return Err("Typ pliku pieczątki nie odpowiada jego zawartości".into());
    }

    let (width, height) = ImageReader::with_format(Cursor::new(data), expected_format)
        .into_dimensions()
        .map_err(|_| "Nie udało się odczytać wymiarów obrazu pieczątki".to_string())?;
    let pixel_count = u64::from(width) * u64::from(height);
    if width == 0
        || height == 0
        || width > MAX_STAMP_DIMENSION
        || height > MAX_STAMP_DIMENSION
        || pixel_count > MAX_STAMP_PIXELS
    {
        return Err("Obraz pieczątki ma zbyt duże wymiary".into());
    }

    image::load_from_memory_with_format(data, expected_format)
        .map_err(|_| "Dane pieczątki są uszkodzone lub niekompletne".to_string())?;

    Ok(())
}

fn decode_stamp_data_url(data_url: &str) -> Result<(&'static str, Vec<u8>), String> {
    let data_url = data_url.trim();
    let (header, encoded) = data_url
        .split_once(',')
        .ok_or_else(|| "Pieczątka musi być obrazem zapisanym jako data URL".to_string())?;
    let mime = match header {
        "data:image/png;base64" => "image/png",
        "data:image/jpeg;base64" => "image/jpeg",
        "data:image/webp;base64" => "image/webp",
        _ => return Err("Pieczątka musi być obrazem PNG, JPEG lub WebP".into()),
    };

    if encoded.len() > MAX_STAMP_BASE64_LENGTH {
        return Err("Plik pieczątki nie może przekraczać 2 MiB".into());
    }

    let data = BASE64_STANDARD
        .decode(encoded)
        .map_err(|_| "Nie udało się odczytać danych pieczątki".to_string())?;
    if data.len() > MAX_STAMP_BYTES {
        return Err("Plik pieczątki nie może przekraczać 2 MiB".into());
    }
    validate_stamp_image(mime, &data)?;

    Ok((mime, data))
}

fn load_firm_settings(connection: &Connection) -> Result<FirmSettings, String> {
    let row = connection
        .query_row(
            "
            SELECT
                company_name,
                owner_name,
                street,
                postal_code,
                city,
                tax_id,
                phone,
                email,
                document_font,
                stamp_data,
                stamp_mime
            FROM firm_settings
            WHERE id = 1
            ",
            [],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, Option<String>>(1)?,
                    row.get::<_, Option<String>>(2)?,
                    row.get::<_, Option<String>>(3)?,
                    row.get::<_, Option<String>>(4)?,
                    row.get::<_, Option<String>>(5)?,
                    row.get::<_, Option<String>>(6)?,
                    row.get::<_, Option<String>>(7)?,
                    row.get::<_, String>(8)?,
                    row.get::<_, Option<Vec<u8>>>(9)?,
                    row.get::<_, Option<String>>(10)?,
                ))
            },
        )
        .optional()
        .map_err(|error| format!("Nie udało się pobrać danych firmy: {error}"))?;

    let Some((
        company_name,
        owner_name,
        street,
        postal_code,
        city,
        tax_id,
        phone,
        email,
        document_font,
        stamp_data,
        stamp_mime,
    )) = row
    else {
        return Ok(FirmSettings::default());
    };

    let stamp_data_url = match (stamp_data, stamp_mime) {
        (None, None) => None,
        (Some(data), Some(mime)) => Some(format!(
            "data:{mime};base64,{}",
            BASE64_STANDARD.encode(data)
        )),
        _ => return Err("Zapisane dane pieczątki są uszkodzone".into()),
    };

    Ok(FirmSettings {
        company_name,
        owner_name,
        street,
        postal_code,
        city,
        tax_id,
        phone,
        email,
        document_font: DocumentFont::from_storage_value(&document_font),
        stamp_data_url,
    })
}

fn upsert_firm_settings(
    connection: &Connection,
    settings: FirmSettings,
) -> Result<FirmSettings, String> {
    let company_name = settings.company_name.trim().to_string();
    if company_name.is_empty() {
        return Err("Nazwa firmy jest wymagana".into());
    }

    let owner_name = trimmed_optional(settings.owner_name);
    let street = trimmed_optional(settings.street);
    let postal_code = trimmed_optional(settings.postal_code);
    let city = trimmed_optional(settings.city);
    let tax_id = trimmed_optional(settings.tax_id);
    let phone = trimmed_optional(settings.phone);
    let email = trimmed_optional(settings.email);
    let document_font = settings.document_font.as_storage_value();
    let stamp = settings
        .stamp_data_url
        .as_deref()
        .map(decode_stamp_data_url)
        .transpose()?;
    let stamp_data = stamp.as_ref().map(|(_, data)| data.as_slice());
    let stamp_mime = stamp.as_ref().map(|(mime, _)| *mime);

    connection
        .execute(
            "
            INSERT INTO firm_settings (
                id,
                company_name,
                owner_name,
                street,
                postal_code,
                city,
                tax_id,
                phone,
                email,
                document_font,
                stamp_data,
                stamp_mime
            ) VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
            ON CONFLICT(id) DO UPDATE SET
                company_name = excluded.company_name,
                owner_name = excluded.owner_name,
                street = excluded.street,
                postal_code = excluded.postal_code,
                city = excluded.city,
                tax_id = excluded.tax_id,
                phone = excluded.phone,
                email = excluded.email,
                document_font = excluded.document_font,
                stamp_data = excluded.stamp_data,
                stamp_mime = excluded.stamp_mime,
                updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
            ",
            params![
                company_name,
                owner_name,
                street,
                postal_code,
                city,
                tax_id,
                phone,
                email,
                document_font,
                stamp_data,
                stamp_mime,
            ],
        )
        .map_err(|error| format!("Nie udało się zapisać danych firmy: {error}"))?;

    load_firm_settings(connection)
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
pub fn delete_service_request(id: i64, database: State<'_, Database>) -> Result<(), String> {
    let connection = database
        .connection
        .lock()
        .map_err(|_| "Baza danych jest chwilowo niedostępna".to_string())?;

    delete_request(&connection, id)
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

#[tauri::command]
pub fn get_firm_settings(database: State<'_, Database>) -> Result<FirmSettings, String> {
    let connection = database
        .connection
        .lock()
        .map_err(|_| "Baza danych jest chwilowo niedostępna".to_string())?;

    load_firm_settings(&connection)
}

#[tauri::command]
pub fn save_firm_settings(
    settings: FirmSettings,
    database: State<'_, Database>,
) -> Result<FirmSettings, String> {
    let connection = database
        .connection
        .lock()
        .map_err(|_| "Baza danych jest chwilowo niedostępna".to_string())?;

    upsert_firm_settings(&connection, settings)
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    use super::{
        close_request, delete_request, find_all, insert_request, load_firm_settings,
        reopen_request, update_request, update_request_status, upsert_firm_settings,
        MAX_STAMP_BASE64_LENGTH,
    };
    use crate::{
        database::Database,
        models::{Client, Device, DocumentFont, FirmSettings, NewServiceRequest},
    };

    const FIRST_PNG: &str = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
    const SECOND_PNG: &str = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=";

    fn sample_request() -> NewServiceRequest {
        NewServiceRequest {
            requested_created_at: None,
            requested_ended_at: None,
            client: Client {
                name: "Anna".into(),
                surname: Some("Nowak".into()),
                phone: Some("123456789".into()),
                email: None,
                address: None,
                note: None,
                preferences: None,
            },
            device: Device {
                name: "Ekspres".into(),
                manufacturer: Some("Cafe Machines".into()),
                model: Some("Cafe Pro".into()),
                serial_number: Some("SN-12345678".into()),
                defect: Some("Nie podgrzewa wody".into()),
            },
            repair_time: Some("2 dni".into()),
            repair_steps: Some(vec![
                "Diagnostyka".into(),
                "Wymiana uszczelki".into(),
                "Konserwacja".into(),
            ]),
            additional_costs: Some(vec![]),
            cost_estimate: Some(250.0),
            note: None,
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
        assert_eq!(
            requests[0].request.device.manufacturer.as_deref(),
            Some("Cafe Machines")
        );
        assert_eq!(
            requests[0].request.device.serial_number.as_deref(),
            Some("SN-12345678")
        );
        assert_eq!(
            requests[0].request.repair_steps.as_deref(),
            Some(
                [
                    "Diagnostyka".to_string(),
                    "Wymiana uszczelki".to_string(),
                    "Konserwacja".to_string(),
                ]
                .as_slice()
            )
        );

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
        assert!(closed.ended_at.is_some());

        let reopened = reopen_request(&connection, created.id).expect("request should reopen");
        assert_eq!(reopened.status, "in_repair");
        assert_eq!(reopened.ended_at, None);

        let waiting = update_request_status(&connection, created.id, "waiting_for_parts")
            .expect("request status should update");
        assert_eq!(waiting.status, "waiting_for_parts");
        assert!(update_request_status(&connection, created.id, "unknown").is_err());

        let cancelled = update_request_status(&connection, created.id, "cancelled")
            .expect("request should cancel");
        assert_eq!(cancelled.status, "cancelled");
        assert!(cancelled.ended_at.is_some());

        let mut corrected_end_date = sample_request();
        corrected_end_date.requested_ended_at = Some("2026-09-12T10:30:00.000Z".into());
        let corrected = update_request(&connection, created.id, corrected_end_date)
            .expect("end date should update");
        assert_eq!(
            corrected.ended_at.as_deref(),
            Some("2026-09-12T10:30:00.000Z")
        );

        delete_request(&connection, created.id).expect("request should delete");
        assert!(find_all(&connection)
            .expect("requests should reload")
            .is_empty());
        assert!(delete_request(&connection, created.id).is_err());
    }

    #[test]
    fn reads_legacy_service_request_without_manufacturer() {
        let request: NewServiceRequest = serde_json::from_str(
            r#"{
                "client": { "name": "Anna" },
                "device": { "name": "Ekspres", "model": "Starszy model" }
            }"#,
        )
        .expect("legacy request should deserialize");

        assert_eq!(request.device.manufacturer, None);
        let serialized = serde_json::to_value(request).expect("request should serialize");
        assert!(serialized["device"].get("manufacturer").is_none());
    }

    #[test]
    fn defaults_and_serializes_the_document_font_contract() {
        let legacy_settings: FirmSettings = serde_json::from_str(
            r#"{
                "companyName": "Cafe Serwis"
            }"#,
        )
        .expect("legacy settings should deserialize");

        assert_eq!(legacy_settings.document_font, DocumentFont::TimesNewRoman);

        let serialized = serde_json::to_value(legacy_settings).expect("settings should serialize");
        assert_eq!(serialized["documentFont"], "times_new_roman");
    }

    #[test]
    fn stores_updates_and_removes_firm_stamp() {
        let database = Database::open(Path::new(":memory:")).expect("database should initialize");
        let connection = database.connection.lock().expect("database should lock");

        assert_eq!(
            load_firm_settings(&connection).expect("blank settings should load"),
            FirmSettings::default()
        );

        let saved = upsert_firm_settings(
            &connection,
            FirmSettings {
                company_name: "  Cafe Serwis  ".into(),
                owner_name: Some("   ".into()),
                street: Some("  ul. Kawowa 1  ".into()),
                postal_code: Some(" 00-001 ".into()),
                city: Some(" Warszawa ".into()),
                tax_id: Some(" 1234567890 ".into()),
                phone: Some(" 123 456 789 ".into()),
                email: Some(" serwis@example.pl ".into()),
                document_font: DocumentFont::Georgia,
                stamp_data_url: Some(FIRST_PNG.into()),
            },
        )
        .expect("settings should save");

        assert_eq!(saved.company_name, "Cafe Serwis");
        assert_eq!(saved.owner_name, None);
        assert_eq!(saved.street.as_deref(), Some("ul. Kawowa 1"));
        assert_eq!(saved.city.as_deref(), Some("Warszawa"));
        assert_eq!(saved.document_font, DocumentFont::Georgia);
        assert_eq!(saved.stamp_data_url.as_deref(), Some(FIRST_PNG));
        assert_eq!(
            load_firm_settings(&connection).expect("settings should reload"),
            saved
        );

        let (storage_type, mime): (String, String) = connection
            .query_row(
                "SELECT typeof(stamp_data), stamp_mime FROM firm_settings WHERE id = 1",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .expect("stored stamp should be inspectable");
        assert_eq!(storage_type, "blob");
        assert_eq!(mime, "image/png");

        let replaced = upsert_firm_settings(
            &connection,
            FirmSettings {
                company_name: "Cafe Serwis".into(),
                stamp_data_url: Some(SECOND_PNG.into()),
                ..FirmSettings::default()
            },
        )
        .expect("stamp should be replaceable");
        assert_eq!(replaced.stamp_data_url.as_deref(), Some(SECOND_PNG));

        let without_stamp = upsert_firm_settings(
            &connection,
            FirmSettings {
                company_name: "Cafe Serwis".into(),
                stamp_data_url: None,
                ..FirmSettings::default()
            },
        )
        .expect("null stamp should remove it");
        assert_eq!(without_stamp.stamp_data_url, None);
        let stamp_is_null: bool = connection
            .query_row(
                "SELECT stamp_data IS NULL AND stamp_mime IS NULL FROM firm_settings WHERE id = 1",
                [],
                |row| row.get(0),
            )
            .expect("removed stamp should be inspectable");
        assert!(stamp_is_null);
    }

    #[test]
    fn rejects_invalid_firm_settings() {
        let database = Database::open(Path::new(":memory:")).expect("database should initialize");
        let connection = database.connection.lock().expect("database should lock");

        assert!(upsert_firm_settings(&connection, FirmSettings::default()).is_err());

        let invalid_stamps = [
            "not-a-data-url".to_string(),
            "data:image/gif;base64,R0lGODlh".to_string(),
            "data:image/png;base64,not-base64".to_string(),
            "data:image/png;base64,iVBORw0KGgo=".to_string(),
            "data:image/png;base64,/9j/2Q==".to_string(),
            format!(
                "data:image/png;base64,{}",
                "A".repeat(MAX_STAMP_BASE64_LENGTH + 1)
            ),
        ];

        for stamp_data_url in invalid_stamps {
            let result = upsert_firm_settings(
                &connection,
                FirmSettings {
                    company_name: "Cafe Serwis".into(),
                    stamp_data_url: Some(stamp_data_url),
                    ..FirmSettings::default()
                },
            );
            assert!(result.is_err());
        }
    }
}
