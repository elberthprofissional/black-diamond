import requests

def test_clients_table():
    """Test that the clients table is accessible and has data."""
    r = requests.get(
        f"{TARGET_URL}/rest/v1/clients?select=id,name,phone,historical_visits&order=created_at.desc&limit=5",
        headers={
            **__AUTH_HEADERS__,
            "Accept": "application/json",
        },
    )
    assert r.status_code == 200
    clients = r.json()
    assert isinstance(clients, list)
    print(f"Clients table returned {len(clients)} clients")
    if len(clients) > 0:
        first = clients[0]
        assert "id" in first
        assert "name" in first
        print(f"  First client: {first.get('name')} - {first.get('phone')}")

def test_bookings_recent():
    """Test that recent bookings can be fetched."""
    r = requests.get(
        f"{TARGET_URL}/rest/v1/bookings?select=id,booking_date,booking_time,status,total_price&order=created_at.desc&limit=5",
        headers={
            **__AUTH_HEADERS__,
            "Accept": "application/json",
        },
    )
    assert r.status_code == 200
    bookings = r.json()
    assert isinstance(bookings, list)
    print(f"Bookings returned {len(bookings)} recent bookings")
    for b in bookings:
        print(f"  {b.get('booking_date')} {b.get('booking_time')} - {b.get('status')} - R$ {b.get('total_price')}")

test_clients_table()
test_bookings_recent()
