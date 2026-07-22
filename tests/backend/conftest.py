"""Shared fixtures for backend integration tests.

Mocks HTTP calls to Supabase REST API so tests can run without
a live database connection. Set SUPABASE_URL to run against real data.
"""
import os
import pytest


# Mock data fixtures

@pytest.fixture
def mock_services():
    return [
        {"id": "s1", "name": "Corte de Cabelo", "price": 50, "duration": 30},
        {"id": "s2", "name": "Barba", "price": 30, "duration": 20},
        {"id": "s3", "name": "Corte + Barba", "price": 70, "duration": 45},
    ]


@pytest.fixture
def mock_clients():
    return [
        {
            "id": "c1",
            "name": "Joao Silva",
            "phone": "31999998888",
            "historical_visits": 5,
        },
        {
            "id": "c2",
            "name": "Maria Santos",
            "phone": "31988887777",
            "historical_visits": 12,
        },
    ]


@pytest.fixture
def mock_bookings():
    return [
        {
            "id": "b1",
            "booking_date": "2026-07-21",
            "booking_time": "14:00",
            "status": "confirmed",
            "total_price": 50,
        },
        {
            "id": "b2",
            "booking_date": "2026-07-22",
            "booking_time": "10:00",
            "status": "pending",
            "total_price": 70,
        },
    ]


@pytest.fixture
def mock_settings():
    return [
        {"key": "barber_name", "value": "Tato"},
        {"key": "barber_phone", "value": "55319800112233"},
        {"key": "working_days", "value": "1,2,3,4,5,6"},
    ]


@pytest.fixture
def mock_coupons():
    return [
        {
            "id": "cp1",
            "code": "DESCONTO10",
            "discount_type": "percentage",
            "discount_value": 10,
            "is_active": True,
        },
    ]


@pytest.fixture
def mock_mensalista_plans():
    return [
        {
            "id": "mp1",
            "name": "Plano Basico",
            "price": 150,
            "is_active": True,
        },
    ]


@pytest.fixture
def mock_available_slots():
    return [
        {"slot_time": "09:00:00"},
        {"slot_time": "09:30:00"},
        {"slot_time": "10:00:00"},
        {"slot_time": "14:00:00"},
        {"slot_time": "14:30:00"},
    ]
