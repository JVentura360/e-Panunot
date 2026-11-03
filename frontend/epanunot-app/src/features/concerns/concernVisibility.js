export function canViewConcern(concern, user, memberIds) {
  if (concern.studentId === user.id && user.role !== 'mayor') return Boolean(user.block_id) && !concern.closedDueToRemoval;
  if (user.role !== 'mayor' || !user.block_id) return false;
  return concern.blockId ? concern.blockId === user.block_id : memberIds.has(concern.studentId);
}

export const canReplyToConcern = (concern) => !concern.closedDueToRemoval && !['resolved', 'closed'].includes(concern.status);

export function concernActions(concern, viewerRole) {
  if (concern.closedDueToRemoval || concern.status === 'closed') return [];
  if (viewerRole === 'mayor') return concern.status === 'open' ? ['in_progress'] : [];
  return concern.status === 'resolved' ? ['reopen'] : ['resolve'];
}
