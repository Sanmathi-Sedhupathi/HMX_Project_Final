#!/usr/bin/env python3
"""
Check pilots table structure
"""

import sqlite3

def check_pilots_table():
    """Check the pilots table structure"""
    try:
        conn = sqlite3.connect('hmx.db')
        cursor = conn.cursor()
        
        # Get table info
        cursor.execute('PRAGMA table_info(pilots)')
        columns = cursor.fetchall()
        
        print("Pilots table structure:")
        print("=" * 50)
        for col in columns:
            col_id, name, data_type, not_null, default_val, pk = col
            print(f"{name:20} | {data_type:10} | NOT NULL: {bool(not_null):5} | DEFAULT: {default_val}")
        
        print("\n" + "=" * 50)
        
        # Check if password or password_hash column exists
        password_cols = [col[1] for col in columns if 'password' in col[1].lower()]
        print(f"Password-related columns: {password_cols}")
        
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_pilots_table()
