use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InputDefault {
    pub key: String,
    pub value: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransportDetails {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub method: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub date: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub time_mode: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub time: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub time_from: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub time_to: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClientPreferences {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub check_in: Option<TransportDetails>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub check_out: Option<TransportDetails>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub repair_card: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub invoice: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Client {
    pub name: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub surname: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub phone: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub address: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub note: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub preferences: Option<ClientPreferences>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Device {
    pub name: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub manufacturer: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub serial_number: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub defect: Option<String>,
}

#[derive(Debug, Default, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DocumentFont {
    #[default]
    TimesNewRoman,
    Georgia,
    Arial,
    Geist,
}

impl DocumentFont {
    pub fn as_storage_value(self) -> &'static str {
        match self {
            Self::TimesNewRoman => "times_new_roman",
            Self::Georgia => "georgia",
            Self::Arial => "arial",
            Self::Geist => "geist",
        }
    }

    pub fn from_storage_value(value: &str) -> Self {
        match value {
            "georgia" => Self::Georgia,
            "arial" => Self::Arial,
            "geist" => Self::Geist,
            _ => Self::TimesNewRoman,
        }
    }
}

#[derive(Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FirmSettings {
    pub company_name: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub owner_name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub street: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub postal_code: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub city: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tax_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub phone: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
    #[serde(default)]
    pub document_font: DocumentFont,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stamp_data_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdditionalCost {
    pub description: String,
    pub price: f64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewServiceRequest {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub requested_created_at: Option<String>,
    pub client: Client,
    pub device: Device,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub repair_time: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub repair_steps: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub additional_costs: Option<Vec<AdditionalCost>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cost_estimate: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub note: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceRequest {
    pub id: i64,
    pub status: String,
    pub created_at: String,
    pub status_changed_at: String,
    #[serde(flatten)]
    pub request: NewServiceRequest,
}
