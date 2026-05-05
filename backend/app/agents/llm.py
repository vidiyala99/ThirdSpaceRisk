from abc import ABC, abstractmethod
from typing import TypeVar, Type
from pydantic import BaseModel

T = TypeVar('T', bound=BaseModel)

class LLMProvider(ABC):
    @abstractmethod
    def generate_structured(self, system_prompt: str, user_prompt: str, response_model: Type[T]) -> T:
        ...

class StubProvider(LLMProvider):
    """Simulates LLM JSON responses deterministically without needing API keys."""
    def __init__(self, fallback_responses: dict[str, dict]):
        self.fallback_responses = fallback_responses

    def generate_structured(self, system_prompt: str, user_prompt: str, response_model: Type[T]) -> T:
        model_name = response_model.__name__
        if model_name in self.fallback_responses:
            data = self.fallback_responses[model_name]
            return response_model(**data)
        raise ValueError(f"No stub data defined for model: {model_name}")
