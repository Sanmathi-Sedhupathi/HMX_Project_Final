from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import os
import jwt
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
import hashlib
import random
import string
import werkzeug
from phonepe_payment import phonepe
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import threading

app = Flask(__name__)

# Configure CORS to allow both development ports and Authorization header
CORS(app, origins=['http://localhost:5173', 'http://localhost:5174'], supports_credentials=True, allow_headers=["Content-Type", "Authorization"])

# Configuration
app.config['SECRET_KEY'] = 'your-secret-key-here'  # Change this in production
DATABASE = 'hmx.db'  # Changed from 'backend/hmx.db' to just 'hmx.db'

# Email Configuration
EMAIL_CONFIG = {
    'SMTP_SERVER': os.getenv('SMTP_SERVER', 'smtp.gmail.com'),
    'SMTP_PORT': int(os.getenv('SMTP_PORT', '587')),
    'EMAIL_ADDRESS': os.getenv('EMAIL_ADDRESS', 'noreply@hmxfpvtours.com'),
    'EMAIL_PASSWORD': os.getenv('EMAIL_PASSWORD', ''),  # App password for Gmail
    'USE_TLS': os.getenv('USE_TLS', 'true').lower() == 'true'
}

CITY_LIST = [
    'Mumbai',
    'Pune',
    'Delhi',
    'Bangalore',
    'Hyderabad',
    'Chennai',
    'Kolkata',
    'Ahmedabad',
    'Jaipur',
    'Chandigarh',
    'Lucknow'
]

def get_cors_origin():
    """Get the correct CORS origin based on the request"""
    origin = request.headers.get('Origin')
    if origin in ['http://localhost:5173', 'http://localhost:5174']:
        return origin
    return 'http://localhost:5173'  # fallback

# Email sending functions
def send_email_async(to_email, subject, body, is_html=False):
    """Send email asynchronously to avoid blocking the main thread"""
    def send_email():
        try:
            send_email_sync(to_email, subject, body, is_html)
        except Exception as e:
            print(f"Failed to send email to {to_email}: {str(e)}")

    thread = threading.Thread(target=send_email)
    thread.daemon = True
    thread.start()

def send_email_sync(to_email, subject, body, is_html=False):
    """Send email synchronously"""
    try:
        # Create message
        msg = MIMEMultipart('alternative')
        msg['From'] = EMAIL_CONFIG['EMAIL_ADDRESS']
        msg['To'] = to_email
        msg['Subject'] = subject

        # Add body to email
        if is_html:
            msg.attach(MIMEText(body, 'html'))
        else:
            msg.attach(MIMEText(body, 'plain'))

        # Create SMTP session
        server = smtplib.SMTP(EMAIL_CONFIG['SMTP_SERVER'], EMAIL_CONFIG['SMTP_PORT'])

        if EMAIL_CONFIG['USE_TLS']:
            server.starttls()  # Enable security

        # Login if credentials are provided
        if EMAIL_CONFIG['EMAIL_PASSWORD']:
            server.login(EMAIL_CONFIG['EMAIL_ADDRESS'], EMAIL_CONFIG['EMAIL_PASSWORD'])

        # Send email
        text = msg.as_string()
        server.sendmail(EMAIL_CONFIG['EMAIL_ADDRESS'], to_email, text)
        server.quit()

        print(f"Email sent successfully to {to_email}")
        return True

    except Exception as e:
        print(f"Failed to send email to {to_email}: {str(e)}")
        return False

def get_application_approval_email(applicant_name, application_type, admin_comments=""):
    """Generate approval email content"""
    subject = f"Application Approved - Welcome to HMX FPV Tours!"

    body = f"""
Dear {applicant_name},

Congratulations! Your {application_type} application has been approved.

Welcome to the HMX FPV Tours team! We're excited to have you on board.

Next Steps:
1. You can now log in to your dashboard using your registered email and password
2. Complete your profile setup if needed
3. Start exploring the available opportunities

{f"Admin Comments: {admin_comments}" if admin_comments else ""}

If you have any questions, please don't hesitate to contact our support team.

Best regards,
HMX FPV Tours Team
Email: support@hmxfpvtours.com
Phone: +91 98765 43210
"""
    return subject, body

def get_application_rejection_email(applicant_name, application_type, admin_comments=""):
    """Generate rejection email content"""
    subject = f"Application Update - HMX FPV Tours"

    body = f"""
Dear {applicant_name},

Thank you for your interest in joining HMX FPV Tours as a {application_type}.

After careful review, we regret to inform you that we cannot proceed with your application at this time.

{f"Feedback: {admin_comments}" if admin_comments else ""}

We encourage you to reapply in the future as opportunities become available.

Thank you for your understanding.

Best regards,
HMX FPV Tours Team
Email: support@hmxfpvtours.com
Phone: +91 98765 43210
"""
    return subject, body

def init_db():
    print("\n=== Initializing Database ===")
    print(f"Database path: {os.path.abspath(DATABASE)}")

    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()

    # Check if users table exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
    if not c.fetchone():
        print("Creating users table...")
        c.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT,
                email TEXT UNIQUE,
                password_hash TEXT,
                role TEXT DEFAULT 'admin',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
    else:
        # Add missing columns to existing users table if needed
        new_columns = [
            ('username', 'TEXT'),
            ('updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
        ]

        for column_name, column_type in new_columns:
            try:
                c.execute(f'ALTER TABLE users ADD COLUMN {column_name} {column_type}')
                print(f"Added {column_name} column to users table")
            except sqlite3.OperationalError as e:
                if "duplicate column name" not in str(e):
                    print(f"Error adding {column_name} column: {e}")
                else:
                    print(f"{column_name} column already exists")

    # Check if pilots table exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='pilots'")
    if not c.fetchone():
        print("Creating pilots table...")
        c.execute('''
            CREATE TABLE IF NOT EXISTS pilots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                full_name TEXT,
                email TEXT UNIQUE NOT NULL,
                phone TEXT,
                password_hash TEXT NOT NULL,
                date_of_birth DATE,
                gender TEXT,
                address TEXT,
                government_id_proof TEXT,
                license_number TEXT,
                issuing_authority TEXT,
                license_issue_date DATE,
                license_expiry_date DATE,
                drone_model TEXT,
                drone_serial TEXT,
                drone_uin TEXT,
                drone_category TEXT,
                total_flying_hours INTEGER,
                flight_records TEXT,
                insurance_policy TEXT,
                insurance_validity DATE,
                pilot_license_url TEXT,
                id_proof_url TEXT,
                training_certificate_url TEXT,
                photograph_url TEXT,
                insurance_certificate_url TEXT,
                experience TEXT,
                equipment TEXT,
                cities TEXT,
                portfolio_url TEXT,
                bank_account TEXT,
                status TEXT DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
    else:
        # Add missing columns to existing pilots table
        new_columns = [
            ('password_hash', 'TEXT'),
            ('full_name', 'TEXT'),
            ('date_of_birth', 'DATE'),
            ('gender', 'TEXT'),
            ('address', 'TEXT'),
            ('government_id_proof', 'TEXT'),
            ('license_number', 'TEXT'),
            ('issuing_authority', 'TEXT'),
            ('license_issue_date', 'DATE'),
            ('license_expiry_date', 'DATE'),
            ('drone_model', 'TEXT'),
            ('drone_serial', 'TEXT'),
            ('drone_uin', 'TEXT'),
            ('drone_category', 'TEXT'),
            ('total_flying_hours', 'INTEGER'),
            ('flight_records', 'TEXT'),
            ('insurance_policy', 'TEXT'),
            ('insurance_validity', 'DATE'),
            ('pilot_license_url', 'TEXT'),
            ('id_proof_url', 'TEXT'),
            ('training_certificate_url', 'TEXT'),
            ('photograph_url', 'TEXT'),
            ('insurance_certificate_url', 'TEXT'),
            ('portfolio_url', 'TEXT'),
            ('bank_account', 'TEXT'),
            ('experience', 'TEXT'),
            ('equipment', 'TEXT'),
            ('cities', 'TEXT')
        ]

        for column_name, column_type in new_columns:
            try:
                c.execute(f'ALTER TABLE pilots ADD COLUMN {column_name} {column_type}')
                print(f"Added {column_name} column to pilots table")
            except sqlite3.OperationalError as e:
                if "duplicate column name" not in str(e):
                    print(f"Error adding {column_name} column: {e}")
                else:
                    print(f"{column_name} column already exists")

    # Check if bookings table exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='bookings'")
    if not c.fetchone():
        print("Creating bookings table...")
        c.execute('''
            CREATE TABLE IF NOT EXISTS bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                pilot_id INTEGER,
                editor_id INTEGER,
                referral_id INTEGER,
                admin_comments TEXT,
                industry TEXT,
                preferred_date DATE,
                location TEXT,
                duration INTEGER,
                requirements TEXT,
                status TEXT DEFAULT 'pending',
                pilot_notes TEXT,
                client_notes TEXT,
                drive_link TEXT,
                payment_status TEXT DEFAULT 'pending',
                payment_amount DECIMAL(10,2),
                payment_date TIMESTAMP,
                completed_date TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                category TEXT,
                area_sqft INTEGER,
                num_floors INTEGER,
                base_cost INTEGER,
                final_cost INTEGER,
                custom_quote TEXT,
                description TEXT,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (pilot_id) REFERENCES pilots (id),
                FOREIGN KEY (editor_id) REFERENCES editors (id),
                FOREIGN KEY (referral_id) REFERENCES referrals (id)
            )
        ''')
    else:
        # Add new columns to existing bookings table
        new_columns = [
            ('drive_link', 'TEXT'),
            ('payment_status', 'TEXT DEFAULT "pending"'),
            ('payment_amount', 'DECIMAL(10,2)'),
            ('payment_date', 'TIMESTAMP'),
            ('completed_date', 'TIMESTAMP'),
            ('referral_id', 'INTEGER'),
            ('admin_comments', 'TEXT'),
            ('category', 'TEXT'),
            ('area_sqft', 'INTEGER'),
            ('num_floors', 'INTEGER'),
            ('base_cost', 'INTEGER'),
            ('final_cost', 'INTEGER'),
            ('custom_quote', 'TEXT'),
            ('description', 'TEXT'),
            # Comprehensive booking details
            ('location_address', 'TEXT'),
            ('gps_coordinates', 'TEXT'),
            ('property_type', 'TEXT'),
            ('indoor_outdoor', 'TEXT'),
            ('area_size', 'REAL'),
            ('area_unit', 'TEXT'),
            ('rooms_sections', 'INTEGER'),
            ('preferred_date', 'DATE'),
            ('preferred_time', 'TEXT'),
            ('special_requirements', 'TEXT'),
            ('drone_permissions_required', 'BOOLEAN'),
            ('fpv_tour_type', 'TEXT'),
            ('video_length', 'INTEGER'),
            ('resolution', 'TEXT'),
            ('background_music_voiceover', 'BOOLEAN'),
            ('editing_style', 'TEXT'),
            ('base_package_cost', 'REAL'),
            ('area_covered', 'REAL'),
            ('shooting_hours', 'INTEGER'),
            ('editing_color_grading', 'BOOLEAN'),
            ('voiceover_script', 'BOOLEAN'),
            ('background_music_licensed', 'BOOLEAN'),
            ('branding_overlay', 'BOOLEAN'),
            ('multiple_revisions', 'BOOLEAN'),
            ('drone_licensing_fee', 'BOOLEAN'),
            ('travel_cost', 'REAL'),
            ('tax_percentage', 'REAL'),
            ('discount_code', 'TEXT'),
            ('discount_amount', 'REAL'),
            ('total_cost', 'REAL'),
            ('editor_id', 'INTEGER'),
            ('pilot_id', 'INTEGER'),
            ('delivery_video_link', 'TEXT')
        ]

        for column_name, column_type in new_columns:
            try:
                c.execute(f'ALTER TABLE bookings ADD COLUMN {column_name} {column_type}')
                print(f"Added {column_name} column to bookings table")
            except sqlite3.OperationalError as e:
                if "duplicate column name" not in str(e):
                    print(f"Error adding {column_name} column: {e}")
                else:
                    print(f"{column_name} column already exists")

    # Check if messages table exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='messages'")
    if not c.fetchone():
        print("Creating messages table...")
        c.execute('''
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sender_id INTEGER,
                receiver_id INTEGER,
                message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                read_at TIMESTAMP,
                FOREIGN KEY (sender_id) REFERENCES users (id),
                FOREIGN KEY (receiver_id) REFERENCES users (id)
            )
        ''')
    
    # Check if videos table exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='videos'")
    if not c.fetchone():
        print("Creating videos table...")
        c.execute('''
            CREATE TABLE IF NOT EXISTS videos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                booking_id INTEGER,
                title TEXT,
                description TEXT,
                status TEXT DEFAULT 'pending',
                review_type TEXT,
                drive_link TEXT,
                review_notes TEXT,
                editor_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (booking_id) REFERENCES bookings (id),
                FOREIGN KEY (editor_id) REFERENCES editors (id)
            )
        ''')
    else:
        # Check if editor_id column exists
        c.execute("PRAGMA table_info(videos)")
        columns = [column[1] for column in c.fetchall()]
        if 'editor_id' not in columns:
            print("Adding editor_id column to videos table...")
            c.execute('ALTER TABLE videos ADD COLUMN editor_id INTEGER REFERENCES editors(id)')
            print("editor_id column added successfully")
    
    # Check if referrals table exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='referrals'")
    if not c.fetchone():
        print("Creating referrals table...")
        c.execute('''
            CREATE TABLE IF NOT EXISTS referrals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                email TEXT UNIQUE,
                phone TEXT,
                status TEXT DEFAULT 'pending',
                commission_rate DECIMAL(5,2),
                total_earnings DECIMAL(10,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
    else:
        # Add missing columns to existing referrals table
        new_columns = [
            ('commission_rate', 'DECIMAL(5,2)'),
            ('total_earnings', 'DECIMAL(10,2) DEFAULT 0'),
            ('updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
        ]
        
        for column_name, column_type in new_columns:
            try:
                c.execute(f'ALTER TABLE referrals ADD COLUMN {column_name} {column_type}')
                print(f"Added {column_name} column to referrals table")
            except sqlite3.OperationalError as e:
                if "duplicate column name" not in str(e):
                    print(f"Error adding {column_name} column: {e}")
                else:
                    print(f"{column_name} column already exists")

    # Check if video_reviews table exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='video_reviews'")
    if not c.fetchone():
        print("Creating video_reviews table...")
        c.execute('''
            CREATE TABLE IF NOT EXISTS video_reviews (
                video_id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                client_id INTEGER,
                editor_id INTEGER,
                pilot_id INTEGER,
                drive_link TEXT,
                submitted_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                admin_comments TEXT,
                pilot_comments TEXT,
                editor_comments TEXT,
                status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'review_changes', 'completed', 'forwarded_to_editor')),
                submission_type TEXT DEFAULT 'pilot' CHECK (submission_type IN ('pilot', 'editor')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES bookings (id),
                FOREIGN KEY (client_id) REFERENCES users (id),
                FOREIGN KEY (editor_id) REFERENCES editors (id),
                FOREIGN KEY (pilot_id) REFERENCES pilots (id)
            )
        ''')
        print("video_reviews table created successfully")

    # Check if editors table exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='editors'")
    if not c.fetchone():
        print("Creating editors table...")
        c.execute('''
            CREATE TABLE IF NOT EXISTS editors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                full_name TEXT,
                email TEXT UNIQUE NOT NULL,
                phone TEXT,
                password_hash TEXT NOT NULL,
                role TEXT,
                years_experience INTEGER,
                primary_skills TEXT,
                specialization TEXT,
                portfolio_url TEXT,
                time_zone TEXT,
                government_id_url TEXT,
                tax_gst_number TEXT,
                status TEXT DEFAULT 'active',
                approval_status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
    else:
        # Add missing columns to existing editors table
        new_columns = [
            ('password_hash', 'TEXT'),
            ('experience', 'TEXT'),
            ('equipment', 'TEXT'),
            ('full_name', 'TEXT'),
            ('years_experience', 'INTEGER'),
            ('primary_skills', 'TEXT'),
            ('specialization', 'TEXT'),
            ('portfolio_url', 'TEXT'),
            ('time_zone', 'TEXT'),
            ('government_id_url', 'TEXT'),
            ('tax_gst_number', 'TEXT'),
            ('role', 'TEXT'),
            ('approval_status', 'TEXT DEFAULT "pending"')
        ]

        for column_name, column_type in new_columns:
            try:
                c.execute(f'ALTER TABLE editors ADD COLUMN {column_name} {column_type}')
                print(f"Added {column_name} column to editors table")
            except sqlite3.OperationalError as e:
                if "duplicate column name" not in str(e):
                    print(f"Error adding {column_name} column: {e}")
                else:
                    print(f"{column_name} column already exists")

        # Handle the password column migration
        try:
            # Check if the old password column exists and has NOT NULL constraint
            c.execute("PRAGMA table_info(editors)")
            columns = c.fetchall()
            has_password_column = any(col[1] == 'password' for col in columns)
            has_password_hash_column = any(col[1] == 'password_hash' for col in columns)

            if has_password_column:
                print("Found old password column, performing migration...")

                # If password_hash doesn't exist, copy password data to it
                if not has_password_hash_column:
                    c.execute("ALTER TABLE editors ADD COLUMN password_hash TEXT")
                    print("Added password_hash column")

                # Copy existing password data to password_hash
                c.execute("UPDATE editors SET password_hash = password WHERE password_hash IS NULL AND password IS NOT NULL")

                # Create new table without the password column
                c.execute('''
                    CREATE TABLE editors_new (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        full_name TEXT,
                        email TEXT UNIQUE NOT NULL,
                        phone TEXT,
                        password_hash TEXT NOT NULL,
                        role TEXT,
                        years_experience INTEGER,
                        primary_skills TEXT,
                        specialization TEXT,
                        portfolio_url TEXT,
                        time_zone TEXT,
                        government_id_url TEXT,
                        tax_gst_number TEXT,
                        status TEXT DEFAULT 'active',
                        approval_status TEXT DEFAULT 'pending',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ''')

                # Copy data from old table to new table
                c.execute('''
                    INSERT INTO editors_new (
                        id, name, full_name, email, phone, password_hash, role, years_experience,
                        primary_skills, specialization, portfolio_url, time_zone,
                        government_id_url, tax_gst_number, status, approval_status, created_at
                    )
                    SELECT
                        id, name, full_name, email, phone, password_hash, role, years_experience,
                        primary_skills, specialization, portfolio_url, time_zone,
                        government_id_url, tax_gst_number,
                        COALESCE(status, 'active'),
                        COALESCE(approval_status, 'pending'),
                        created_at
                    FROM editors
                ''')

                # Drop old table and rename new table
                c.execute("DROP TABLE editors")
                c.execute("ALTER TABLE editors_new RENAME TO editors")
                print("Successfully migrated editors table structure")

        except sqlite3.OperationalError as e:
            print(f"Migration error (this might be normal for new installations): {e}")
            pass

    # Check if business_clients table exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='business_clients'")
    if not c.fetchone():
        print("Creating business_clients table...")
        c.execute('''
            CREATE TABLE IF NOT EXISTS business_clients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                business_name TEXT NOT NULL,
                registration_number TEXT NOT NULL,
                organization_type TEXT NOT NULL,
                incorporation_date DATE NOT NULL,
                official_address TEXT NOT NULL,
                official_email TEXT UNIQUE NOT NULL,
                phone TEXT NOT NULL,
                contact_name TEXT NOT NULL,
                contact_person_designation TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                registration_certificate_url TEXT,
                tax_identification_url TEXT,
                business_license_url TEXT,
                address_proof_url TEXT,
                status TEXT DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        print("Business clients table created successfully")
    else:
        print("Business clients table already exists")

    # Check if editor_applications table exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='editor_applications'")
    if not c.fetchone():
        print("Creating editor_applications table...")
        c.execute('''
            CREATE TABLE IF NOT EXISTS editor_applications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                phone TEXT NOT NULL,
                role TEXT NOT NULL,
                years_experience INTEGER NOT NULL,
                primary_skills TEXT NOT NULL,
                specialization TEXT NOT NULL,
                portfolio_url TEXT,
                time_zone TEXT,
                government_id_url TEXT,
                tax_gst_number TEXT,
                password_hash TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                admin_comments TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        print("Editor applications table created successfully")
    else:
        print("Editor applications table already exists")

    # Check if referral_applications table exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='referral_applications'")
    if not c.fetchone():
        print("Creating referral_applications table...")
        c.execute('''
            CREATE TABLE IF NOT EXISTS referral_applications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                phone TEXT NOT NULL,
                location TEXT,
                experience TEXT,
                network_size TEXT,
                referral_strategy TEXT,
                social_media_links TEXT,
                password_hash TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                admin_comments TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        print("Referral applications table created successfully")
    else:
        print("Referral applications table already exists")

    # Check if business_client_applications table exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='business_client_applications'")
    if not c.fetchone():
        print("Creating business_client_applications table...")
        c.execute('''
            CREATE TABLE IF NOT EXISTS business_client_applications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                business_name TEXT NOT NULL,
                registration_number TEXT NOT NULL,
                organization_type TEXT NOT NULL,
                incorporation_date DATE NOT NULL,
                official_address TEXT NOT NULL,
                official_email TEXT UNIQUE NOT NULL,
                phone TEXT NOT NULL,
                contact_name TEXT NOT NULL,
                contact_person_designation TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                registration_certificate_url TEXT,
                tax_identification_url TEXT,
                business_license_url TEXT,
                address_proof_url TEXT,
                status TEXT DEFAULT 'pending',
                admin_comments TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        print("Business client applications table created successfully")
    else:
        print("Business client applications table already exists")

    # Check if inquiries table exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='inquiries'")
    if not c.fetchone():
        print("Creating inquiries table...")
        c.execute('''
            CREATE TABLE IF NOT EXISTS inquiries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                email TEXT,
                phone TEXT,
                message TEXT,
                status TEXT DEFAULT 'new',
                source TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
    
    # Check if payments table exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='payments'")
    if not c.fetchone():
        print("Creating payments table...")
        c.execute('''
            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                booking_id INTEGER,
                amount DECIMAL(10,2),
                status TEXT DEFAULT 'pending',
                payment_method TEXT,
                transaction_id TEXT,
                merchant_transaction_id TEXT,
                phonepe_transaction_id TEXT,
                payment_gateway TEXT DEFAULT 'phonepe',
                gateway_response TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (booking_id) REFERENCES bookings (id)
            )
        ''')
    else:
        # Add PhonePe specific columns to existing payments table
        new_columns = [
            ('merchant_transaction_id', 'TEXT'),
            ('phonepe_transaction_id', 'TEXT'),
            ('payment_gateway', 'TEXT DEFAULT "phonepe"'),
            ('gateway_response', 'TEXT')
        ]
        
        for column_name, column_type in new_columns:
            try:
                c.execute(f'ALTER TABLE payments ADD COLUMN {column_name} {column_type}')
                print(f"Added {column_name} column to payments table")
            except sqlite3.OperationalError as e:
                if "duplicate column name" not in str(e):
                    print(f"Error adding {column_name} column: {e}")
                else:
                    print(f"{column_name} column already exists")
    
    # Check if cancellations table exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='cancellations'")
    if not c.fetchone():
        print("Creating cancellations table...")
        c.execute('''
            CREATE TABLE IF NOT EXISTS cancellations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                booking_id INTEGER,
                reason TEXT,
                status TEXT DEFAULT 'pending',
                refund_amount DECIMAL(10,2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (booking_id) REFERENCES bookings (id)
            )
        ''')
    
    # Check if pre_list table exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='pre_list'")
    if not c.fetchone():
        print("Creating pre_list table...")
        c.execute('''
            CREATE TABLE IF NOT EXISTS pre_list (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                category TEXT,
                status TEXT DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
    
    # Check if pilot_applications table exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='pilot_applications'")
    if not c.fetchone():
        print("Creating pilot_applications table...")
        c.execute('''
            CREATE TABLE IF NOT EXISTS pilot_applications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                full_name TEXT,
                email TEXT UNIQUE NOT NULL,
                phone TEXT,
                password_hash TEXT NOT NULL,
                date_of_birth DATE,
                gender TEXT,
                address TEXT,
                government_id_proof TEXT,
                license_number TEXT,
                issuing_authority TEXT,
                license_issue_date DATE,
                license_expiry_date DATE,
                drone_model TEXT,
                drone_serial TEXT,
                drone_uin TEXT,
                drone_category TEXT,
                total_flying_hours INTEGER,
                flight_records TEXT,
                insurance_policy TEXT,
                insurance_validity DATE,
                pilot_license_url TEXT,
                id_proof_url TEXT,
                training_certificate_url TEXT,
                photograph_url TEXT,
                insurance_certificate_url TEXT,
                cities TEXT,
                experience TEXT,
                equipment TEXT,
                portfolio_url TEXT,
                bank_account TEXT,
                status TEXT DEFAULT 'pending',
                admin_comments TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        print("Pilot applications table created successfully")
    else:
        # Add missing columns to existing pilot_applications table
        new_columns = [
            ('password_hash', 'TEXT'),
            ('full_name', 'TEXT'),
            ('date_of_birth', 'DATE'),
            ('gender', 'TEXT'),
            ('address', 'TEXT'),
            ('government_id_proof', 'TEXT'),
            ('license_number', 'TEXT'),
            ('issuing_authority', 'TEXT'),
            ('license_issue_date', 'DATE'),
            ('license_expiry_date', 'DATE'),
            ('drone_model', 'TEXT'),
            ('drone_serial', 'TEXT'),
            ('drone_uin', 'TEXT'),
            ('drone_category', 'TEXT'),
            ('total_flying_hours', 'INTEGER'),
            ('flight_records', 'TEXT'),
            ('insurance_policy', 'TEXT'),
            ('insurance_validity', 'DATE'),
            ('pilot_license_url', 'TEXT'),
            ('id_proof_url', 'TEXT'),
            ('training_certificate_url', 'TEXT'),
            ('photograph_url', 'TEXT'),
            ('insurance_certificate_url', 'TEXT'),
            ('portfolio_url', 'TEXT'),
            ('bank_account', 'TEXT'),
            ('admin_comments', 'TEXT')
        ]

        for column_name, column_type in new_columns:
            try:
                c.execute(f'ALTER TABLE pilot_applications ADD COLUMN {column_name} {column_type}')
                print(f"Added {column_name} column to pilot_applications table")
            except sqlite3.OperationalError as e:
                if "duplicate column name" not in str(e):
                    print(f"Error adding {column_name} column to pilot_applications: {e}")
                else:
                    print(f"{column_name} column already exists in pilot_applications")
        print("Pilot applications table updated successfully")

    conn.commit()
    conn.close()
    print("Database initialization complete!")
    print("===================\n")

def get_db():
    print(f"\n=== Database Connection ===")
    print(f"Current working directory: {os.getcwd()}")
    print(f"Looking for database at: {os.path.abspath(DATABASE)}")
    print(f"Database exists: {os.path.exists(DATABASE)}")
    
    # Add timeout to prevent database locked errors
    conn = sqlite3.connect(DATABASE, timeout=20.0)
    conn.row_factory = sqlite3.Row
    
    # Verify users table
    cursor = conn.cursor()
    users = cursor.execute('SELECT * FROM users').fetchall()
    print(f"Number of users in database: {len(users)}")
    for user in users:
        print(f"Found user: {user['email']} (ID: {user['id']})")
    print("===================\n")
    
    return conn

# Initialize database
init_db()

# Update the token_required decorator to skip OPTIONS requests
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        print("\n=== Token Verification ===")
        # Skip token check for OPTIONS requests
        if request.method == 'OPTIONS':
            print("Skipping token check for OPTIONS request")
            return '', 200
            
        token = request.headers.get('Authorization')
        if not token:
            print("No token found in Authorization header")
            return jsonify({'message': 'Token is missing'}), 401
        
        try:
            print(f"Received token: {token}")
            if not token.startswith('Bearer '):
                print("Token does not start with 'Bearer '")
                return jsonify({'message': 'Invalid token format'}), 401
                
            token = token.split(' ')[1]  # Remove 'Bearer ' prefix
            print(f"Decoded token (without Bearer): {token}")
            
            # Decode the token
            decoded_token = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            print(f"Decoded token data: {decoded_token}")
            
            # Get user data based on role from token
            role = decoded_token.get('role')
            user_id = decoded_token.get('user_id')
            
            if not role or not user_id:
                print("Token missing role or user_id")
                return jsonify({'message': 'Invalid token data'}), 401
            
            # Get user data based on role
            conn = get_db()
            cursor = conn.cursor()
            
            if role == 'pilot':
                cursor.execute('SELECT * FROM pilots WHERE id = ?', (user_id,))
            elif role == 'editor':
                cursor.execute('SELECT * FROM editors WHERE id = ?', (user_id,))
            elif role == 'referral':
                cursor.execute('SELECT * FROM referrals WHERE id = ?', (user_id,))
            else:
                cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
            
            user = cursor.fetchone()
            conn.close()
            
            if not user:
                print(f"No user found for ID {user_id} with role {role}")
                return jsonify({'message': 'User not found'}), 401
            
            # Create a user object that includes the role from the token
            user_data = dict(user)
            user_data['role'] = role  # Use the role from the token
            user_data['user_id'] = user_id  # Use the user_id from the token

            print("✅ Token verification successful")
            print(f"🔑 Token role: {role}")
            print(f"👤 Token user_id: {user_id}")
            print(f"📋 User data being passed to endpoint: {user_data}")
            print(f"🎯 Endpoint being called: {request.endpoint}")
            print("=" * 50)
            return f(user_data, *args, **kwargs)
            
        except Exception as e:
            print(f"Token verification failed: {str(e)}")
            return jsonify({'message': 'Invalid token'}), 401
    
    return decorated

# Helper functions
def get_user_by_id(user_id):
    print(f"\n=== Looking up user by ID ===")
    print(f"ID to find: {user_id}")
    
    conn = get_db()
    
    # First check users table
    user = conn.execute('SELECT *, "client" as role FROM users WHERE id = ?', (user_id,)).fetchone()
    
    if not user:
        # If not found in users, check pilots table
        user = conn.execute('SELECT *, "pilot" as role FROM pilots WHERE id = ?', (user_id,)).fetchone()
    
    conn.close()
    
    if user:
        print(f"Found user in database:")
        print(f"ID: {user['id']}")
        print(f"Email: {user['email']}")
        print(f"Role: {user['role']}")
        if 'approval_status' in user:
            print(f"Approval: {user['approval_status']}")
        elif 'status' in user:
            print(f"Status: {user['status']}")
        print()
    else:
        print("No user found with that ID\n")
    
    return dict(user) if user else None

def get_user_by_email(email):
    print(f"\n=== Looking up user by email ===")
    print(f"Email to find: {email}")
    
    conn = get_db()
    user = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
    conn.close()
    
    if user:
        print(f"Found user in database:")
        print(f"ID: {user['id']}")
        print(f"Email: {user['email']}")
        print(f"Role: {user['role']}")
        print(f"Approval: {user['approval_status']}\n")
    else:
        print("No user found with that email\n")
    
    return dict(user) if user else None

# Routes
@app.route('/api/auth/register', methods=['POST', 'OPTIONS'])
def register():
    # Handle preflight request
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept')
        response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        print("\n=== New User Registration ===")
        print(f"Request headers: {dict(request.headers)}")
        print(f"Request method: {request.method}")
        print(f"Request content type: {request.content_type}")
        
        # Get and validate request data
        try:
            data = request.get_json()
            print(f"Registration data received: {data}")
        except Exception as e:
            print(f"Error parsing JSON data: {str(e)}")
            return jsonify({'message': 'Invalid JSON data'}), 400
        
        if not data:
            print("No data received in request")
            return jsonify({'message': 'No data received'}), 400

        # Validate required fields
        required_fields = [
            'business_name', 'contact_name', 'email', 'phone', 'password',
            'registration_number', 'organization_type', 'incorporation_date',
            'official_address', 'official_email', 'contact_person_designation'
        ]
        missing_fields = [field for field in required_fields if field not in data or not data[field]]
        if missing_fields:
            print(f"Missing required fields: {missing_fields}")
            return jsonify({'message': f'Missing required fields: {", ".join(missing_fields)}'}), 400

        # Validate email format
        if '@' not in data['email'] or '.' not in data['email']:
            print(f"Invalid email format: {data['email']}")
            return jsonify({'message': 'Invalid email format'}), 400

        # Validate official email format
        if '@' not in data['official_email'] or '.' not in data['official_email']:
            print(f"Invalid official email format: {data['official_email']}")
            return jsonify({'message': 'Invalid official email format'}), 400

        # Validate password length
        if len(data['password']) < 8:
            print("Password too short")
            return jsonify({'message': 'Password must be at least 8 characters long'}), 400

        # Validate incorporation date format (YYYY-MM-DD)
        try:
            from datetime import datetime
            datetime.strptime(data['incorporation_date'], '%Y-%m-%d')
        except ValueError:
            print(f"Invalid incorporation date format: {data['incorporation_date']}")
            return jsonify({'message': 'Invalid incorporation date format. Use YYYY-MM-DD'}), 400

        # Validate organization type
        valid_org_types = ['Private Limited', 'Public Limited', 'Partnership', 'LLP', 'Sole Proprietorship', 'NGO', 'Trust', 'Society', 'Other']
        if data['organization_type'] not in valid_org_types:
            print(f"Invalid organization type: {data['organization_type']}")
            return jsonify({'message': f'Invalid organization type. Must be one of: {", ".join(valid_org_types)}'}), 400

        # Check if email already exists in applications or main table
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT id FROM business_client_applications WHERE email = ? OR official_email = ?',
                      (data['email'], data['official_email']))
        if cursor.fetchone():
            print(f"Email {data['email']} or official email {data['official_email']} already has pending application")
            conn.close()
            return jsonify({'message': 'Application already submitted with this email'}), 400

        cursor.execute('SELECT id FROM business_clients WHERE email = ? OR official_email = ?',
                      (data['email'], data['official_email']))
        if cursor.fetchone():
            print(f"Email {data['email']} or official email {data['official_email']} already registered")
            conn.close()
            return jsonify({'message': 'Email already registered'}), 400

        try:
            # Generate password hash using werkzeug
            password_hash = generate_password_hash(data['password'])
            print("Password hash generated successfully")

            # Insert new business client application
            cursor.execute('''
                INSERT INTO business_client_applications (
                    business_name,
                    registration_number,
                    organization_type,
                    incorporation_date,
                    official_address,
                    official_email,
                    phone,
                    contact_name,
                    contact_person_designation,
                    email,
                    password_hash,
                    registration_certificate_url,
                    tax_identification_url,
                    business_license_url,
                    address_proof_url
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                data['business_name'],
                data['registration_number'],
                data['organization_type'],
                data['incorporation_date'],
                data['official_address'],
                data['official_email'],
                data['phone'],
                data['contact_name'],
                data['contact_person_designation'],
                data['email'],
                password_hash,
                data.get('registration_certificate_url', ''),
                data.get('tax_identification_url', ''),
                data.get('business_license_url', ''),
                data.get('address_proof_url', '')
            ))
            print("Business client application submitted to database")

            # Commit transaction
            conn.commit()
            application_id = cursor.lastrowid
            print(f"New business client application created with ID: {application_id}")
            print(f"Email: {data['email']}")
            print(f"Business: {data['business_name']}")
            print(f"Status: pending")

            # Close database connection
            conn.close()
            print("Database connection closed")

            response = jsonify({
                'message': 'Business application submitted successfully. Please wait for admin approval.',
                'application_id': application_id
            })
            response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
            response.headers.add('Access-Control-Allow-Credentials', 'true')
            return response, 201

        except sqlite3.Error as e:
            print(f"Database error: {str(e)}")
            print(f"Error type: {type(e)}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            return jsonify({'message': f'Database error: {str(e)}'}), 500

    except Exception as e:
        print(f"Unexpected error during registration: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        response = jsonify({'message': 'Registration failed due to an unexpected error'})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 500

@app.route('/api/auth/login', methods=['POST', 'OPTIONS'])
def login():
    # Handle preflight request
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept')
        response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        print("\n=== Login Attempt ===")
        print(f"Request headers: {dict(request.headers)}")
        print(f"Request method: {request.method}")
        print(f"Request content type: {request.content_type}")

        # Get and validate request data
        try:
            data = request.get_json()
            print(f"Login data received: {data}")
        except Exception as e:
            print(f"Error parsing JSON data: {str(e)}")
            return jsonify({'message': 'Invalid JSON data'}), 400

        if not data:
            print("No data received in request")
            return jsonify({'message': 'No data received'}), 400

        # Validate required fields
        if 'email' not in data or not data['email']:
            print("Email is required")
            return jsonify({'message': 'Email is required'}), 400
        if 'password' not in data or not data['password']:
            print("Password is required")
            return jsonify({'message': 'Password is required'}), 400

        email = data['email']
        password = data['password']
        print(f"Attempting login for email: {email}")

        # First check pilots table
        conn = get_db()
        cursor = conn.cursor()
        
        print("Checking pilots table...")
        cursor.execute('SELECT * FROM pilots WHERE email = ?', (email,))
        pilot = cursor.fetchone()
        
        if pilot:
            print("Found pilot in database")
            pilot_dict = dict(pilot)
            print(f"Pilot status: {pilot_dict['status']}")
            
            # Check if pilot has password_hash or password field
            password_field = pilot_dict.get('password_hash') or pilot_dict.get('password')
            if password_field:
                print(f"Pilot password hash: {password_field[:20]}...")
            else:
                print("No password field found for pilot")
                return jsonify({'message': 'Invalid email or password'}), 401
            
            if pilot_dict['status'] == 'pending':
                print("Pilot is pending approval")
                return jsonify({'message': 'Your account is pending approval'}), 403
            
            print("Verifying pilot password...")
            password_check = verify_password(password, password_field)
            print(f"Password verification result: {password_check}")
            
            if password_check:
                print("Password verified for pilot")
                token_data = {
                    'user_id': pilot_dict['id'],
                    'role': 'pilot',
                    'exp': datetime.utcnow() + timedelta(days=1)
                }
                print(f"Token data: {token_data}")
                token = jwt.encode(token_data, app.config['SECRET_KEY'])
                print("Generated token for pilot")
                
                response = jsonify({
                    'token': token,
                    'role': 'pilot',
                    'user_id': pilot_dict['id']
                })
                response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
                response.headers.add('Access-Control-Allow-Credentials', 'true')
                return response
            else:
                print("Invalid password for pilot")
                return jsonify({'message': 'Invalid email or password'}), 401
        
        # Check editors table
        print("Pilot not found, checking editors table...")
        cursor.execute('SELECT * FROM editors WHERE email = ?', (email,))
        editor = cursor.fetchone()
        
        if editor:
            print("Found editor in database")
            editor_dict = dict(editor)
            print(f"Editor status: {editor_dict['status']}")
            
            # Check if editor has password_hash or password field
            password_field = editor_dict.get('password_hash') or editor_dict.get('password')
            if password_field:
                print(f"Editor password hash: {password_field[:20]}...")
            else:
                print("No password field found for editor")
                return jsonify({'message': 'Invalid email or password'}), 401
            
            if editor_dict['status'] == 'pending':
                print("Editor is pending approval")
                return jsonify({'message': 'Your account is pending approval'}), 403
            
            print("Verifying editor password...")
            password_check = verify_password(password, password_field)
            print(f"Password verification result: {password_check}")
            
            if password_check:
                print("Password verified for editor")
                token_data = {
                    'user_id': editor_dict['id'],
                    'role': 'editor',
                    'exp': datetime.utcnow() + timedelta(days=1)
                }
                print(f"Token data: {token_data}")
                token = jwt.encode(token_data, app.config['SECRET_KEY'])
                print("Generated token for editor")
                
                response = jsonify({
                    'token': token,
                    'role': 'editor',
                    'user_id': editor_dict['id']
                })
                response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
                response.headers.add('Access-Control-Allow-Credentials', 'true')
                return response
            else:
                print("Invalid password for editor")
                return jsonify({'message': 'Invalid email or password'}), 401
        
        # Check users table (for all user types including clients and admins)
        print("Checking users table...")
        cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
        user = cursor.fetchone()

        if user:
            user_dict = dict(user)
            user_role = user_dict.get('role', 'admin')
            print(f"Found user in database with role: {user_role}")
            print(f"User password hash: {user_dict['password_hash'][:20]}...")

            print("Verifying user password...")
            password_check = verify_password(password, user_dict['password_hash'])
            print(f"Password verification result: {password_check}")

            if password_check:
                print(f"Password verified for {user_role} user")

                # For clients, also get business details
                business_name = None
                if user_role == 'client':
                    cursor.execute('SELECT business_name FROM business_clients WHERE email = ?', (email,))
                    business_result = cursor.fetchone()
                    if business_result:
                        business_name = business_result[0]

                token_data = {
                    'user_id': user_dict['id'],
                    'email': user_dict['email'],
                    'role': user_role,
                    'exp': datetime.utcnow() + timedelta(days=1)
                }
                print(f"Token data: {token_data}")
                token = jwt.encode(token_data, app.config['SECRET_KEY'])
                print(f"Generated token for {user_role} user")

                response_data = {
                    'token': token,
                    'role': user_role,
                    'user_id': user_dict['id']
                }

                # Add business name for clients
                if business_name:
                    response_data['business_name'] = business_name

                response = jsonify(response_data)
                response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
                response.headers.add('Access-Control-Allow-Credentials', 'true')
                return response
            else:
                print("Invalid password for user")
                return jsonify({'message': 'Invalid email or password'}), 401
        else:
            print("User not found in users table")
            return jsonify({'message': 'Invalid email or password'}), 401
        
        conn.close()

    except Exception as e:
        print(f"Unexpected error during login: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        response = jsonify({'message': 'Login failed due to an unexpected error'})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 500

@app.route('/api/auth/verify', methods=['GET'])
@token_required
def verify_token(current_user):
    try:
        print('\n=== Verifying Token ===')
        print('User data received:', current_user)
        
        # Return the user data with the role from the token
        return jsonify({
            'user_id': current_user['user_id'],
            'email': current_user['email'],
            'role': current_user['role'],
            'approval_status': current_user.get('status', current_user.get('approval_status', 'approved'))
        })
        
    except Exception as e:
        print('Error in verify_token:', str(e))
        return jsonify({'error': 'Token verification failed'}), 401

@app.route('/api/bookings', methods=['GET', 'POST', 'OPTIONS'])
@token_required
def get_bookings(current_user):
    def calculate_cost(category, area_sqft, num_floors):
        COSTING_TABLE = {
            "Retail Store / Showroom":      [5999,  9999,  15999, 20999, None],
            "Restaurants & Cafes":          [7999, 11999, 19999, 25999, None],
            "Fitness & Sports Arenas":      [9999, 13999, 22999, 31999, None],
            "Resorts & Farmstays / Hotels": [11999,17999, 29999, 39999, None],
            "Real Estate Property":         [13999,23999, 37999, 49999, None],
            "Shopping Mall / Complex":      [15999,29999, 47999, 63999, None],
            "Adventure / Water Parks":      [12999,23999, 39999, 55999, None],
            "Gaming & Entertainment Zones": [10999,19999, 33999, 45999, None],
        }
        area_ranges = [1000, 5000, 10000, 50000]
        if category not in COSTING_TABLE:
            return None, None, "Invalid category"
        if area_sqft > 50000:
            return None, None, "Custom Quote"
        # Find index for area
        idx = 0
        for i, max_area in enumerate(area_ranges):
            if area_sqft <= max_area:
                idx = i
                break
            idx = i + 1
        base_cost = COSTING_TABLE[category][idx]
        if base_cost is None:
            return None, None, "Custom Quote"
        # Floor adjustment
        if num_floors is None or num_floors < 1:
            num_floors = 1
        final_cost = int(base_cost * (1 + 0.1 * (num_floors - 1)))
        return base_cost, final_cost, None

    if request.method == 'POST':
        data = request.json
        print("\n=== Creating New Comprehensive Booking ===")
        print(f"Request headers: {dict(request.headers)}")
        print(f"Current user: {current_user}")
        print(f"Booking data: {data}")
        try:
            # Validate required fields for comprehensive booking
            required_fields = [
                'location_address', 'property_type', 'indoor_outdoor', 'area_size',
                'rooms_sections', 'preferred_date', 'preferred_time', 'fpv_tour_type',
                'video_length', 'resolution', 'editing_style'
            ]

            for field in required_fields:
                if field not in data or not data[field]:
                    print(f"Missing or empty required field: {field}")
                    return jsonify({'message': f'Missing required field: {field}'}), 400

            # Validate data types
            try:
                area_size = float(data['area_size'])
                if area_size <= 0:
                    return jsonify({'message': 'Area size must be positive'}), 400
            except (ValueError, TypeError):
                return jsonify({'message': 'Area size must be a valid number'}), 400

            try:
                rooms_sections = int(data['rooms_sections'])
                if rooms_sections <= 0:
                    return jsonify({'message': 'Rooms/sections must be positive'}), 400
            except (ValueError, TypeError):
                return jsonify({'message': 'Rooms/sections must be a valid number'}), 400

            try:
                video_length = int(data['video_length'])
                if video_length <= 0:
                    return jsonify({'message': 'Video length must be positive'}), 400
            except (ValueError, TypeError):
                return jsonify({'message': 'Video length must be a valid number'}), 400

            # Verify user exists
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute('SELECT id FROM users WHERE id = ?', (current_user['id'],))
            if not cursor.fetchone():
                print(f"User not found: {current_user['id']}")
                return jsonify({'message': 'User not found'}), 404

            print("Inserting comprehensive booking into database...")
            cursor.execute('''
                INSERT INTO bookings (
                    user_id, location_address, gps_coordinates, property_type, indoor_outdoor,
                    area_size, area_unit, rooms_sections, preferred_date, preferred_time,
                    special_requirements, drone_permissions_required, fpv_tour_type, video_length,
                    resolution, background_music_voiceover, editing_style, base_package_cost,
                    shooting_hours, editing_color_grading, voiceover_script, background_music_licensed,
                    branding_overlay, multiple_revisions, drone_licensing_fee, travel_cost,
                    tax_percentage, discount_code, discount_amount, total_cost, status, payment_status
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending'
                )
            ''', (
                current_user['id'],
                data['location_address'],
                data.get('gps_coordinates', ''),
                data['property_type'],
                data['indoor_outdoor'],
                area_size,
                data.get('area_unit', 'sq_ft'),
                rooms_sections,
                data['preferred_date'],
                data['preferred_time'],
                data.get('special_requirements', ''),
                data.get('drone_permissions_required', False),
                data['fpv_tour_type'],
                video_length,
                data['resolution'],
                data.get('background_music_voiceover', False),
                data['editing_style'],
                data.get('base_package_cost', 0),
                data.get('shooting_hours', 1),
                data.get('editing_color_grading', False),
                data.get('voiceover_script', False),
                data.get('background_music_licensed', False),
                data.get('branding_overlay', False),
                data.get('multiple_revisions', False),
                data.get('drone_licensing_fee', False),
                data.get('travel_cost', 0),
                data.get('tax_percentage', 18),
                data.get('discount_code', ''),
                data.get('discount_amount', 0),
                data.get('total_cost', 0)
            ))

            conn.commit()
            booking_id = cursor.lastrowid
            print(f"Created comprehensive booking with ID: {booking_id}")
            conn.close()

            return jsonify({
                'message': 'Comprehensive booking created successfully',
                'booking_id': booking_id,
                'total_cost': data.get('total_cost', 0)
            }), 201

        except sqlite3.Error as e:
            print(f"Database error: {str(e)}")
            print(f"Error type: {type(e)}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            return jsonify({'message': f'Database error: {str(e)}'}), 500
        except Exception as e:
            print(f"Unexpected error: {str(e)}")
            print(f"Error type: {type(e)}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            return jsonify({'message': f'Failed to create booking: {str(e)}'}), 500
    
    print("\n=== Fetching Bookings ===")
    print(f"User role: {current_user['role']}")
    
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        if current_user['role'] == 'admin':
            # Admin sees all bookings with user and pilot details
            cursor.execute('''
                SELECT b.*, 
                       u.business_name, u.contact_name, u.email as client_email,
                       p.name as pilot_name, p.email as pilot_email
                FROM bookings b
                LEFT JOIN users u ON b.user_id = u.id
                LEFT JOIN pilots p ON b.pilot_id = p.id
                ORDER BY b.created_at DESC
            ''')
        elif current_user['role'] == 'pilot':
            # Show all available bookings and bookings assigned to this pilot, regardless of city
            cursor.execute('''
                SELECT b.*, 
                       u.business_name, u.contact_name, u.email as client_email,
                       CASE 
                           WHEN b.pilot_id = ? THEN 'assigned'
                           WHEN b.status = 'available' THEN 'available'
                           ELSE 'unavailable'
                       END as booking_status
                FROM bookings b
                LEFT JOIN users u ON b.user_id = u.id
                WHERE b.status = 'available' OR b.pilot_id = ?
                ORDER BY b.created_at DESC
            ''', (current_user.get('id', current_user.get('user_id')), current_user.get('id', current_user.get('user_id'))))
        else:
            # Clients see their own bookings
            cursor.execute('''
                SELECT b.*, 
                       p.name as pilot_name, p.email as pilot_email
                FROM bookings b
                LEFT JOIN pilots p ON b.pilot_id = p.id
                WHERE b.user_id = ?
                ORDER BY b.created_at DESC
            ''', (current_user['id'],))
        
        bookings = cursor.fetchall()
        print(f"Found {len(bookings)} bookings")
        conn.close()
        
        return jsonify([dict(booking) for booking in bookings])
    except Exception as e:
        print(f"Error fetching bookings: {str(e)}")
        return jsonify({'message': 'Failed to fetch bookings'}), 500

@app.route('/api/bookings/<int:booking_id>/claim', methods=['POST', 'OPTIONS'])
@token_required
def claim_booking(current_user, booking_id):
    if current_user['role'] != 'pilot':
        return jsonify({'message': 'Only pilots can claim bookings'}), 403
        
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # Check if booking exists and is available
        cursor.execute('''
            SELECT * FROM bookings 
            WHERE id = ? AND status = 'available'
        ''', (booking_id,))
        booking = cursor.fetchone()
        
        if not booking:
            return jsonify({'message': 'Booking not found or not available'}), 404
            
        # Update booking with pilot assignment
        pilot_id = current_user.get('id', current_user.get('user_id'))
        cursor.execute('''
            UPDATE bookings
            SET pilot_id = ?, status = 'assigned', updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND status = 'available'
        ''', (pilot_id, booking_id))
        
        if cursor.rowcount == 0:
            return jsonify({'message': 'Booking was claimed by another pilot'}), 409
            
        conn.commit()
        print(f"Booking {booking_id} claimed by pilot {pilot_id}")
        conn.close()
        
        return jsonify({'message': 'Booking claimed successfully'})
    except Exception as e:
        print(f"Error claiming booking: {str(e)}")
        return jsonify({'message': 'Failed to claim booking'}), 500

@app.route('/api/bookings/<int:booking_id>', methods=['PUT', 'OPTIONS'])
@token_required
def update_booking(current_user, booking_id):
    data = request.json
    print(f"\n=== Updating Booking {booking_id} ===")
    print(f"Update data: {data}")
    
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # Check if booking exists and user has permission
        cursor.execute('SELECT * FROM bookings WHERE id = ?', (booking_id,))
        booking = cursor.fetchone()
        
        if not booking:
            return jsonify({'message': 'Booking not found'}), 404
            
        if current_user['role'] == 'client' and booking['user_id'] != current_user['id']:
            return jsonify({'message': 'Unauthorized'}), 403
            
        # Update booking based on user role
        if current_user['role'] == 'admin':
            # Admin can update any field
            cursor.execute('''
                UPDATE bookings 
                SET status = ?, pilot_notes = ?, client_notes = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (data.get('status'), data.get('pilot_notes'), data.get('client_notes'), booking_id))
        elif current_user['role'] == 'pilot':
            # Pilots can update status and notes for their assigned bookings
            pilot_id = current_user.get('id', current_user.get('user_id'))
            if booking['pilot_id'] != pilot_id:
                return jsonify({'message': 'Unauthorized'}), 403
            cursor.execute('''
                UPDATE bookings
                SET status = ?, pilot_notes = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND pilot_id = ?
            ''', (data.get('status'), data.get('pilot_notes'), booking_id, pilot_id))
        else:
            # Clients can update their notes
            cursor.execute('''
                UPDATE bookings 
                SET client_notes = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND user_id = ?
            ''', (data.get('client_notes'), booking_id, current_user['id']))
            
        conn.commit()
        print("Booking updated successfully")
        conn.close()
        
        return jsonify({'message': 'Booking updated successfully'})
    except Exception as e:
        print(f"Error updating booking: {str(e)}")
        return jsonify({'message': 'Failed to update booking'}), 500

@app.route('/api/bookings/<int:booking_id>/complete', methods=['POST'])
@token_required
def complete_booking(current_user, booking_id):
    if current_user['role'] != 'pilot':
        return jsonify({'message': 'Only pilots can complete bookings'}), 403
        
    data = request.json
    if not data.get('drive_link'):
        return jsonify({'message': 'Drive link is required to complete the booking'}), 400
        
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # Check if booking exists and is assigned to this pilot
        pilot_id = current_user.get('id', current_user.get('user_id'))
        cursor.execute('''
            SELECT * FROM bookings
            WHERE id = ? AND pilot_id = ? AND status = 'in_progress'
        ''', (booking_id, pilot_id))
        booking = cursor.fetchone()
        
        if not booking:
            return jsonify({'message': 'Booking not found or not in progress'}), 404
            
        # Update booking with completion details
        cursor.execute('''
            UPDATE bookings 
            SET status = 'completed',
                drive_link = ?,
                completed_date = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND pilot_id = ?
        ''', (data['drive_link'], booking_id, pilot_id))
        
        conn.commit()
        print(f"Booking {booking_id} completed by pilot {pilot_id}")
        conn.close()
        
        return jsonify({'message': 'Booking completed successfully'})
    except Exception as e:
        print(f"Error completing booking: {str(e)}")
        return jsonify({'message': 'Failed to complete booking'}), 500

@app.route('/api/bookings/<int:booking_id>/payment', methods=['POST'])
@token_required
def process_payment(current_user, booking_id):
    if current_user['role'] != 'client':
        return jsonify({'message': 'Only clients can make payments'}), 403
        
    data = request.json
    if not data.get('amount'):
        return jsonify({'message': 'Payment amount is required'}), 400
        
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # Check if booking exists and belongs to this client
        cursor.execute('''
            SELECT * FROM bookings 
            WHERE id = ? AND user_id = ? AND status = 'completed'
        ''', (booking_id, current_user['id']))
        booking = cursor.fetchone()
        
        if not booking:
            return jsonify({'message': 'Booking not found or not completed'}), 404
            
        # Update booking with payment details
        cursor.execute('''
            UPDATE bookings 
            SET payment_status = 'paid',
                payment_amount = ?,
                payment_date = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
        ''', (data['amount'], booking_id, current_user['id']))
        
        conn.commit()
        print(f"Payment processed for booking {booking_id} by client {current_user['id']}")
        conn.close()
        
        return jsonify({'message': 'Payment processed successfully'})
    except Exception as e:
        print(f"Error processing payment: {str(e)}")
        return jsonify({'message': 'Failed to process payment'}), 500

@app.route('/api/bookings/<int:booking_id>/start', methods=['POST'])
@token_required
def start_booking(current_user, booking_id):
    if current_user['role'] != 'pilot':
        return jsonify({'message': 'Only pilots can start bookings'}), 403
        
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # Check if booking exists and is assigned to this pilot
        pilot_id = current_user.get('id', current_user.get('user_id'))
        cursor.execute('''
            SELECT * FROM bookings
            WHERE id = ? AND pilot_id = ? AND status = 'assigned'
        ''', (booking_id, pilot_id))
        booking = cursor.fetchone()
        
        if not booking:
            return jsonify({'message': 'Booking not found or not assigned'}), 404
            
        # Update booking status to in_progress
        cursor.execute('''
            UPDATE bookings 
            SET status = 'in_progress',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND pilot_id = ?
        ''', (booking_id, pilot_id))
        
        conn.commit()
        print(f"Booking {booking_id} started by pilot {pilot_id}")
        conn.close()
        
        return jsonify({'message': 'Booking started successfully'})
    except Exception as e:
        print(f"Error starting booking: {str(e)}")
        return jsonify({'message': 'Failed to start booking'}), 500

# Client Profile Update
@app.route('/api/clients/profile', methods=['PUT'])
@token_required
def update_client_profile(current_user):
    if current_user['role'] != 'client':
        return jsonify({'message': 'Unauthorized'}), 403

    data = request.get_json()
    required_fields = ['business_name', 'contact_name', 'phone']
    
    # Validate required fields
    for field in required_fields:
        if field not in data:
            return jsonify({'message': f'Missing required field: {field}'}), 400

    try:
        conn = get_db()
        cursor = conn.cursor()

        # Update client profile
        cursor.execute('''
            UPDATE clients 
            SET business_name = ?, contact_name = ?, phone = ?
            WHERE user_id = ?
        ''', (data['business_name'], data['contact_name'], data['phone'], current_user['id']))

        # Update users table for contact name
        cursor.execute('''
            UPDATE users 
            SET contact_name = ?
            WHERE id = ?
        ''', (data['contact_name'], current_user['id']))

        conn.commit()
        conn.close()

        return jsonify({
            'message': 'Profile updated successfully',
            'business_name': data['business_name'],
            'contact_name': data['contact_name'],
            'phone': data['phone']
        }), 200

    except Exception as e:
        print(f"Error updating client profile: {str(e)}")
        return jsonify({'message': 'Failed to update profile'}), 500

# Client Password Update
@app.route('/api/clients/password', methods=['PUT'])
@token_required
def update_client_password(current_user):
    if current_user['role'] != 'client':
        return jsonify({'message': 'Unauthorized'}), 403

    data = request.get_json()
    required_fields = ['current_password', 'new_password']
    
    # Validate required fields
    for field in required_fields:
        if field not in data:
            return jsonify({'message': f'Missing required field: {field}'}), 400

    try:
        conn = get_db()
        cursor = conn.cursor()

        # Get current user's password hash
        cursor.execute('SELECT password_hash FROM users WHERE id = ?', (current_user['id'],))
        user = cursor.fetchone()

        if not user:
            return jsonify({'message': 'User not found'}), 404

        # Verify current password
        if not verify_password(data['current_password'], user['password_hash']):
            return jsonify({'message': 'Current password is incorrect'}), 400

        # Hash new password
        new_password_hash = generate_password_hash(data['new_password'])

        # Update password
        cursor.execute('''
            UPDATE users 
            SET password_hash = ?
            WHERE id = ?
        ''', (new_password_hash, current_user['id']))

        conn.commit()
        conn.close()

        return jsonify({'message': 'Password updated successfully'}), 200

    except Exception as e:
        print(f"Error updating client password: {str(e)}")
        return jsonify({'message': 'Failed to update password'}), 500

# Client Account Deletion
@app.route('/api/clients/account', methods=['DELETE'])
@token_required
def delete_client_account(current_user):
    if current_user['role'] != 'client':
        return jsonify({'message': 'Unauthorized'}), 403

    try:
        conn = get_db()
        cursor = conn.cursor()

        # Start transaction
        cursor.execute('BEGIN TRANSACTION')

        try:
            # Delete client's bookings
            cursor.execute('DELETE FROM bookings WHERE client_id = ?', (current_user['id'],))

            # Delete client record
            cursor.execute('DELETE FROM clients WHERE user_id = ?', (current_user['id'],))

            # Delete user record
            cursor.execute('DELETE FROM users WHERE id = ?', (current_user['id'],))

            # Commit transaction
            cursor.execute('COMMIT')
            conn.close()

            return jsonify({'message': 'Account deleted successfully'}), 200

        except Exception as e:
            # Rollback transaction on error
            cursor.execute('ROLLBACK')
            raise e

    except Exception as e:
        print(f"Error deleting client account: {str(e)}")
        return jsonify({'message': 'Failed to delete account'}), 500

# Helper function to verify password
def verify_password(password, password_hash):
    try:
        print(f"\n=== Password Verification ===")
        print(f"Password hash format: {password_hash[:20]}...")
        
        # Use werkzeug's password verification
        result = werkzeug.security.check_password_hash(password_hash, password)
        print(f"Password verification result: {result}")
        return result
            
    except Exception as e:
        print(f"Error verifying password: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return False

# Helper function to generate password hash
def generate_password_hash(password):
    # Use werkzeug's password hashing
    return werkzeug.security.generate_password_hash(password)

@app.route('/api/admin/users', methods=['GET', 'OPTIONS'])
@token_required
def get_users(current_user):
    # Handle preflight request
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept')
        response.headers.add('Access-Control-Allow-Methods', 'GET,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    print("\n=== Admin Users Request ===")
    print(f"Requesting user role: {current_user['role']}")
    
    if current_user['role'] != 'admin':
        print("Unauthorized access attempt")
        response = jsonify({'message': 'Unauthorized'}), 403
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    
    try:
        conn = get_db()
        users = conn.execute('SELECT * FROM users').fetchall()
        conn.close()
        
        users_list = [dict(user) for user in users]
        print(f"Found {len(users_list)} users:")
        for user in users_list:
            print(f"- {user['email']} (Status: {user['approval_status']})")
        
        response = jsonify(users_list)
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    except Exception as e:
        print(f"Error fetching users: {str(e)}")
        response = jsonify({'message': 'Error fetching users'}), 500
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

@app.route('/api/admin/users/<int:user_id>/approval', methods=['PUT', 'OPTIONS'])
@token_required
def update_user_approval(current_user, user_id):
    # Handle preflight request
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept')
        response.headers.add('Access-Control-Allow-Methods', 'PUT,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    print(f"\n=== Update User Approval ===")
    print(f"Requesting user role: {current_user['role']}")
    print(f"Target user ID: {user_id}")
    
    if current_user['role'] != 'admin':
        print("Unauthorized access attempt")
        response = jsonify({'message': 'Unauthorized'}), 403
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    
    try:
        data = request.get_json()
        if not data or 'approval_status' not in data:
            return jsonify({'error': 'approval_status is required'}), 400
        
        approval_status = data['approval_status']
        if approval_status not in ['pending', 'approved', 'rejected']:
            return jsonify({'error': 'Invalid approval status'}), 400
        
        conn = get_db()
        c = conn.cursor()
        
        # Check if user exists
        c.execute('SELECT id FROM users WHERE id = ?', (user_id,))
        if not c.fetchone():
            return jsonify({'error': 'User not found'}), 404
        
        # Update approval status
        c.execute('UPDATE users SET approval_status = ? WHERE id = ?', (approval_status, user_id))
        conn.commit()
        conn.close()
        
        print(f"User {user_id} approval status updated to: {approval_status}")
        
        response = jsonify({'message': f'User approval status updated to {approval_status}'})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
        
    except Exception as e:
        print(f"Error updating user approval: {str(e)}")
        response = jsonify({'message': 'Error updating user approval'}), 500
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

@app.route('/api/admin/pilots', methods=['GET', 'POST', 'OPTIONS'])
@token_required
def manage_pilots(current_user):
    if request.method == 'OPTIONS':
        return '', 200
        
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    if request.method == 'POST':
        try:
            data = request.get_json()
            required_fields = ['name', 'email', 'phone', 'password']
            
            # Validate required fields
            for field in required_fields:
                if field not in data:
                    return jsonify({'error': f'Missing required field: {field}'}), 400

            conn = get_db()
            c = conn.cursor()

            # Check if email already exists
            c.execute('SELECT id FROM pilots WHERE email = ?', (data['email'],))
            if c.fetchone():
                return jsonify({'error': 'Email already registered'}), 400

            # Hash password
            hashed_password = generate_password_hash(data['password'])

            # Insert new pilot
            c.execute('''
                INSERT INTO pilots (name, email, phone, password_hash, status)
                VALUES (?, ?, ?, ?, 'active')
            ''', (data['name'], data['email'], data['phone'], hashed_password))
            
            conn.commit()
            return jsonify({'message': 'Pilot added successfully'}), 201

        except Exception as e:
            print(f"Error adding pilot: {e}")
            return jsonify({'error': 'Internal server error'}), 500

    # GET method
    try:
        conn = get_db()
        c = conn.cursor()
        
        # Fetch pilots with error handling for each column
        c.execute('SELECT id, name, email, phone, status, created_at FROM pilots')
        pilots = c.fetchall()
        
        pilots_list = []
        for pilot in pilots:
            try:
                pilot_dict = {
                    'id': pilot[0],
                    'name': pilot[1],
                    'email': pilot[2],
                    'phone': pilot[3],
                    'status': pilot[4],
                    'created_at': pilot[5] if len(pilot) > 5 else None
                }
                pilots_list.append(pilot_dict)
            except Exception as e:
                print(f"Error processing pilot data: {e}")
                print(f"Problematic pilot data: {pilot}")
                continue

        print(f"Successfully fetched {len(pilots_list)} pilots")
        return jsonify(pilots_list)

    except Exception as e:
        print(f"Error fetching pilots: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/admin/pilots/<int:pilot_id>', methods=['GET', 'PUT', 'DELETE', 'OPTIONS'])
@token_required
def manage_pilot(current_user, pilot_id):
    if request.method == 'OPTIONS':
        return '', 200
        
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    try:
        conn = get_db()
        c = conn.cursor()

        if request.method == 'GET':
            c.execute('SELECT id, name, email, phone, status, created_at FROM pilots WHERE id = ?', (pilot_id,))
            pilot = c.fetchone()
            
            if not pilot:
                return jsonify({'error': 'Pilot not found'}), 404

            return jsonify({
                'id': pilot[0],
                'name': pilot[1],
                'email': pilot[2],
                'phone': pilot[3],
                'status': pilot[4],
                'created_at': pilot[5]
            })

        elif request.method == 'PUT':
            data = request.get_json()
            if not data:
                return jsonify({'error': 'No data provided'}), 400

            # Check if pilot exists
            c.execute('SELECT id FROM pilots WHERE id = ?', (pilot_id,))
            if not c.fetchone():
                return jsonify({'error': 'Pilot not found'}), 404

            # Update pilot
            update_fields = []
            update_values = []
            
            if 'name' in data:
                update_fields.append('name = ?')
                update_values.append(data['name'])
            if 'email' in data:
                update_fields.append('email = ?')
                update_values.append(data['email'])
            if 'phone' in data:
                update_fields.append('phone = ?')
                update_values.append(data['phone'])
            if 'status' in data:
                update_fields.append('status = ?')
                update_values.append(data['status'])
            if 'password' in data:
                update_fields.append('password_hash = ?')
                update_values.append(generate_password_hash(data['password']))

            if not update_fields:
                return jsonify({'error': 'No valid fields to update'}), 400

            update_values.append(pilot_id)
            query = f'''
                UPDATE pilots 
                SET {', '.join(update_fields)}
                WHERE id = ?
            '''
            
            c.execute(query, update_values)
            conn.commit()
            
            return jsonify({'message': 'Pilot updated successfully'})

        elif request.method == 'DELETE':
            # Check if pilot exists
            c.execute('SELECT id FROM pilots WHERE id = ?', (pilot_id,))
            if not c.fetchone():
                return jsonify({'error': 'Pilot not found'}), 404

            # Delete pilot
            c.execute('DELETE FROM pilots WHERE id = ?', (pilot_id,))
            conn.commit()
            
            return jsonify({'message': 'Pilot deleted successfully'})

    except Exception as e:
        print(f"Error managing pilot: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/admin/pilots/<int:pilot_id>/details', methods=['GET'])
@token_required
def get_pilot_details(current_user, pilot_id):
    """Get detailed information for a specific pilot"""
    try:
        conn = get_db()
        c = conn.cursor()

        # Get detailed pilot information
        c.execute('SELECT * FROM pilots WHERE id = ?', (pilot_id,))
        pilot = c.fetchone()
        conn.close()

        if not pilot:
            return jsonify({'message': 'Pilot not found'}), 404

        # Convert to dictionary
        pilot_dict = dict(pilot)

        response = jsonify(pilot_dict)
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    except Exception as e:
        print(f"Error fetching pilot details: {str(e)}")
        return jsonify({'message': 'Internal server error'}), 500

@app.route('/api/admin/videos', methods=['GET', 'OPTIONS'])
@token_required
def get_videos(current_user):
    if current_user['role'] != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    try:
        conn = get_db()
        # Get videos with editor information
        videos = conn.execute('''
            SELECT v.*, e.name as editor_name, e.email as editor_email
            FROM videos v
            LEFT JOIN editors e ON v.editor_id = e.id
            ORDER BY v.created_at DESC
        ''').fetchall()
        conn.close()
        
        return jsonify([dict(video) for video in videos])
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/admin/videos/<int:video_id>', methods=['PUT', 'OPTIONS'])
@token_required
def update_video(current_user, video_id):
    if current_user['role'] != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    try:
        data = request.get_json()
        conn = get_db()
        
        # Update video with editor assignment support
        update_fields = []
        update_values = []
        
        if 'status' in data:
            update_fields.append('status = ?')
            update_values.append(data['status'])
        if 'review_notes' in data:
            update_fields.append('review_notes = ?')
            update_values.append(data['review_notes'])
        if 'editor_id' in data:
            update_fields.append('editor_id = ?')
            update_values.append(data['editor_id'])
        
        update_fields.append('updated_at = CURRENT_TIMESTAMP')
        update_values.append(video_id)
        
        query = f'''
            UPDATE videos 
            SET {', '.join(update_fields)}
            WHERE id = ?
        '''
        
        conn.execute(query, update_values)
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Video updated successfully'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/admin/videos/<int:video_id>/assign', methods=['POST', 'OPTIONS'])
@token_required
def assign_editor_to_video(current_user, video_id):
    if current_user['role'] != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.get_json()
        if not data or 'editor_id' not in data:
            return jsonify({'message': 'Editor ID is required'}), 400
        
        conn = get_db()
        
        # Check if video exists
        video = conn.execute('SELECT id FROM videos WHERE id = ?', (video_id,)).fetchone()
        if not video:
            conn.close()
            return jsonify({'message': 'Video not found'}), 404
        
        # Check if editor exists
        editor = conn.execute('SELECT id FROM editors WHERE id = ?', (data['editor_id'],)).fetchone()
        if not editor:
            conn.close()
            return jsonify({'message': 'Editor not found'}), 404
        
        # Assign editor to video
        conn.execute('''
            UPDATE videos 
            SET editor_id = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (data['editor_id'], video_id))
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Editor assigned successfully'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500

# Public Referral Registration Endpoint
@app.route('/api/referrals/register', methods=['POST', 'OPTIONS'])
def public_referral_register():
    # Handle preflight request
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept')
        response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        data = request.get_json()
        if not data:
            return jsonify({'message': 'No data received'}), 400

        # Validate required fields
        required_fields = ['name', 'email', 'phone', 'password']
        missing = [f for f in required_fields if f not in data or not data[f]]
        if missing:
            return jsonify({'message': f'Missing required fields: {", ".join(missing)}'}), 400

        # Basic email validation
        if '@' not in data['email'] or '.' not in data['email']:
            return jsonify({'message': 'Invalid email format'}), 400

        # Validate password length
        if len(data['password']) < 6:
            return jsonify({'message': 'Password must be at least 6 characters long'}), 400

        conn = get_db()
        c = conn.cursor()

        # Check if email already exists in applications or main table
        c.execute('SELECT id FROM referral_applications WHERE email = ?', (data['email'],))
        if c.fetchone():
            conn.close()
            return jsonify({'message': 'Application already submitted with this email'}), 400

        c.execute('SELECT id FROM referrals WHERE email = ?', (data['email'],))
        if c.fetchone():
            conn.close()
            return jsonify({'message': 'Email already registered'}), 400

        # Hash password
        password_hash = generate_password_hash(data['password'])

        # Insert referral application
        c.execute('''
            INSERT INTO referral_applications (
                name, email, phone, location, experience, network_size,
                referral_strategy, social_media_links, password_hash
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['name'],
            data['email'],
            data['phone'],
            data.get('location', ''),
            data.get('experience', ''),
            data.get('network_size', ''),
            data.get('referral_strategy', ''),
            data.get('social_media_links', ''),
            password_hash
        ))
        conn.commit()
        application_id = c.lastrowid
        conn.close()

        response = jsonify({
            'message': 'Referral application submitted successfully. Please wait for admin approval.',
            'application_id': application_id
        })
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 201
    except Exception as e:
        print(f"Error in public_referral_register: {str(e)}")
        response = jsonify({'message': 'Internal server error'})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 500

@app.route('/api/admin/referrals', methods=['GET', 'POST', 'OPTIONS'])
@token_required
def manage_referrals(current_user):
    if request.method == 'OPTIONS':
        return '', 200
        
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    if request.method == 'POST':
        try:
            data = request.get_json()
            required_fields = ['name', 'email', 'phone']
            
            # Validate required fields
            for field in required_fields:
                if field not in data:
                    return jsonify({'error': f'Missing required field: {field}'}), 400

            conn = get_db()
            c = conn.cursor()

            # Insert new referral
            c.execute('''
                INSERT INTO referrals (
                    name, email, phone, status
                )
                VALUES (?, ?, ?, 'pending')
            ''', (
                data['name'], data['email'], data['phone']
            ))
            
            conn.commit()
            conn.close()
            return jsonify({'message': 'Referral added successfully'}), 201

        except Exception as e:
            print(f"Error adding referral: {e}")
            return jsonify({'error': 'Internal server error'}), 500

    # GET method
    try:
        conn = get_db()
        c = conn.cursor()
        
        # Fetch referrals
        c.execute('''
            SELECT id, name, email, phone, status, commission_rate, total_earnings, created_at
            FROM referrals
            ORDER BY created_at DESC
        ''')
        referrals = c.fetchall()
        
        referrals_list = []
        for referral in referrals:
            try:
                referral_dict = {
                    'id': referral[0],
                    'name': referral[1],
                    'email': referral[2],
                    'phone': referral[3],
                    'status': referral[4],
                    'commission_rate': referral[5],
                    'total_earnings': referral[6],
                    'created_at': referral[7]
                }
                referrals_list.append(referral_dict)
            except Exception as e:
                print(f"Error processing referral data: {e}")
                print(f"Problematic referral data: {referral}")
                continue

        conn.close()
        print(f"Successfully fetched {len(referrals_list)} referrals")
        return jsonify(referrals_list)

    except Exception as e:
        print(f"Error fetching referrals: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/admin/referrals/<int:referral_id>', methods=['GET', 'PUT', 'DELETE', 'OPTIONS'])
@token_required
def manage_referral(current_user, referral_id):
    if request.method == 'OPTIONS':
        return '', 200
        
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    try:
        conn = get_db()
        c = conn.cursor()

        if request.method == 'GET':
            c.execute('SELECT * FROM referrals WHERE id = ?', (referral_id,))
            referral = c.fetchone()
            
            if not referral:
                conn.close()
                return jsonify({'error': 'Referral not found'}), 404

            conn.close()
            return jsonify({
                'id': referral[0],
                'name': referral[1],
                'email': referral[2],
                'phone': referral[3],
                'status': referral[4],
                'commission_rate': referral[5],
                'total_earnings': referral[6],
                'created_at': referral[7]
            })

        elif request.method == 'PUT':
            data = request.get_json()
            if not data:
                conn.close()
                return jsonify({'error': 'No data provided'}), 400

            # Check if referral exists
            c.execute('SELECT id FROM referrals WHERE id = ?', (referral_id,))
            if not c.fetchone():
                conn.close()
                return jsonify({'error': 'Referral not found'}), 404

            # Update referral
            update_fields = []
            update_values = []
            
            fields = [
                'name', 'email', 'phone', 'status', 'commission_rate', 'total_earnings'
            ]
            
            for field in fields:
                if field in data:
                    update_fields.append(f'{field} = ?')
                    update_values.append(data[field])

            if not update_fields:
                conn.close()
                return jsonify({'error': 'No valid fields to update'}), 400

            update_values.append(referral_id)
            query = f'''
                UPDATE referrals 
                SET {', '.join(update_fields)}
                WHERE id = ?
            '''
            
            c.execute(query, update_values)
            conn.commit()
            conn.close()
            
            return jsonify({'message': 'Referral updated successfully'})

        elif request.method == 'DELETE':
            # Check if referral exists
            c.execute('SELECT id FROM referrals WHERE id = ?', (referral_id,))
            if not c.fetchone():
                conn.close()
                return jsonify({'error': 'Referral not found'}), 404

            # Delete referral
            c.execute('DELETE FROM referrals WHERE id = ?', (referral_id,))
            conn.commit()
            conn.close()
            
            return jsonify({'message': 'Referral deleted successfully'})

    except Exception as e:
        print(f"Error managing referral: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/admin/editors', methods=['GET', 'POST', 'OPTIONS'])
@token_required
def manage_editors(current_user):
    if request.method == 'OPTIONS':
        return '', 200
        
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    if request.method == 'POST':
        try:
            data = request.get_json()
            required_fields = ['name', 'email', 'phone', 'password']
            
            # Validate required fields
            for field in required_fields:
                if field not in data:
                    return jsonify({'error': f'Missing required field: {field}'}), 400

            conn = get_db()
            c = conn.cursor()

            # Check if email already exists
            c.execute('SELECT id FROM editors WHERE email = ?', (data['email'],))
            if c.fetchone():
                return jsonify({'error': 'Email already registered'}), 400

            # Hash password
            hashed_password = generate_password_hash(data['password'])

            # Insert new editor
            c.execute('''
                INSERT INTO editors (name, email, phone, password_hash, status)
                VALUES (?, ?, ?, ?, 'active')
            ''', (data['name'], data['email'], data['phone'], hashed_password))
            
            conn.commit()
            conn.close()
            return jsonify({'message': 'Editor added successfully'}), 201

        except Exception as e:
            print(f"Error adding editor: {e}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            try:
                conn.close()
            except:
                pass
            return jsonify({'error': 'Internal server error'}), 500

    # GET method
    try:
        conn = get_db()
        c = conn.cursor()
        
        # First, let's check what columns exist in the editors table
        c.execute("PRAGMA table_info(editors)")
        columns_info = c.fetchall()
        print(f"Editors table columns: {[col[1] for col in columns_info]}")
        
        # Fetch editors with error handling for each column
        c.execute('SELECT id, name, email, phone, status, created_at FROM editors')
        editors = c.fetchall()
        
        editors_list = []
        for editor in editors:
            try:
                editor_dict = {
                    'id': editor[0],
                    'name': editor[1],
                    'email': editor[2],
                    'phone': editor[3],
                    'status': editor[4],
                    'created_at': editor[5] if len(editor) > 5 else None
                }
                editors_list.append(editor_dict)
            except Exception as e:
                print(f"Error processing editor data: {e}")
                print(f"Problematic editor data: {editor}")
                continue

        print(f"Successfully fetched {len(editors_list)} editors")
        conn.close()
        return jsonify(editors_list)

    except Exception as e:
        print(f"Error fetching editors: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        try:
            conn.close()
        except:
            pass
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/admin/editors/<int:editor_id>', methods=['GET', 'PUT', 'DELETE', 'OPTIONS'])
@token_required
def manage_editor(current_user, editor_id):
    if request.method == 'OPTIONS':
        return '', 200
        
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    try:
        conn = get_db()
        c = conn.cursor()

        if request.method == 'GET':
            c.execute('SELECT id, name, email, phone, status, created_at FROM editors WHERE id = ?', (editor_id,))
            editor = c.fetchone()
            
            if not editor:
                return jsonify({'error': 'Editor not found'}), 404

            return jsonify({
                'id': editor[0],
                'name': editor[1],
                'email': editor[2],
                'phone': editor[3],
                'status': editor[4],
                'created_at': editor[5]
            })

        elif request.method == 'PUT':
            data = request.get_json()
            if not data:
                return jsonify({'error': 'No data provided'}), 400

            # Check if editor exists
            c.execute('SELECT id FROM editors WHERE id = ?', (editor_id,))
            if not c.fetchone():
                return jsonify({'error': 'Editor not found'}), 404

            # Update editor
            update_fields = []
            update_values = []
            
            if 'name' in data:
                update_fields.append('name = ?')
                update_values.append(data['name'])
            if 'email' in data:
                update_fields.append('email = ?')
                update_values.append(data['email'])
            if 'phone' in data:
                update_fields.append('phone = ?')
                update_values.append(data['phone'])
            if 'status' in data:
                update_fields.append('status = ?')
                update_values.append(data['status'])

            if not update_fields:
                return jsonify({'error': 'No valid fields to update'}), 400

            update_values.append(editor_id)
            query = f'''
                UPDATE editors 
                SET {', '.join(update_fields)}
                WHERE id = ?
            '''
            
            c.execute(query, update_values)
            conn.commit()
            
            return jsonify({'message': 'Editor updated successfully'})

        elif request.method == 'DELETE':
            # Check if editor exists
            c.execute('SELECT id FROM editors WHERE id = ?', (editor_id,))
            if not c.fetchone():
                return jsonify({'error': 'Editor not found'}), 404

            # Delete editor
            c.execute('DELETE FROM editors WHERE id = ?', (editor_id,))
            conn.commit()
            
            return jsonify({'message': 'Editor deleted successfully'})

    except Exception as e:
        print(f"Error managing editor: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/admin/editors/<int:editor_id>/details', methods=['GET'])
@token_required
def get_editor_details(current_user, editor_id):
    """Get detailed information for a specific editor"""
    try:
        conn = get_db()
        c = conn.cursor()

        # Get detailed editor information
        c.execute('SELECT * FROM editors WHERE id = ?', (editor_id,))
        editor = c.fetchone()
        conn.close()

        if not editor:
            return jsonify({'message': 'Editor not found'}), 404

        # Convert to dictionary
        editor_dict = dict(editor)

        response = jsonify(editor_dict)
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    except Exception as e:
        print(f"Error fetching editor details: {str(e)}")
        return jsonify({'message': 'Internal server error'}), 500

@app.route('/api/admin/inquiries', methods=['GET', 'PUT', 'OPTIONS'])
@token_required
def manage_inquiries(current_user):
    if current_user['role'] != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    if request.method == 'GET':
        try:
            conn = get_db()
            inquiries = conn.execute('SELECT * FROM inquiries ORDER BY created_at DESC').fetchall()
            conn.close()
            
            return jsonify([dict(inquiry) for inquiry in inquiries])
        except Exception as e:
            return jsonify({'message': str(e)}), 500
    
    elif request.method == 'PUT':
        try:
            data = request.get_json()
            conn = get_db()
            
            conn.execute('''
                UPDATE inquiries 
                SET status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (data['status'], data['id']))
            
            conn.commit()
            conn.close()
            
            return jsonify({'message': 'Inquiry updated successfully'})
        except Exception as e:
            return jsonify({'message': str(e)}), 500

@app.route('/api/admin/payments', methods=['GET', 'OPTIONS'])
@token_required
def get_payments(current_user):
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept')
        response.headers.add('Access-Control-Allow-Methods', 'GET,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    if current_user['role'] != 'admin':
        response = jsonify({'message': 'Unauthorized'}), 403
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    
    try:
        conn = get_db()
        payments = conn.execute('''
            SELECT 
                p.*,
                b.industry,
                b.location,
                u.contact_name as client_name,
                u.business_name as client_company,
                u.email as client_email,
                u.phone as client_phone,
                pi.name as pilot_name,
                pi.email as pilot_email,
                pi.phone as pilot_phone,
                r.name as referral_name,
                r.email as referral_email
            FROM payments p
            JOIN bookings b ON p.booking_id = b.id
            JOIN users u ON b.user_id = u.id
            LEFT JOIN pilots pi ON b.pilot_id = pi.id
            LEFT JOIN referrals r ON b.referral_id = r.id
            ORDER BY p.created_at DESC
        ''').fetchall()
        conn.close()
        
        payments_list = []
        for payment in payments:
            payment_dict = {
                'id': payment[0],
                'booking_id': payment[1],
                'amount': float(payment[2]) if payment[2] else 0,
                'status': payment[3],
                'payment_method': payment[4],
                'transaction_id': payment[5],
                'created_at': payment[6],
                'updated_at': payment[7],
                'industry': payment[8],
                'location': payment[9],
                'client_name': payment[10],
                'client_company': payment[11],
                'client_email': payment[12],
                'client_phone': payment[13],
                'pilot_name': payment[14],
                'pilot_email': payment[15],
                'pilot_phone': payment[16],
                'referral_name': payment[17],
                'referral_email': payment[18]
            }
            payments_list.append(payment_dict)
        
        response = jsonify(payments_list)
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    except Exception as e:
        print(f"Error fetching payments: {str(e)}")
        response = jsonify({'message': str(e)}), 500
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

@app.route('/api/admin/cancellations', methods=['GET', 'POST', 'OPTIONS'])
@token_required
def manage_cancellations(current_user):
    if current_user['role'] != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    if request.method == 'GET':
        try:
            conn = get_db()
            cancellations = conn.execute('''
                SELECT c.*, b.industry, b.location 
                FROM cancellations c
                JOIN bookings b ON c.booking_id = b.id
                ORDER BY c.created_at DESC
            ''').fetchall()
            conn.close()
            
            return jsonify([dict(cancellation) for cancellation in cancellations])
        except Exception as e:
            return jsonify({'message': str(e)}), 500
    
    elif request.method == 'POST':
        try:
            data = request.get_json()
            conn = get_db()
            
            conn.execute('''
                INSERT INTO cancellations (booking_id, reason, refund_amount)
                VALUES (?, ?, ?)
            ''', (data['booking_id'], data['reason'], data['refund_amount']))
            
            # Update booking status
            conn.execute('''
                UPDATE bookings 
                SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (data['booking_id'],))
            
            conn.commit()
            conn.close()
            
            return jsonify({'message': 'Cancellation processed successfully'})
        except Exception as e:
            return jsonify({'message': str(e)}), 500

@app.route('/api/admin/stats', methods=['GET', 'OPTIONS'])
@token_required
def get_admin_stats(current_user):
    if current_user['role'] != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    try:
        conn = get_db()
        
        # Get video stats
        video_stats = conn.execute('''
            SELECT 
                COUNT(CASE WHEN status = 'pending' AND review_type = 'before' THEN 1 END) as pending_before,
                COUNT(CASE WHEN status = 'pending' AND review_type = 'after' THEN 1 END) as pending_after
            FROM videos
        ''').fetchone()
        
        # Get order stats
        order_stats = conn.execute('''
            SELECT 
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as new_orders,
                COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as ongoing_orders,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders
            FROM bookings
        ''').fetchone()
        
        # Get revenue stats
        revenue_stats = conn.execute('''
            SELECT 
                COALESCE(SUM(amount), 0) as total_revenue
            FROM payments
            WHERE status = 'completed'
            AND created_at >= date('now', 'start of month')
        ''').fetchone()
        
        conn.close()
        
        return jsonify({
            'videos': dict(video_stats),
            'orders': dict(order_stats),
            'revenue': dict(revenue_stats)
        })
    except Exception as e:
        return jsonify({'message': str(e)}), 500

# Pre-List Management Endpoints
@app.route('/api/admin/pre-list', methods=['GET', 'POST', 'OPTIONS'])
@token_required
def manage_pre_list(current_user):
    if current_user['role'] != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    if request.method == 'GET':
        try:
            conn = get_db()
            items = conn.execute('SELECT * FROM pre_list ORDER BY created_at DESC').fetchall()
            conn.close()
            
            return jsonify([dict(item) for item in items])
        except Exception as e:
            return jsonify({'message': str(e)}), 500
    
    elif request.method == 'POST':
        try:
            data = request.get_json()
            conn = get_db()
            
            conn.execute('''
                INSERT INTO pre_list (title, description, category, status)
                VALUES (?, ?, ?, ?)
            ''', (data['title'], data['description'], data['category'], data['status']))
            
            conn.commit()
            conn.close()
            
            return jsonify({'message': 'Item added successfully'})
        except Exception as e:
            return jsonify({'message': str(e)}), 500

@app.route('/api/admin/pre-list/<int:item_id>', methods=['PUT', 'DELETE', 'OPTIONS'])
@token_required
def manage_pre_list_item(current_user, item_id):
    if current_user['role'] != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    if request.method == 'PUT':
        try:
            data = request.get_json()
            conn = get_db()
            
            conn.execute('''
                UPDATE pre_list 
                SET title = ?, description = ?, category = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (data['title'], data['description'], data['category'], data['status'], item_id))
            
            conn.commit()
            conn.close()
            
            return jsonify({'message': 'Item updated successfully'})
        except Exception as e:
            return jsonify({'message': str(e)}), 500
    
    elif request.method == 'DELETE':
        try:
            conn = get_db()
            
            conn.execute('DELETE FROM pre_list WHERE id = ?', (item_id,))
            
            conn.commit()
            conn.close()
            
            return jsonify({'message': 'Item deleted successfully'})
        except Exception as e:
            return jsonify({'message': str(e)}), 500

@app.route('/api/admin/orders', methods=['GET', 'POST', 'OPTIONS'])
@token_required
def get_admin_orders(current_user):
    # Handle preflight request
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept')
        response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    if current_user['role'] != 'admin':
        response = jsonify({'message': 'Unauthorized'}), 403
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    
    # Handle POST request for creating new order
    if request.method == 'POST':
        data = request.json
        print("\n=== Creating New Order (Admin) ===")
        print(f"Order data: {data}")
        
        try:
            # Validate required fields
            required_fields = ['client_name', 'client_email', 'pilot_id', 'industry', 'preferred_date', 'location', 'duration', 'payment_amount']
            for field in required_fields:
                if field not in data:
                    return jsonify({'message': f'Missing required field: {field}'}), 400
                if not data[field]:
                    return jsonify({'message': f'Empty required field: {field}'}), 400

            # Validate data types
            try:
                pilot_id = int(data['pilot_id'])
                duration = int(data['duration'])
                payment_amount = float(data['payment_amount'])
                
                if duration < 1 or duration > 8:
                    return jsonify({'message': 'Duration must be between 1 and 8 hours'}), 400
                if payment_amount <= 0:
                    return jsonify({'message': 'Payment amount must be greater than 0'}), 400
            except ValueError:
                return jsonify({'message': 'Invalid numeric values'}), 400

            try:
                datetime.strptime(data['preferred_date'], '%Y-%m-%d')
            except ValueError:
                return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400

            conn = get_db()
            cursor = conn.cursor()

            # Verify pilot exists
            cursor.execute('SELECT id FROM pilots WHERE id = ?', (pilot_id,))
            if not cursor.fetchone():
                return jsonify({'message': 'Pilot not found'}), 404

            # Create the booking/order with client details in notes
            client_info = f"Client: {data['client_name']} ({data['client_email']})"
            requirements = data.get('requirements', '')
            if requirements:
                client_info += f"\nRequirements: {requirements}"

            cursor.execute('''
                INSERT INTO bookings (
                    pilot_id, industry, preferred_date, location, 
                    duration, requirements, status, payment_amount, payment_status,
                    client_notes
                ) VALUES (?, ?, ?, ?, ?, ?, 'assigned', ?, 'pending', ?)
            ''', (
                pilot_id,
                data['industry'], 
                data['preferred_date'],
                data['location'], 
                duration, 
                requirements,
                payment_amount,
                client_info
            ))
            
            conn.commit()
            booking_id = cursor.lastrowid
            print(f"Created order with ID: {booking_id}")
            conn.close()
            
            return jsonify({
                'message': 'Order created successfully',
                'booking_id': booking_id
            }), 201
            
        except sqlite3.Error as e:
            print(f"Database error: {str(e)}")
            return jsonify({'message': f'Database error: {str(e)}'}), 500
        except Exception as e:
            print(f"Unexpected error: {str(e)}")
            return jsonify({'message': f'Failed to create order: {str(e)}'}), 500
    
    # Handle GET request for fetching orders
    try:
        conn = get_db()

        # Get status filter from query parameters
        status_filter = request.args.get('status', 'all')

        # Use a simple query with only the columns we know exist from your data
        base_query = '''
            SELECT b.*,
                   COALESCE(u.name, 'Unknown Client') as client_name,
                   u.name, u.email as client_email, u.id as client_id,
                   p.name as pilot_name, p.email as pilot_email, p.id as pilot_id_actual,
                   e.name as editor_name, e.email as editor_email, e.id as editor_id_actual,
                   r.name as referral_name, r.id as referral_id_actual
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.id
            LEFT JOIN pilots p ON b.pilot_id = p.id
            LEFT JOIN editors e ON b.editor_id = e.id
            LEFT JOIN referrals r ON b.referral_id = r.id
        '''

        # Add status filtering
        if status_filter == 'pending':
            query = base_query + " WHERE b.status = 'pending' ORDER BY b.created_at DESC"
        elif status_filter == 'ongoing':
            query = base_query + " WHERE b.status NOT IN ('pending', 'completed', 'rejected', 'cancelled') ORDER BY b.created_at DESC"
        elif status_filter == 'completed':
            query = base_query + " WHERE b.status = 'completed' ORDER BY b.created_at DESC"
        elif status_filter == 'cancelled':
            query = base_query + " WHERE b.status = 'cancelled' ORDER BY b.created_at DESC"
        else:
            query = base_query + " ORDER BY b.created_at DESC"

        orders = conn.execute(query).fetchall()
        conn.close()

        # Process orders to handle cases where user_id is null
        processed_orders = []
        for order in orders:
            order_dict = dict(order)

            # If no user data, try to extract from client_notes
            if not order_dict.get('name') and order_dict.get('client_notes'):
                client_notes = order_dict['client_notes']
                if client_notes.startswith('Client: '):
                    # Extract client name and email from notes
                    client_info = client_notes.split('\n')[0]
                    client_parts = client_info.replace('Client: ', '').split(' (')
                    if len(client_parts) == 2:
                        order_dict['name'] = client_parts[0]
                        order_dict['client_email'] = client_parts[1].rstrip(')')

            # Format the order data with ALL booking fields
            formatted_order = {
                # Basic Information
                'id': order_dict.get('id'),
                'booking_id': f"HMX{order_dict.get('id', ''):04d}",
                'user_id': order_dict.get('user_id'),
                'status': order_dict.get('status', 'pending'),
                'created_at': order_dict.get('created_at', ''),
                'updated_at': order_dict.get('updated_at', ''),

                # Client Information
                'client_id': order_dict.get('client_id'),
                'client_name': order_dict.get('client_name') or order_dict.get('name', 'Unknown'),
                'client_email': order_dict.get('client_email', ''),

                # Team Assignment
                'pilot_id': order_dict.get('pilot_id'),
                'pilot_name': order_dict.get('pilot_name', ''),
                'editor_id': order_dict.get('editor_id'),
                'editor_name': order_dict.get('editor_name', ''),
                'referral_id': order_dict.get('referral_id'),
                'referral_name': order_dict.get('referral_name', ''),

                # Location & Property
                'location': order_dict.get('location', ''),
                'location_address': order_dict.get('location_address', ''),
                'gps_coordinates': order_dict.get('gps_coordinates', ''),
                'property_type': order_dict.get('property_type', ''),
                'industry': order_dict.get('category', ''),  # Use category instead of industry
                'indoor_outdoor': order_dict.get('indoor_outdoor', ''),
                'area_size': order_dict.get('area_size', 0),
                'area_unit': order_dict.get('area_unit', ''),
                'area_sqft': order_dict.get('area_sqft', 0),
                'num_floors': order_dict.get('num_floors', 0),
                'rooms_sections': order_dict.get('rooms_sections', 0),
                'duration': order_dict.get('duration', 0),

                # Scheduling
                'preferred_date': order_dict.get('preferred_date', ''),
                'preferred_time': order_dict.get('preferred_time', ''),
                'shooting_hours': order_dict.get('shooting_hours', 0),
                'area_covered': order_dict.get('area_covered', 0),

                # Video Specifications
                'fpv_tour_type': order_dict.get('fpv_tour_type', ''),
                'video_length': order_dict.get('video_length', 0),
                'resolution': order_dict.get('resolution', ''),
                'editing_style': order_dict.get('editing_style', ''),
                'background_music_voiceover': bool(order_dict.get('background_music_voiceover', 0)),
                'editing_color_grading': bool(order_dict.get('editing_color_grading', 0)),
                'voiceover_script': bool(order_dict.get('voiceover_script', 0)),
                'background_music_licensed': bool(order_dict.get('background_music_licensed', 0)),
                'branding_overlay': bool(order_dict.get('branding_overlay', 0)),
                'multiple_revisions': bool(order_dict.get('multiple_revisions', 0)),
                'drone_licensing_fee': bool(order_dict.get('drone_licensing_fee', 0)),
                'drone_permissions_required': bool(order_dict.get('drone_permissions_required', 0)),

                # Financial Information
                'base_package_cost': order_dict.get('base_package_cost', 0),
                'base_cost': order_dict.get('base_cost', 0),
                'final_cost': order_dict.get('final_cost', 0),
                'total_cost': order_dict.get('total_cost', 0),
                'travel_cost': order_dict.get('travel_cost', 0),
                'tax_percentage': order_dict.get('tax_percentage', 0),
                'discount_code': order_dict.get('discount_code', ''),
                'discount_amount': order_dict.get('discount_amount', 0),
                'payment_status': order_dict.get('payment_status', 'pending'),
                'payment_amount': order_dict.get('payment_amount', 0),
                'total_amount': order_dict.get('payment_amount', 0),  # For backward compatibility
                'payment_date': order_dict.get('payment_date', ''),
                'completed_date': order_dict.get('completed_date', ''),

                # Requirements & Notes
                'requirements': order_dict.get('requirements', ''),
                'special_requirements': order_dict.get('special_requirements', ''),
                'custom_quote': order_dict.get('custom_quote', ''),
                'description': order_dict.get('description', ''),
                'pilot_notes': order_dict.get('pilot_notes', ''),
                'client_notes': order_dict.get('client_notes', ''),
                'admin_comments': order_dict.get('admin_comments', ''),

                # Links & Deliverables
                'drive_link': order_dict.get('drive_link', ''),
                'delivery_video_link': order_dict.get('delivery_video_link', '')
            }

            processed_orders.append(formatted_order)

        # Debug: Print raw data from database
        if orders:
            print("Raw order from DB:", dict(orders[0]))
            print("Raw order keys:", list(dict(orders[0]).keys()))

        # Debug: Print processed order data
        if processed_orders:
            print("Processed order keys:", list(processed_orders[0].keys()))
            sample = processed_orders[0]
            print("Sample processed values:")
            for key, value in sample.items():
                if value and value != '' and value != 0:
                    print(f"  {key}: {value}")

        return jsonify(processed_orders)
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/admin/debug/bookings', methods=['GET'])
@token_required
def debug_bookings(current_user):
    """Debug endpoint to check bookings directly"""
    if current_user['role'] != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403

    try:
        conn = get_db()

        # Get all bookings with basic info
        cursor = conn.cursor()
        cursor.execute('SELECT id, user_id, status, property_type, location_address, created_at FROM bookings ORDER BY created_at DESC')
        bookings = cursor.fetchall()

        # Get all users
        cursor.execute('SELECT id, name, email FROM users')
        users = cursor.fetchall()

        conn.close()

        return jsonify({
            'bookings': [dict(zip(['id', 'user_id', 'status', 'property_type', 'location_address', 'created_at'], booking)) for booking in bookings],
            'users': [dict(zip(['id', 'name', 'email'], user)) for user in users],
            'total_bookings': len(bookings),
            'total_users': len(users)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/orders/<int:order_id>', methods=['PUT', 'DELETE', 'OPTIONS'])
@token_required
def manage_order(current_user, order_id):
    if request.method == 'OPTIONS':
        return '', 200

    if current_user['role'] != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403

    try:
        conn = get_db()
        cursor = conn.cursor()

        if request.method == 'PUT':
            data = request.json

            # Update order status, assignments, or comments
            update_fields = []
            update_values = []

            if 'status' in data:
                update_fields.append('status = ?')
                update_values.append(data['status'])

            if 'pilot_id' in data:
                update_fields.append('pilot_id = ?')
                update_values.append(data['pilot_id'] if data['pilot_id'] else None)

            if 'editor_id' in data:
                update_fields.append('editor_id = ?')
                update_values.append(data['editor_id'] if data['editor_id'] else None)

            if 'admin_comments' in data:
                update_fields.append('admin_comments = ?')
                update_values.append(data['admin_comments'])

            if update_fields:
                update_fields.append('updated_at = CURRENT_TIMESTAMP')
                update_values.append(order_id)

                query = f"UPDATE bookings SET {', '.join(update_fields)} WHERE id = ?"
                cursor.execute(query, update_values)
                conn.commit()

            conn.close()
            return jsonify({'message': 'Order updated successfully'})

        elif request.method == 'DELETE':
            cursor.execute('DELETE FROM bookings WHERE id = ?', (order_id,))
            conn.commit()
            conn.close()
            return jsonify({'message': 'Order deleted successfully'})

    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/admin/dashboard/stats', methods=['GET', 'OPTIONS'])
@token_required
def get_dashboard_stats(current_user):
    if request.method == 'OPTIONS':
        return '', 200
        
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    try:
        conn = get_db()
        c = conn.cursor()

        # Get pending videos count
        c.execute('''
            SELECT COUNT(*) FROM videos 
            WHERE status = 'pending'
        ''')
        pending_videos = c.fetchone()[0]

        # Get active orders count
        c.execute('''
            SELECT COUNT(*) FROM bookings 
            WHERE status = 'in_progress'
        ''')
        active_orders = c.fetchone()[0]

        # Get revenue for current month
        current_month = datetime.now().strftime('%Y-%m')
        c.execute('''
            SELECT COALESCE(SUM(payment_amount), 0) 
            FROM bookings 
            WHERE payment_status = 'completed' 
            AND strftime('%Y-%m', payment_date) = ?
        ''', (current_month,))
        revenue_mtd = c.fetchone()[0] or 0

        # Get completed orders count
        c.execute('''
            SELECT COUNT(*) FROM bookings 
            WHERE status = 'completed'
        ''')
        completed_orders = c.fetchone()[0]

        return jsonify({
            'pendingVideos': pending_videos,
            'activeOrders': active_orders,
            'revenueMTD': revenue_mtd,
            'completedOrders': completed_orders
        })

    except Exception as e:
        print(f"Error fetching dashboard stats: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/admin/dashboard/activities', methods=['GET', 'OPTIONS'])
@token_required
def get_dashboard_activities(current_user):
    if request.method == 'OPTIONS':
        return '', 200
        
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    try:
        conn = get_db()
        c = conn.cursor()

        # Get recent activities from various tables
        activities = []

        # Get recent bookings
        c.execute('''
            SELECT id, status, created_at 
            FROM bookings 
            ORDER BY created_at DESC 
            LIMIT 5
        ''')
        bookings = c.fetchall()
        for booking in bookings:
            activities.append({
                'id': f'booking_{booking[0]}',
                'type': 'order',
                'action': f'New booking {booking[0]}',
                'details': f'Status: {booking[1]}',
                'timestamp': booking[2]
            })

        # Get recent pilot registrations
        c.execute('''
            SELECT id, name, created_at 
            FROM pilots 
            ORDER BY created_at DESC 
            LIMIT 5
        ''')
        pilots = c.fetchall()
        for pilot in pilots:
            activities.append({
                'id': f'pilot_{pilot[0]}',
                'type': 'pilot',
                'action': 'New pilot registration',
                'details': f'Pilot: {pilot[1]}',
                'timestamp': pilot[2]
            })

        # Get recent referrals
        c.execute('''
            SELECT id, name, created_at 
            FROM referrals 
            ORDER BY created_at DESC 
            LIMIT 5
        ''')
        referrals = c.fetchall()
        for referral in referrals:
            activities.append({
                'id': f'referral_{referral[0]}',
                'type': 'referral',
                'action': 'New referral',
                'details': f'Referral: {referral[1]}',
                'timestamp': referral[2]
            })

        # Sort activities by timestamp
        activities.sort(key=lambda x: x['timestamp'], reverse=True)
        
        # Return only the 10 most recent activities
        return jsonify(activities[:10])

    except Exception as e:
        print(f"Error fetching dashboard activities: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/admin/settings', methods=['GET', 'PUT', 'OPTIONS'])
@token_required
def manage_settings(current_user):
    if request.method == 'OPTIONS':
        return '', 200
        
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    try:
        conn = get_db()
        c = conn.cursor()

        if request.method == 'GET':
            # Return settings that match the frontend interface
            settings = {
                'companyName': 'HMX FPV Tours',
                'email': 'admin@hmxfpvtours.com',
                'phone': '+91 98765 43210',
                'address': '123 FPV Street, Mumbai, Maharashtra 400001',
                'currency': 'INR',
                'timezone': 'Asia/Kolkata',
                'notificationSettings': {
                    'emailNotifications': True,
                    'orderUpdates': True,
                    'paymentReminders': True,
                    'systemAlerts': True
                }
            }
            conn.close()
            return jsonify(settings)

        elif request.method == 'PUT':
            data = request.get_json()
            if not data:
                conn.close()
                return jsonify({'error': 'No data provided'}), 400

            # For now, just return success (in a real app, you'd save to database)
            conn.close()
            return jsonify({'message': 'Settings updated successfully'})

    except Exception as e:
        print(f"Error managing settings: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/pilots/register', methods=['POST', 'OPTIONS'])
def pilot_register():
    # Handle preflight request
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 200

    try:
        print('\n=== Pilot Registration ===')
        data = request.get_json()
        print(f"Registration data: {data}")

        # Validate required fields
        required_fields = ['name', 'full_name', 'email', 'phone', 'password', 'date_of_birth',
                          'gender', 'address', 'license_number', 'issuing_authority',
                          'license_issue_date', 'license_expiry_date', 'total_flying_hours',
                          'experience', 'equipment', 'pilot_license_url', 'id_proof_url', 'photograph_url']

        for field in required_fields:
            if field not in data or not data[field]:
                print(f"Missing required field: {field}")
                return jsonify({'message': f'Missing required field: {field}'}), 400

        # Validate email format
        if '@' not in data['email'] or '.' not in data['email']:
            print(f"Invalid email format: {data['email']}")
            return jsonify({'message': 'Invalid email format'}), 400

        # Validate password length
        if len(data['password']) < 6:
            print(f"Password too short: {len(data['password'])} characters")
            return jsonify({'message': 'Password must be at least 6 characters long'}), 400

        # Validate age (must be 18+)
        from datetime import datetime
        try:
            birth_date = datetime.strptime(data['date_of_birth'], '%Y-%m-%d')
            today = datetime.now()
            age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
            if age < 18:
                return jsonify({'message': 'Must be at least 18 years old'}), 400
        except ValueError:
            return jsonify({'message': 'Invalid date of birth format'}), 400

        # Validate license expiry
        try:
            expiry_date = datetime.strptime(data['license_expiry_date'], '%Y-%m-%d')
            if expiry_date <= datetime.now():
                return jsonify({'message': 'License must not be expired'}), 400
        except ValueError:
            return jsonify({'message': 'Invalid license expiry date format'}), 400

        conn = get_db()
        cursor = conn.cursor()

        # Check if email already exists in applications or main table
        cursor.execute('SELECT id FROM pilot_applications WHERE email = ?', (data['email'],))
        if cursor.fetchone():
            print(f"Email already has pending application: {data['email']}")
            conn.close()
            return jsonify({'message': 'Application already submitted with this email'}), 409

        cursor.execute('SELECT id FROM pilots WHERE email = ?', (data['email'],))
        if cursor.fetchone():
            print(f"Email already exists: {data['email']}")
            conn.close()
            return jsonify({'message': 'Email already registered'}), 409

        # Hash password
        password_hash = generate_password_hash(data['password'])

        # Insert new pilot application
        cursor.execute('''
            INSERT INTO pilot_applications (
                name, full_name, email, phone, password, password_hash, date_of_birth, gender, address,
                government_id_proof, license_number, issuing_authority, license_issue_date,
                license_expiry_date, drone_model, drone_serial, drone_uin, drone_category,
                total_flying_hours, flight_records, insurance_policy, insurance_validity,
                pilot_license_url, id_proof_url, training_certificate_url, photograph_url,
                insurance_certificate_url, cities, experience, equipment, portfolio_url, bank_account
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['name'],
            data['full_name'],
            data['email'],
            data['phone'],
            password_hash,  # For legacy password column
            password_hash,  # For new password_hash column
            data['date_of_birth'],
            data['gender'],
            data['address'],
            data.get('government_id_proof', ''),
            data['license_number'],
            data['issuing_authority'],
            data['license_issue_date'],
            data['license_expiry_date'],
            data.get('drone_model', ''),
            data.get('drone_serial', ''),
            data.get('drone_uin', ''),
            data.get('drone_category', ''),
            data['total_flying_hours'],
            data.get('flight_records', ''),
            data.get('insurance_policy', ''),
            data.get('insurance_validity', ''),
            data['pilot_license_url'],
            data['id_proof_url'],
            data.get('training_certificate_url', ''),
            data['photograph_url'],
            data.get('insurance_certificate_url', ''),
            data.get('cities', ''),
            data['experience'],
            data['equipment'],
            data.get('portfolio_url', ''),
            data.get('bank_account', '')
        ))

        application_id = cursor.lastrowid
        conn.commit()
        conn.close()

        print(f"Pilot application submitted successfully with ID: {application_id}")

        # Create response with CORS headers
        response = jsonify({
            'message': 'Pilot application submitted successfully. Please wait for admin approval.',
            'application_id': application_id
        })
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 201

    except sqlite3.Error as e:
        print(f"Database error during pilot registration: {str(e)}")
        import traceback
        print(f"Database error traceback: {traceback.format_exc()}")

        # Close connection if still open
        try:
            if 'conn' in locals():
                conn.close()
        except:
            pass

        response = jsonify({'message': 'Database error during registration'})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 500
    except Exception as e:
        print(f"Unexpected error during pilot registration: {str(e)}")
        import traceback
        print(f"Unexpected error traceback: {traceback.format_exc()}")

        # Close connection if still open
        try:
            if 'conn' in locals():
                conn.close()
        except:
            pass

        response = jsonify({'message': 'Registration failed due to an unexpected error'})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 500

@app.route('/api/editors/register', methods=['POST', 'OPTIONS'])
def editor_register():
    # Handle preflight request
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 200

    try:
        print('\n=== Editor Registration ===')
        data = request.get_json()
        print(f"Registration data: {data}")

        # Validate required fields
        required_fields = ['full_name', 'email', 'phone', 'password', 'role', 'years_experience', 'primary_skills', 'specialization']
        for field in required_fields:
            if field not in data or not data[field]:
                print(f"Missing required field: {field}")
                return jsonify({'message': f'Missing required field: {field}'}), 400

        # Validate email format
        if '@' not in data['email'] or '.' not in data['email']:
            print(f"Invalid email format: {data['email']}")
            return jsonify({'message': 'Invalid email format'}), 400

        # Validate password length
        if len(data['password']) < 6:
            print(f"Password too short: {len(data['password'])} characters")
            return jsonify({'message': 'Password must be at least 6 characters long'}), 400

        # Validate years of experience
        try:
            years_exp = int(data['years_experience'])
            if years_exp < 0:
                return jsonify({'message': 'Years of experience must be a positive number'}), 400
        except (ValueError, TypeError):
            return jsonify({'message': 'Years of experience must be a valid number'}), 400

        conn = get_db()
        cursor = conn.cursor()

        # Check if email already exists in applications or main table
        cursor.execute('SELECT id FROM editor_applications WHERE email = ?', (data['email'],))
        if cursor.fetchone():
            print(f"Email already exists in applications: {data['email']}")
            conn.close()
            return jsonify({'message': 'Application already submitted with this email'}), 409

        cursor.execute('SELECT id FROM editors WHERE email = ?', (data['email'],))
        if cursor.fetchone():
            print(f"Email already exists in editors: {data['email']}")
            conn.close()
            return jsonify({'message': 'Email already registered'}), 409

        # Hash password
        password_hash = generate_password_hash(data['password'])

        # Insert new editor application
        cursor.execute('''
            INSERT INTO editor_applications (
                full_name, email, phone, role, years_experience,
                primary_skills, specialization, portfolio_url, time_zone,
                government_id_url, tax_gst_number, password_hash
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['full_name'],
            data['email'],
            data['phone'],
            data['role'],
            years_exp,
            data['primary_skills'],
            data['specialization'],
            data.get('portfolio_url', ''),
            data.get('time_zone', ''),
            data.get('government_id_url', ''),
            data.get('tax_gst_number', ''),
            password_hash
        ))

        application_id = cursor.lastrowid
        conn.commit()
        conn.close()

        print(f"Editor application submitted successfully with ID: {application_id}")

        # Create response with CORS headers
        response = jsonify({
            'message': 'Editor application submitted successfully. Please wait for admin approval.',
            'application_id': application_id
        })
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 201

    except sqlite3.Error as e:
        print(f"Database error during editor registration: {str(e)}")
        response = jsonify({'message': 'Database error during registration'})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 500
    except Exception as e:
        print(f"Unexpected error during editor registration: {str(e)}")
        response = jsonify({'message': 'Registration failed due to an unexpected error'})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 500

@app.route('/api/editor/videos', methods=['GET', 'OPTIONS'])
@token_required
def get_editor_videos(current_user):
    if request.method == 'OPTIONS':
        return '', 200
        
    if current_user['role'] != 'editor':
        return jsonify({'error': 'Unauthorized'}), 403

    try:
        conn = get_db()
        c = conn.cursor()
        
        # Fetch videos assigned to this editor
        c.execute('''
            SELECT id, booking_id, title, description, status, review_type, 
                   drive_link, review_notes, created_at, updated_at
            FROM videos 
            WHERE editor_id = ?
            ORDER BY created_at DESC
        ''', (current_user['id'],))
        videos = c.fetchall()
        
        videos_list = []
        for video in videos:
            try:
                video_dict = {
                    'id': video[0],
                    'booking_id': video[1],
                    'title': video[2],
                    'description': video[3],
                    'status': video[4],
                    'review_type': video[5],
                    'drive_link': video[6],
                    'review_notes': video[7],
                    'created_at': video[8],
                    'updated_at': video[9]
                }
                videos_list.append(video_dict)
            except Exception as e:
                print(f"Error processing video data: {e}")
                continue

        conn.close()
        return jsonify(videos_list)

    except Exception as e:
        print(f"Error fetching videos: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/editor/videos/<int:video_id>', methods=['PUT', 'OPTIONS'])
@token_required
def update_editor_video(current_user, video_id):
    if request.method == 'OPTIONS':
        return '', 200
        
    if current_user['role'] != 'editor':
        return jsonify({'error': 'Unauthorized'}), 403

    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        conn = get_db()
        c = conn.cursor()

        # Check if video exists
        c.execute('SELECT id FROM videos WHERE id = ?', (video_id,))
        if not c.fetchone():
            conn.close()
            return jsonify({'error': 'Video not found'}), 404

        # Update video
        update_fields = []
        update_values = []
        
        if 'status' in data:
            update_fields.append('status = ?')
            update_values.append(data['status'])
        if 'review_notes' in data:
            update_fields.append('review_notes = ?')
            update_values.append(data['review_notes'])

        if not update_fields:
            conn.close()
            return jsonify({'error': 'No valid fields to update'}), 400

        update_fields.append('updated_at = CURRENT_TIMESTAMP')
        update_values.append(video_id)
        
        query = f'''
            UPDATE videos 
            SET {', '.join(update_fields)}
            WHERE id = ?
        '''
        
        c.execute(query, update_values)
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Video updated successfully'})

    except Exception as e:
        print(f"Error updating video: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/admin/clients', methods=['GET', 'OPTIONS'])
@token_required
def get_clients(current_user):
    # Handle preflight request
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept')
        response.headers.add('Access-Control-Allow-Methods', 'GET,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    print("\n=== Admin Clients Request ===")
    print(f"Requesting user role: {current_user['role']}")
    
    if current_user['role'] != 'admin':
        print("Unauthorized access attempt")
        response = jsonify({'message': 'Unauthorized'}), 403
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    
    try:
        conn = get_db()
        c = conn.cursor()
        
        # Get all clients (users with role 'client') with their business details and order info
        c.execute('''
            SELECT
                u.id,
                u.name as contact_name,
                bc.business_name,
                bc.contact_person_designation as position,
                u.phone,
                u.email,
                bc.official_address as city,
                u.created_at,
                COUNT(b.id) as order_count,
                COALESCE(SUM(b.payment_amount), 0) as total_order_value
            FROM users u
            LEFT JOIN business_clients bc ON u.email = bc.email
            LEFT JOIN bookings b ON u.id = b.user_id
            WHERE u.role = 'client'
            GROUP BY u.id
            ORDER BY u.created_at DESC
        ''')
        
        clients = c.fetchall()
        conn.close()
        
        clients_list = []
        for client in clients:
            client_dict = {
                'id': client[0],
                'contact_name': client[1],
                'business_name': client[2],
                'position': client[3],
                'phone': client[4],
                'email': client[5],
                'city': client[6],
                'created_at': client[7],
                'order_count': client[8],
                'total_order_value': float(client[9]) if client[9] else 0
            }
            clients_list.append(client_dict)
        
        print(f"Found {len(clients_list)} clients")
        
        response = jsonify(clients_list)
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
        
    except Exception as e:
        print(f"Error fetching clients: {str(e)}")
        response = jsonify({'message': 'Error fetching clients'}), 500
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

@app.route('/api/admin/clients/<int:client_id>/details', methods=['GET'])
@token_required
def get_client_details(current_user, client_id):
    """Get detailed information for a specific client"""
    try:
        conn = get_db()
        c = conn.cursor()

        # Get detailed client information by joining users and business_clients tables
        c.execute('''
            SELECT
                u.id,
                u.name as user_contact_name,
                u.email as user_email,
                u.phone as user_phone,
                u.created_at as user_created_at,
                u.approval_status as user_approval_status,
                bc.id as business_id,
                bc.business_name,
                bc.registration_number,
                bc.organization_type,
                bc.incorporation_date,
                bc.official_address,
                bc.official_email,
                bc.phone as business_phone,
                bc.contact_name as business_contact_name,
                bc.contact_person_designation,
                bc.email as business_email,
                bc.registration_certificate_url,
                bc.tax_identification_url,
                bc.business_license_url,
                bc.address_proof_url,
                bc.approval_status as business_approval_status,
                bc.status as business_status,
                bc.created_at as business_created_at,
                bc.updated_at as business_updated_at,
                COUNT(b.id) as order_count,
                COALESCE(SUM(b.payment_amount), 0) as total_order_value
            FROM users u
            LEFT JOIN business_clients bc ON u.email = bc.email
            LEFT JOIN bookings b ON u.id = b.user_id
            WHERE u.id = ? AND u.role = 'client'
            GROUP BY u.id
        ''', (client_id,))

        client = c.fetchone()
        conn.close()

        if not client:
            return jsonify({'message': 'Client not found'}), 404

        # Convert to dictionary
        client_dict = dict(client)

        response = jsonify(client_dict)
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    except Exception as e:
        print(f"Error fetching client details: {str(e)}")
        return jsonify({'message': 'Internal server error'}), 500

# Old pilot_apply endpoint removed - use /api/pilots/register instead
# The old endpoint was using a simple schema that conflicts with the new comprehensive schema

@app.route('/api/admin/pilot-applications', methods=['GET'])
@token_required
def list_pilot_applications(current_user):
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    try:
        conn = get_db()
        c = conn.cursor()
        c.execute('SELECT * FROM pilot_applications ORDER BY created_at DESC')
        rows = c.fetchall()
        columns = [desc[0] for desc in c.description]
        applications = [dict(zip(columns, row)) for row in rows]
        conn.close()
        return jsonify(applications)
    except Exception as e:
        print(f"Error fetching pilot applications: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/admin/pilot-applications/<int:app_id>/approve', methods=['POST'])
@token_required
def approve_pilot_application(current_user, app_id):
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    data = request.get_json()
    admin_comments = data.get('admin_comments', '')
    try:
        conn = get_db()
        c = conn.cursor()
        # Get application
        c.execute('SELECT * FROM pilot_applications WHERE id = ?', (app_id,))
        app_row = c.fetchone()
        if not app_row:
            conn.close()
            return jsonify({'error': 'Application not found'}), 404
        columns = [desc[0] for desc in c.description]
        app_data = dict(zip(columns, app_row))
        # Create pilot in pilots table
        c.execute('SELECT id FROM pilots WHERE email = ?', (app_data['email'],))
        if c.fetchone():
            conn.close()
            return jsonify({'error': 'Pilot already exists'}), 409
        c.execute('''
            INSERT INTO pilots (name, email, phone, password, experience, equipment, cities, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)
        ''', (
            app_data['name'],
            app_data['email'],
            app_data['phone'],
            app_data['password'],
            app_data['experience'],
            app_data['equipment'],
            app_data['cities']
        ))
        # Update application status
        c.execute('''
            UPDATE pilot_applications SET status = 'approved', admin_comments = ? WHERE id = ?
        ''', (admin_comments, app_id))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Pilot approved and registered.'})
    except Exception as e:
        print(f"Error approving pilot application: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/admin/pilot-applications/<int:app_id>/reject', methods=['POST'])
@token_required
def reject_pilot_application(current_user, app_id):
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    data = request.get_json()
    admin_comments = data.get('admin_comments', '')
    try:
        conn = get_db()
        c = conn.cursor()
        c.execute('''
            UPDATE pilot_applications SET status = 'rejected', admin_comments = ? WHERE id = ?
        ''', (admin_comments, app_id))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Application rejected.'})
    except Exception as e:
        print(f"Error rejecting pilot application: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/cities', methods=['GET'])
def get_cities():
    response = jsonify(CITY_LIST)
    response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

@app.route('/api/cost/preview', methods=['POST'])
def cost_preview():
    data = request.json
    category = data.get('category')
    area_sqft = data.get('area_sqft')
    num_floors = data.get('num_floors')
    def calculate_cost(category, area_sqft, num_floors):
        COSTING_TABLE = {
            "Retail Store / Showroom":      [5999,  9999,  15999, 20999, None],
            "Restaurants & Cafes":          [7999, 11999, 19999, 25999, None],
            "Fitness & Sports Arenas":      [9999, 13999, 22999, 31999, None],
            "Resorts & Farmstays / Hotels": [11999,17999, 29999, 39999, None],
            "Real Estate Property":         [13999,23999, 37999, 49999, None],
            "Shopping Mall / Complex":      [15999,29999, 47999, 63999, None],
            "Adventure / Water Parks":      [12999,23999, 39999, 55999, None],
            "Gaming & Entertainment Zones": [10999,19999, 33999, 45999, None],
        }
        area_ranges = [1000, 5000, 10000, 50000]
        if category not in COSTING_TABLE:
            return None, None, "Invalid category"
        try:
            area_sqft = int(area_sqft)
        except:
            return None, None, "Invalid area"
        try:
            num_floors = int(num_floors)
        except:
            num_floors = 1
        if area_sqft > 50000:
            return None, None, "Custom Quote"
        idx = 0
        for i, max_area in enumerate(area_ranges):
            if area_sqft <= max_area:
                idx = i
                break
            idx = i + 1
        base_cost = COSTING_TABLE[category][idx]
        if base_cost is None:
            return None, None, "Custom Quote"
        if num_floors is None or num_floors < 1:
            num_floors = 1
        final_cost = int(base_cost * (1 + 0.1 * (num_floors - 1)))
        return base_cost, final_cost, None
    base_cost, final_cost, custom_quote = calculate_cost(category, area_sqft, num_floors)
    return jsonify({
        'base_cost': base_cost,
        'final_cost': final_cost,
        'custom_quote': custom_quote
    })

# PhonePe Payment Integration Endpoints

@app.route('/api/payment/initiate', methods=['POST', 'OPTIONS'])
@token_required
def initiate_payment(current_user):
    """Initiate PhonePe payment for a booking"""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept')
        response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    if current_user['role'] != 'client':
        return jsonify({'message': 'Only clients can initiate payments'}), 403

    try:
        data = request.get_json()
        booking_id = data.get('booking_id')
        amount = data.get('amount')

        if not booking_id or not amount:
            return jsonify({'message': 'Booking ID and amount are required'}), 400

        # Get booking details
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT b.*, u.phone, u.contact_name, u.business_name
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            WHERE b.id = ? AND b.user_id = ?
        ''', (booking_id, current_user['id']))
        
        booking = cursor.fetchone()
        conn.close()

        if not booking:
            return jsonify({'message': 'Booking not found'}), 404

        # Prepare customer info for PhonePe
        customer_info = {
            'user_id': current_user['id'],
            'phone': booking['phone'],
            'name': booking['contact_name'],
            'business_name': booking['business_name']
        }

        # Initiate PhonePe payment
        payment_result = phonepe.create_payment_request(booking_id, amount, customer_info)

        if payment_result['success']:
            # Store payment record in database
            conn = get_db()
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO payments (
                    booking_id, amount, status, payment_method, 
                    merchant_transaction_id, payment_gateway
                ) VALUES (?, ?, 'pending', 'phonepe', ?, 'phonepe')
            ''', (booking_id, amount, payment_result['merchant_transaction_id']))
            
            conn.commit()
            conn.close()

            return jsonify({
                'success': True,
                'payment_url': payment_result['payment_url'],
                'transaction_id': payment_result['transaction_id']
            })
        else:
            return jsonify({
                'success': False,
                'message': payment_result['error']
            }), 400

    except Exception as e:
        print(f"Error initiating payment: {str(e)}")
        return jsonify({'message': 'Failed to initiate payment'}), 500

@app.route('/api/payment/callback', methods=['POST', 'GET'])
def payment_callback():
    """Handle PhonePe payment callback"""
    try:
        # Get callback data
        if request.method == 'POST':
            callback_data = request.get_json()
        else:
            # For GET requests, parse query parameters
            callback_data = request.args.to_dict()

        print(f"Payment callback received: {callback_data}")

        # Validate callback
        is_valid, message = phonepe.validate_callback(callback_data)

        if not is_valid:
            print(f"Invalid callback: {message}")
            return jsonify({'message': 'Invalid callback'}), 400

        # Check payment status with PhonePe
        merchant_transaction_id = callback_data.get('merchantTransactionId')
        status_result = phonepe.check_payment_status(merchant_transaction_id)

        if status_result['success']:
            payment_status = status_result['status']

            # Update payment record in database
            conn = get_db()
            cursor = conn.cursor()

            # Update payment status
            cursor.execute('''
                UPDATE payments 
                SET status = ?, gateway_response = ?, updated_at = CURRENT_TIMESTAMP
                WHERE merchant_transaction_id = ?
            ''', (payment_status, json.dumps(status_result), merchant_transaction_id))

            # Get payment record
            cursor.execute('SELECT booking_id FROM payments WHERE merchant_transaction_id = ?', (merchant_transaction_id,))
            payment_record = cursor.fetchone()
            
            if payment_record:
                booking_id = payment_record[0]
                
                # Update booking payment status
                if payment_status == 'COMPLETED':
                    cursor.execute('''
                        UPDATE bookings 
                        SET payment_status = 'paid', 
                            payment_amount = (SELECT amount FROM payments WHERE merchant_transaction_id = ?),
                            payment_date = CURRENT_TIMESTAMP,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    ''', (merchant_transaction_id, booking_id))
                
                conn.commit()
            
            conn.close()

            return jsonify({
                'success': True,
                'status': payment_status,
                'message': 'Payment status updated successfully'
            })
        else:
            return jsonify({
                'success': False,
                'message': status_result['error']
            }), 400

    except Exception as e:
        print(f"Error processing payment callback: {str(e)}")
        return jsonify({'message': 'Failed to process callback'}), 500

@app.route('/api/payment/status/<merchant_transaction_id>', methods=['GET'])
@token_required
def check_payment_status(current_user, merchant_transaction_id):
    """Check payment status for a specific transaction"""
    try:
        # Check status with PhonePe
        status_result = phonepe.check_payment_status(merchant_transaction_id)
        
        if status_result['success']:
            return jsonify(status_result)
        else:
            return jsonify({
                'success': False,
                'message': status_result['error']
            }), 400

    except Exception as e:
        print(f"Error checking payment status: {str(e)}")
        return jsonify({'message': 'Failed to check payment status'}), 500

@app.route('/api/payment/refund', methods=['POST'])
@token_required
def process_refund(current_user):
    """Process refund for a payment"""
    if current_user['role'] != 'admin':
        return jsonify({'message': 'Only admins can process refunds'}), 403

    try:
        data = request.get_json()
        merchant_transaction_id = data.get('merchant_transaction_id')
        refund_amount = data.get('refund_amount')
        refund_note = data.get('refund_note', '')

        if not merchant_transaction_id or not refund_amount:
            return jsonify({'message': 'Merchant transaction ID and refund amount are required'}), 400

        # Process refund with PhonePe
        refund_result = phonepe.process_refund(merchant_transaction_id, refund_amount, refund_note)

        if refund_result['success']:
            # Update payment record
            conn = get_db()
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE payments 
                SET status = 'refunded', 
                    gateway_response = ?, 
                    updated_at = CURRENT_TIMESTAMP
                WHERE merchant_transaction_id = ?
            ''', (json.dumps(refund_result), merchant_transaction_id))
            
            conn.commit()
            conn.close()

            return jsonify({
                'success': True,
                'message': 'Refund processed successfully',
                'refund_transaction_id': refund_result['refund_transaction_id']
            })
        else:
            return jsonify({
                'success': False,
                'message': refund_result['error']
            }), 400

    except Exception as e:
        print(f"Error processing refund: {str(e)}")
        return jsonify({'message': 'Failed to process refund'}), 500

# Application Management Endpoints
@app.route('/api/admin/applications/<application_type>', methods=['GET', 'OPTIONS'])
@token_required
def get_applications(current_user, application_type):
    """Get all applications of a specific type"""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        # Validate application type
        valid_types = ['pilot', 'editor', 'referral', 'business_client']
        if application_type not in valid_types:
            return jsonify({'message': 'Invalid application type'}), 400

        conn = get_db()
        cursor = conn.cursor()

        table_name = f"{application_type}_applications"
        cursor.execute(f'SELECT * FROM {table_name} ORDER BY created_at DESC')
        applications = cursor.fetchall()

        # Convert to list of dictionaries
        applications_list = []
        for app in applications:
            app_dict = dict(app)
            applications_list.append(app_dict)

        conn.close()

        response = jsonify({
            'applications': applications_list,
            'count': len(applications_list)
        })
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    except Exception as e:
        print(f"Error getting applications: {str(e)}")
        response = jsonify({'message': 'Failed to get applications'})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 500

@app.route('/api/admin/applications/<application_type>/<int:application_id>/approve', methods=['POST', 'OPTIONS'])
@token_required
def approve_application(current_user, application_type, application_id):
    """Approve an application and move to main table"""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        # Get admin comments from request
        data = request.get_json() or {}
        admin_comments = data.get('comments', '')

        # Validate application type
        valid_types = ['pilot', 'editor', 'referral', 'business_client']
        if application_type not in valid_types:
            return jsonify({'message': 'Invalid application type'}), 400

        conn = get_db()
        cursor = conn.cursor()

        # Get application data
        app_table = f"{application_type}_applications"
        cursor.execute(f'SELECT * FROM {app_table} WHERE id = ?', (application_id,))
        application = cursor.fetchone()

        if not application:
            conn.close()
            return jsonify({'message': 'Application not found'}), 404

        app_dict = dict(application)

        # Move to appropriate main table based on type
        if application_type == 'pilot':
            cursor.execute('''
                INSERT INTO pilots (
                    name, full_name, email, phone, password, password_hash, date_of_birth, gender, address,
                    government_id_proof, license_number, issuing_authority, license_issue_date,
                    license_expiry_date, drone_model, drone_serial, drone_uin, drone_category,
                    total_flying_hours, flight_records, insurance_policy, insurance_validity,
                    pilot_license_url, id_proof_url, training_certificate_url, photograph_url,
                    insurance_certificate_url, cities, experience, equipment, portfolio_url,
                    bank_account, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
            ''', (
                app_dict['name'], app_dict['full_name'], app_dict['email'], app_dict['phone'],
                app_dict['password_hash'], app_dict['password_hash'], app_dict['date_of_birth'], app_dict['gender'], app_dict['address'],
                app_dict['government_id_proof'], app_dict['license_number'], app_dict['issuing_authority'],
                app_dict['license_issue_date'], app_dict['license_expiry_date'], app_dict['drone_model'],
                app_dict['drone_serial'], app_dict['drone_uin'], app_dict['drone_category'],
                app_dict['total_flying_hours'], app_dict['flight_records'], app_dict['insurance_policy'],
                app_dict['insurance_validity'], app_dict['pilot_license_url'], app_dict['id_proof_url'],
                app_dict['training_certificate_url'], app_dict['photograph_url'], app_dict['insurance_certificate_url'],
                app_dict['cities'], app_dict['experience'], app_dict['equipment'], app_dict['portfolio_url'],
                app_dict['bank_account']
            ))
        elif application_type == 'editor':
            cursor.execute('''
                INSERT INTO editors (name, full_name, email, phone, password_hash, role,
                                   years_experience, primary_skills, specialization,
                                   portfolio_url, time_zone, government_id_url, tax_gst_number, status, approval_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 'approved')
            ''', (
                app_dict['full_name'], app_dict['full_name'], app_dict['email'], app_dict['phone'],
                app_dict['password_hash'], app_dict['role'], app_dict['years_experience'],
                app_dict['primary_skills'], app_dict['specialization'], app_dict['portfolio_url'],
                app_dict['time_zone'], app_dict['government_id_url'], app_dict['tax_gst_number']
            ))
        elif application_type == 'referral':
            # Referrals table has limited columns, only insert what exists
            cursor.execute('''
                INSERT INTO referrals (name, email, phone, status, commission_rate, total_earnings)
                VALUES (?, ?, ?, 'active', 10.0, 0.0)
            ''', (
                app_dict['name'], app_dict['email'], app_dict['phone']
            ))
        elif application_type == 'business_client':
            # Insert into business_clients table
            cursor.execute('''
                INSERT INTO business_clients (business_name, registration_number, organization_type,
                                            incorporation_date, official_address, official_email, phone,
                                            contact_name, contact_person_designation, email, password_hash,
                                            registration_certificate_url, tax_identification_url,
                                            business_license_url, address_proof_url, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
            ''', (
                app_dict['business_name'], app_dict['registration_number'], app_dict['organization_type'],
                app_dict['incorporation_date'], app_dict['official_address'], app_dict['official_email'],
                app_dict['phone'], app_dict['contact_name'], app_dict['contact_person_designation'],
                app_dict['email'], app_dict['password_hash'], app_dict['registration_certificate_url'],
                app_dict['tax_identification_url'], app_dict['business_license_url'], app_dict['address_proof_url']
            ))

            # Also create a user record for authentication and client database display
            cursor.execute('''
                INSERT INTO users (email, password_hash, name, role, approval_status, created_at)
                VALUES (?, ?, ?, 'client', 'approved', CURRENT_TIMESTAMP)
            ''', (
                app_dict['email'], app_dict['password_hash'], app_dict['contact_name']
            ))

        # Delete from applications table
        cursor.execute(f'DELETE FROM {app_table} WHERE id = ?', (application_id,))

        conn.commit()
        conn.close()

        # Send approval email
        try:
            applicant_name = app_dict.get('name') or app_dict.get('full_name') or 'Applicant'
            applicant_email = app_dict.get('email')

            if applicant_email:
                subject, body = get_application_approval_email(
                    applicant_name,
                    application_type.replace('_', ' ').title(),
                    admin_comments
                )
                send_email_async(applicant_email, subject, body)
                print(f"Approval email sent to {applicant_email}")
            else:
                print("No email address found for applicant")
        except Exception as e:
            print(f"Failed to send approval email: {str(e)}")

        response = jsonify({'message': f'{application_type.title()} application approved successfully'})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    except Exception as e:
        print(f"Error approving application: {str(e)}")
        response = jsonify({'message': 'Failed to approve application'})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 500

@app.route('/api/admin/applications/<application_type>/<int:application_id>/reject', methods=['POST', 'OPTIONS'])
@token_required
def reject_application(current_user, application_type, application_id):
    """Reject an application"""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        data = request.get_json() or {}
        admin_comments = data.get('comments', '')

        # Validate application type
        valid_types = ['pilot', 'editor', 'referral', 'business_client']
        if application_type not in valid_types:
            return jsonify({'message': 'Invalid application type'}), 400

        conn = get_db()
        cursor = conn.cursor()

        # Update application status to rejected
        app_table = f"{application_type}_applications"
        cursor.execute(f'''
            UPDATE {app_table}
            SET status = 'rejected', admin_comments = ?
            WHERE id = ?
        ''', (admin_comments, application_id))

        if cursor.rowcount == 0:
            conn.close()
            return jsonify({'message': 'Application not found'}), 404

        # Get application details for email
        cursor.execute(f'SELECT * FROM {app_table} WHERE id = ?', (application_id,))
        app_row = cursor.fetchone()
        app_dict = dict(app_row) if app_row else {}

        conn.commit()
        conn.close()

        # Send rejection email
        try:
            applicant_name = app_dict.get('name') or app_dict.get('full_name') or 'Applicant'
            applicant_email = app_dict.get('email')

            if applicant_email:
                subject, body = get_application_rejection_email(
                    applicant_name,
                    application_type.replace('_', ' ').title(),
                    admin_comments
                )
                send_email_async(applicant_email, subject, body)
                print(f"Rejection email sent to {applicant_email}")
            else:
                print("No email address found for applicant")
        except Exception as e:
            print(f"Failed to send rejection email: {str(e)}")

        response = jsonify({'message': f'{application_type.title()} application rejected'})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    except Exception as e:
        print(f"Error rejecting application: {str(e)}")
        response = jsonify({'message': 'Failed to reject application'})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 500

# Video Reviews API Endpoints

@app.route('/api/admin/video-reviews', methods=['GET'])
@token_required
def get_video_reviews(current_user):
    """Get video reviews for admin dashboard"""
    if current_user['role'] != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403

    try:
        conn = get_db()

        # Get submission type filter
        submission_type = request.args.get('type', 'all')  # pilot, editor, or all

        base_query = '''
            SELECT vr.*,
                   b.id as booking_id,
                   u.name as client_name, u.email as client_email,
                   p.name as pilot_name, p.email as pilot_email,
                   e.name as editor_name, e.email as editor_email
            FROM video_reviews vr
            LEFT JOIN bookings b ON vr.order_id = b.id
            LEFT JOIN users u ON vr.client_id = u.id
            LEFT JOIN pilots p ON vr.pilot_id = p.id
            LEFT JOIN editors e ON vr.editor_id = e.id
        '''

        if submission_type == 'pilot':
            query = base_query + " WHERE vr.submission_type = 'pilot' ORDER BY vr.submitted_date DESC"
        elif submission_type == 'editor':
            query = base_query + " WHERE vr.submission_type = 'editor' ORDER BY vr.submitted_date DESC"
        else:
            query = base_query + " ORDER BY vr.submitted_date DESC"

        reviews = conn.execute(query).fetchall()
        conn.close()

        # Format the response
        reviews_list = []
        for review in reviews:
            review_dict = dict(review)
            reviews_list.append({
                'video_id': review_dict.get('video_id'),
                'order_id': review_dict.get('order_id'),
                'booking_id': f"HMX{review_dict.get('order_id', ''):04d}",
                'client_id': review_dict.get('client_id'),
                'client_name': review_dict.get('client_name', 'Unknown'),
                'client_email': review_dict.get('client_email', ''),
                'editor_id': review_dict.get('editor_id'),
                'editor_name': review_dict.get('editor_name', 'Unassigned'),
                'pilot_id': review_dict.get('pilot_id'),
                'pilot_name': review_dict.get('pilot_name', 'Unassigned'),
                'drive_link': review_dict.get('drive_link', ''),
                'submitted_date': review_dict.get('submitted_date', ''),
                'admin_comments': review_dict.get('admin_comments', ''),
                'pilot_comments': review_dict.get('pilot_comments', ''),
                'editor_comments': review_dict.get('editor_comments', ''),
                'status': review_dict.get('status', 'submitted'),
                'submission_type': review_dict.get('submission_type', 'pilot'),
                'created_at': review_dict.get('created_at', ''),
                'updated_at': review_dict.get('updated_at', '')
            })

        return jsonify(reviews_list)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/video-reviews/<int:video_id>', methods=['PUT'])
@token_required
def update_video_review(current_user, video_id):
    """Update video review status and comments"""
    if current_user['role'] != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403

    try:
        data = request.json
        conn = get_db()
        cursor = conn.cursor()

        # Update video review
        update_fields = []
        update_values = []

        if 'status' in data:
            update_fields.append('status = ?')
            update_values.append(data['status'])

        if 'admin_comments' in data:
            update_fields.append('admin_comments = ?')
            update_values.append(data['admin_comments'])

        if update_fields:
            update_fields.append('updated_at = CURRENT_TIMESTAMP')
            update_values.append(video_id)

            query = f"UPDATE video_reviews SET {', '.join(update_fields)} WHERE video_id = ?"
            cursor.execute(query, update_values)

            # If status is being updated, also update bookings table
            if 'status' in data:
                # Get the order_id, submission_type, and drive_link for this video review
                cursor.execute('SELECT order_id, submission_type, drive_link, editor_id FROM video_reviews WHERE video_id = ?', (video_id,))
                result = cursor.fetchone()

                if result:
                    order_id, submission_type, drive_link, editor_id = result

                    # Update bookings table based on status and submission type
                    if data['status'] == 'forwarded_to_editor' and submission_type == 'pilot':
                        cursor.execute('UPDATE bookings SET status = ? WHERE id = ?', ('editing', order_id))
                    elif data['status'] == 'completed' and submission_type == 'editor':
                        # When marking editor video as completed, also update delivery link
                        cursor.execute('''
                            UPDATE bookings
                            SET status = 'completed', delivery_video_link = ?
                            WHERE id = ?
                        ''', (drive_link, order_id))
                        print(f"Updated booking {order_id} status to completed with video link: {drive_link}")
                    elif data['status'] == 'approved' and submission_type == 'editor':
                        # When admin approves editor video, update delivery_video_link with the latest approved video
                        # Get the latest approved video from this editor for this order
                        cursor.execute('''
                            SELECT drive_link FROM video_reviews
                            WHERE order_id = ? AND editor_id = ? AND submission_type = 'editor' AND status = 'approved'
                            ORDER BY submitted_date DESC
                            LIMIT 1
                        ''', (order_id, editor_id))

                        latest_approved = cursor.fetchone()
                        if latest_approved:
                            latest_drive_link = latest_approved[0]
                            # Update the booking with the latest approved video link
                            cursor.execute('''
                                UPDATE bookings
                                SET delivery_video_link = ?, status = 'completed'
                                WHERE id = ?
                            ''', (latest_drive_link, order_id))
                            print(f"Updated booking {order_id} with approved video link: {latest_drive_link}")
                        else:
                            # If no approved video found yet, just update with current video link
                            cursor.execute('''
                                UPDATE bookings
                                SET delivery_video_link = ?, status = 'completed'
                                WHERE id = ?
                            ''', (drive_link, order_id))
                            print(f"Updated booking {order_id} with current video link: {drive_link}")

            conn.commit()

        conn.close()
        return jsonify({'message': 'Video review updated successfully'})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/pilot/video-submissions', methods=['GET', 'POST'])
@token_required
def pilot_video_submissions(current_user):
    """Handle pilot video submissions"""
    if current_user['role'] != 'pilot':
        return jsonify({'message': 'Unauthorized'}), 403

    try:
        conn = get_db()

        if request.method == 'GET':
            # Get pilot's video submissions
            cursor = conn.cursor()
            cursor.execute('''
                SELECT vr.*, b.id as booking_id,
                       u.name as client_name
                FROM video_reviews vr
                LEFT JOIN bookings b ON vr.order_id = b.id
                LEFT JOIN users u ON vr.client_id = u.id
                WHERE vr.pilot_id = ? AND vr.submission_type = 'pilot'
                ORDER BY vr.submitted_date DESC
            ''', (current_user['user_id'],))

            submissions = cursor.fetchall()
            conn.close()

            submissions_list = []
            for submission in submissions:
                sub_dict = dict(submission)
                submissions_list.append({
                    'video_id': sub_dict.get('video_id'),
                    'order_id': sub_dict.get('order_id'),
                    'booking_id': f"HMX{sub_dict.get('order_id', ''):04d}",
                    'client_name': sub_dict.get('client_name', 'Unknown'),
                    'drive_link': sub_dict.get('drive_link', ''),
                    'pilot_comments': sub_dict.get('pilot_comments', ''),
                    'admin_comments': sub_dict.get('admin_comments', ''),
                    'status': sub_dict.get('status', 'submitted'),
                    'submitted_date': sub_dict.get('submitted_date', '')
                })

            return jsonify(submissions_list)

        elif request.method == 'POST':
            # Create new pilot video submission
            data = request.json
            cursor = conn.cursor()

            cursor.execute('''
                INSERT INTO video_reviews (
                    order_id, client_id, pilot_id, drive_link, pilot_comments,
                    submission_type, status
                ) VALUES (?, ?, ?, ?, ?, 'pilot', 'submitted')
            ''', (
                data.get('order_id'),
                data.get('client_id'),
                current_user['user_id'],
                data.get('drive_link'),
                data.get('pilot_comments', '')
            ))

            conn.commit()
            conn.close()

            return jsonify({'message': 'Video submitted successfully'})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/editor/video-submissions', methods=['GET', 'POST'])
@token_required
def editor_video_submissions(current_user):
    """Handle editor video submissions"""
    if current_user['role'] != 'editor':
        return jsonify({'message': 'Unauthorized'}), 403

    try:
        conn = get_db()

        if request.method == 'GET':
            # Get editor's video submissions
            cursor = conn.cursor()
            cursor.execute('''
                SELECT vr.*, b.id as booking_id,
                       u.name as client_name
                FROM video_reviews vr
                LEFT JOIN bookings b ON vr.order_id = b.id
                LEFT JOIN users u ON vr.client_id = u.id
                WHERE vr.editor_id = ? AND vr.submission_type = 'editor'
                ORDER BY vr.submitted_date DESC
            ''', (current_user['user_id'],))

            submissions = cursor.fetchall()
            conn.close()

            submissions_list = []
            for submission in submissions:
                sub_dict = dict(submission)
                submissions_list.append({
                    'video_id': sub_dict.get('video_id'),
                    'order_id': sub_dict.get('order_id'),
                    'booking_id': f"HMX{sub_dict.get('order_id', ''):04d}",
                    'client_name': sub_dict.get('client_name', 'Unknown'),
                    'drive_link': sub_dict.get('drive_link', ''),
                    'editor_comments': sub_dict.get('editor_comments', ''),
                    'admin_comments': sub_dict.get('admin_comments', ''),
                    'status': sub_dict.get('status', 'submitted'),
                    'submitted_date': sub_dict.get('submitted_date', '')
                })

            return jsonify(submissions_list)

        elif request.method == 'POST':
            # Create new editor video submission
            data = request.json
            cursor = conn.cursor()

            cursor.execute('''
                INSERT INTO video_reviews (
                    order_id, client_id, editor_id, pilot_id, drive_link, editor_comments,
                    submission_type, status
                ) VALUES (?, ?, ?, ?, ?, ?, 'editor', 'submitted')
            ''', (
                data.get('order_id'),
                data.get('client_id'),
                current_user['user_id'],
                data.get('pilot_id'),
                data.get('drive_link'),
                data.get('editor_comments', '')
            ))

            conn.commit()
            conn.close()

            return jsonify({'message': 'Edited video submitted successfully'})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/pilot/assigned-orders', methods=['GET'])
@token_required
def get_pilot_assigned_orders(current_user):
    """Get ALL orders assigned to pilot for dashboard"""
    print(f"Pilot assigned orders - current_user: {current_user}")

    if current_user['role'] != 'pilot':
        return jsonify({'message': 'Unauthorized'}), 403

    try:
        conn = get_db()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        print(f"Fetching orders for pilot ID: {current_user['user_id']}")

        # Get ALL orders assigned to this pilot (for dashboard)
        cursor.execute('''
            SELECT b.*, u.name as client_name, u.email as client_email,
                   e.name as editor_name
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.id
            LEFT JOIN editors e ON b.editor_id = e.id
            WHERE b.pilot_id = ?
            ORDER BY b.created_at DESC
        ''', (current_user['user_id'],))

        orders = cursor.fetchall()
        conn.close()

        orders_list = []
        for order in orders:
            order_dict = dict(order)
            orders_list.append({
                'id': order_dict.get('id'),
                'booking_id': f"HMX{order_dict.get('id', ''):04d}",
                'user_id': order_dict.get('user_id'),
                'client_id': order_dict.get('user_id'),
                'client_name': order_dict.get('client_name', 'Unknown'),
                'client_email': order_dict.get('client_email', ''),
                'editor_id': order_dict.get('editor_id'),
                'editor_name': order_dict.get('editor_name', 'Unassigned'),
                'status': order_dict.get('status'),
                'preferred_date': order_dict.get('preferred_date', ''),
                'location_address': order_dict.get('location_address', ''),
                'property_type': order_dict.get('property_type', ''),
                'payment_amount': order_dict.get('payment_amount'),
                'payment_status': order_dict.get('payment_status'),
                'delivery_video_link': order_dict.get('delivery_video_link'),
                'updated_at': order_dict.get('updated_at'),
                'created_at': order_dict.get('created_at')
            })

        print(f"Returning {len(orders_list)} orders")
        return jsonify(orders_list)

    except Exception as e:
        print(f"Error in get_pilot_assigned_orders: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/editor/ongoing-orders', methods=['GET'])
@token_required
def get_editor_ongoing_orders(current_user):
    """Get ongoing orders for the logged-in editor (not completed, cancelled, or rejected)"""
    print(f"Editor ongoing orders - current_user: {current_user}")

    if current_user['role'] != 'editor':
        return jsonify({'message': 'Unauthorized'}), 403

    try:
        conn = get_db()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Get ongoing bookings assigned to this editor
        cursor.execute('''
            SELECT b.*, u.name as client_name, u.email as client_email
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.id
            WHERE b.editor_id = ? AND b.status NOT IN ('completed', 'cancelled', 'rejected')
            ORDER BY b.preferred_date ASC
        ''', (current_user['user_id'],))

        orders = cursor.fetchall()
        conn.close()

        orders_list = []
        for order in orders:
            order_dict = dict(order)
            orders_list.append({
                'id': order_dict.get('id'),
                'user_id': order_dict.get('user_id'),
                'client_id': order_dict.get('user_id'),
                'pilot_id': order_dict.get('pilot_id'),
                'client_name': order_dict.get('client_name', 'Unknown'),
                'client_email': order_dict.get('client_email', ''),
                'location_address': order_dict.get('location_address'),
                'status': order_dict.get('status'),
                'preferred_date': order_dict.get('preferred_date'),
                'payment_amount': order_dict.get('payment_amount'),
                'created_at': order_dict.get('created_at')
            })

        print(f"Returning {len(orders_list)} ongoing orders for editor")
        return jsonify(orders_list)

    except Exception as e:
        print(f"Error in get_editor_ongoing_orders: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/editor/completed-orders', methods=['GET', 'OPTIONS'])
@token_required
def get_editor_completed_orders(current_user):
    """Get completed orders for the logged-in editor"""

    # Handle preflight request
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept')
        response.headers.add('Access-Control-Allow-Methods', 'GET,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    print(f"\n=== EDITOR COMPLETED ORDERS DEBUG ===")
    print(f"Current user data: {current_user}")
    print(f"User ID: {current_user.get('user_id', 'NOT_FOUND')}")
    print(f"User role: {current_user.get('role', 'NOT_FOUND')}")

    if current_user['role'] != 'editor':
        print(f"❌ AUTHORIZATION FAILED: Expected role 'editor', got '{current_user['role']}'")
        response = jsonify({'message': f'Unauthorized - Role is {current_user["role"]}, expected editor'})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 403

    print(f"✅ AUTHORIZATION PASSED: User is an editor")

    try:
        conn = get_db()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Get only completed bookings assigned to this editor
        cursor.execute('''
            SELECT b.*, u.name as client_name, u.email as client_email
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.id
            WHERE b.editor_id = ? AND b.status = 'completed'
            ORDER BY b.updated_at DESC
        ''', (current_user['user_id'],))

        orders = cursor.fetchall()
        conn.close()

        orders_list = []
        for order in orders:
            order_dict = dict(order)
            orders_list.append({
                'id': order_dict.get('id'),
                'user_id': order_dict.get('user_id'),
                'client_name': order_dict.get('client_name', 'Unknown'),
                'client_email': order_dict.get('client_email', ''),
                'location_address': order_dict.get('location_address'),
                'status': order_dict.get('status'),
                'payment_status': order_dict.get('payment_status'),
                'payment_amount': order_dict.get('payment_amount'),
                'delivery_video_link': order_dict.get('delivery_video_link'),
                'updated_at': order_dict.get('updated_at'),
                'created_at': order_dict.get('created_at')
            })

        print(f"Returning {len(orders_list)} completed orders for editor")
        response = jsonify(orders_list)
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    except Exception as e:
        print(f"Error in get_editor_completed_orders: {str(e)}")
        import traceback
        traceback.print_exc()
        response = jsonify({'error': str(e)})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 500

@app.route('/api/editor/cancelled-orders', methods=['GET', 'OPTIONS'])
@token_required
def get_editor_cancelled_orders(current_user):
    """Get cancelled/rejected orders for the logged-in editor"""
    print(f"\n=== EDITOR CANCELLED ORDERS DEBUG ===")
    print(f"Current user data: {current_user}")
    print(f"User ID: {current_user.get('user_id', 'NOT_FOUND')}")
    print(f"User role: {current_user.get('role', 'NOT_FOUND')}")

    if current_user['role'] != 'editor':
        print(f"❌ AUTHORIZATION FAILED: Expected role 'editor', got '{current_user['role']}'")
        return jsonify({'message': f'Unauthorized - Role is {current_user["role"]}, expected editor'}), 403

    print(f"✅ AUTHORIZATION PASSED: User is an editor")

    try:
        conn = get_db()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Get cancelled/rejected bookings assigned to this editor
        cursor.execute('''
            SELECT b.*, u.name as client_name, u.email as client_email
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.id
            WHERE b.editor_id = ? AND b.status IN ('cancelled', 'rejected')
            ORDER BY b.updated_at DESC
        ''', (current_user['user_id'],))

        orders = cursor.fetchall()
        conn.close()

        orders_list = []
        for order in orders:
            order_dict = dict(order)
            orders_list.append({
                'id': order_dict.get('id'),
                'user_id': order_dict.get('user_id'),
                'client_name': order_dict.get('client_name', 'Unknown'),
                'client_email': order_dict.get('client_email', ''),
                'location_address': order_dict.get('location_address'),
                'status': order_dict.get('status'),
                'updated_at': order_dict.get('updated_at'),
                'created_at': order_dict.get('created_at')
            })

        print(f"Returning {len(orders_list)} cancelled orders for editor")
        return jsonify(orders_list)

    except Exception as e:
        print(f"Error in get_editor_cancelled_orders: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/editor/submission-history/<int:order_id>', methods=['GET'])
@token_required
def get_editor_submission_history(current_user, order_id):
    """Get submission history for a specific order"""
    if current_user['role'] != 'editor':
        return jsonify({'message': 'Unauthorized'}), 403

    try:
        conn = get_db()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Get all video submissions for this order by this editor
        cursor.execute('''
            SELECT vr.*, b.id as booking_id
            FROM video_reviews vr
            LEFT JOIN bookings b ON vr.order_id = b.id
            WHERE vr.order_id = ? AND vr.editor_id = ? AND vr.submission_type = 'editor'
            ORDER BY vr.submitted_date DESC
        ''', (order_id, current_user['user_id']))

        submissions = cursor.fetchall()
        conn.close()

        submissions_list = []
        for submission in submissions:
            sub_dict = dict(submission)
            submissions_list.append({
                'video_id': sub_dict.get('video_id'),
                'order_id': sub_dict.get('order_id'),
                'drive_link': sub_dict.get('drive_link'),
                'editor_comments': sub_dict.get('editor_comments'),
                'admin_comments': sub_dict.get('admin_comments'),
                'status': sub_dict.get('status'),
                'submitted_date': sub_dict.get('submitted_date')
            })

        return jsonify(submissions_list)

    except Exception as e:
        print(f"Error in get_editor_submission_history: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/editor/video-submissions', methods=['POST'])
@token_required
def submit_editor_video(current_user):
    """Submit a new video by editor"""
    if current_user['role'] != 'editor':
        return jsonify({'message': 'Unauthorized'}), 403

    try:
        data = request.get_json()
        order_id = data.get('order_id')
        drive_link = data.get('drive_link')
        editor_comments = data.get('editor_comments', '')

        if not order_id or not drive_link:
            return jsonify({'message': 'Order ID and drive link are required'}), 400

        conn = get_db()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Insert new video submission
        cursor.execute('''
            INSERT INTO video_reviews (
                order_id, editor_id, submission_type, drive_link,
                editor_comments, status, submitted_date
            ) VALUES (?, ?, 'editor', ?, ?, 'submitted', ?)
        ''', (
            order_id,
            current_user['user_id'],
            drive_link,
            editor_comments,
            datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        ))

        conn.commit()
        conn.close()

        return jsonify({'message': 'Video submitted successfully'}), 201

    except Exception as e:
        print(f"Error in submit_editor_video: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/pilot/test-simple', methods=['GET'])
def test_simple_pilot():
    """Simple test endpoint without authentication"""
    return jsonify({'message': 'Pilot endpoint is working', 'timestamp': datetime.now().isoformat()})

@app.route('/api/pilot/submission-history/<int:order_id>', methods=['GET'])
@token_required
def get_pilot_submission_history(current_user, order_id):
    """Get submission history for a specific order"""
    if current_user['role'] != 'pilot':
        return jsonify({'message': 'Unauthorized'}), 403

    try:
        conn = get_db()
        cursor = conn.cursor()

        # Get all video submissions for this order by this pilot
        cursor.execute('''
            SELECT vr.*, b.id as booking_id
            FROM video_reviews vr
            LEFT JOIN bookings b ON vr.order_id = b.id
            WHERE vr.order_id = ? AND vr.pilot_id = ? AND vr.submission_type = 'pilot'
            ORDER BY vr.submitted_date DESC
        ''', (order_id, current_user['user_id']))

        submissions = cursor.fetchall()
        conn.close()

        submissions_list = []
        for submission in submissions:
            sub_dict = dict(submission)
            submissions_list.append({
                'video_id': sub_dict.get('video_id'),
                'order_id': sub_dict.get('order_id'),
                'drive_link': sub_dict.get('drive_link'),
                'pilot_comments': sub_dict.get('pilot_comments'),
                'admin_comments': sub_dict.get('admin_comments'),
                'status': sub_dict.get('status'),
                'submitted_date': sub_dict.get('submitted_date')
            })

        return jsonify(submissions_list)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/pilot/all-orders', methods=['GET'])
@token_required
def get_pilot_all_orders(current_user):
    """Get ALL orders for the logged-in pilot"""
    if current_user['role'] != 'pilot':
        return jsonify({'message': 'Unauthorized'}), 403

    try:
        conn = get_db()
        cursor = conn.cursor()

        # Get ALL bookings assigned to this pilot
        cursor.execute('''
            SELECT b.*, u.name as client_name, u.email as client_email, u.business_name
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.id
            WHERE b.pilot_id = ?
            ORDER BY b.created_at DESC
        ''', (current_user['user_id'],))

        orders = cursor.fetchall()
        conn.close()

        orders_list = []
        for order in orders:
            order_dict = dict(order)
            orders_list.append({
                'id': order_dict.get('id'),
                'user_id': order_dict.get('user_id'),
                'client_id': order_dict.get('user_id'),
                'editor_id': order_dict.get('editor_id'),
                'client_name': order_dict.get('client_name') or order_dict.get('business_name', 'Unknown'),
                'client_email': order_dict.get('client_email', ''),
                'location_address': order_dict.get('location_address'),
                'status': order_dict.get('status'),
                'preferred_date': order_dict.get('preferred_date'),
                'payment_amount': order_dict.get('payment_amount'),
                'payment_status': order_dict.get('payment_status'),
                'delivery_video_link': order_dict.get('delivery_video_link'),
                'updated_at': order_dict.get('updated_at'),
                'created_at': order_dict.get('created_at')
            })

        return jsonify(orders_list)

    except Exception as e:
        print(f"Error in get_pilot_all_orders: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/pilot/ongoing-orders', methods=['GET'])
@token_required
def get_pilot_ongoing_orders(current_user):
    """Get ongoing orders for the logged-in pilot (not completed, cancelled, or rejected)"""
    print(f"Pilot ongoing orders - current_user: {current_user}")

    if current_user['role'] != 'pilot':
        return jsonify({'message': 'Unauthorized'}), 403

    try:
        conn = get_db()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Get ongoing bookings assigned to this pilot
        cursor.execute('''
            SELECT b.*, u.name as client_name, u.email as client_email, u.business_name
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.id
            WHERE b.pilot_id = ? AND b.status NOT IN ('completed', 'cancelled', 'rejected')
            ORDER BY b.preferred_date ASC
        ''', (current_user['user_id'],))

        orders = cursor.fetchall()
        conn.close()

        orders_list = []
        for order in orders:
            order_dict = dict(order)
            orders_list.append({
                'id': order_dict.get('id'),
                'user_id': order_dict.get('user_id'),
                'client_id': order_dict.get('user_id'),
                'editor_id': order_dict.get('editor_id'),
                'client_name': order_dict.get('client_name') or order_dict.get('business_name', 'Unknown'),
                'client_email': order_dict.get('client_email', ''),
                'location_address': order_dict.get('location_address'),
                'status': order_dict.get('status'),
                'preferred_date': order_dict.get('preferred_date'),
                'payment_amount': order_dict.get('payment_amount'),
                'created_at': order_dict.get('created_at')
            })

        return jsonify(orders_list)

    except Exception as e:
        print(f"Error in get_pilot_ongoing_orders: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/pilot/completed-orders', methods=['GET'])
@token_required
def get_pilot_completed_orders(current_user):
    """Get completed orders for the logged-in pilot"""
    print(f"Pilot completed orders - current_user: {current_user}")

    if current_user['role'] != 'pilot':
        return jsonify({'message': 'Unauthorized'}), 403

    try:
        conn = get_db()
        cursor = conn.cursor()

        # Get only completed bookings assigned to this pilot
        cursor.execute('''
            SELECT b.*, u.name as client_name, u.email as client_email, u.business_name
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.id
            WHERE b.pilot_id = ? AND b.status = 'completed'
            ORDER BY b.updated_at DESC
        ''', (current_user['user_id'],))

        orders = cursor.fetchall()
        conn.close()

        orders_list = []
        for order in orders:
            order_dict = dict(order)
            orders_list.append({
                'id': order_dict.get('id'),
                'user_id': order_dict.get('user_id'),
                'client_name': order_dict.get('client_name') or order_dict.get('business_name', 'Unknown'),
                'client_email': order_dict.get('client_email', ''),
                'location_address': order_dict.get('location_address'),
                'status': order_dict.get('status'),
                'payment_status': order_dict.get('payment_status'),
                'payment_amount': order_dict.get('payment_amount'),
                'delivery_video_link': order_dict.get('delivery_video_link'),
                'updated_at': order_dict.get('updated_at'),
                'created_at': order_dict.get('created_at')
            })

        return jsonify(orders_list)

    except Exception as e:
        print(f"Error in get_pilot_completed_orders: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/pilot/cancelled-orders', methods=['GET'])
@token_required
def get_pilot_cancelled_orders(current_user):
    """Get cancelled/rejected orders for the logged-in pilot"""
    print(f"Pilot cancelled orders - current_user: {current_user}")

    if current_user['role'] != 'pilot':
        return jsonify({'message': 'Unauthorized'}), 403

    try:
        conn = get_db()
        cursor = conn.cursor()

        # Get cancelled/rejected bookings assigned to this pilot
        cursor.execute('''
            SELECT b.*, u.name as client_name, u.email as client_email, u.business_name
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.id
            WHERE b.pilot_id = ? AND b.status IN ('cancelled', 'rejected')
            ORDER BY b.updated_at DESC
        ''', (current_user['user_id'],))

        orders = cursor.fetchall()
        conn.close()

        orders_list = []
        for order in orders:
            order_dict = dict(order)
            orders_list.append({
                'id': order_dict.get('id'),
                'user_id': order_dict.get('user_id'),
                'client_name': order_dict.get('client_name') or order_dict.get('business_name', 'Unknown'),
                'client_email': order_dict.get('client_email', ''),
                'location_address': order_dict.get('location_address'),
                'status': order_dict.get('status'),
                'updated_at': order_dict.get('updated_at'),
                'created_at': order_dict.get('created_at')
            })

        return jsonify(orders_list)

    except Exception as e:
        print(f"Error in get_pilot_cancelled_orders: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/pilot/final-review', methods=['GET'])
@token_required
def get_pilot_final_review(current_user):
    """Get orders ready for pilot final review"""
    if current_user['role'] != 'pilot':
        return jsonify({'message': 'Unauthorized'}), 403

    try:
        conn = get_db()
        cursor = conn.cursor()

        # Get orders where editor has submitted final video and waiting for pilot approval
        cursor.execute('''
            SELECT b.*, u.name as client_name, u.email as client_email,
                   vr.drive_link as final_video_link
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.id
            LEFT JOIN video_reviews vr ON b.id = vr.order_id
                AND vr.submission_type = 'editor'
                AND vr.status = 'submitted'
            WHERE b.pilot_id = ? AND b.status = 'final_review'
            ORDER BY b.preferred_date ASC
        ''', (current_user['user_id'],))

        orders = cursor.fetchall()
        conn.close()

        orders_list = []
        for order in orders:
            order_dict = dict(order)
            orders_list.append({
                'id': order_dict.get('id'),
                'client_id': order_dict.get('user_id'),
                'client_name': order_dict.get('client_name', 'Unknown'),
                'client_email': order_dict.get('client_email', ''),
                'status': order_dict.get('status'),
                'final_video_link': order_dict.get('final_video_link')
            })

        return jsonify(orders_list)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/editor/assigned-orders', methods=['GET', 'OPTIONS'])
@token_required
def get_editor_assigned_orders(current_user):
    """Get ALL orders assigned to editor for dashboard"""

    # Handle preflight request
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept')
        response.headers.add('Access-Control-Allow-Methods', 'GET,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    print(f"\n=== EDITOR ASSIGNED ORDERS DEBUG ===")
    print(f"Current user data: {current_user}")
    print(f"User ID: {current_user.get('user_id', 'NOT_FOUND')}")
    print(f"User role: {current_user.get('role', 'NOT_FOUND')}")
    print(f"User email: {current_user.get('email', 'NOT_FOUND')}")
    print(f"User name: {current_user.get('name', 'NOT_FOUND')}")

    if current_user['role'] != 'editor':
        print(f"❌ AUTHORIZATION FAILED: Expected role 'editor', got '{current_user['role']}'")
        response = jsonify({'message': f'Unauthorized - Role is {current_user["role"]}, expected editor'})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 403

    print(f"✅ AUTHORIZATION PASSED: User is an editor")

    try:
        conn = get_db()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        print(f"Fetching orders for editor ID: {current_user['user_id']}")

        # Get ALL orders assigned to this editor (for dashboard)
        cursor.execute('''
            SELECT b.*, u.name as client_name, u.email as client_email,
                   p.name as pilot_name
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.id
            LEFT JOIN pilots p ON b.pilot_id = p.id
            WHERE b.editor_id = ?
            ORDER BY b.created_at DESC
        ''', (current_user['user_id'],))

        orders = cursor.fetchall()
        conn.close()

        orders_list = []
        for order in orders:
            order_dict = dict(order)
            orders_list.append({
                'id': order_dict.get('id'),
                'booking_id': f"HMX{order_dict.get('id', ''):04d}",
                'user_id': order_dict.get('user_id'),
                'client_id': order_dict.get('user_id'),
                'client_name': order_dict.get('client_name', 'Unknown'),
                'client_email': order_dict.get('client_email', ''),
                'pilot_id': order_dict.get('pilot_id'),
                'pilot_name': order_dict.get('pilot_name', 'Unknown'),
                'status': order_dict.get('status'),
                'preferred_date': order_dict.get('preferred_date', ''),
                'location_address': order_dict.get('location_address', ''),
                'property_type': order_dict.get('property_type', ''),
                'payment_amount': order_dict.get('payment_amount'),
                'payment_status': order_dict.get('payment_status'),
                'delivery_video_link': order_dict.get('delivery_video_link'),
                'delivery_drive_link': order_dict.get('delivery_drive_link'),
                'updated_at': order_dict.get('updated_at'),
                'created_at': order_dict.get('created_at')
            })

        print(f"Returning {len(orders_list)} orders for editor")
        response = jsonify(orders_list)
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    except Exception as e:
        print(f"Error in get_editor_assigned_orders: {str(e)}")
        import traceback
        traceback.print_exc()
        response = jsonify({'error': str(e)})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)