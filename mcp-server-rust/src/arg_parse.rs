use anyhow::{anyhow, Result};
use serde_json::{Map, Value};

pub fn as_object(value: &Value) -> Result<&Map<String, Value>> {
    value
        .as_object()
        .ok_or_else(|| anyhow!("Tool arguments must be a JSON object"))
}
