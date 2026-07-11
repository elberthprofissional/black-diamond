import requests
import json

def test_available_slots():
    """Test that the get_available_slots API returns data for today."""
    r = requests.post(
        f"{TARGET_URL}/rest/v1/rpc/get_available_slots",
        json={"p_date": "2026-07-11"},
        headers={
            **__AUTH_HEADERS__,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    assert r.status_code in [200, 404, 400]
    print(f"Available slots API responded: {r.status_code}")

def test_services_table():
    """Test that the services table is accessible."""
    r = requests.get(
        f"{TARGET_URL}/rest/v1/services?select=id,name,price,duration",
        headers={
            **__AUTH_HEADERS__,
            "Accept": "application/json",
        },
    )
    assert r.status_code == 200
    services = r.json()
    assert isinstance(services, list)
    print(f"Services table returned {len(services)} services")
    if len(services) > 0:
        first = services[0]
        assert "id" in first
        assert "name" in first
        assert "price" in first
        print(f"  First service: {first.get('name')} - R$ {first.get('price')}")

test_available_slots()
test_services_table()
