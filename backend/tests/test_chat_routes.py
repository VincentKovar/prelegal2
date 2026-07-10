"""Integration tests for /api/chat/* routes."""

import json
from types import SimpleNamespace
from unittest.mock import patch

from fastapi.testclient import TestClient

from main import app
from services import ai_service

client = TestClient(app)


def test_greeting_endpoint():
    res = client.get("/api/chat/greeting")
    assert res.status_code == 200
    body = res.json()
    assert body["documentType"] == "mutual-nda"
    assert body["isComplete"] is False


def _mock_completion(content: dict):
    message = SimpleNamespace(content=json.dumps(content))
    choice = SimpleNamespace(message=message)
    return SimpleNamespace(choices=[choice])


def test_message_endpoint_returns_fields():
    fake_response = {
        "response": "Got it, what's the effective date?",
        "documentType": "mutual-nda",
        "fields": {"party_a_name": "Acme Inc."},
        "isComplete": False,
    }
    with patch.object(ai_service, "completion", return_value=_mock_completion(fake_response)):
        res = client.post(
            "/api/chat/message",
            json={"messages": [{"role": "user", "content": "Party A is Acme Inc."}]},
        )

    assert res.status_code == 200
    body = res.json()
    assert body["fields"] == {"party_a_name": "Acme Inc."}


def test_message_endpoint_rejects_empty_messages():
    res = client.post("/api/chat/message", json={"messages": []})
    assert res.status_code == 400
