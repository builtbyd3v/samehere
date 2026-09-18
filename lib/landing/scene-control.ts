/** Keep an already-shown Samehere reaction when the viewer picks a person. */
export function reactionAfterSelect(
  controlled: boolean,
  reacted: boolean,
  autoOn: boolean,
): boolean {
  return controlled ? reacted : autoOn || reacted;
}
