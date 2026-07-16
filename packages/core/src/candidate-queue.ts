import type { ImageCandidate } from "../../site-adapters/src/types";

export function prioritizeImageCandidates(candidates: Iterable<ImageCandidate>): ImageCandidate[] {
  return [...candidates]
    .map((candidate, index) => ({ candidate, index }))
    .sort((left, right) => {
      const priorityDifference = priorityValue(left.candidate.priority) - priorityValue(right.candidate.priority);
      return priorityDifference || left.index - right.index;
    })
    .map(({ candidate }) => candidate);
}

function priorityValue(priority: ImageCandidate["priority"]): number {
  return priority === "visible" ? 0 : priority === "nearby" ? 1 : 2;
}
