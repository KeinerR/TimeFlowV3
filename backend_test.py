import requests
import sys
import json
from datetime import datetime

class TimeFlowAPITester:
    def __init__(self, base_url="https://admin-roles-perms.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.user = None
        self.business_id = None
        self.service_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        default_headers = {'Content-Type': 'application/json'}
        if self.token:
            default_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            default_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=default_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=default_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                if response.text:
                    try:
                        response_data = response.json()
                        if isinstance(response_data, dict) and len(response_data) < 5:
                            print(f"   Response: {response_data}")
                        return True, response_data
                    except:
                        return True, {}
                return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                if response.text:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test API root endpoint"""
        success, response = self.run_test("API Root", "GET", "", 200)
        return success

    def test_setup_super_admin(self):
        """Test super admin setup"""
        print(f"\n📋 Setting up Super Admin...")
        success, response = self.run_test(
            "Setup Super Admin", 
            "POST", 
            "setup/super-admin", 
            200
        )
        if not success:
            # Try with 400 - super admin might already exist
            success, response = self.run_test(
                "Setup Super Admin (Already Exists)", 
                "POST", 
                "setup/super-admin", 
                400
            )
        return success

    def test_login(self):
        """Test login with super admin credentials"""
        print(f"\n🔐 Testing Authentication...")
        
        # Prepare form data for login
        login_data = {
            'username': 'admin@timeflow.com',  # OAuth2PasswordRequestForm uses 'username' field
            'password': 'admin123'
        }
        
        # Login endpoint expects form data, not JSON
        url = f"{self.base_url}/auth/login"
        headers = {'Content-Type': 'application/x-www-form-urlencoded'}
        
        self.tests_run += 1
        print(f"🔍 Testing Login...")
        print(f"   URL: {url}")
        
        try:
            response = requests.post(url, data=login_data, headers=headers)
            
            if response.status_code == 200:
                self.tests_passed += 1
                print(f"✅ Login Passed - Status: {response.status_code}")
                
                response_data = response.json()
                self.token = response_data.get('access_token')
                self.user = response_data.get('user')
                
                print(f"   User: {self.user['email']} ({self.user['role']})")
                return True
            else:
                print(f"❌ Login Failed - Status: {response.status_code}")
                if response.text:
                    print(f"   Error: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Login Failed - Error: {str(e)}")
            return False

    def test_get_profile(self):
        """Test getting user profile"""
        success, response = self.run_test("Get Profile", "GET", "auth/me", 200)
        return success

    def test_create_business(self):
        """Test creating a business"""
        business_data = {
            "name": f"Test Business {datetime.now().strftime('%H%M%S')}",
            "description": "A test business for automation testing",
            "address": "123 Test Street",
            "phone": "+1234567890",
            "email": "testbusiness@timeflow.com"
        }
        
        success, response = self.run_test(
            "Create Business", 
            "POST", 
            "businesses/", 
            200, 
            data=business_data
        )
        
        if success and response:
            self.business_id = response.get('id')
            print(f"   Business ID: {self.business_id}")
        
        return success

    def test_get_businesses(self):
        """Test getting businesses"""
        success, response = self.run_test("Get Businesses", "GET", "businesses/", 200)
        return success

    def test_create_service(self):
        """Test creating a service"""
        if not self.business_id:
            print("❌ Cannot test create service - no business_id available")
            return False
            
        service_data = {
            "name": "Test Service",
            "description": "A test service for automation",
            "duration_minutes": 30,
            "price": 50.0,
            "business_id": self.business_id,
            "staff_ids": []
        }
        
        success, response = self.run_test(
            "Create Service", 
            "POST", 
            "services/", 
            200, 
            data=service_data
        )
        
        if success and response:
            self.service_id = response.get('id')
            print(f"   Service ID: {self.service_id}")
        
        return success

    def test_get_services(self):
        """Test getting services"""
        success, response = self.run_test("Get Services", "GET", "services/", 200)
        return success

    def test_public_endpoints(self):
        """Test public endpoints"""
        print(f"\n🌐 Testing Public Endpoints...")
        
        success1, _ = self.run_test("Public Businesses", "GET", "public/businesses", 200)
        
        # Test public services if we have a business
        success2 = True
        if self.business_id:
            success2, _ = self.run_test(
                "Public Services", 
                "GET", 
                f"public/businesses/{self.business_id}/services", 
                200
            )
        
        return success1 and success2

    def test_notifications(self):
        """Test notifications endpoint"""
        success, response = self.run_test("Get Notifications", "GET", "notifications/", 200)
        return success

def main():
    print("🚀 Starting TimeFlow API Testing...")
    print("=" * 50)
    
    # Setup
    tester = TimeFlowAPITester()
    
    # Core API Tests
    tests = [
        ("API Root", tester.test_root_endpoint),
        ("Super Admin Setup", tester.test_setup_super_admin),
        ("User Login", tester.test_login),
        ("User Profile", tester.test_get_profile),
        ("Create Business", tester.test_create_business),
        ("Get Businesses", tester.test_get_businesses),
        ("Create Service", tester.test_create_service),
        ("Get Services", tester.test_get_services),
        ("Public Endpoints", tester.test_public_endpoints),
        ("Notifications", tester.test_notifications),
    ]
    
    for test_name, test_func in tests:
        try:
            success = test_func()
            if not success:
                print(f"⚠️  Test '{test_name}' failed but continuing...")
        except Exception as e:
            print(f"💥 Test '{test_name}' crashed: {str(e)}")
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results:")
    print(f"   Tests Passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"   Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%" if tester.tests_run > 0 else "   No tests run")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("❌ Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())