use anyhow::{anyhow, Result};
use serde_json::{Map, Value};

pub fn as_object(value: &Value) -> Result<&Map<String, Value>> {
    value
        .as_object()
        .ok_or_else(|| anyhow!("Tool arguments must be a JSON object"))
}

pub fn get_string(args: &Map<String, Value>, key: &str, required: bool) -> Result<Option<String>> {
    match args.get(key) {
        Some(Value::String(value)) => Ok(Some(value.clone())),
        Some(Value::Null) if !required => Ok(None),
        Some(_) => Err(anyhow!("{} must be a string{}", key, if required { "" } else { " if provided" })),
        None if required => Err(anyhow!("{} must be a string", key)),
        None => Ok(None),
    }
}

pub fn get_number(args: &Map<String, Value>, key: &str) -> Result<Option<f64>> {
    match args.get(key) {
        Some(Value::Number(value)) => value
            .as_f64()
            .ok_or_else(|| anyhow!("{} must be a number if provided", key))
            .map(Some),
        Some(Value::Null) => Ok(None),
        Some(_) => Err(anyhow!("{} must be a number if provided", key)),
        None => Ok(None),
    }
}

pub fn get_bool(args: &Map<String, Value>, key: &str) -> Result<Option<bool>> {
    match args.get(key) {
        Some(Value::Bool(value)) => Ok(Some(*value)),
        Some(Value::Null) => Ok(None),
        Some(_) => Err(anyhow!("{} must be a boolean if provided", key)),
        None => Ok(None),
    }
}

pub fn get_string_array(args: &Map<String, Value>, key: &str) -> Result<Option<Vec<String>>> {
    match args.get(key) {
        Some(Value::Array(entries)) => {
            let mut result = Vec::with_capacity(entries.len());
            for entry in entries {
                let value = entry
                    .as_str()
                    .ok_or_else(|| anyhow!("{} must be an array of strings if provided", key))?;
                result.push(value.to_string());
            }
            Ok(Some(result))
        }
        Some(Value::Null) => Ok(None),
        Some(_) => Err(anyhow!("{} must be an array of strings if provided", key)),
        None => Ok(None),
    }
}

pub fn get_nullable_string(args: &Map<String, Value>, key: &str) -> Result<Option<Option<String>>> {
    match args.get(key) {
        Some(Value::String(value)) => Ok(Some(Some(value.clone()))),
        Some(Value::Null) => Ok(Some(None)),
        Some(_) => Err(anyhow!("{} must be a string or null if provided", key)),
        None => Ok(None),
    }
}
