#!/usr/bin/env python3
"""
Quick email test script to verify email configuration
"""

import requests
import json

def test_email():
    """Test email configuration"""
    
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
    
    # Test email
    test_email_data = {
        "email": "sanmathisedhupathi2004@gmail.com"  # Your email
    }
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    print("📧 Sending test email...")
    email_response = requests.post(
        "http://localhost:5000/api/admin/test-email", 
        json=test_email_data, 
        headers=headers
    )
    
    if email_response.status_code == 200:
        print("✅ Test email sent successfully!")
        print(f"Response: {email_response.json()}")
        print("📬 Check your inbox (and spam folder) for the test email.")
    else:
        print("❌ Test email failed!")
        print(f"Status: {email_response.status_code}")
        print(f"Response: {email_response.text}")

if __name__ == "__main__":
    test_email()
