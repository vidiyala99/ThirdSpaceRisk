import re
from typing import List, Dict


def chunk_policy_text(text: str) -> List[Dict]:
    chunks = []
    sections = re.split(r'\n## ', text)

    for section in sections:
        section_match = re.search(r'^([^\n]+)', section)
        if not section_match:
            continue
        section_title = section_match.group(1).strip()

        clauses = re.split(r'\n### ', section)

        for clause in clauses[1:]:
            clause_match = re.search(r'^([^\n]+)', clause)
            if not clause_match:
                continue
            clause_title = clause_match.group(1).strip()
            content = clause.strip()

            is_exclusion = "EXCLUSION" in section_title.upper() or "EXCLUSION" in clause_title.upper()

            chunks.append({
                "content": f"{section_title} > {content}",
                "metadata": {
                    "section": section_title,
                    "clause_id": clause_title.split(' ')[0],
                    "is_exclusion": is_exclusion,
                    "source_file": "nightlife_liability_2026.md"
                }
            })
    return chunks
