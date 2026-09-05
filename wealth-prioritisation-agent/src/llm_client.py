"""
Single point of contact for LLM calls in this project.

All the reasoning agents (attribution, recommendation, conversation-prep, etc.)
should import `generate()` from here rather than calling any SDK directly.
That keeps the model provider swappable in one file if it ever needs to change
again, and makes it easy to log every prompt/response pair for the
explainability/traceability requirement in the challenge brief.

Provider: Google Gemini (via the official `google-genai` SDK).
Auth: reads GEMINI_API_KEY from the environment (loaded from .env if present).
"""

from __future__ import annotations

import os
import json
from dataclasses import dataclass, field
from typing import Any, Optional

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

_API_KEY = os.environ.get("GEMINI_API_KEY")
_DEFAULT_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

_client: Optional[genai.Client] = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        if not _API_KEY:
            raise RuntimeError(
                "GEMINI_API_KEY is not set. Copy .env.example to .env and add your "
                "own key, or export GEMINI_API_KEY in your shell before running."
            )
        _client = genai.Client(api_key=_API_KEY)
    return _client


@dataclass
class LLMResponse:
    text: str
    model: str
    raw: Any = field(repr=False, default=None)


def generate(
    prompt: str,
    system_instruction: Optional[str] = None,
    model: Optional[str] = None,
    temperature: float = 0.2,
    response_schema: Optional[dict] = None,
) -> LLMResponse:
    """
    Send a prompt to Gemini and return the text response.

    - Keep temperature low (default 0.2) for anything client-facing: this is a
      wealth-advisory tool, not a creative one. Grounded and repeatable beats
      creative here.
    - Pass `response_schema` (a JSON schema dict) to force structured JSON
      output, e.g. for the recommendation agent's {action, reasoning,
      supporting_evidence} objects. Gemini will validate against it.
    - `system_instruction` is where you should put the grounding rule, e.g.
      "Only reference events present in the provided event_log rows. Never
      invent a market event from your own knowledge."
    """
    client = _get_client()
    model_name = model or _DEFAULT_MODEL

    config_kwargs: dict[str, Any] = {"temperature": temperature}
    if system_instruction:
        config_kwargs["system_instruction"] = system_instruction
    if response_schema:
        config_kwargs["response_mime_type"] = "application/json"
        config_kwargs["response_schema"] = response_schema

    config = types.GenerateContentConfig(**config_kwargs)

    result = client.models.generate_content(
        model=model_name,
        contents=prompt,
        config=config,
    )

    return LLMResponse(text=result.text, model=model_name, raw=result)


def generate_json(
    prompt: str,
    response_schema: dict,
    system_instruction: Optional[str] = None,
    model: Optional[str] = None,
    temperature: float = 0.2,
) -> dict:
    """Convenience wrapper: generate() + json.loads() the result."""
    resp = generate(
        prompt=prompt,
        system_instruction=system_instruction,
        model=model,
        temperature=temperature,
        response_schema=response_schema,
    )
    return json.loads(resp.text)


if __name__ == "__main__":
    # Quick smoke test: `python src/llm_client.py`
    out = generate("Reply with exactly the word: OK")
    print(f"model={out.model}")
    print(f"response={out.text!r}")
