import os

# PhonePe Configuration
class PhonePeConfig:
    # Sandbox/Test Environment - Updated with working credentials
    MERCHANT_ID = os.getenv('PHONEPE_MERCHANT_ID', 'M22ZR5G5PJQK2')
    SALT_KEY = os.getenv('PHONEPE_SALT_KEY', 'c099eb0cd-02cf-4e2a-8aca-3e6c6aff0399')
    SALT_INDEX = os.getenv('PHONEPE_SALT_INDEX', '1')
    
    # Environment URLs
    BASE_URL = os.getenv('PHONEPE_BASE_URL', 'https://api-preprod.phonepe.com/apis/pg-sandbox')
    REDIRECT_URL = os.getenv('PHONEPE_REDIRECT_URL', 'http://localhost:5173/payment/callback')
    
    # API Endpoints
    PAY_API = f"{BASE_URL}/pg/v1/pay"
    STATUS_API = f"{BASE_URL}/pg/v1/status"
    REFUND_API = f"{BASE_URL}/pg/v1/refund"

# Alternative Sandbox Configuration (if the above doesn't work)
class PhonePeConfigAlt:
    MERCHANT_ID = os.getenv('PHONEPE_MERCHANT_ID', 'PGTESTPAYUAT')
    SALT_KEY = os.getenv('PHONEPE_SALT_KEY', '099eb0cd-02cf-4e2a-8aca-3e6c6aff0399')
    SALT_INDEX = os.getenv('PHONEPE_SALT_INDEX', '1')
    
    BASE_URL = os.getenv('PHONEPE_BASE_URL', 'https://api-preprod.phonepe.com/apis/pg-sandbox')
    REDIRECT_URL = os.getenv('PHONEPE_REDIRECT_URL', 'http://localhost:5173/payment/callback')
    
    PAY_API = f"{BASE_URL}/pg/v1/pay"
    STATUS_API = f"{BASE_URL}/pg/v1/status"
    REFUND_API = f"{BASE_URL}/pg/v1/refund"

# Production Configuration (uncomment when going live)
# class PhonePeConfig:
#     MERCHANT_ID = os.getenv('PHONEPE_MERCHANT_ID', 'YOUR_PRODUCTION_MERCHANT_ID')
#     SALT_KEY = os.getenv('PHONEPE_SALT_KEY', 'YOUR_PRODUCTION_SALT_KEY')
#     SALT_INDEX = os.getenv('PHONEPE_SALT_INDEX', '1')
#     
#     BASE_URL = os.getenv('PHONEPE_BASE_URL', 'https://api.phonepe.com/apis/hermes')
#     REDIRECT_URL = os.getenv('PHONEPE_REDIRECT_URL', 'https://yourdomain.com/payment/callback')
#     
#     PAY_API = f"{BASE_URL}/pg/v1/pay"
#     STATUS_API = f"{BASE_URL}/pg/v1/status"
#     REFUND_API = f"{BASE_URL}/pg/v1/refund"
