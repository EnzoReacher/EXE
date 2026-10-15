import type { Bullet, ReviewedBullet } from "./types";

export function mergeCandidates(generated: Bullet[], previous: ReviewedBullet[]): ReviewedBullet[] {
  const fresh = generated.map((bullet) => {
    const old = previous.find((b) => b.id === bullet.id);
    return { ...bullet, currentText: old?.edited ? old.currentText : bullet.text, edited: Boolean(old?.edited), accepted: false, rejected: false };
  });
  const detached = previous.filter((b) => b.edited && !generated.some((candidate) => candidate.id === b.id)).map((b) => ({ ...b, factIds: [], requirementIds: [], detached: true, accepted: false }));
  return [...fresh, ...detached];
}
export function editBullet(bullet: ReviewedBullet, currentText: string): ReviewedBullet {
  return { ...bullet, currentText, edited: currentText !== bullet.text, accepted: false, rejected: false };
}
export function acceptedText(bullets: ReviewedBullet[]) {
  return bullets.filter((b) => b.accepted && !b.rejected && b.currentText.trim().length >= 5 && b.currentText.length <= 500).map((b) => `• ${b.currentText.trim()}`).join("\n");
}
