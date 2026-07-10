
name: Cerebras Inference
description: Use this to write code to call an LLM using LiteLLM and a free-tier OpenRouter model
---

# Calling an LLM via OpenRouter (free tier)

These instructions allow you to write code to call an LLM using a free OpenRouter model.
This method uses LiteLLM and OpenRouter.

## Setup

The OPENROUTER_API_KEY must be set in the .env file and loaded in as an environment variable.

The uv project must include litellm and pydantic.
`uv add litellm pydantic`

## Code snippets

Use code like these examples in order to use the free OpenRouter model.

### Imports and constants

```python
from litellm import completion
MODEL = "openrouter/openai/gpt-oss-120b:free"
```

### Code to call for a text response

```python
response = completion(model=MODEL, messages=messages, reasoning_effort="low")
result = response.choices[0].message.content
```

### Code to call for a Structured Outputs response

```python
response = completion(model=MODEL, messages=messages, response_format=MyBaseModelSubclass, reasoning_effort="low")
result = response.choices[0].message.content
result_as_object = MyBaseModelSubclass.model_validate_json(result)
```

## Notes

- No `extra_body`/provider pinning is needed or used — free-tier routing picks whichever provider serves the `:free` variant.
- Free models carry rate limits (commonly ~20 requests/minute, ~200/day, subject to change). Wrap calls in a try/except for `litellm.exceptions.RateLimitError` and surface a friendly retry message.
- Not all `:free` variants reliably honor `response_format`; if structured outputs stop parsing, check the model's current supported parameters at openrouter.ai/models.