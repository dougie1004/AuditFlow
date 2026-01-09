import os
import zipfile
import datetime

def backup_source_code():
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    zip_filename = f"auditflow_source_backup_{timestamp}.zip"
    
    # Allowed extensions
    allowed_extensions = {'.ts', '.tsx', '.rs', '.toml', '.json', '.css', '.html', '.md', '.py', '.yml'}
    
    # Excluded directories
    excluded_dirs = {'node_modules', 'target', 'dist', 'build', '.git', '.vscode', '.idea', 'target_v3_final'}

    print(f"Starting backup: {zip_filename}")
    
    with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk('.'):
            # Modify dirs in-place to skip excluded directories
            dirs[:] = [d for d in dirs if d not in excluded_dirs]
            
            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext in allowed_extensions:
                    file_path = os.path.join(root, file)
                    zipf.write(file_path, arcname=os.path.relpath(file_path, '.'))
                    print(f"Added: {file_path}")
                    
    print(f"Backup complete. Size: {os.path.getsize(zip_filename) / 1024 / 1024:.2f} MB")

if __name__ == "__main__":
    backup_source_code()
