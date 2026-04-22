-- Sprint 049 #049-17 (Design 029 v0.3 §15 Q4): capture signup origin.
--
-- When a visitor signs up via the eval.sovereignhealth.io conversion
-- banner, the frontend appends `?from=demo-{profile}` to the cross-
-- plane signup URL. The backend signup handler stores this value in
-- `users.signup_source` for founder analytics of demo-to-signup
-- conversion per profile.
--
-- Per product privacy policy: no session tracking, no page-view
-- events, no IP/UA logging for demo visitors. Just this one nullable
-- attribute on the user row at the moment of registration.
--
-- Idempotent.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS signup_source text;

COMMENT ON COLUMN users.signup_source IS
    'Origin of registration. Nullable. Values: demo-optimized | demo-average | demo-at_risk | NULL. Captured from ?from=... query on /signup for eval.sovereignhealth.io funnel attribution. No session/behavioral tracking.';
