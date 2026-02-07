"""
Test suite for TimeFlow Security Features and Payment Flow
Testing: 
1. Super Admin visibility - non-super_admin users should not see super_admin in user lists
2. Data isolation by business - users should only see users from their own businesses  
3. Payment flow when marking appointment as 'Attended' (Cash/Transfer/Pending)
4. User role update should save correctly to database
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
API_URL = f"{BASE_URL}/api"

# Test credentials
SUPER_ADMIN_EMAIL = "admin@timeflow.com"
SUPER_ADMIN_PASSWORD = "admin123"
BUSINESS_USER_EMAIL = "business_test@test.com"
BUSINESS_USER_PASSWORD = "test1234"

class TestAuthentication:
    """Test authentication endpoints"""
    
    def test_super_admin_login(self):
        """Test super admin can login"""
        response = requests.post(
            f"{API_URL}/auth/login/",
            data={"username": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Super admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "super_admin"
        print(f"✓ Super admin login successful, role: {data['user']['role']}")
        
    def test_business_user_login(self):
        """Test business user can login"""
        response = requests.post(
            f"{API_URL}/auth/login/",
            data={"username": BUSINESS_USER_EMAIL, "password": BUSINESS_USER_PASSWORD}
        )
        # This might fail if user doesn't exist yet
        if response.status_code == 200:
            data = response.json()
            assert "access_token" in data
            print(f"✓ Business user login successful, role: {data['user']['role']}")
        else:
            print(f"⚠ Business user might not exist yet: {response.status_code}")


class TestSuperAdminVisibility:
    """Test that super_admin users are hidden from non-super_admin users"""
    
    @pytest.fixture
    def super_admin_token(self):
        """Get super admin auth token"""
        response = requests.post(
            f"{API_URL}/auth/login/",
            data={"username": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip("Super admin login failed")
        return response.json()["access_token"]
    
    @pytest.fixture
    def business_user_token(self, super_admin_token):
        """Get or create business user and get auth token"""
        # First try to login
        response = requests.post(
            f"{API_URL}/auth/login/",
            data={"username": BUSINESS_USER_EMAIL, "password": BUSINESS_USER_PASSWORD}
        )
        if response.status_code == 200:
            return response.json()["access_token"]
        
        # Create business user if doesn't exist
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # First get or create a business
        biz_response = requests.get(f"{API_URL}/businesses/", headers=headers)
        if biz_response.status_code == 200 and len(biz_response.json()) > 0:
            business_id = biz_response.json()[0]["id"]
        else:
            # Create a business
            biz_create = requests.post(
                f"{API_URL}/businesses/",
                headers=headers,
                json={"name": "Test Business", "description": "For testing"}
            )
            if biz_create.status_code in [200, 201]:
                business_id = biz_create.json()["id"]
            else:
                pytest.skip("Cannot create business for testing")
        
        # Create business user
        create_response = requests.post(
            f"{API_URL}/users/?role=business&business_ids={business_id}",
            headers=headers,
            json={
                "email": BUSINESS_USER_EMAIL,
                "password": BUSINESS_USER_PASSWORD,
                "first_name": "Business",
                "last_name": "Test"
            }
        )
        if create_response.status_code not in [200, 201]:
            pytest.skip(f"Cannot create business user: {create_response.text}")
        
        # Now login
        login_response = requests.post(
            f"{API_URL}/auth/login/",
            data={"username": BUSINESS_USER_EMAIL, "password": BUSINESS_USER_PASSWORD}
        )
        if login_response.status_code != 200:
            pytest.skip("Business user login failed after creation")
        return login_response.json()["access_token"]
    
    def test_super_admin_can_see_all_users(self, super_admin_token):
        """Super admin should be able to see all users including other super_admins"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{API_URL}/users/", headers=headers)
        
        assert response.status_code == 200, f"Failed to get users: {response.text}"
        users = response.json()
        
        # Super admin should see super_admin users
        super_admin_users = [u for u in users if u["role"] == "super_admin"]
        assert len(super_admin_users) >= 1, "Super admin should see at least one super_admin user"
        print(f"✓ Super admin sees {len(super_admin_users)} super_admin user(s)")
        print(f"✓ Total users visible to super_admin: {len(users)}")
        
    def test_business_user_cannot_see_super_admin(self, business_user_token, super_admin_token):
        """Business user should NOT see any super_admin users in the list"""
        headers = {"Authorization": f"Bearer {business_user_token}"}
        response = requests.get(f"{API_URL}/users/", headers=headers)
        
        assert response.status_code == 200, f"Failed to get users: {response.text}"
        users = response.json()
        
        # Business user should NOT see any super_admin users
        super_admin_users = [u for u in users if u["role"] == "super_admin"]
        assert len(super_admin_users) == 0, f"SECURITY BUG: Business user can see {len(super_admin_users)} super_admin user(s)!"
        print(f"✓ Business user correctly cannot see any super_admin users")
        print(f"✓ Users visible to business user: {len(users)}")
        
    def test_business_user_cannot_filter_super_admin(self, business_user_token):
        """Business user should get empty list when filtering for super_admin role"""
        headers = {"Authorization": f"Bearer {business_user_token}"}
        response = requests.get(f"{API_URL}/users/?role=super_admin", headers=headers)
        
        assert response.status_code == 200, f"Failed to get users: {response.text}"
        users = response.json()
        
        assert len(users) == 0, f"SECURITY BUG: Business user can filter for super_admin and see {len(users)} user(s)!"
        print(f"✓ Business user correctly gets empty list when filtering for super_admin")
        
    def test_business_user_cannot_access_super_admin_by_id(self, business_user_token, super_admin_token):
        """Business user should get 404 when trying to access super_admin user by ID"""
        # First get super admin's user ID
        super_headers = {"Authorization": f"Bearer {super_admin_token}"}
        me_response = requests.get(f"{API_URL}/auth/me/", headers=super_headers)
        
        if me_response.status_code != 200:
            pytest.skip("Cannot get super admin user ID")
        
        super_admin_id = me_response.json()["id"]
        
        # Try to access as business user
        business_headers = {"Authorization": f"Bearer {business_user_token}"}
        response = requests.get(f"{API_URL}/users/{super_admin_id}/", headers=business_headers)
        
        # Should get 404 (not found) or 403 (forbidden)
        assert response.status_code in [403, 404], f"SECURITY BUG: Business user can access super_admin by ID! Status: {response.status_code}"
        print(f"✓ Business user correctly denied access to super_admin user by ID (status: {response.status_code})")


class TestDataIsolationByBusiness:
    """Test that users only see users from their own businesses"""
    
    @pytest.fixture
    def super_admin_token(self):
        """Get super admin auth token"""
        response = requests.post(
            f"{API_URL}/auth/login/",
            data={"username": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip("Super admin login failed")
        return response.json()["access_token"]
    
    def test_super_admin_sees_all_users(self, super_admin_token):
        """Super admin should see all users across all businesses"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{API_URL}/users/", headers=headers)
        
        assert response.status_code == 200
        users = response.json()
        print(f"✓ Super admin can see {len(users)} total users")
        
    def test_users_filtered_by_business(self, super_admin_token):
        """Test that users can be filtered by business ID"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # Get businesses first
        biz_response = requests.get(f"{API_URL}/businesses/", headers=headers)
        if biz_response.status_code != 200 or len(biz_response.json()) == 0:
            pytest.skip("No businesses available for testing")
        
        business_id = biz_response.json()[0]["id"]
        
        # Get users filtered by business
        response = requests.get(f"{API_URL}/users/?business_id={business_id}", headers=headers)
        assert response.status_code == 200
        users = response.json()
        
        # All returned users should belong to this business
        for user in users:
            assert business_id in user.get("businesses", []), f"User {user['id']} doesn't belong to business {business_id}"
        
        print(f"✓ Business filter works correctly, found {len(users)} users in business")


class TestUserRoleUpdate:
    """Test that user role updates are saved correctly"""
    
    @pytest.fixture
    def super_admin_token(self):
        """Get super admin auth token"""
        response = requests.post(
            f"{API_URL}/auth/login/",
            data={"username": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip("Super admin login failed")
        return response.json()["access_token"]
    
    def test_super_admin_can_update_user_role(self, super_admin_token):
        """Super admin should be able to update user roles"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # Create a test user
        test_email = f"TEST_role_test_{datetime.now().timestamp()}@test.com"
        create_response = requests.post(
            f"{API_URL}/users/?role=client",
            headers=headers,
            json={
                "email": test_email,
                "password": "testpass123",
                "first_name": "Role",
                "last_name": "Test"
            }
        )
        
        if create_response.status_code not in [200, 201]:
            pytest.skip(f"Cannot create test user: {create_response.text}")
        
        user_id = create_response.json()["id"]
        
        try:
            # Update role from client to staff
            update_response = requests.put(
                f"{API_URL}/users/{user_id}/",
                headers=headers,
                json={"role": "staff"}
            )
            
            assert update_response.status_code == 200, f"Role update failed: {update_response.text}"
            updated_user = update_response.json()
            assert updated_user["role"] == "staff", f"Role not updated! Expected 'staff', got '{updated_user['role']}'"
            
            # Verify by fetching user again
            get_response = requests.get(f"{API_URL}/users/{user_id}/", headers=headers)
            assert get_response.status_code == 200
            fetched_user = get_response.json()
            assert fetched_user["role"] == "staff", f"Role not persisted! Expected 'staff', got '{fetched_user['role']}'"
            
            print(f"✓ User role successfully updated from client to staff and persisted")
            
        finally:
            # Cleanup: deactivate test user
            requests.put(
                f"{API_URL}/users/{user_id}/",
                headers=headers,
                json={"is_active": False}
            )


class TestPaymentFlow:
    """Test payment flow when marking appointment as Attended"""
    
    @pytest.fixture
    def super_admin_token(self):
        """Get super admin auth token"""
        response = requests.post(
            f"{API_URL}/auth/login/",
            data={"username": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip("Super admin login failed")
        return response.json()["access_token"]
    
    @pytest.fixture
    def test_appointment(self, super_admin_token):
        """Create a test appointment for payment testing"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # Get or create a business
        biz_response = requests.get(f"{API_URL}/businesses/", headers=headers)
        if biz_response.status_code != 200 or len(biz_response.json()) == 0:
            # Create a business
            biz_create = requests.post(
                f"{API_URL}/businesses/",
                headers=headers,
                json={"name": "Test Business for Payments", "description": "Payment testing"}
            )
            if biz_create.status_code not in [200, 201]:
                pytest.skip("Cannot create business for payment testing")
            business_id = biz_create.json()["id"]
        else:
            business_id = biz_response.json()[0]["id"]
        
        # Get or create a service
        svc_response = requests.get(f"{API_URL}/services/?business_id={business_id}", headers=headers)
        if svc_response.status_code != 200 or len(svc_response.json()) == 0:
            svc_create = requests.post(
                f"{API_URL}/services/",
                headers=headers,
                json={
                    "name": "Test Service",
                    "business_id": business_id,
                    "duration_minutes": 30,
                    "price": 100.0
                }
            )
            if svc_create.status_code not in [200, 201]:
                pytest.skip("Cannot create service for payment testing")
            service_id = svc_create.json()["id"]
        else:
            service_id = svc_response.json()[0]["id"]
        
        # Get or create staff
        staff_response = requests.get(f"{API_URL}/staff/?business_id={business_id}", headers=headers)
        if staff_response.status_code != 200 or len(staff_response.json()) == 0:
            # Need to create a staff user first
            staff_email = f"TEST_staff_{datetime.now().timestamp()}@test.com"
            staff_user_create = requests.post(
                f"{API_URL}/users/?role=staff&business_ids={business_id}",
                headers=headers,
                json={
                    "email": staff_email,
                    "password": "staffpass123",
                    "first_name": "Staff",
                    "last_name": "Test"
                }
            )
            if staff_user_create.status_code not in [200, 201]:
                pytest.skip("Cannot create staff user for payment testing")
            staff_user_id = staff_user_create.json()["id"]
            
            staff_create = requests.post(
                f"{API_URL}/staff/",
                headers=headers,
                json={
                    "user_id": staff_user_id,
                    "business_id": business_id,
                    "service_ids": [service_id]
                }
            )
            if staff_create.status_code not in [200, 201]:
                pytest.skip("Cannot create staff for payment testing")
            staff_id = staff_create.json()["id"]
        else:
            staff_id = staff_response.json()[0]["id"]
        
        # Get super admin's user ID as client
        me_response = requests.get(f"{API_URL}/auth/me/", headers=headers)
        client_id = me_response.json()["id"]
        
        # Create appointment
        appointment_date = (datetime.now() + timedelta(days=1)).isoformat()
        apt_create = requests.post(
            f"{API_URL}/appointments/",
            headers=headers,
            json={
                "business_id": business_id,
                "service_id": service_id,
                "staff_id": staff_id,
                "client_id": client_id,
                "date": appointment_date,
                "notes": "Test appointment for payment testing"
            }
        )
        
        if apt_create.status_code not in [200, 201]:
            pytest.skip(f"Cannot create appointment for payment testing: {apt_create.text}")
        
        return apt_create.json()
    
    def test_complete_appointment_with_cash(self, super_admin_token, test_appointment):
        """Test completing appointment with cash payment"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        appointment_id = test_appointment["id"]
        
        response = requests.post(
            f"{API_URL}/appointments/{appointment_id}/complete/",
            headers=headers,
            json={"payment_method": "cash"}
        )
        
        assert response.status_code == 200, f"Cash payment completion failed: {response.text}"
        result = response.json()
        
        assert result["payment_status"] == "completed", f"Expected 'completed' status, got '{result['payment_status']}'"
        assert "payment_id" in result
        print(f"✓ Cash payment completed successfully. Payment ID: {result['payment_id']}")
        
    def test_complete_appointment_with_transfer(self, super_admin_token):
        """Test completing appointment with transfer payment (needs receipt)"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # Create a new appointment for this test
        biz_response = requests.get(f"{API_URL}/businesses/", headers=headers)
        if biz_response.status_code != 200 or len(biz_response.json()) == 0:
            pytest.skip("No business available")
        business_id = biz_response.json()[0]["id"]
        
        # Get services and staff
        svc_response = requests.get(f"{API_URL}/services/?business_id={business_id}", headers=headers)
        staff_response = requests.get(f"{API_URL}/staff/?business_id={business_id}", headers=headers)
        
        if svc_response.status_code != 200 or len(svc_response.json()) == 0:
            pytest.skip("No services available")
        if staff_response.status_code != 200 or len(staff_response.json()) == 0:
            pytest.skip("No staff available")
        
        service_id = svc_response.json()[0]["id"]
        staff_id = staff_response.json()[0]["id"]
        
        me_response = requests.get(f"{API_URL}/auth/me/", headers=headers)
        client_id = me_response.json()["id"]
        
        appointment_date = (datetime.now() + timedelta(days=2)).isoformat()
        apt_create = requests.post(
            f"{API_URL}/appointments/",
            headers=headers,
            json={
                "business_id": business_id,
                "service_id": service_id,
                "staff_id": staff_id,
                "client_id": client_id,
                "date": appointment_date,
                "notes": "Test for transfer payment"
            }
        )
        
        if apt_create.status_code not in [200, 201]:
            pytest.skip(f"Cannot create appointment: {apt_create.text}")
        
        appointment_id = apt_create.json()["id"]
        
        # Complete with transfer payment (base64 encoded dummy image)
        dummy_receipt = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        response = requests.post(
            f"{API_URL}/appointments/{appointment_id}/complete/",
            headers=headers,
            json={
                "payment_method": "transfer",
                "receipt_image": dummy_receipt
            }
        )
        
        assert response.status_code == 200, f"Transfer payment completion failed: {response.text}"
        result = response.json()
        
        assert result["payment_status"] == "pending_validation", f"Expected 'pending_validation' status, got '{result['payment_status']}'"
        print(f"✓ Transfer payment marked as pending_validation. Payment ID: {result['payment_id']}")
        
    def test_complete_appointment_with_pending(self, super_admin_token):
        """Test completing appointment with pending payment (needs reason)"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # Create a new appointment
        biz_response = requests.get(f"{API_URL}/businesses/", headers=headers)
        if biz_response.status_code != 200 or len(biz_response.json()) == 0:
            pytest.skip("No business available")
        business_id = biz_response.json()[0]["id"]
        
        svc_response = requests.get(f"{API_URL}/services/?business_id={business_id}", headers=headers)
        staff_response = requests.get(f"{API_URL}/staff/?business_id={business_id}", headers=headers)
        
        if svc_response.status_code != 200 or len(svc_response.json()) == 0:
            pytest.skip("No services available")
        if staff_response.status_code != 200 or len(staff_response.json()) == 0:
            pytest.skip("No staff available")
        
        service_id = svc_response.json()[0]["id"]
        staff_id = staff_response.json()[0]["id"]
        
        me_response = requests.get(f"{API_URL}/auth/me/", headers=headers)
        client_id = me_response.json()["id"]
        
        appointment_date = (datetime.now() + timedelta(days=3)).isoformat()
        apt_create = requests.post(
            f"{API_URL}/appointments/",
            headers=headers,
            json={
                "business_id": business_id,
                "service_id": service_id,
                "staff_id": staff_id,
                "client_id": client_id,
                "date": appointment_date,
                "notes": "Test for pending payment"
            }
        )
        
        if apt_create.status_code not in [200, 201]:
            pytest.skip(f"Cannot create appointment: {apt_create.text}")
        
        appointment_id = apt_create.json()["id"]
        
        response = requests.post(
            f"{API_URL}/appointments/{appointment_id}/complete/",
            headers=headers,
            json={
                "payment_method": "pending",
                "pending_reason": "Customer will pay next visit"
            }
        )
        
        assert response.status_code == 200, f"Pending payment completion failed: {response.text}"
        result = response.json()
        
        assert result["payment_status"] == "pending_payment", f"Expected 'pending_payment' status, got '{result['payment_status']}'"
        print(f"✓ Pending payment recorded successfully. Payment ID: {result['payment_id']}")


class TestCreateClientPermissions:
    """Test that admin/business/staff roles can create clients"""
    
    @pytest.fixture
    def super_admin_token(self):
        """Get super admin auth token"""
        response = requests.post(
            f"{API_URL}/auth/login/",
            data={"username": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip("Super admin login failed")
        return response.json()["access_token"]
    
    def test_super_admin_can_create_client(self, super_admin_token):
        """Super admin should be able to create client users"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        test_email = f"TEST_client_{datetime.now().timestamp()}@test.com"
        response = requests.post(
            f"{API_URL}/users/?role=client",
            headers=headers,
            json={
                "email": test_email,
                "password": "clientpass123",
                "first_name": "Test",
                "last_name": "Client"
            }
        )
        
        assert response.status_code in [200, 201], f"Client creation failed: {response.text}"
        created_user = response.json()
        assert created_user["role"] == "client"
        print(f"✓ Super admin successfully created a client user")
        
        # Cleanup
        requests.put(
            f"{API_URL}/users/{created_user['id']}/",
            headers=headers,
            json={"is_active": False}
        )


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
