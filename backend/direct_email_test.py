#!/usr/bin/env python3
"""
Direct email test without going through the API
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Email Configuration
EMAIL_CONFIG = {
    'SMTP_SERVER': os.getenv('SMTP_SERVER', 'smtp.gmail.com'),
    'SMTP_PORT': int(os.getenv('SMTP_PORT', '587')),
    'EMAIL_ADDRESS': os.getenv('EMAIL_ADDRESS', 'noreply@hmxfpvtours.com'),
    'EMAIL_PASSWORD': os.getenv('EMAIL_PASSWORD', ''),
    'USE_TLS': os.getenv('USE_TLS', 'true').lower() == 'true'
}

def test_direct_email():
    """Test email directly"""
    
    print("📧 Direct Email Test")
    print("=" * 50)
    print(f"SMTP Server: {EMAIL_CONFIG['SMTP_SERVER']}")
    print(f"SMTP Port: {EMAIL_CONFIG['SMTP_PORT']}")
    print(f"Email Address: {EMAIL_CONFIG['EMAIL_ADDRESS']}")
    print(f"Password Set: {'Yes' if EMAIL_CONFIG['EMAIL_PASSWORD'] else 'No'}")
    print(f"Password Length: {len(EMAIL_CONFIG['EMAIL_PASSWORD'])}")
    print(f"Use TLS: {EMAIL_CONFIG['USE_TLS']}")
    print("=" * 50)
    
    try:
        to_email = "sanmathisedhupathi2004@gmail.com"
        subject = "HMX FPV Tours - Direct Email Test"
        body = """
Hello!

This is a direct email test from HMX FPV Tours backend.

If you receive this email, the email configuration is working correctly!

Test Details:
- Sent directly from Python script
- Using Gmail SMTP
- TLS encryption enabled

Best regards,
HMX FPV Tours System
"""
        
        print(f"📧 Creating email message...")
        msg = MIMEMultipart()
        msg['From'] = EMAIL_CONFIG['EMAIL_ADDRESS']
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))
        
        print(f"📧 Connecting to SMTP server...")
        server = smtplib.SMTP(EMAIL_CONFIG['SMTP_SERVER'], EMAIL_CONFIG['SMTP_PORT'])
        
        # Enable debug output
        server.set_debuglevel(1)
        
        if EMAIL_CONFIG['USE_TLS']:
            print(f"📧 Starting TLS...")
            server.starttls()
        
        print(f"📧 Logging in...")
        server.login(EMAIL_CONFIG['EMAIL_ADDRESS'], EMAIL_CONFIG['EMAIL_PASSWORD'])
        
        print(f"📧 Sending email...")
        text = msg.as_string()
        server.sendmail(EMAIL_CONFIG['EMAIL_ADDRESS'], to_email, text)
        server.quit()
        
        print(f"✅ Email sent successfully to {to_email}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to send email: {str(e)}")
        print(f"❌ Error type: {type(e).__name__}")
        import traceback
        print(f"❌ Full traceback:")
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_direct_email()
