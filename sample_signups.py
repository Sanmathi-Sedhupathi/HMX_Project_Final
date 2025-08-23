#!/usr/bin/env python3
"""
Sample signup data for testing the application system
"""

import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:5000"

def test_pilot_signup():
    """Sample pilot application with all required fields"""
    url = f"{BASE_URL}/api/pilots/register"
    
    # Calculate dates (ensure future dates)
    from datetime import datetime, timedelta
    today = datetime.now()

    birth_date = "1990-05-15"  # 33 years old
    license_issue = "2020-03-10"
    license_expiry = (today + timedelta(days=365)).strftime("%Y-%m-%d")  # 1 year from now
    insurance_expiry = (today + timedelta(days=180)).strftime("%Y-%m-%d")  # 6 months from now
    
    pilot_data = {
        # Personal Details
        "name": "John Pilot",
        "full_name": "John Michael Pilot",
        "email": "john.pilot@example.com",
        "phone": "+91-9876543210",
        "password": "PilotPass123!",
        "date_of_birth": birth_date,
        "gender": "Male",
        "address": "123 Aviation Street, Drone City, Maharashtra 400001, India",

        # Identification & License Details
        "government_id_proof": "Aadhaar Card",
        "license_number": "DGCA/UAS/RPC/2020/001234",
        "issuing_authority": "DGCA (India)",
        "license_issue_date": license_issue,
        "license_expiry_date": license_expiry,

        # Drone Details (Optional)
        "drone_model": "DJI Mavic 3 Pro",
        "drone_serial": "1581F5FSD23400123",
        "drone_uin": "IN-DL01234567890",
        "drone_category": "Small",

        # Experience & Insurance
        "total_flying_hours": 250,  # Changed to integer
        "flight_records": "Commercial aerial photography for real estate (50+ projects), Wedding videography (30+ events), Agricultural surveys (20+ farms), Infrastructure inspection (15+ sites)",
        "insurance_policy": "HDFC-ERGO-DRONE-2023-456789",
        "insurance_validity": insurance_expiry,
        "cities": "Mumbai, Pune",
        "experience": "5+ years of professional drone operations. Specialized in aerial cinematography, real estate photography, and commercial inspections. Experienced with various DJI models and manual flight modes. Certified in advanced flight planning and safety protocols.",
        "equipment": "DJI Mavic 3 Pro with 4K camera, DJI Mini 3 Pro, Extra batteries (6x), ND filters set, Landing pad, Tablet for flight control, Backup controller",
        "portfolio_url": "https://youtube.com/c/johnpilotdrone",
        "bank_account": "HDFC0001234567890123",

        # Document Uploads
        "pilot_license_url": "https://drive.google.com/file/d/1a2b3c4d5e6f7g8h9i0j/view",
        "id_proof_url": "https://drive.google.com/file/d/2b3c4d5e6f7g8h9i0j1k/view",
        "training_certificate_url": "https://drive.google.com/file/d/3c4d5e6f7g8h9i0j1k2l/view",
        "photograph_url": "https://drive.google.com/file/d/4d5e6f7g8h9i0j1k2l3m/view",
        "insurance_certificate_url": "https://drive.google.com/file/d/5e6f7g8h9i0j1k2l3m4n/view"
    }
    
    try:
        print("=== PILOT SIGNUP SAMPLE ===")
        print(f"URL: {url}")
        print(f"Data: {json.dumps(pilot_data, indent=2)}")
        
        response = requests.post(url, json=pilot_data)
        print(f"\nResponse Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 201:
            print("✅ Pilot application submitted successfully!")
        else:
            print("❌ Pilot application failed")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")

def test_editor_signup():
    """Sample editor application with all required fields"""
    url = f"{BASE_URL}/api/editors/register"
    
    editor_data = {
        "full_name": "Sarah Video Editor",
        "email": "sarah.editor@example.com",
        "phone": "+91-8765432109",
        "password": "EditorPass123!",
        "role": "Video Editor",
        "years_experience": "7",
        "primary_skills": "Adobe Premiere Pro, After Effects, DaVinci Resolve, Final Cut Pro, Motion Graphics, Color Grading",
        "specialization": "Corporate videos, Social media content, Wedding films, Documentary editing, Drone footage post-processing",
        "portfolio_url": "https://vimeo.com/saraheditor",
        "time_zone": "IST (UTC+5:30)",
        "government_id_url": "https://drive.google.com/file/d/6f7g8h9i0j1k2l3m4n5o/view",
        "tax_gst_number": "27ABCDE1234F1Z5"
    }
    
    try:
        print("\n=== EDITOR SIGNUP SAMPLE ===")
        print(f"URL: {url}")
        print(f"Data: {json.dumps(editor_data, indent=2)}")
        
        response = requests.post(url, json=editor_data)
        print(f"\nResponse Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 201:
            print("✅ Editor application submitted successfully!")
        else:
            print("❌ Editor application failed")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")

def test_business_client_signup():
    """Sample business client application with all required fields"""
    url = f"{BASE_URL}/api/auth/register"
    
    business_data = {
        "business_name": "TechCorp Solutions Pvt Ltd",
        "registration_number": "U72900MH2018PTC123456",
        "organization_type": "Private Limited",
        "incorporation_date": "2018-06-15",
        "official_address": "456 Business Park, Tech Hub, Bangalore, Karnataka 560001, India",
        "official_email": "info@techcorp.com",
        "phone": "+91-8012345678",
        "contact_name": "Rajesh Kumar",
        "contact_person_designation": "Chief Technology Officer",
        "email": "rajesh.kumar@techcorp.com",
        "password": "TechCorp123!",
        "registration_certificate_url": "https://drive.google.com/file/d/7g8h9i0j1k2l3m4n5o6p/view",
        "tax_identification_url": "https://drive.google.com/file/d/8h9i0j1k2l3m4n5o6p7q/view",
        "business_license_url": "https://drive.google.com/file/d/9i0j1k2l3m4n5o6p7q8r/view",
        "address_proof_url": "https://drive.google.com/file/d/0j1k2l3m4n5o6p7q8r9s/view"
    }
    
    try:
        print("\n=== BUSINESS CLIENT SIGNUP SAMPLE ===")
        print(f"URL: {url}")
        print(f"Data: {json.dumps(business_data, indent=2)}")
        
        response = requests.post(url, json=business_data)
        print(f"\nResponse Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 201:
            print("✅ Business client application submitted successfully!")
        else:
            print("❌ Business client application failed")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")

def test_referral_signup():
    """Sample referral application with all required fields"""
    url = f"{BASE_URL}/api/referrals/register"
    
    referral_data = {
        "name": "Marketing Mike",
        "email": "mike.referral@example.com",
        "phone": "+91-7654321098",
        "password": "ReferralPass123!",
        "location": "Mumbai, Maharashtra",
        "experience": "8 years in digital marketing and business development. Previously worked with tech startups and media agencies.",
        "network_size": "1000+ professional contacts across technology, media, and business sectors",
        "referral_strategy": "Leveraging LinkedIn network, industry events, startup meetups, and existing client relationships to identify potential customers needing drone services",
        "social_media_links": "LinkedIn: linkedin.com/in/marketingmike, Twitter: @marketingmike, Instagram: @mike_marketing_pro"
    }
    
    try:
        print("\n=== REFERRAL SIGNUP SAMPLE ===")
        print(f"URL: {url}")
        print(f"Data: {json.dumps(referral_data, indent=2)}")
        
        response = requests.post(url, json=referral_data)
        print(f"\nResponse Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 201:
            print("✅ Referral application submitted successfully!")
        else:
            print("❌ Referral application failed")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")

def main():
    print("🚀 SAMPLE SIGNUP DEMONSTRATIONS")
    print("=" * 50)
    print("This script demonstrates sample signup data for all user types")
    print("Make sure your backend server is running on localhost:5000")
    print("=" * 50)
    
    # Test all signup types
    test_pilot_signup()
    test_editor_signup()
    test_business_client_signup()
    test_referral_signup()
    
    print("\n" + "=" * 50)
    print("📋 SUMMARY")
    print("All sample signups completed!")
    print("\nNext steps:")
    print("1. Check your database for the new applications")
    print("2. Use admin panel to approve/reject applications")
    print("3. Test login with approved users")
    print("=" * 50)

if __name__ == "__main__":
    main()
