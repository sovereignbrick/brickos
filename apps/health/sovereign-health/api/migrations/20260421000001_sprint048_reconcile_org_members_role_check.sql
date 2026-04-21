-- Sprint 048 #048-01: reconcile `public.org_members.role` CHECK
-- constraints.
--
-- Sprint 040 (2026-04-08) added:
--   CHECK (role IN ('owner','tech_admin','commercial_admin','editor','consumer'))
-- Sprint 041 (2026-04-11) bootstrap added a SECOND constraint:
--   CHECK (role IN ('org_owner','practitioner','member'))
-- without dropping the first. Both have the same name
-- `org_members_role_check` but postgres allows multiple check
-- constraints on the same column with different ANON names. The
-- result: no role value satisfies BOTH checks, so INSERTs fail.
--
-- Staging DB had been manually reconciled into a single union
-- constraint (probably during Sprint 041 manual deploy). Fresh
-- localhost databases still carry both conflicting constraints.
--
-- This migration drops every check constraint on the `role` column
-- and re-adds a single unified one that accepts both the legacy
-- 5-role enum (Sprint 040) and the new 3-role enum (Sprint 041/+).
-- The unified check matches staging production DB exactly.

DO $$
DECLARE
    constraint_rec RECORD;
BEGIN
    -- Drop every CHECK constraint on org_members.role, regardless of name.
    FOR constraint_rec IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.org_members'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%role%'
    LOOP
        EXECUTE format('ALTER TABLE public.org_members DROP CONSTRAINT %I', constraint_rec.conname);
        RAISE NOTICE 'dropped org_members role check: %', constraint_rec.conname;
    END LOOP;

    -- Re-add a single unified constraint.
    ALTER TABLE public.org_members
        ADD CONSTRAINT org_members_role_check
        CHECK (role IN (
            -- new 3-role enum (Sprint 040 #463 / Sprint 041)
            'org_owner', 'practitioner', 'member',
            -- legacy 5-role enum (pre-Sprint 040, still present for
            -- existing rows until a separate data migration rewrites them)
            'owner', 'tech_admin', 'commercial_admin', 'editor', 'consumer'
        ));
    RAISE NOTICE 'added unified org_members_role_check';
END$$;
