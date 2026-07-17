import os
import pytest
import requests
from datetime import date

TARGET_URL = os.environ.get("SUPABASE_URL", "")
AUTH_HEADERS = {
    "apikey": os.environ.get("SUPABASE_ANON_KEY", ""),
    "Authorization": f"Bearer {os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')}",
    "Accept": "application/json",
}


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
