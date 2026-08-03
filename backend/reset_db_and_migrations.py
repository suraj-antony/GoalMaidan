import os
import glob
import sys
import MySQLdb
from decouple import Config, RepositoryEnv

def reset_migrations():
    print("Deleting old migration files...")
    # Find all Django apps inside backend/apps
    apps_dir = os.path.join(os.path.dirname(__file__), 'apps')
    for app in os.listdir(apps_dir):
        app_path = os.path.join(apps_dir, app)
        if os.path.isdir(app_path):
            migrations_dir = os.path.join(app_path, 'migrations')
            if os.path.exists(migrations_dir):
                # Find all .py files in migrations except __init__.py
                pattern = os.path.join(migrations_dir, "*.py")
                for filepath in glob.glob(pattern):
                    filename = os.path.basename(filepath)
                    if filename != "__init__.py":
                        print(f"Removing: {filepath}")
                        try:
                            os.remove(filepath)
                        except Exception as e:
                            print(f"Failed to remove {filepath}: {e}")

def reset_database():
    print("Resetting MySQL database...")
    # Load configuration from .env file
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    config = Config(RepositoryEnv(env_path))
    
    db_name = config('DB_NAME', default='football_app')
    db_user = config('DB_USER', default='root')
    db_password = config('DB_PASSWORD', default='')
    db_host = config('DB_HOST', default='localhost')
    db_port = config('DB_PORT', default='3306')
    
    # Connect without specifying database name to drop/recreate
    conn = MySQLdb.connect(
        host=db_host,
        user=db_user,
        password=db_password,
        port=int(db_port)
    )
    cursor = conn.cursor()
    
    print(f"Dropping database '{db_name}' if exists...")
    cursor.execute(f"DROP DATABASE IF EXISTS {db_name}")
    
    print(f"Creating database '{db_name}'...")
    cursor.execute(f"CREATE DATABASE {db_name}")
    
    cursor.close()
    conn.close()
    print("Database reset completed successfully!")

def run_django_commands():
    print("Running Django migrations generation & migration...")
    # Setup Django settings
    import django
    from django.core.management import call_command
    
    # Ensure backend path is in system path
    sys.path.append(os.path.dirname(__file__))
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'football_app.settings')
    django.setup()
    
    print("Generating clean migrations (makemigrations)...")
    call_command('makemigrations')
    
    print("Applying migrations (migrate)...")
    call_command('migrate')
    
    print("All migrations applied successfully!")

if __name__ == "__main__":
    reset_migrations()
    reset_database()
    run_django_commands()
