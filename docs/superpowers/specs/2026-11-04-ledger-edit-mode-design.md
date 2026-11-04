# Ledger Edit mode

## Agreed behavior

- Put Edit beside Refresh in the Enrolled subjects header.
- Keep withdrawal controls hidden in the normal ledger view.
- Edit reveals Withdraw on each eligible subject card and becomes Done.
- Withdraw opens the existing styled confirmation dialog naming the subject and block.
- Cancel leaves enrollment untouched. A failed request stays in the dialog with an error and retry available.
- Successful withdrawal removes the enrollment through the existing API and keeps Edit mode active for more changes.
- Refresh also keeps Edit mode active. Done hides withdrawal controls; reopening the page starts in normal view.
- Apply the existing withdrawal permissions for regular/irregular students and mayors. Preserve block membership and mayor role.

## Implementation choice

Use local React state in JoinBlock and reuse ConfirmDialog. Keep backend withdrawal rules and account-scoped cache invalidation as implemented. Wrap the header controls on narrow screens.

## Acceptance

Default view has no Withdraw buttons; Edit reveals them; cancel sends no request; confirm sends the existing DELETE; errors are visible in the dialog; success and Refresh leave Edit active; Done exits, including after the final subject is withdrawn.
