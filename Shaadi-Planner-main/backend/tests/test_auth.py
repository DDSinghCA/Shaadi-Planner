# Auth endpoint tests
import pytest
import requests

class TestAuth:
    """Authentication endpoint tests"""

    def test_health_check(self, base_url, api_client):
        """Test health endpoint"""
        response = api_client.get(f"{base_url}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "timestamp" in data
        print("✓ Health check passed")

    def test_login_success(self, base_url, api_client):
        """Test successful login with superadmin"""
        response = api_client.post(f"{base_url}/api/auth/login", json={
            "username": "superadmin",
            "password": "Temp@123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert "user" in data
        assert data["user"]["username"] == "superadmin"
        assert data["user"]["role"] == "admin"
        assert data["user"]["force_password_change"] == True
        print("✓ Login successful with force_password_change=true")

    def test_login_invalid_credentials(self, base_url, api_client):
        """Test login with invalid credentials"""
        response = api_client.post(f"{base_url}/api/auth/login", json={
            "username": "wronguser",
            "password": "wrongpass"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials rejected")

    def test_get_me(self, base_url, api_client, admin_token):
        """Test GET /api/auth/me with Bearer token"""
        response = api_client.get(
            f"{base_url}/api/auth/me",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "user" in data
        assert data["user"]["username"] == "superadmin"
        assert data["user"]["role"] == "admin"
        print("✓ GET /api/auth/me successful")

    def test_get_me_no_token(self, base_url, api_client):
        """Test GET /api/auth/me without token"""
        response = api_client.get(f"{base_url}/api/auth/me")
        assert response.status_code == 401
        print("✓ Unauthorized access blocked")

    def test_change_password(self, base_url, api_client):
        """Test password change flow"""
        # Login first
        login_response = api_client.post(f"{base_url}/api/auth/login", json={
            "username": "superadmin",
            "password": "Temp@123"
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        
        # Change password (force change, no current_password needed)
        change_response = api_client.post(
            f"{base_url}/api/auth/change-password",
            headers={"Authorization": f"Bearer {token}"},
            json={"new_password": "NewPass@123"}
        )
        assert change_response.status_code == 200
        print("✓ Password changed successfully")
        
        # Verify old password doesn't work
        old_login = api_client.post(f"{base_url}/api/auth/login", json={
            "username": "superadmin",
            "password": "Temp@123"
        })
        assert old_login.status_code == 401
        print("✓ Old password rejected")
        
        # Verify new password works
        new_login = api_client.post(f"{base_url}/api/auth/login", json={
            "username": "superadmin",
            "password": "NewPass@123"
        })
        assert new_login.status_code == 200
        assert new_login.json()["user"]["force_password_change"] == False
        print("✓ New password works, force_password_change=false")
        
        # Change back to original password
        new_token = new_login.json()["access_token"]
        reset_response = api_client.post(
            f"{base_url}/api/auth/change-password",
            headers={"Authorization": f"Bearer {new_token}"},
            json={"current_password": "NewPass@123", "new_password": "Temp@123"}
        )
        assert reset_response.status_code == 200
        print("✓ Password reset to original")

    def test_refresh_token(self, base_url, api_client, admin_user_data):
        """Test token refresh"""
        refresh_token = admin_user_data["refresh_token"]
        response = api_client.post(
            f"{base_url}/api/auth/refresh",
            headers={"Authorization": f"Bearer {refresh_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        print("✓ Token refresh successful")
