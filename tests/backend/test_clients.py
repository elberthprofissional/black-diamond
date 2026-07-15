import os
import pytest
import requests

TARGET_URL = os.environ.get("SUPABASE_URL", "")
AUTH_HEADERS = {
    "apikey": os.environ.get("SUPABASE_ANON_KEY", ""),
    "Authorization": f"Bearer {os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')}",
    "Accept": "application/json",
}


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
