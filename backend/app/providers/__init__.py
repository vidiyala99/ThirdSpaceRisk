"""
Third Space Risk — LLM Provider Abstraction Layer

Providers sit at the agent boundary. Swapping providers requires only changing
the one returned by get_default_provider — the packet builder, citation
validator, and audit trail are untouched.

Resolution order (first hit wins):
  1. ANTHROPIC_API_KEY → AnthropicProvider (Claude Haiku 4.5)
  2. GEMINI_API_KEY    → GeminiProvider    (Gemini 2.5 Flash)
  3. (no key)          → DeterministicProvider (template-based)
"""

from app.providers.base import MemoProvider, ProviderMode
from app.providers.deterministic import DeterministicProvider
from app.providers.anthropic_provider import AnthropicProvider
from app.providers.gemini_provider import GeminiProvider


def get_default_provider() -> MemoProvider:
    """Return the active provider based on which API key is configured."""
    import os
    if os.getenv("ANTHROPIC_API_KEY"):
        return AnthropicProvider()
    if os.getenv("GEMINI_API_KEY"):
        return GeminiProvider()
    return DeterministicProvider()


__all__ = [
    "MemoProvider",
    "ProviderMode",
    "DeterministicProvider",
    "AnthropicProvider",
    "GeminiProvider",
    "get_default_provider",
]
