"""Unit tests for the multi-document-type chat service (services/ai_service.py)."""

import json
from types import SimpleNamespace
from unittest.mock import patch

import pytest

from models.chat import Message
from models.documents import DOCUMENT_CATALOG, get_template
from services import ai_service


def _mock_completion(content: dict):
    message = SimpleNamespace(content=json.dumps(content))
    choice = SimpleNamespace(message=message)
    return SimpleNamespace(choices=[choice])


@pytest.mark.parametrize("document_id", [doc.id for doc in DOCUMENT_CATALOG])
def test_get_greeting_targets_requested_document_type(document_id):
    template = get_template(document_id)
    greeting = ai_service.get_greeting(document_id)
    assert greeting.documentType == document_id
    assert greeting.isComplete is False
    assert template.title in greeting.response


def test_get_greeting_without_document_type_starts_discovery():
    greeting = ai_service.get_greeting()
    assert greeting.documentType is None
    assert greeting.isComplete is False
    assert "?" in greeting.response


@pytest.mark.parametrize("document_id", [doc.id for doc in DOCUMENT_CATALOG])
def test_pinned_system_prompt_lists_that_documents_fields(document_id):
    prompt = ai_service._pinned_system_prompt(document_id)
    for field in get_template(document_id).fields:
        assert field.key in prompt
    assert document_id in prompt


def test_discovery_system_prompt_lists_whole_catalog():
    prompt = ai_service._discovery_system_prompt()
    for doc in DOCUMENT_CATALOG:
        assert doc.id in prompt


def test_process_message_returns_extracted_fields_for_pinned_type():
    fake_response = {
        "response": "Great, and what's the effective date?",
        "documentType": "mutual-nda",
        "fields": {"party_a_name": "Acme Inc.", "party_b_name": "Beta LLC"},
        "isComplete": False,
    }
    with patch.object(ai_service, "completion", return_value=_mock_completion(fake_response)):
        result = ai_service.process_message(
            [Message(role="user", content="Acme Inc. and Beta LLC")], document_type="mutual-nda"
        )

    assert result.fields == {"party_a_name": "Acme Inc.", "party_b_name": "Beta LLC"}
    assert result.isComplete is False
    assert result.documentType == "mutual-nda"


def test_process_message_works_for_a_non_nda_document_type():
    fake_response = {
        "response": "Got it, what's the exclusivity period?",
        "documentType": "letter-of-intent",
        "fields": {"buyer_name": "Acme Inc.", "target_name": "Target Co."},
        "isComplete": False,
    }
    with patch.object(ai_service, "completion", return_value=_mock_completion(fake_response)):
        result = ai_service.process_message(
            [Message(role="user", content="Buyer is Acme Inc., target is Target Co.")],
            document_type="letter-of-intent",
        )

    assert result.fields["buyer_name"] == "Acme Inc."
    assert result.documentType == "letter-of-intent"


def test_process_message_pins_document_type_even_if_model_omits_it():
    fake_response = {
        "response": "Noted.",
        "documentType": None,
        "fields": {"party_a_name": "Acme Inc."},
        "isComplete": False,
    }
    with patch.object(ai_service, "completion", return_value=_mock_completion(fake_response)):
        result = ai_service.process_message(
            [Message(role="user", content="Party A is Acme Inc.")], document_type="mutual-nda"
        )

    assert result.documentType == "mutual-nda"


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
            [Message(role="user", content="Governing law is Delaware")], document_type="mutual-nda"
        )

    assert result.isComplete is True
    assert result.fields["governing_law"] == "Delaware"


def test_process_message_discovery_mode_matches_a_document_type():
    fake_response = {
        "response": "Sounds like a Mutual NDA - shall we go with that?",
        "documentType": "mutual-nda",
        "fields": {},
        "isComplete": False,
    }
    with patch.object(ai_service, "completion", return_value=_mock_completion(fake_response)):
        result = ai_service.process_message(
            [Message(role="user", content="I need to protect confidential info with a partner")],
            document_type=None,
        )

    assert result.documentType == "mutual-nda"


def test_process_message_discovery_mode_suggests_closest_match_for_unsupported_request():
    fake_response = {
        "response": (
            "We can't generate an employment contract, but a Letter of Intent might be "
            "the closest fit if this is acquisition-related - want to try that?"
        ),
        "documentType": None,
        "suggestedDocument": "letter-of-intent",
        "fields": {},
        "isComplete": False,
    }
    with patch.object(ai_service, "completion", return_value=_mock_completion(fake_response)):
        result = ai_service.process_message(
            [Message(role="user", content="I need an employment contract for a new hire")],
            document_type=None,
        )

    assert result.documentType is None
    assert result.suggestedDocument == "letter-of-intent"


def test_process_message_rejects_unknown_document_type():
    with pytest.raises(ValueError):
        ai_service.process_message(
            [Message(role="user", content="hi")], document_type="not-a-real-type"
        )


def test_process_message_handles_rate_limit():
    from litellm import exceptions as litellm_exceptions

    def _raise(*args, **kwargs):
        raise litellm_exceptions.RateLimitError(
            message="rate limited", llm_provider="openrouter", model="gpt-oss-120b"
        )

    with patch.object(ai_service, "completion", side_effect=_raise):
        result = ai_service.process_message(
            [Message(role="user", content="hi")], document_type="mutual-nda"
        )

    assert result.isComplete is False
    assert "rate limit" in result.response.lower()
    assert result.documentType == "mutual-nda"
