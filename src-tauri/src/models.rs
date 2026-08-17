use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransportDetails {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub method: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub date: Option<String>,
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
    pub preferences: Option<ClientPreferences>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Device {
    pub name: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub defect: Option<String>,
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
