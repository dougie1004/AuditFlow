
$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::ASCII
cargo check --message-format=short > errors.txt 2>&1
Type errors.txt
