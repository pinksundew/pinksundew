use futures::FutureExt;
use rmcp::ErrorData as McpError;

pub async fn guard_request_panic<F, T>(label: &'static str, future: F) -> Result<T, McpError>
where
    F: std::future::Future<Output = Result<T, McpError>>,
{
    let guarded = std::panic::AssertUnwindSafe(future).catch_unwind().await;

    match guarded {
        Ok(result) => result,
        Err(payload) => Err(McpError::internal_error(
            format!("{} panic: {}", label, panic_payload_to_string(payload)),
            None,
        )),
    }
}

pub fn panic_payload_to_string(payload: Box<dyn std::any::Any + Send>) -> String {
    if let Some(message) = payload.downcast_ref::<&'static str>() {
        return (*message).to_string();
    }

    if let Some(message) = payload.downcast_ref::<String>() {
        return message.clone();
    }

    "Unknown panic payload".to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn panic_is_converted_to_internal_error() {
        let result: Result<(), McpError> = guard_request_panic("test", async {
            panic!("boom");
        })
        .await;

        assert!(result.is_err());
        let error = result.expect_err("error expected");
        assert!(error.message.contains("test panic"));
    }
}
