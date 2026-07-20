# Phase 5 public portfolio deployment

Phase 5.1–5.3 adds opt-in publication of verified training artifacts. Private training tables remain owner-only; anonymous visitors read only `public_portfolios` and `published_artifacts`.

## Deploy

1. Apply `supabase/migrations/202607190004_phase5_public_portfolio.sql` in the Supabase SQL editor or with a linked CLI.
2. Confirm `public_portfolios` and `published_artifacts` both show Row Level Security enabled.
3. Deploy the Next.js application with the existing `NEXT_PUBLIC_SUPABASE_URL` and publishable key. No service-role key is needed for portfolio reads or owner publication.
4. Open `/portfolio` while authenticated, save a profile, and keep it private for the first check.

## Positive smoke test

1. Prepare one artifact owned by the test user with `verification_status = 'verified'` and an HTTPS `artifact_url`.
2. Prepare one pending or rejected artifact for the same user.
3. At `/portfolio`, publish the verified artifact and verify the blocked artifact has no publication action.
4. Before enabling the whole portfolio, request `/p/{slug}` anonymously and expect HTTP 404.
5. Enable the portfolio and request the same URL anonymously; expect HTTP 200, the chosen artifact, its MLevelUp quality score, and evidence-backed skill counts.
6. Hide the portfolio; expect anonymous HTTP 404 while the Published section still contains the snapshot for the owner.

## Negative security test

- Attempt anonymous insert, update, and delete operations on `published_artifacts`; each must be denied.
- Attempt `publish_portfolio_artifact` while signed out; expect `portfolio_auth_required` or permission denial.
- Attempt to publish another user's artifact; expect `portfolio_artifact_not_found`.
- Attempt to publish an owned pending/rejected artifact; expect `portfolio_artifact_not_verified`.
- Request display of a non-HTTPS artifact URL; expect `portfolio_artifact_url_not_https`.
- Mark a fourth artifact as featured; expect `portfolio_featured_limit`.
- Confirm the RPC input exposes no `user_id`, `quality_score`, `skill_tags`, `artifact_type`, `verification_status`, or replacement URL argument.

## Privacy inspection

Inspect anonymous HTML and network responses for the strings below. None may appear:

```text
email
self_reflection
reviewer_notes
feedback
failure_streak
recovery
access_token
```

Only HTTPS artifact links should render. Unknown, hidden, and removed portfolios must return the same non-disclosing 404 experience.

Record the migration identifier, test artifact ID, anonymous HTTP statuses, RLS denial results, automated test counts, deployment URL, and timestamp. Never record access tokens, magic links, or secret keys.
