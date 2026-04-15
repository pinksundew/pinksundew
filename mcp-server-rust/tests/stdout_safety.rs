use std::fs;
use std::path::Path;

fn collect_rs_files(dir: &Path, files: &mut Vec<String>) {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                collect_rs_files(path.as_path(), files);
            } else if path.extension().and_then(|ext| ext.to_str()) == Some("rs") {
                files.push(path.to_string_lossy().to_string());
            }
        }
    }
}

#[test]
fn first_party_code_avoids_stdout_print_macros() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("src");
    let mut files = Vec::new();
    collect_rs_files(root.as_path(), &mut files);

    let mut violations = Vec::new();

    for file in files {
        let content = fs::read_to_string(file.as_str()).unwrap_or_default();
        for (line_index, line) in content.lines().enumerate() {
            let trimmed = line.trim_start();
            if trimmed.starts_with("println!(") || trimmed.starts_with("print!(") {
                violations.push(format!("{}:{} -> {}", file, line_index + 1, line.trim()));
            }
        }
    }

    assert!(
        violations.is_empty(),
        "stdout print macro(s) found:\n{}",
        violations.join("\n")
    );
}
