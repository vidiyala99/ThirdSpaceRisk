from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum


class ProviderMode(str, Enum):
    DETERMINISTIC = "deterministic"
    LLM = "llm"


@dataclass(frozen=True)
class MemoOutput:
    summary: str
    open_questions: list[str]
    provider: str
    mode: ProviderMode
    model: str | None = None


class MemoProvider(ABC):
    """
    Abstract interface for underwriting memo drafting.

    Implementations must be bounded and auditable:
    - They receive only structured, validated findings — not raw user input.
    - Their output is stored as draft text, not as a compliance decision.
    - The rubric engine and citation validator run before and independently of this layer.
    """

    @property
    @abstractmethod
    def provider_name(self) -> str: ...

    @property
    @abstractmethod
    def mode(self) -> ProviderMode: ...

    @abstractmethod
    def draft_memo(
        self,
        *,
        incident_summary: str,
        incident_location: str,
        risk_type: str,
        severity: str,
        confidence: float,
        citation_excerpts: list[str],
        open_questions: list[str] | None = None,
    ) -> MemoOutput: ...
