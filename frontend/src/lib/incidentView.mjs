export function summarizeEvidence(packet) {
  const citations = packet?.underwriting_memo?.citations ?? [];
  const timeline = packet?.claims_timeline ?? [];
  const sourceTypes = [...new Set(citations.map((citation) => citation.source_type))].sort();

  return {
    citationCount: citations.length,
    sourceTypes,
    hasStreamingContext: timeline.some((event) => event.source?.startsWith("stream:")),
  };
}

export function classifyPacketLifecycle(packet, options = {}) {
  if (options.isProcessing) return "processing";
  if (!packet) return "draft";

  const statuses = [
    packet?.underwriting_memo?.review_status,
    packet?.risk_signal?.review_status,
    packet?.review_status,
  ]
    .filter(Boolean)
    .map((status) => String(status).toLowerCase());

  if (statuses.some((status) => status.includes("blocked") || status.includes("rejected"))) return "blocked";
  if (statuses.some((status) => status.includes("approved"))) return "approved";
  if (statuses.some((status) => status.includes("review"))) return "needs_review";
  return "draft";
}

export function buildEvidenceGroups(packet) {
  const usageByCitation = new Map();

  for (const [label, citations] of [
    ["Risk signal", packet?.risk_signal?.citations ?? []],
    ["Underwriting memo", packet?.underwriting_memo?.citations ?? []],
  ]) {
    for (const citation of citations) {
      const key = citationKey(citation);
      const existing = usageByCitation.get(key) ?? { ...citation, usedBy: [] };
      if (!existing.usedBy.includes(label)) existing.usedBy.push(label);
      usageByCitation.set(key, existing);
    }
  }

  const citations = [...usageByCitation.values()].map((citation) => ({
    ...citation,
    usedBy: citation.usedBy.join(", "),
  }));

  const groups = new Map();
  for (const citation of citations) {
    const sourceType = citation.source_type || "unknown";
    const group = groups.get(sourceType) ?? { sourceType, citations: [] };
    group.citations.push(citation);
    groups.set(sourceType, group);
  }

  return [...groups.values()].sort((a, b) => a.sourceType.localeCompare(b.sourceType));
}

function citationKey(citation) {
  return `${citation?.source_type ?? "unknown"}:${citation?.source_id ?? "unknown"}:${citation?.excerpt ?? ""}`;
}
