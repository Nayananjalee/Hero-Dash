"""
Migration script to add age_group and hearing_level columns to users table.
Supports both SQLite (local dev) and PostgreSQL (production).
"""
import os
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.getenv('DATABASE_URL', 'sqlite:///./hero_dash.db')

# Fix Render/Heroku postgres:// prefix
if DB_URL.startswith('postgres://'):
    DB_URL = DB_URL.replace('postgres://', 'postgresql://', 1)

if DB_URL.startswith('sqlite'):
    # SQLite migration
    import sqlite3
    if DB_URL.startswith('sqlite:///'):
        db_file = DB_URL.replace('sqlite:///', '')
    else:
        db_file = DB_URL
    
    print('Database file:', db_file)
    if not os.path.exists(db_file):
        print('DB file does not exist; nothing to migrate.')
        exit(0)
    
    conn = sqlite3.connect(db_file)
    cur = conn.cursor()
    
    cur.execute("PRAGMA table_info(users);")
    cols = [row[1] for row in cur.fetchall()]
    print('Existing users columns:', cols)
    
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

else:
    # PostgreSQL migration using SQLAlchemy
    from sqlalchemy import create_engine, text
    
    engine = create_engine(DB_URL)
    
    with engine.connect() as conn:
        # Check existing columns
        result = conn.execute(text(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'users'"
        ))
        cols = [row[0] for row in result]
        print('Existing users columns:', cols)
        
        wanted = {
            'age_group': "ALTER TABLE users ADD COLUMN age_group VARCHAR(20) DEFAULT '7-8'",
            'hearing_level': "ALTER TABLE users ADD COLUMN hearing_level VARCHAR(20) DEFAULT 'moderate'"
        }
        
        for col, sql in wanted.items():
            if col in cols:
                print(f"Column '{col}' already exists")
            else:
                print(f"Adding column {col}...")
                try:
                    conn.execute(text(sql))
                    conn.commit()
                    print(f"Added column {col}")
                except Exception as e:
                    print('Failed to add column', col, e)

print('Migration complete.')

conn.close()
print('Migration complete')
