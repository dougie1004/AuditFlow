use rusqlite::Connection;
fn main() {
    let path = "C:\\Users\\user\\AppData\\Roaming\\com.auditflow.app\\audit_data_v4.db";
    match Connection::open(path) {
        Ok(conn) => {
            let count: i64 = conn.query_row("SELECT COUNT(*) FROM entity_event", [], |r| r.get(0)).unwrap_or(0);
            println!("SUCCESS: Count is {}", count);
        },
        Err(e) => println!("FAILURE: {}", e),
    }
}
