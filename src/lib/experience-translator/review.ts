import type { Bullet, ReviewedBullet } from "./types";

/** Source IDs are positional, not evidence identities. Never relink stale edits. */
export function invalidateReview(previous: ReviewedBullet[]): ReviewedBullet[] {
  const used = new Set(previous.filter((b) => b.detached).map((b) => b.id));
  return previous.map((b) => {
    let id = b.detached ? b.id : `detached-${b.id}`;
    if (!b.detached) { while (used.has(id)) id += "-kept"; used.add(id); }
    return { ...b, id, factIds: [], requirementIds: [], detached: true, accepted: false };
  });
}

export function mergeCandidates(generated: Bullet[], previous: ReviewedBullet[]): ReviewedBullet[] {
  const fresh = generated.map((bullet) => {
    const old = previous.find((b) => !b.detached && b.id === bullet.id && b.text === bullet.text);
    return { ...bullet, currentText: old?.edited ? old.currentText : bullet.text, edited: Boolean(old?.edited), accepted: false, rejected: false };
  });
  const detached = invalidateReview(previous.filter((b) => b.detached || (b.edited && !generated.some((candidate) => candidate.id === b.id && candidate.text === b.text))));
  return [...fresh, ...detached];
}
export function editBullet(bullet: ReviewedBullet, currentText: string): ReviewedBullet {
  return { ...bullet, currentText, edited: currentText !== bullet.text, accepted: false, rejected: false };
}
export function acceptedText(bullets: ReviewedBullet[]) {
  return bullets.filter((b) => b.accepted && !b.rejected && b.currentText.trim().length >= 5 && b.currentText.length <= 500).map((b) => `• ${b.currentText.trim()}`).join("\n");
}
