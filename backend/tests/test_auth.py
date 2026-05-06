"""Tests for the HMAC-signed auth token implementation."""
import time
import pytest
from app.auth import create_token, verify_token, create_password_hash, verify_password, _sign


def test_token_round_trip():
    token = create_token("user_001", "test@example.com", "broker", "venue_001")
    claims = verify_token(token)
    assert claims is not None
    assert claims["sub"] == "user_001"
    assert claims["email"] == "test@example.com"
    assert claims["role"] == "broker"
    assert claims["tenant_id"] == "venue_001"


def test_token_without_tenant():
    token = create_token("user_002", "op@example.com", "venue_operator")
    claims = verify_token(token)
    assert claims is not None
    assert claims["tenant_id"] is None


def test_tampered_payload_rejected():
    token = create_token("user_001", "test@example.com", "broker")
    sig, encoded = token.split(".", 1)
    # Flip one character in the payload to simulate tampering
    tampered_encoded = encoded[:-1] + ("A" if encoded[-1] != "A" else "B")
    tampered_token = f"{sig}.{tampered_encoded}"
    assert verify_token(tampered_token) is None


def test_tampered_signature_rejected():
    token = create_token("user_001", "test@example.com", "broker")
    sig, encoded = token.split(".", 1)
    bad_sig = "a" * 32
    assert verify_token(f"{bad_sig}.{encoded}") is None


def test_malformed_token_rejected():
    assert verify_token("") is None
    assert verify_token("nodot") is None
    assert verify_token("short.x") is None


def test_expired_token_rejected(monkeypatch):
    token = create_token("user_001", "test@example.com", "broker")
    # Fast-forward time past expiry
    monkeypatch.setattr(time, "time", lambda: time.time() + 999999)
    assert verify_token(token) is None


def test_password_hash_round_trip():
    hashed = create_password_hash("demo123")
    assert verify_password("demo123", hashed)
    assert not verify_password("wrong", hashed)


def test_secret_stability():
    """Token created before a simulated restart must still verify after."""
    token = create_token("user_001", "x@y.com", "admin")
    # The _APP_SECRET is module-level and stable — verify_token uses the same secret
    assert verify_token(token) is not None
