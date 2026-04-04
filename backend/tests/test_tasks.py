# Task CRUD tests
import pytest
import requests

class TestTasks:
    """Task management endpoint tests"""

    def test_create_task(self, base_url, api_client, auth_headers):
        """Test creating a task"""
        response = api_client.post(
            f"{base_url}/api/tasks",
            headers=auth_headers,
            json={
                "title": "TEST_Book venue",
                "deadline": "2026-06-15",
                "status": "pending",
                "notes": "Contact 3 venues"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["title"] == "TEST_Book venue"
        assert data["status"] == "pending"
        print(f"✓ Task created: {data['id']}")
        return data["id"]

    def test_get_tasks(self, base_url, api_client, auth_headers):
        """Test getting tasks"""
        # Create a task first
        create_response = api_client.post(
            f"{base_url}/api/tasks",
            headers=auth_headers,
            json={"title": "TEST_Get tasks test", "status": "pending"}
        )
        assert create_response.status_code == 200
        task_id = create_response.json()["id"]
        
        # Get tasks
        response = api_client.get(
            f"{base_url}/api/tasks",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} tasks")

    def test_get_my_tasks(self, base_url, api_client, auth_headers):
        """Test getting my tasks"""
        response = api_client.get(
            f"{base_url}/api/tasks/my",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} my tasks")

    def test_get_all_tasks_admin(self, base_url, api_client, auth_headers):
        """Test getting all tasks (admin only)"""
        response = api_client.get(
            f"{base_url}/api/tasks/all",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} all tasks (admin)")

    def test_update_task(self, base_url, api_client, auth_headers):
        """Test updating a task"""
        # Create task
        create_response = api_client.post(
            f"{base_url}/api/tasks",
            headers=auth_headers,
            json={"title": "TEST_Update test", "status": "pending"}
        )
        task_id = create_response.json()["id"]
        
        # Update task
        update_response = api_client.put(
            f"{base_url}/api/tasks/{task_id}",
            headers=auth_headers,
            json={"status": "completed"}
        )
        assert update_response.status_code == 200
        data = update_response.json()
        assert data["status"] == "completed"
        print(f"✓ Task {task_id} updated")

    def test_delete_task_admin(self, base_url, api_client, auth_headers):
        """Test deleting a task (admin only)"""
        # Create task
        create_response = api_client.post(
            f"{base_url}/api/tasks",
            headers=auth_headers,
            json={"title": "TEST_Delete test", "status": "pending"}
        )
        task_id = create_response.json()["id"]
        
        # Delete task
        delete_response = api_client.delete(
            f"{base_url}/api/tasks/{task_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200
        print(f"✓ Task {task_id} deleted")
        
        # Verify deletion
        get_response = api_client.get(
            f"{base_url}/api/tasks/all",
            headers=auth_headers
        )
        tasks = get_response.json()
        deleted_task = [t for t in tasks if t["id"] == task_id]
        assert len(deleted_task) == 0
        print("✓ Task deletion verified")
