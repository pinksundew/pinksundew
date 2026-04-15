use std::fs;
use std::path::Path;

#[test]
fn logger_is_configured_for_stderr() {
    let main_path = Path::new(env!("CARGO_MANIFEST_DIR")).join("src/main.rs");
    let content = fs::read_to_string(main_path).expect("main.rs should be readable");

    assert!(
        content.contains("with_writer(std::io::stderr)"),
        "expected tracing subscriber writer to be stderr"
    );
}
