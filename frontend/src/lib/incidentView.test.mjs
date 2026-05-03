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
