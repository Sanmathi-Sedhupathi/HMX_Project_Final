#!/usr/bin/env python3
"""
Recreate the bookings table with only essential columns
"""

import sqlite3
import os

def recreate_bookings_table():
    """Drop and recreate bookings table with clean structure"""
    
    # Connect to database
    db_path = 'backend/hmx.db'
    if not os.path.exists(db_path):
        print(f"❌ Database not found at {db_path}")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("🗑️ Dropping existing bookings table...")
        cursor.execute('DROP TABLE IF EXISTS bookings')
        
        print("🏗️ Creating new clean bookings table...")
        cursor.execute('''
            CREATE TABLE bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                
                -- Project/Shoot Details
                location_address TEXT NOT NULL,
                gps_coordinates TEXT,
                property_type TEXT NOT NULL,
                indoor_outdoor TEXT NOT NULL,
                area_size REAL NOT NULL,
                area_unit TEXT DEFAULT 'sq_ft',
                rooms_sections INTEGER NOT NULL,
                preferred_date DATE NOT NULL,
                preferred_time TEXT NOT NULL,
                special_requirements TEXT,
                drone_permissions_required BOOLEAN DEFAULT 0,
                
                -- Video Specifications
                fpv_tour_type TEXT NOT NULL,
                video_length INTEGER NOT NULL,
                resolution TEXT NOT NULL,
                background_music_voiceover BOOLEAN DEFAULT 0,
                editing_style TEXT NOT NULL,
                
                -- Cost Calculation
                base_package_cost REAL DEFAULT 0,
                shooting_hours INTEGER DEFAULT 1,
                editing_color_grading BOOLEAN DEFAULT 0,
                voiceover_script BOOLEAN DEFAULT 0,
                background_music_licensed BOOLEAN DEFAULT 0,
                branding_overlay BOOLEAN DEFAULT 0,
                multiple_revisions BOOLEAN DEFAULT 0,
                drone_licensing_fee BOOLEAN DEFAULT 0,
                travel_cost REAL DEFAULT 0,
                tax_percentage REAL DEFAULT 18,
                discount_code TEXT,
                discount_amount REAL DEFAULT 0,
                total_cost REAL DEFAULT 0,
                
                -- Status and Management (Admin controlled)
                status TEXT DEFAULT 'pending',
                payment_status TEXT DEFAULT 'pending',
                editor_id INTEGER,
                pilot_id INTEGER,
                delivery_video_link TEXT,
                payment_date TIMESTAMP,
                payment_amount REAL,
                
                -- Timestamps
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (pilot_id) REFERENCES pilots (id),
                FOREIGN KEY (editor_id) REFERENCES editors (id)
            )
        ''')
        
        conn.commit()
        
        # Verify the new table structure
        cursor.execute('PRAGMA table_info(bookings)')
        columns = cursor.fetchall()
        
        print(f"✅ New bookings table created successfully!")
        print(f"📊 Total columns: {len(columns)}")
        print("\n📋 COLUMN STRUCTURE:")
        
        # Group columns by category
        project_fields = []
        video_fields = []
        cost_fields = []
        status_fields = []
        system_fields = []
        
        for col in columns:
            col_name = col[1]
            col_type = col[2]
            
            if col_name in ['id', 'user_id', 'created_at', 'updated_at']:
                system_fields.append(f"  {col_name} ({col_type})")
            elif col_name in ['location_address', 'gps_coordinates', 'property_type', 'indoor_outdoor', 
                             'area_size', 'area_unit', 'rooms_sections', 'preferred_date', 'preferred_time', 
                             'special_requirements', 'drone_permissions_required']:
                project_fields.append(f"  {col_name} ({col_type})")
            elif col_name in ['fpv_tour_type', 'video_length', 'resolution', 'background_music_voiceover', 'editing_style']:
                video_fields.append(f"  {col_name} ({col_type})")
            elif col_name in ['base_package_cost', 'shooting_hours', 'editing_color_grading', 'voiceover_script',
                             'background_music_licensed', 'branding_overlay', 'multiple_revisions', 'drone_licensing_fee',
                             'travel_cost', 'tax_percentage', 'discount_code', 'discount_amount', 'total_cost']:
                cost_fields.append(f"  {col_name} ({col_type})")
            elif col_name in ['status', 'payment_status', 'editor_id', 'pilot_id', 'delivery_video_link', 
                             'payment_date', 'payment_amount']:
                status_fields.append(f"  {col_name} ({col_type})")
        
        print(f"\n🏗️ SYSTEM FIELDS ({len(system_fields)}):")
        for field in system_fields:
            print(field)
            
        print(f"\n📍 PROJECT/SHOOT DETAILS ({len(project_fields)}):")
        for field in project_fields:
            print(field)
            
        print(f"\n🎥 VIDEO SPECIFICATIONS ({len(video_fields)}):")
        for field in video_fields:
            print(field)
            
        print(f"\n💰 COST CALCULATION ({len(cost_fields)}):")
        for field in cost_fields:
            print(field)
            
        print(f"\n📋 STATUS & MANAGEMENT ({len(status_fields)}):")
        for field in status_fields:
            print(field)
        
        conn.close()
        
        print(f"\n🎉 BOOKINGS TABLE RECREATION COMPLETE!")
        print(f"✅ Clean structure with {len(columns)} essential columns")
        print(f"✅ All unnecessary legacy fields removed")
        print(f"✅ Ready for comprehensive booking form")
        
        return True
        
    except Exception as e:
        print(f"❌ Error recreating bookings table: {str(e)}")
        return False

if __name__ == "__main__":
    print("🔄 RECREATING BOOKINGS TABLE")
    print("=" * 50)
    print("This will drop the existing bookings table and create a clean one")
    print("with only the essential fields for the comprehensive booking form")
    print("=" * 50)
    
    success = recreate_bookings_table()
    
    if success:
        print("\n✅ SUCCESS: Bookings table recreated successfully!")
        print("💡 You can now use the comprehensive booking form")
    else:
        print("\n❌ FAILED: Could not recreate bookings table")
    
    print("=" * 50)
