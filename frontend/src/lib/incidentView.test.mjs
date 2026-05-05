import assert from "node:assert/strict";
import { summarizeEvidence } from "./incidentView.mjs";

const summary = summarizeEvidence({
  underwriting_memo: {
    citations: [
      { source_type: "policy", source_id: "policy-1" },
      { source_type: "staffing", source_id: "staffing-1" },
      { source_type: "staffing", source_id: "staffing-2" },
    ],
  },
  claims_timeline: [
    { source: "stream:door-count" },
    { source: "stream:camera-rear-bar-clip" },
  ],
});

assert.equal(summary.citationCount, 3);
assert.deepEqual(summary.sourceTypes, ["policy", "staffing"]);
assert.equal(summary.hasStreamingContext, true);

const { classifyPacketLifecycle, buildEvidenceGroups } = await import("./incidentView.mjs");

assert.equal(classifyPacketLifecycle(null), "draft");
assert.equal(
  classifyPacketLifecycle({
    underwriting_memo: { review_status: "approved" },
    risk_signal: { review_status: "needs_review" },
  }),
  "approved",
);
assert.equal(
  classifyPacketLifecycle({
    underwriting_memo: { review_status: "draft" },
    risk_signal: { review_status: "blocked" },
  }),
  "blocked",
);
assert.equal(
  classifyPacketLifecycle({
    underwriting_memo: { review_status: "draft" },
    risk_signal: { review_status: "needs_review" },
  }),
  "needs_review",
);

const evidenceGroups = buildEvidenceGroups({
  risk_signal: {
    citations: [
      { source_type: "policy", source_id: "policy-1", excerpt: "Coverage requires same-night notes." },
    ],
  },
  underwriting_memo: {
    citations: [
      { source_type: "policy", source_id: "policy-1", excerpt: "Coverage requires same-night notes." },
      { source_type: "stream", source_id: "stream-door", excerpt: "Door count stayed below capacity." },
    ],
  },
});

assert.equal(evidenceGroups.length, 2);
assert.deepEqual(evidenceGroups.map((group) => group.sourceType), ["policy", "stream"]);
assert.equal(evidenceGroups[0].citations.length, 1);
assert.equal(evidenceGroups[0].citations[0].usedBy, "Risk signal, Underwriting memo");
