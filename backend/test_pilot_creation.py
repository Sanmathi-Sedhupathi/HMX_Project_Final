#!/usr/bin/env python3
"""
Test pilot account creation with email
"""

import requests
import json

def test_pilot_creation():
    """Test creating a pilot account"""
    
    # Admin login first
    login_data = {
        "email": "admin@hmxfpvtours.com",
        "password": "admin123"
    }
    
    print("🔐 Logging in as admin...")
    login_response = requests.post("http://localhost:5000/api/auth/login", json=login_data)
    
    if login_response.status_code != 200:
        print("❌ Admin login failed!")
        print(f"Response: {login_response.text}")
        return
    
    token = login_response.json().get('token')
    print("✅ Admin login successful!")
    
    # Create pilot account
    pilot_data = {
        "name": "Test Pilot",
        "full_name": "Test Pilot Full Name",
        "email": "testpilot2@example.com",  # Different email for second test
        "phone": "+91 9876543210",
        "password": "TestPilot123!",  # This will be auto-generated, but we provide one
        "cities": "Mumbai, Delhi",
        "experience": "5 years of drone flying experience",
        "equipment": "DJI Mavic Pro, DJI FPV",
        "status": "active"
    }
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    print("👨‍✈️ Creating pilot account...")
    pilot_response = requests.post(
        "http://localhost:5000/api/admin/pilots/create",
        json=pilot_data,
        headers=headers
    )
    
    if pilot_response.status_code == 201:
        print("✅ Pilot account created successfully!")
        print(f"Response: {pilot_response.json()}")
        print("📧 Check your email for the welcome message with login credentials!")
    else:
        print("❌ Pilot creation failed!")
        print(f"Status: {pilot_response.status_code}")
        print(f"Response: {pilot_response.text}")

if __name__ == "__main__":
    test_pilot_creation()
