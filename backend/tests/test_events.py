# Event/Itinerary CRUD tests
import pytest
import requests

class TestEvents:
    """Event management endpoint tests"""

    def test_create_event(self, base_url, api_client, auth_headers):
        """Test creating an event (admin only)"""
        response = api_client.post(
            f"{base_url}/api/events",
            headers=auth_headers,
            json={
                "name": "TEST_Sangeet Ceremony",
                "date": "2026-06-10",
                "time": "18:00",
                "location": "Grand Ballroom",
                "notes": "Traditional music and dance"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["name"] == "TEST_Sangeet Ceremony"
        assert data["date"] == "2026-06-10"
        print(f"✓ Event created: {data['id']}")

    def test_get_events(self, base_url, api_client, auth_headers):
        """Test getting events"""
        # Create an event first
        create_response = api_client.post(
            f"{base_url}/api/events",
            headers=auth_headers,
            json={"name": "TEST_Mehendi", "date": "2026-06-09", "time": "14:00"}
        )
        assert create_response.status_code == 200
        
        # Get events
        response = api_client.get(
            f"{base_url}/api/events",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} events")

    def test_update_event(self, base_url, api_client, auth_headers):
        """Test updating an event (admin only)"""
        # Create event
        create_response = api_client.post(
            f"{base_url}/api/events",
            headers=auth_headers,
            json={"name": "TEST_Update Event", "date": "2026-06-11", "time": "10:00"}
        )
        event_id = create_response.json()["id"]
        
        # Update event
        update_response = api_client.put(
            f"{base_url}/api/events/{event_id}",
            headers=auth_headers,
            json={"location": "Updated Venue"}
        )
        assert update_response.status_code == 200
        data = update_response.json()
        assert data["location"] == "Updated Venue"
        print(f"✓ Event {event_id} updated")

    def test_delete_event_admin(self, base_url, api_client, auth_headers):
        """Test deleting an event (admin only)"""
        # Create event
        create_response = api_client.post(
            f"{base_url}/api/events",
            headers=auth_headers,
            json={"name": "TEST_Delete Event", "date": "2026-06-12", "time": "16:00"}
        )
        event_id = create_response.json()["id"]
        
        # Delete event
        delete_response = api_client.delete(
            f"{base_url}/api/events/{event_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200
        print(f"✓ Event {event_id} deleted")
