import sqlite3
import os

DB_PATH = os.getenv('DATABASE_URL', 'sqlite:///./hero_dash.db')
# Normalize path for sqlite:/// prefix
if DB_PATH.startswith('sqlite:///'):
    db_file = DB_PATH.replace('sqlite:///', '')
else:
    db_file = DB_PATH

print('Database file:', db_file)
if not os.path.exists(db_file):
    print('DB file does not exist; nothing to migrate.')
    exit(0)

conn = sqlite3.connect(db_file)
cur = conn.cursor()

# Get existing columns
cur.execute("PRAGMA table_info(users);")
cols = [row[1] for row in cur.fetchall()]
print('Existing users columns:', cols)

# Columns we want to ensure
wanted = {
    'age_group': "ALTER TABLE users ADD COLUMN age_group TEXT DEFAULT '7-8'",
    'hearing_level': "ALTER TABLE users ADD COLUMN hearing_level TEXT DEFAULT 'moderate'"
}

for col, sql in wanted.items():
    if col in cols:
        print(f"Column '{col}' already exists")
    else:
        print(f"Adding column {col}...")
        try:
            cur.execute(sql)
            conn.commit()
            print(f"Added column {col}")
        except Exception as e:
            print('Failed to add column', col, e)

conn.close()
print('Migration complete')
