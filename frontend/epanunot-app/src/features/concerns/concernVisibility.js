export function canViewConcern(concern, user, memberIds) {
  if (concern.studentId === user.id) return true;
  if (user.role !== 'mayor' || !user.block_id) return false;
  return concern.blockId ? concern.blockId === user.block_id : memberIds.has(concern.studentId);
}
