# Budget CRUD tests
import pytest
import requests

class TestBudget:
    """Budget management endpoint tests"""

    def test_create_budget_item(self, base_url, api_client, auth_headers):
        """Test creating a budget item (admin only)"""
        response = api_client.post(
            f"{base_url}/api/budget",
            headers=auth_headers,
            json={
                "category": "TEST_Venue",
                "description": "Wedding hall booking",
                "planned_amount": 500000,
                "actual_amount": 0
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["category"] == "TEST_Venue"
        assert data["planned_amount"] == 500000
        print(f"✓ Budget item created: {data['id']}")

    def test_get_budget_admin(self, base_url, api_client, auth_headers):
        """Test getting budget (admin sees all items)"""
        # Create a budget item first
        create_response = api_client.post(
            f"{base_url}/api/budget",
            headers=auth_headers,
            json={"category": "TEST_Catering", "planned_amount": 300000, "actual_amount": 0}
        )
        assert create_response.status_code == 200
        
        # Get budget
        response = api_client.get(
            f"{base_url}/api/budget",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total_planned" in data
        assert "total_actual" in data
        assert isinstance(data["items"], list)
        print(f"✓ Budget retrieved: {len(data['items'])} items, Total planned: ₹{data['total_planned']}")

    def test_update_budget_item(self, base_url, api_client, auth_headers):
        """Test updating a budget item (admin only)"""
        # Create budget item
        create_response = api_client.post(
            f"{base_url}/api/budget",
            headers=auth_headers,
            json={"category": "TEST_Decoration", "planned_amount": 100000, "actual_amount": 0}
        )
        item_id = create_response.json()["id"]
        
        # Update budget item
        update_response = api_client.put(
            f"{base_url}/api/budget/{item_id}",
            headers=auth_headers,
            json={"actual_amount": 95000}
        )
        assert update_response.status_code == 200
        data = update_response.json()
        assert data["actual_amount"] == 95000
        print(f"✓ Budget item {item_id} updated")

    def test_delete_budget_item_admin(self, base_url, api_client, auth_headers):
        """Test deleting a budget item (admin only)"""
        # Create budget item
        create_response = api_client.post(
            f"{base_url}/api/budget",
            headers=auth_headers,
            json={"category": "TEST_Delete", "planned_amount": 50000, "actual_amount": 0}
        )
        item_id = create_response.json()["id"]
        
        # Delete budget item
        delete_response = api_client.delete(
            f"{base_url}/api/budget/{item_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200
        print(f"✓ Budget item {item_id} deleted")

    def test_viewer_cannot_access_budget(self, base_url, api_client, auth_headers):
        """Test that viewer role cannot access budget"""
        # First create a viewer user
        create_user_response = api_client.post(
            f"{base_url}/api/users",
            headers=auth_headers,
            json={
                "username": "TEST_viewer1",
                "password": "viewerpass123",
                "name": "Test Viewer",
                "role": "viewer"
            }
        )
        assert create_user_response.status_code == 200
        
        # Login as viewer
        login_response = api_client.post(
            f"{base_url}/api/auth/login",
            json={"username": "TEST_viewer1", "password": "viewerpass123"}
        )
        assert login_response.status_code == 200
        viewer_token = login_response.json()["access_token"]
        
        # Try to access budget
        budget_response = api_client.get(
            f"{base_url}/api/budget",
            headers={"Authorization": f"Bearer {viewer_token}"}
        )
        assert budget_response.status_code == 403
        print("✓ Viewer role blocked from budget access")
