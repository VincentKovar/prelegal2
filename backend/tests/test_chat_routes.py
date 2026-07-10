"""Integration tests for /api/chat/* routes."""

import json
from types import SimpleNamespace
from unittest.mock import patch

from fastapi.testclient import TestClient

from main import app
from services import ai_service

client = TestClient(app)


def test_greeting_endpoint_defaults_to_discovery_mode():
    res = client.get("/api/chat/greeting")
    assert res.status_code == 200
    body = res.json()
    assert body["documentType"] is None
    assert body["isComplete"] is False


def test_greeting_endpoint_scoped_to_document_type():
    res = client.get("/api/chat/greeting", params={"document_type": "letter-of-intent"})
    assert res.status_code == 200
    body = res.json()
    assert body["documentType"] == "letter-of-intent"


def test_greeting_endpoint_rejects_unknown_document_type():
    res = client.get("/api/chat/greeting", params={"document_type": "not-a-real-type"})
    assert res.status_code == 404


def _mock_completion(content: dict):
    message = SimpleNamespace(content=json.dumps(content))
    choice = SimpleNamespace(message=message)
    return SimpleNamespace(choices=[choice])


def test_message_endpoint_returns_fields_for_pinned_type():
    fake_response = {
        "response": "Got it, what's the effective date?",
        "documentType": "mutual-nda",
        "fields": {"party_a_name": "Acme Inc."},
        "isComplete": False,
    }
    with patch.object(ai_service, "completion", return_value=_mock_completion(fake_response)):
        res = client.post(
            "/api/chat/message",
            json={
                "messages": [{"role": "user", "content": "Party A is Acme Inc."}],
                "documentType": "mutual-nda",
            },
        )

    assert res.status_code == 200
    body = res.json()
    assert body["fields"] == {"party_a_name": "Acme Inc."}
    assert body["documentType"] == "mutual-nda"


def test_message_endpoint_supports_discovery_mode_without_document_type():
    fake_response = {
        "response": "Sounds like a Term Sheet - want to go with that?",
        "documentType": "term-sheet",
        "fields": {},
        "isComplete": False,
    }
    with patch.object(ai_service, "completion", return_value=_mock_completion(fake_response)):
        res = client.post(
            "/api/chat/message",
            json={"messages": [{"role": "user", "content": "I want to summarize deal terms"}]},
        )

    assert res.status_code == 200
    body = res.json()
    assert body["documentType"] == "term-sheet"


def test_message_endpoint_rejects_unknown_document_type():
    res = client.post(
        "/api/chat/message",
        json={
            "messages": [{"role": "user", "content": "hi"}],
            "documentType": "not-a-real-type",
        },
    )
    assert res.status_code == 400


def test_message_endpoint_rejects_empty_messages():
    res = client.post("/api/chat/message", json={"messages": []})
    assert res.status_code == 400


def test_template_endpoint_returns_body_for_known_type():
    res = client.get("/api/catalog/mutual-nda/template")
    assert res.status_code == 200
    assert "{{party_a_name}}" in res.json()["body"]


def test_template_endpoint_404s_for_unknown_type():
    res = client.get("/api/catalog/not-a-real-type/template")
    assert res.status_code == 404
