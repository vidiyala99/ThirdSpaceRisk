from app.schemas import Citation


class VenueKnowledgeBase:
    def __init__(self, sources: list[dict], stream_events: list[dict]):
        self._documents = [*sources, *stream_events]

    def retrieve(self, venue_id: str, query: str, limit: int = 5) -> list[Citation]:
        query_terms = {term.lower().strip(".,") for term in query.split() if len(term) > 3}
        scored: list[tuple[int, dict]] = []
        for document in self._documents:
            if document["venue_id"] != venue_id:
                continue
            haystack = f"{document.get('text', '')} {document.get('label', '')}".lower()
            score = sum(1 for term in query_terms if term in haystack)
            if score:
                scored.append((score, document))

        ranked = sorted(scored, key=lambda item: item[0], reverse=True)
        if len(ranked) < 3:
            fallback = [
                document
                for document in self._documents
                if document["venue_id"] == venue_id and document not in [item[1] for item in ranked]
            ]
            ranked.extend((0, document) for document in fallback)

        return [
            Citation(
                source_id=document["source_id"],
                source_type=document.get("source_type", "stream"),
                excerpt=document.get("text") or document["label"],
            )
            for _, document in ranked[:limit]
        ]
