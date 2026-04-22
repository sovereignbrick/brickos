-- Sprint 049 #049-11 (Design 029 v0.3): lock the 3 demo user passwords
-- so they can't be logged into.
--
-- Context: the eval.sovereignhealth.io surface serves read-only data
-- from these seed users via /demo/* endpoints. They have real password
-- hashes from the bootstrap seed migration, which means anyone who
-- guessed the seed password (or recovered it from an old backup) could
-- log in as a demo user and potentially have a weirder-than-expected
-- experience (or, more concerning, see admin-only UI if a demo user's
-- tier were ever elevated).
--
-- Setting password_hash to an unverifiable sentinel means argon2 can
-- never match -- login attempts fail with the standard "invalid
-- credentials" response. Data remains readable via /demo/* because
-- those handlers don't check auth.
--
-- Safe to re-run: UPDATE is idempotent. Only touches the 3 demo users
-- (identified by email).

UPDATE users
   SET password_hash = '$argon2id$v=19$m=65536,t=3,p=4$LOCKED$LOCKED-Sprint049-049-11'
 WHERE email IN (
     'optimized@sovereignhealth.io',
     'average@sovereignhealth.io',
     'atrisk@sovereignhealth.io'
 );
