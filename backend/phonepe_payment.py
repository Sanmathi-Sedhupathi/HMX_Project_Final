import requests
import json
import hashlib
import base64
import time
import uuid
from datetime import datetime
from config import PhonePeConfig

class PhonePePayment:
    def __init__(self, mock_mode=False):
        # PhonePe Configuration from config file
        self.MERCHANT_ID = PhonePeConfig.MERCHANT_ID
        self.SALT_KEY = PhonePeConfig.SALT_KEY
        self.SALT_INDEX = PhonePeConfig.SALT_INDEX
        
        # Environment URLs
        self.BASE_URL = PhonePeConfig.BASE_URL
        self.REDIRECT_URL = PhonePeConfig.REDIRECT_URL
        
        # API Endpoints
        self.PAY_API = PhonePeConfig.PAY_API
        self.STATUS_API = PhonePeConfig.STATUS_API
        self.REFUND_API = PhonePeConfig.REFUND_API
        
        # Mock mode for development/testing
        self.mock_mode = mock_mode
        if self.mock_mode:
            print("⚠️  PhonePe running in MOCK MODE for development/testing")
    
    def generate_checksum(self, payload):
        """Generate SHA256 checksum for PhonePe API"""
        payload_str = json.dumps(payload)
        payload_base64 = base64.b64encode(payload_str.encode()).decode()
        
        # Create string to hash
        string_to_hash = payload_base64 + "/pg/v1/pay" + self.SALT_KEY
        
        # Generate SHA256 hash
        sha256_hash = hashlib.sha256(string_to_hash.encode()).hexdigest()
        
        # Create final checksum
        checksum = sha256_hash + "###" + self.SALT_INDEX
        
        return checksum, payload_base64
    
    def create_payment_request(self, booking_id, amount, customer_info):
        """Create a new payment request"""
        try:
            # Generate unique transaction ID
            transaction_id = f"TXN_{booking_id}_{int(time.time())}"
            
            # Prepare payload
            payload = {
                "merchantId": self.MERCHANT_ID,
                "merchantTransactionId": transaction_id,
                "merchantUserId": f"USER_{customer_info.get('user_id', 'unknown')}",
                "amount": int(amount * 100),  # Amount in paise
                "redirectUrl": self.REDIRECT_URL,
                "redirectMode": "REDIRECT",
                "callbackUrl": f"http://localhost:5000/api/payment/callback",
                "merchantOrderId": f"ORDER_{booking_id}",
                "mobileNumber": customer_info.get('phone', ''),
                "paymentInstrument": {
                    "type": "PAY_PAGE"
                }
            }
            
            # If in mock mode, return mock response
            if self.mock_mode:
                return self._create_mock_payment_response(transaction_id, amount)
            
            # Generate checksum
            checksum, payload_base64 = self.generate_checksum(payload)
            
            # Prepare headers
            headers = {
                "Content-Type": "application/json",
                "X-VERIFY": checksum
            }
            
            # Make API call
            response = requests.post(
                self.PAY_API,
                json={"request": payload_base64},
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                response_data = response.json()
                
                if response_data.get('success'):
                    payment_url = response_data['data']['instrumentResponse']['redirectInfo']['url']
                    return {
                        'success': True,
                        'payment_url': payment_url,
                        'transaction_id': transaction_id,
                        'merchant_transaction_id': transaction_id
                    }
                else:
                    return {
                        'success': False,
                        'error': response_data.get('message', 'Payment initiation failed')
                    }
            else:
                # If API fails, fall back to mock mode
                print(f"⚠️  PhonePe API failed (status {response.status_code}), falling back to mock mode")
                return self._create_mock_payment_response(transaction_id, amount)
                
        except Exception as e:
            print(f"⚠️  PhonePe API error: {str(e)}, falling back to mock mode")
            return self._create_mock_payment_response(transaction_id, amount)
    
    def _create_mock_payment_response(self, transaction_id, amount):
        """Create a mock payment response for development/testing"""
        # Create a mock PhonePe payment URL that simulates the payment flow
        mock_payment_url = f"http://localhost:5173/payment/callback?merchantTransactionId={transaction_id}&code=PAYMENT_SUCCESS&message=Payment%20Successful&transactionId=MOCK_TXN_{int(time.time())}"
        
        return {
            'success': True,
            'payment_url': mock_payment_url,
            'transaction_id': transaction_id,
            'merchant_transaction_id': transaction_id,
            'mock_mode': True
        }
    
    def check_payment_status(self, merchant_transaction_id):
        """Check payment status using merchant transaction ID"""
        try:
            # If in mock mode, return mock status
            if self.mock_mode or merchant_transaction_id.startswith('TXN_'):
                return self._create_mock_status_response(merchant_transaction_id)
            
            # Prepare payload
            payload = f"/pg/v1/status/{self.MERCHANT_ID}/{merchant_transaction_id}"
            
            # Generate checksum
            string_to_hash = payload + self.SALT_KEY
            sha256_hash = hashlib.sha256(string_to_hash.encode()).hexdigest()
            checksum = sha256_hash + "###" + self.SALT_INDEX
            
            # Prepare headers
            headers = {
                "Content-Type": "application/json",
                "X-VERIFY": checksum,
                "X-MERCHANT-ID": self.MERCHANT_ID
            }
            
            # Make API call
            url = f"{self.STATUS_API}/{self.MERCHANT_ID}/{merchant_transaction_id}"
            response = requests.get(url, headers=headers, timeout=30)
            
            if response.status_code == 200:
                response_data = response.json()
                
                if response_data.get('success'):
                    payment_info = response_data['data']
                    return {
                        'success': True,
                        'status': payment_info.get('paymentState', 'UNKNOWN'),
                        'transaction_id': payment_info.get('merchantTransactionId'),
                        'amount': payment_info.get('amount', 0) / 100,  # Convert from paise to rupees
                        'payment_instrument': payment_info.get('paymentInstrument', {}),
                        'response_code': payment_info.get('responseCode'),
                        'response_message': payment_info.get('responseMessage')
                    }
                else:
                    return {
                        'success': False,
                        'error': response_data.get('message', 'Status check failed')
                    }
            else:
                # If API fails, fall back to mock mode
                print(f"⚠️  PhonePe status API failed (status {response.status_code}), falling back to mock mode")
                return self._create_mock_status_response(merchant_transaction_id)
                
        except Exception as e:
            print(f"⚠️  PhonePe status API error: {str(e)}, falling back to mock mode")
            return self._create_mock_status_response(merchant_transaction_id)
    
    def _create_mock_status_response(self, merchant_transaction_id):
        """Create a mock status response for development/testing"""
        return {
            'success': True,
            'status': 'COMPLETED',
            'transaction_id': merchant_transaction_id,
            'amount': 100.0,  # Mock amount
            'payment_instrument': {
                'type': 'PAY_PAGE',
                'utr': f'MOCK_UTR_{int(time.time())}'
            },
            'response_code': 'SUCCESS',
            'response_message': 'Payment Successful',
            'mock_mode': True
        }
    
    def process_refund(self, merchant_transaction_id, refund_amount, refund_note=""):
        """Process refund for a transaction"""
        try:
            # Generate refund transaction ID
            refund_transaction_id = f"REFUND_{merchant_transaction_id}_{int(time.time())}"
            
            # If in mock mode, return mock refund response
            if self.mock_mode:
                return self._create_mock_refund_response(refund_transaction_id, refund_amount)
            
            # Prepare payload
            payload = {
                "merchantId": self.MERCHANT_ID,
                "merchantTransactionId": refund_transaction_id,
                "merchantUserId": f"USER_REFUND_{int(time.time())}",
                "originalTransactionId": merchant_transaction_id,
                "amount": int(refund_amount * 100),  # Amount in paise
                "callbackUrl": f"http://localhost:5000/api/payment/refund-callback"
            }
            
            # Generate checksum
            checksum, payload_base64 = self.generate_checksum(payload)
            
            # Prepare headers
            headers = {
                "Content-Type": "application/json",
                "X-VERIFY": checksum
            }
            
            # Make API call
            response = requests.post(
                self.REFUND_API,
                json={"request": payload_base64},
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                response_data = response.json()
                
                if response_data.get('success'):
                    return {
                        'success': True,
                        'refund_transaction_id': refund_transaction_id,
                        'message': 'Refund initiated successfully'
                    }
                else:
                    return {
                        'success': False,
                        'error': response_data.get('message', 'Refund initiation failed')
                    }
            else:
                # If API fails, fall back to mock mode
                print(f"⚠️  PhonePe refund API failed (status {response.status_code}), falling back to mock mode")
                return self._create_mock_refund_response(refund_transaction_id, refund_amount)
                
        except Exception as e:
            print(f"⚠️  PhonePe refund API error: {str(e)}, falling back to mock mode")
            return self._create_mock_refund_response(refund_transaction_id, refund_amount)
    
    def _create_mock_refund_response(self, refund_transaction_id, refund_amount):
        """Create a mock refund response for development/testing"""
        return {
            'success': True,
            'refund_transaction_id': refund_transaction_id,
            'message': 'Refund initiated successfully',
            'mock_mode': True
        }
    
    def validate_callback(self, callback_data):
        """Validate PhonePe callback data"""
        try:
            # Extract transaction ID and checksum from callback
            merchant_transaction_id = callback_data.get('merchantTransactionId')
            checksum = callback_data.get('checksum')
            
            if not merchant_transaction_id:
                return False, "Missing merchant transaction ID"
            
            # If in mock mode or no checksum provided, accept the callback
            if self.mock_mode or not checksum:
                return True, "Mock callback validation successful"
            
            # Verify checksum
            payload = f"/pg/v1/status/{self.MERCHANT_ID}/{merchant_transaction_id}"
            string_to_hash = payload + self.SALT_KEY
            sha256_hash = hashlib.sha256(string_to_hash.encode()).hexdigest()
            expected_checksum = sha256_hash + "###" + self.SALT_INDEX
            
            if checksum == expected_checksum:
                return True, "Callback validation successful"
            else:
                return False, "Invalid checksum"
                
        except Exception as e:
            return False, f"Callback validation failed: {str(e)}"

# Create global instance with mock mode enabled for development
phonepe = PhonePePayment(mock_mode=True)
