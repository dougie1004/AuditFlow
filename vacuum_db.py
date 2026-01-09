import sqlite3
import os

def find_and_vacuum():
    # Common locations to search
    search_roots = [
        os.path.join(os.environ['APPDATA']),
        os.path.join(os.environ['LOCALAPPDATA']),
        os.getcwd()
    ]
    
    target_db = "audit_data_v4.db"
    found_dbs = []

    print("Searching for database...")
    for root_dir in search_roots:
        for root, dirs, files in os.walk(root_dir):
            if target_db in files:
                found_dbs.append(os.path.join(root, target_db))

    if not found_dbs:
        print("Database not found in common locations.")
        return

    for db_path in found_dbs:
        print(f"Vacuuming: {db_path}")
        try:
            conn = sqlite3.connect(db_path)
            initial_size = os.path.getsize(db_path) / 1024 / 1024
            
            conn.execute("VACUUM")
            conn.commit()
            conn.close()
            
            final_size = os.path.getsize(db_path) / 1024 / 1024
            print(f"Success! Size: {initial_size:.2f}MB -> {final_size:.2f}MB")
        except Exception as e:
            print(f"Failed to vacuum {db_path}: {e}")

if __name__ == "__main__":
    find_and_vacuum()
