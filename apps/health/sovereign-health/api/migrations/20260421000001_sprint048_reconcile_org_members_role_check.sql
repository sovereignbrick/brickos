-- Sprint 048 #048-01: reconcile `org_members.role` CHECK constraints.
--
-- Sprint 040 (2026-04-08) added:
--   CHECK (role IN ('owner','tech_admin','commercial_admin','editor','consumer'))
-- Sprint 041 (2026-04-11) bootstrap added a SECOND constraint:
--   CHECK (role IN ('org_owner','practitioner','member'))
-- without dropping the first. Both were named `org_members_role_check`,
-- but postgres allows multiple CHECKs on the same column with different
-- auto-assigned names. Net result: no role value satisfies BOTH, so
-- INSERTs fail.
--
-- Where org_members lives depends on deployment era:
--   - Sprint 040 and fresh localhost DBs -> public.org_members
--   - Sprint 041+ staging / production (ADR-035 data-plane elevation)
--     -> brickos.org_members, with public.org_members either absent or
--        already manually reconciled.
--
-- This migration is idempotent across both worlds: it looks up
-- org_members via `to_regclass`, runs on whichever schema has the
-- table, and no-ops if neither exists. The unified CHECK accepts both
-- the legacy 5-role enum and the new 3-role enum so existing rows
-- with legacy role values continue to validate.

DO $$
DECLARE
    target_relid oid;
    target_schema text;
    target_qname  text;
    constraint_rec RECORD;
BEGIN
    -- Prefer brickos.org_members (post-ADR-035); fall back to public.
    target_relid := COALESCE(
        to_regclass('brickos.org_members'),
        to_regclass('public.org_members')
    );

    IF target_relid IS NULL THEN
        RAISE NOTICE 'org_members table not found in brickos or public; skipping';
        RETURN;
    END IF;

    SELECT nspname, format('%I.%I', nspname, relname)
      INTO target_schema, target_qname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE c.oid = target_relid;

    -- Drop every CHECK constraint on the role column, regardless of name.
    FOR constraint_rec IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = target_relid
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%role%'
    LOOP
        EXECUTE format(
            'ALTER TABLE %s DROP CONSTRAINT %I',
            target_qname,
            constraint_rec.conname
        );
        RAISE NOTICE 'dropped role check on %: %', target_qname, constraint_rec.conname;
    END LOOP;

    -- Re-add a single unified constraint.
    EXECUTE format(
        'ALTER TABLE %s
             ADD CONSTRAINT org_members_role_check
             CHECK (role IN (
                 ''org_owner'', ''practitioner'', ''member'',
                 ''owner'', ''tech_admin'', ''commercial_admin'', ''editor'', ''consumer''
             ))',
        target_qname
    );
    RAISE NOTICE 'added unified role check on %', target_qname;
END$$;
