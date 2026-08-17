use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransportDetails {
    pub method: Option<String>,
    pub date: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClientPreferences {
    pub check_in: Option<TransportDetails>,
    pub check_out: Option<TransportDetails>,
    pub repair_card: Option<bool>,
    pub invoice: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Client {
    pub name: String,
    pub surname: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub preferences: Option<ClientPreferences>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Device {
    pub name: String,
    pub model: Option<String>,
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
    pub repair_time: Option<String>,
    pub repair_steps: Option<Vec<String>>,
    pub additional_costs: Option<Vec<AdditionalCost>>,
    pub cost_estimate: Option<f64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceRequest {
    pub id: i64,
    pub status: String,
    pub created_at: String,
    #[serde(flatten)]
    pub request: NewServiceRequest,
}
