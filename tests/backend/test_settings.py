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
def test_settings_table():
    """Test that the settings table is accessible."""
    r = requests.get(
        f"{TARGET_URL}/rest/v1/settings?select=key,value&limit=10",
        headers=AUTH_HEADERS,
    )
    assert r.status_code == 200
    settings = r.json()
    assert isinstance(settings, list)
    assert len(settings) > 0, "Settings table should have entries"


@pytest.mark.skipif(not TARGET_URL, reason="SUPABASE_URL not set")
def test_coupons_table():
    """Test that the coupons table is accessible."""
    r = requests.get(
        f"{TARGET_URL}/rest/v1/coupons?select=id,code,discount_type,discount_value,is_active&limit=10",
        headers=AUTH_HEADERS,
    )
    assert r.status_code == 200
    coupons = r.json()
    assert isinstance(coupons, list)


@pytest.mark.skipif(not TARGET_URL, reason="SUPABASE_URL not set")
def test_mensalista_plans():
    """Test that mensalista_plans table is accessible."""
    r = requests.get(
        f"{TARGET_URL}/rest/v1/mensalista_plans?select=id,name,price,is_active&limit=10",
        headers=AUTH_HEADERS,
    )
    assert r.status_code == 200
    plans = r.json()
    assert isinstance(plans, list)
