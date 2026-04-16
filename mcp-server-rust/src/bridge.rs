use anyhow::{anyhow, Result};
use reqwest::{Method, StatusCode};
use serde::de::DeserializeOwned;
use serde::Serialize;

#[derive(Clone)]
pub struct BridgeClient {
    client: reqwest::Client,
    base_url: String,
    api_key: String,
}

impl BridgeClient {
    pub fn new(base_url: String, api_key: String) -> Self {
        Self {
            client: reqwest::Client::new(),
            base_url,
            api_key,
        }
    }

    pub async fn get_json<T: DeserializeOwned>(&self, path: &str) -> Result<T> {
        self.request_json::<(), T>(Method::GET, path, None).await
    }

    pub async fn post_json<B: Serialize, T: DeserializeOwned>(
        &self,
        path: &str,
        body: &B,
    ) -> Result<T> {
        self.request_json(Method::POST, path, Some(body)).await
    }

    pub async fn patch_json<B: Serialize, T: DeserializeOwned>(
        &self,
        path: &str,
        body: &B,
    ) -> Result<T> {
        self.request_json(Method::PATCH, path, Some(body)).await
    }

    pub async fn delete_json<T: DeserializeOwned>(&self, path: &str) -> Result<T> {
        self.request_json::<(), T>(Method::DELETE, path, None).await
    }

    async fn request_json<B: Serialize, T: DeserializeOwned>(
        &self,
        method: Method,
        path: &str,
        body: Option<&B>,
    ) -> Result<T> {
        let url = format!("{}/api/bridge{}", self.base_url, path);
        let mut request = self
            .client
            .request(method, &url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json");

        if let Some(payload) = body {
            request = request.json(payload);
        }

        let response = request.send().await?;
        if response.status() == StatusCode::NO_CONTENT {
            return serde_json::from_str("null").map_err(Into::into);
        }

        if !response.status().is_success() {
            let status = response.status();
            let body = response
                .text()
                .await
                .unwrap_or_else(|_| "<unreadable body>".to_string());
            return Err(anyhow!("Bridge API error {}: {}", status.as_u16(), body));
        }

        response
            .json::<T>()
            .await
            .map_err(|err| anyhow!("Failed to decode bridge response: {err}"))
    }
}
