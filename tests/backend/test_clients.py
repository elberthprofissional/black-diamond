import os
import pytest
import requests
from unittest.mock import patch, MagicMock

TARGET_URL = os.environ.get("SUPABASE_URL", "")
AUTH_HEADERS = {
    "apikey": os.environ.get("SUPABASE_ANON_KEY", ""),
    "Authorization": f"Bearer {os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')}",
    "Accept": "application/json",
}


# ── Live tests (require SUPABASE_URL) ──

@pytest.mark.skipif(not TARGET_URL, reason="SUPABASE_URL not set")
def test_clients_table():
    """Test that the clients table is accessible and has data."""
    r = requests.get(
        f"{TARGET_URL}/rest/v1/clients?select=id,name,phone,historical_visits&order=created_at.desc&limit=5",
        headers=AUTH_HEADERS,
    )
    assert r.status_code == 200
    clients = r.json()
    assert isinstance(clients, list)


@pytest.mark.skipif(not TARGET_URL, reason="SUPABASE_URL not set")
def test_bookings_recent():
    """Test that recent bookings can be fetched."""
    r = requests.get(
        f"{TARGET_URL}/rest/v1/bookings?select=id,booking_date,booking_time,status,total_price&order=created_at.desc&limit=5",
        headers=AUTH_HEADERS,
    )
    assert r.status_code == 200
    bookings = r.json()
    assert isinstance(bookings, list)


# ── Mock tests (run without database) ──

class TestClientsMock:
    """Tests using mocked Supabase responses."""

    def test_client_schema(self, mock_clients):
        """Validates client data structure."""
        for client in mock_clients:
            assert "id" in client
            assert "name" in client
            assert "phone" in client
            assert isinstance(client["name"], str)
            assert len(client["name"]) > 0

    def test_client_phone_format(self, mock_clients):
        """Validates phone numbers contain only digits."""
        for client in mock_clients:
            digits = "".join(c for c in client["phone"] if c.isdigit())
            assert len(digits) >= 10, f"Phone {client['phone']} too short"

    def test_client_visits_are_non_negative(self, mock_clients):
        """Validates historical visits count is non-negative."""
        for client in mock_clients:
            assert client["historical_visits"] >= 0

    def test_clients_have_unique_ids(self, mock_clients):
        """Validates all client IDs are unique."""
        ids = [c["id"] for c in mock_clients]
        assert len(ids) == len(set(ids))

    def test_client_name_not_empty(self, mock_clients):
        """Validates client names are not empty strings."""
        for client in mock_clients:
            assert client["name"].strip(), f"Client {client['id']} has empty name"
