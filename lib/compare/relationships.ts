export function orderConceptRelationshipPair(firstConceptId: string, secondConceptId: string): [string, string] {
  if (firstConceptId === secondConceptId) {
    throw new Error("Concept relationship pairs require two distinct concept ids.");
  }

  return firstConceptId < secondConceptId ? [firstConceptId, secondConceptId] : [secondConceptId, firstConceptId];
}

export function buildConceptRelationshipPairKey(firstConceptId: string, secondConceptId: string): string {
  const [conceptAId, conceptBId] = orderConceptRelationshipPair(firstConceptId, secondConceptId);
  return `${conceptAId}:${conceptBId}`;
}
