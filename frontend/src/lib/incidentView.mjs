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
