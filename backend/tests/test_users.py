# User management tests (admin only)
import pytest
import requests

class TestUsers:
    """User management endpoint tests"""

    def test_create_user(self, base_url, api_client, auth_headers):
        """Test creating a new user"""
        response = api_client.post(
            f"{base_url}/api/users",
            headers=auth_headers,
            json={
                "username": "TEST_contributor1",
                "password": "testpass123",
                "name": "Test Contributor",
                "role": "contributor"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["username"] == "test_contributor1"  # lowercase
        assert data["role"] == "contributor"
        print(f"✓ User created: {data['id']}")

    def test_list_users(self, base_url, api_client, auth_headers):
        """Test listing all users"""
        response = api_client.get(
            f"{base_url}/api/users",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1  # At least admin
        # Check admin user exists
        admin_users = [u for u in data if u["username"] == "superadmin"]
        assert len(admin_users) == 1
        assert "password_hash" not in admin_users[0]
        print(f"✓ Listed {len(data)} users")

    def test_create_user_duplicate(self, base_url, api_client, auth_headers):
        """Test creating duplicate user fails"""
        response = api_client.post(
            f"{base_url}/api/users",
            headers=auth_headers,
            json={
                "username": "superadmin",
                "password": "test123",
                "name": "Duplicate",
                "role": "admin"
            }
        )
        assert response.status_code == 400
        print("✓ Duplicate username rejected")

    def test_create_user_no_auth(self, base_url, api_client):
        """Test creating user without auth fails"""
        response = api_client.post(
            f"{base_url}/api/users",
            json={
                "username": "noauth",
                "password": "test123",
                "name": "No Auth",
                "role": "viewer"
            }
        )
        assert response.status_code == 401
        print("✓ Unauthorized user creation blocked")
