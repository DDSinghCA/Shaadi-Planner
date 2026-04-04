# Guest CRUD tests
import pytest
import requests

class TestGuests:
    """Guest management endpoint tests"""

    def test_create_guest(self, base_url, api_client, auth_headers):
        """Test creating a guest"""
        response = api_client.post(
            f"{base_url}/api/guests",
            headers=auth_headers,
            json={
                "name": "TEST_Rajesh Kumar",
                "side": "groom",
                "group": "family",
                "phone": "+91-9876543210"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["name"] == "TEST_Rajesh Kumar"
        assert data["side"] == "groom"
        print(f"✓ Guest created: {data['id']}")

    def test_get_guests(self, base_url, api_client, auth_headers):
        """Test getting guests"""
        # Create a guest first
        create_response = api_client.post(
            f"{base_url}/api/guests",
            headers=auth_headers,
            json={"name": "TEST_Priya Sharma", "side": "bride", "group": "friends"}
        )
        assert create_response.status_code == 200
        
        # Get guests
        response = api_client.get(
            f"{base_url}/api/guests",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} guests")

    def test_get_guests_filtered(self, base_url, api_client, auth_headers):
        """Test getting guests with filters"""
        response = api_client.get(
            f"{base_url}/api/guests?side=bride",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All returned guests should be from bride side
        for guest in data:
            assert guest["side"] == "bride"
        print(f"✓ Retrieved {len(data)} bride-side guests")

    def test_update_guest(self, base_url, api_client, auth_headers):
        """Test updating a guest"""
        # Create guest
        create_response = api_client.post(
            f"{base_url}/api/guests",
            headers=auth_headers,
            json={"name": "TEST_Update Guest", "side": "bride", "group": "family"}
        )
        guest_id = create_response.json()["id"]
        
        # Update guest
        update_response = api_client.put(
            f"{base_url}/api/guests/{guest_id}",
            headers=auth_headers,
            json={"phone": "+91-1234567890"}
        )
        assert update_response.status_code == 200
        data = update_response.json()
        assert data["phone"] == "+91-1234567890"
        print(f"✓ Guest {guest_id} updated")

    def test_delete_guest_admin(self, base_url, api_client, auth_headers):
        """Test deleting a guest (admin only)"""
        # Create guest
        create_response = api_client.post(
            f"{base_url}/api/guests",
            headers=auth_headers,
            json={"name": "TEST_Delete Guest", "side": "groom", "group": "colleagues"}
        )
        guest_id = create_response.json()["id"]
        
        # Delete guest
        delete_response = api_client.delete(
            f"{base_url}/api/guests/{guest_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200
        print(f"✓ Guest {guest_id} deleted")
