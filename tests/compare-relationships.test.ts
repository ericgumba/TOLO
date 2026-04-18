import { describe, expect, it } from "vitest";

import { buildConceptRelationshipPairKey, orderConceptRelationshipPair } from "@/lib/compare/relationships";

describe("compare relationship helpers", () => {
  it("orders concept ids deterministically", () => {
    expect(orderConceptRelationshipPair("concept-b", "concept-a")).toEqual(["concept-a", "concept-b"]);
  });

  it("builds the same pair key regardless of input order", () => {
    expect(buildConceptRelationshipPairKey("concept-a", "concept-b")).toBe("concept-a:concept-b");
    expect(buildConceptRelationshipPairKey("concept-b", "concept-a")).toBe("concept-a:concept-b");
  });
});
