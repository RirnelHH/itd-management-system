# 2026-04-10 Auth/API/Bundle/Delete Improvement Batch

## Scope

- Unified frontend HTTP usage behind shared `src/api/*` modules and a shared auth session helper.
- Normalized current-user handling across frontend session storage and backend JWT controller access.
- Added admin delete-account UI wiring with backend safety checks for self-delete and last-admin delete.
- Reduced frontend bundle risk by moving Element Plus to resolver-based auto import and adding manual chunk splitting.
- Added lightweight regression coverage for session normalization and storage behavior.

## Safety Notes

- Existing backend delete endpoint remained admin-only and now rejects deleting the currently logged-in admin.
- The backend also rejects deleting the final remaining admin account.
- Frontend auth failures continue to clear stale local session state without changing login flow semantics.

## Validation

- Frontend: shared session helper tests plus production build.
- Backend: production TypeScript build.

## Remaining Debt

- No end-to-end browser/API integration harness exists yet for login, profile update, and contacts visibility flows.
- Backend service methods still rely on inline DTO-like shapes in several controllers/services and could be formalized later.
