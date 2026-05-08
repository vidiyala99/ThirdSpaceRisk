"""
Third Space Risk — LLM Provider Abstraction Layer

Providers sit at the agent boundary. Swapping from DeterministicProvider
to AnthropicProvider requires only changing the provider passed to the
UnderwritingPacketAgentRuntime — the packet builder, citation validator,
and audit trail are untouched.
"""

from app.providers.base import MemoProvider, ProviderMode
from app.providers.deterministic import DeterministicProvider
from app.providers.anthropic_provider import AnthropicProvider


def get_default_provider() -> MemoProvider:
    """Return the active provider. Switches to Anthropic if ANTHROPIC_API_KEY is set."""
    import os
    if os.getenv("ANTHROPIC_API_KEY"):
        return AnthropicProvider()
    return DeterministicProvider()


__all__ = ["MemoProvider", "ProviderMode", "DeterministicProvider", "AnthropicProvider", "get_default_provider"]
