export function applicationEligibility(user) {
  if (user.role !== 'student') return { allowed: false, reason: 'Only unjoined regular students can apply as mayor.' };
  if (user.can_apply_as_mayor === false) return { allowed: false, reason: user.mayor_application_disabled_reason || 'You are not currently eligible to apply as mayor.' };
  if (user.block_id || user.enrollment_count || user.enrolled_block_ids?.length) return { allowed: false, reason: 'You already belong to a block with an assigned mayor.' };
  if (user.student_type === 'irregular') return { allowed: false, reason: 'Only regular students can apply as mayor.' };
  return { allowed: true, reason: '' };
}
export const isRegularStudent = (user) => user.role === 'mayor' || user.student_type === 'regular';
export function enrollmentReadiness(joined, profile, ledger) {
  const pending = profile.isPending || joined && ledger.isPending;
  const error = profile.error || joined && ledger.error;
  return { pending: Boolean(pending), error, unavailable: Boolean(pending || error) };
}
export const blockNavigation = (user) => user.block_id || user.role === 'mayor'
  ? { label: 'My Ledger', mobileLabel: 'Ledger', joined: true }
  : { label: 'Join a Block', mobileLabel: 'Join a Block', joined: false };
export const mayWithdrawSubjects = (user) => user.role === 'mayor' || user.role === 'student' && ['regular', 'irregular'].includes(user.student_type);
