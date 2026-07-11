import requests

def test_settings_table():
    """Test that the settings table is accessible."""
    r = requests.get(
        f"{TARGET_URL}/rest/v1/settings?select=key,value&limit=10",
        headers={
            **__AUTH_HEADERS__,
            "Accept": "application/json",
        },
    )
    assert r.status_code == 200
    settings = r.json()
    assert isinstance(settings, list)
    print(f"Settings returned {len(settings)} entries")
    for s in settings:
        print(f"  {s.get('key')}: {s.get('value')}")

def test_loyalty_config():
    """Test that the loyalty_config table exists and is accessible."""
    r = requests.get(
        f"{TARGET_URL}/rest/v1/loyalty_config?select=id,visit_threshold,reward_service_id,enabled",
        headers={
            **__AUTH_HEADERS__,
            "Accept": "application/json",
        },
    )
    assert r.status_code == 200
    configs = r.json()
    assert isinstance(configs, list)
    print(f"Loyalty config returned {len(configs)} rows")
    for c in configs:
        print(f"  Threshold: {c.get('visit_threshold')}, Enabled: {c.get('enabled')}")

def test_coupons_table():
    """Test that the coupons table is accessible."""
    r = requests.get(
        f"{TARGET_URL}/rest/v1/coupons?select=id,code,discount_type,discount_value,is_active&limit=10",
        headers={
            **__AUTH_HEADERS__,
            "Accept": "application/json",
        },
    )
    assert r.status_code == 200
    coupons = r.json()
    assert isinstance(coupons, list)
    print(f"Coupons returned {len(coupons)} coupons")

def test_mensalista_plans():
    """Test that mensalista_plans table is accessible."""
    r = requests.get(
        f"{TARGET_URL}/rest/v1/mensalista_plans?select=id,name,price,is_active&limit=10",
        headers={
            **__AUTH_HEADERS__,
            "Accept": "application/json",
        },
    )
    assert r.status_code == 200
    plans = r.json()
    assert isinstance(plans, list)
    print(f"Mensalista plans returned {len(plans)} plans")
    for p in plans:
        print(f"  {p.get('name')} - R$ {p.get('price')}")

test_settings_table()
test_loyalty_config()
test_coupons_table()
test_mensalista_plans()
