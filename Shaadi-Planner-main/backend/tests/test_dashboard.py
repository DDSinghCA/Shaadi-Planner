# Dashboard endpoint tests
import pytest
import requests

class TestDashboard:
    """Dashboard endpoint tests"""

    def test_get_dashboard(self, base_url, api_client, auth_headers):
        """Test getting dashboard data"""
        response = api_client.get(
            f"{base_url}/api/dashboard",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "my_tasks" in data
        assert "upcoming_events" in data
        assert "budget_summary" in data
        assert "guest_count" in data
        assert isinstance(data["my_tasks"], list)
        assert isinstance(data["upcoming_events"], list)
        assert isinstance(data["budget_summary"], dict)
        assert isinstance(data["guest_count"], int)
        print(f"✓ Dashboard data retrieved: {data['guest_count']} guests, {len(data['my_tasks'])} pending tasks")
