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


# ── Mock tests (run without database) ──

class TestSettingsMock:
    """Tests using mocked Supabase responses."""

    def test_settings_schema(self, mock_settings):
        """Validates settings data structure."""
        for setting in mock_settings:
            assert "key" in setting
            assert "value" in setting
            assert isinstance(setting["key"], str)
            assert len(setting["key"]) > 0

    def test_required_settings_exist(self, mock_settings):
        """Validates critical settings are present."""
        keys = {s["key"] for s in mock_settings}
        assert "barber_name" in keys
        assert "barber_phone" in keys
        assert "working_days" in keys

    def test_working_days_format(self, mock_settings):
        """Validates working_days is comma-separated day numbers."""
        wd = next(s for s in mock_settings if s["key"] == "working_days")
        days = [int(d) for d in wd["value"].split(",")]
        assert all(0 <= d <= 6 for d in days)
        assert len(days) > 0


class TestCouponsMock:
    """Tests using mocked coupon data."""

    def test_coupon_schema(self, mock_coupons):
        """Validates coupon data structure."""
        for coupon in mock_coupons:
            assert "id" in coupon
            assert "code" in coupon
            assert "discount_type" in coupon
            assert "is_active" in coupon

    def test_coupon_discount_type(self, mock_coupons):
        """Validates discount_type is one of allowed values."""
        valid_types = {"fixed", "percentage", "free"}
        for coupon in mock_coupons:
            assert coupon["discount_type"] in valid_types

    def test_coupon_code_uppercase(self, mock_coupons):
        """Validates coupon codes are uppercase."""
        for coupon in mock_coupons:
            assert coupon["code"] == coupon["code"].upper()


class TestMensalistaMock:
    """Tests using mocked mensalista plan data."""

    def test_plan_schema(self, mock_mensalista_plans):
        """Validates plan data structure."""
        for plan in mock_mensalista_plans:
            assert "id" in plan
            assert "name" in plan
            assert "price" in plan
            assert "is_active" in plan

    def test_plan_price_positive(self, mock_mensalista_plans):
        """Validates plan prices are positive."""
        for plan in mock_mensalista_plans:
            assert plan["price"] > 0
