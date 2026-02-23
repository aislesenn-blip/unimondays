# Tier Logic Documentation

## Strategy
The system uses a **Script-Based Tier Enforcement** model. Usage is tracked per *script processed*, not per page or file upload.

## Tiers
1.  **Lite**: 100 scripts/month.
2.  **Pro**: 500 scripts/month.
3.  **X (Enterprise)**: Unlimited (or custom high limit).

## Implementation
- **Files**: `src/lib/utils/tier-manager.ts`
- **Database Model**: `User` table has `quota` and `used` columns.

## Workflow
1.  **Check Quota**: Before accepting an upload at `/api/upload`, the system calls `TierManager.checkQuota(userId, 1)`.
2.  **Increment Usage**: Upon successful upload/processing initiation, `TierManager.incrementUsage(userId, 1)` is called.
3.  **Blocking**: If `used >= quota`, the API returns `403 Forbidden` with a "Quota Exceeded" message.

## Edge Cases
- **Bulk Uploads**: If a bulk PDF contains 50 students, the system counts it as 1 upload initially but *should* count as 50 scripts upon splitting.
  - *Current Logic*: Increments by 1 on upload.
  - *Refinement Needed*: Update `TierManager` to increment by `scripts.length` after collation in `/api/process`. (This ensures accurate billing).

## Future Payment Integration
- Stripe/local payment gateway webhooks will reset `used` count or increase `quota` upon subscription renewal.
