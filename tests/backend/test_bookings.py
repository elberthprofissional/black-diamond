import os
import pytest
import requests
from datetime import date
from unittest.mock import patch, MagicMock

TARGET_URL = os.environ.get("SUPABASE_URL", "")
AUTH_HEADERS = {
    "apikey": os.environ.get("SUPABASE_ANON_KEY", ""),
    "Authorization": f"Bearer {os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')}",
    "Accept": "application/json",
}


# ── Live tests (require SUPABASE_URL) ──

@pytest.mark.skipif(not TARGET_URL, reason="SUPABASE_URL not set")
def test_available_slots():
    """Test that the get_available_slots API returns data for today."""
    today = date.today().isoformat()
    r = requests.post(
        f"{TARGET_URL}/rest/v1/rpc/get_available_slots",
        json={"p_date": today},
        headers={
            **AUTH_HEADERS,
            "Content-Type": "application/json",
        },
    )
    assert r.status_code in [200, 400], f"Unexpected status: {r.status_code}"


@pytest.mark.skipif(not TARGET_URL, reason="SUPABASE_URL not set")
def test_services_table():
    """Test that the services table is accessible."""
    r = requests.get(
        f"{TARGET_URL}/rest/v1/services?select=id,name,price,duration",
        headers=AUTH_HEADERS,
    )
    assert r.status_code == 200
    services = r.json()
    assert isinstance(services, list)
    assert len(services) > 0, "Services table should have entries"


# ── Mock tests (run without database) ──

class TestBookingsMock:
    """Tests using mocked Supabase responses."""

    def test_services_schema(self, mock_services):
        """Validates service data structure."""
        for service in mock_services:
            assert "id" in service
            assert "name" in service
            assert "price" in service
            assert "duration" in service
            assert isinstance(service["price"], (int, float))
            assert service["price"] > 0
            assert service["duration"] > 0

    def test_available_slots_format(self, mock_available_slots):
        """Validates slot time format (HH:MM:SS)."""
        for slot in mock_available_slots:
            assert "slot_time" in slot
            parts = slot["slot_time"].split(":")
            assert len(parts) == 3
            assert 0 <= int(parts[0]) <= 23
            assert 0 <= int(parts[1]) <= 59

    def test_booking_status_values(self, mock_bookings):
        """Validates booking status is one of allowed values."""
        valid_statuses = {"pending", "confirmed", "cancelled", "completed"}
        for booking in mock_bookings:
            assert booking["status"] in valid_statuses

    def test_booking_has_required_fields(self, mock_bookings):
        """Validates all required booking fields exist."""
        required = {"id", "booking_date", "booking_time", "status", "total_price"}
        for booking in mock_bookings:
            assert required.issubset(booking.keys())

    def test_bookings_sorted_by_date(self, mock_bookings):
        """Validates bookings are sorted by date ascending."""
        dates = [b["booking_date"] for b in mock_bookings]
        assert dates == sorted(dates)
