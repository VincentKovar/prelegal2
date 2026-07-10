"""Unit tests for the mutual-NDA chat service (services/ai_service.py)."""

import json
from types import SimpleNamespace
from unittest.mock import patch

from models.chat import Message
from services import ai_service


def test_get_greeting_targets_mutual_nda():
    greeting = ai_service.get_greeting()
    assert greeting.documentType == "mutual-nda"
    assert greeting.isComplete is False
    assert "Mutual Non-Disclosure Agreement" in greeting.response


def test_system_prompt_lists_all_nda_fields():
    for field in ai_service.MUTUAL_NDA.fields:
        assert field.key in ai_service.FIELD_REQUIREMENTS_TEXT


def _mock_completion(content: dict):
    message = SimpleNamespace(content=json.dumps(content))
    choice = SimpleNamespace(message=message)
    return SimpleNamespace(choices=[choice])


def test_process_message_returns_extracted_fields():
    fake_response = {
        "response": "Great, and what's the effective date?",
        "documentType": "mutual-nda",
        "fields": {"party_a_name": "Acme Inc.", "party_b_name": "Beta LLC"},
        "isComplete": False,
    }
    with patch.object(ai_service, "completion", return_value=_mock_completion(fake_response)):
        result = ai_service.process_message(
            [Message(role="user", content="Acme Inc. and Beta LLC")]
        )

    assert result.fields == {"party_a_name": "Acme Inc.", "party_b_name": "Beta LLC"}
    assert result.isComplete is False


def test_process_message_marks_complete_when_all_fields_present():
    fake_response = {
        "response": "All set! Here's a summary...",
        "documentType": "mutual-nda",
        "fields": {
            "party_a_name": "Acme Inc.",
            "party_b_name": "Beta LLC",
            "effective_date": "2026-07-10",
            "governing_law": "Delaware",
        },
        "isComplete": True,
    }
    with patch.object(ai_service, "completion", return_value=_mock_completion(fake_response)):
        result = ai_service.process_message(
            [Message(role="user", content="Governing law is Delaware")]
        )

    assert result.isComplete is True
    assert result.fields["governing_law"] == "Delaware"


def test_process_message_handles_rate_limit(monkeypatch):
    from litellm import exceptions as litellm_exceptions

    def _raise(*args, **kwargs):
        raise litellm_exceptions.RateLimitError(
            message="rate limited", llm_provider="openrouter", model="gpt-oss-120b"
        )

    with patch.object(ai_service, "completion", side_effect=_raise):
        result = ai_service.process_message([Message(role="user", content="hi")])

    assert result.isComplete is False
    assert "rate limit" in result.response.lower()
