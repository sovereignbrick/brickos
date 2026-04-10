# Runbook — Onboard a new white-label customer

> Sprint 040 #487. design 022 §11. Step-by-step procedure for a brickos staff
> member to take a new white-label customer (e.g. a clinic that wants SHI under
> their own brand) from "deal closed" to "JWT in their inbox + SLA running".

## Prerequisites

- You are signed in as a `platform` admin on `platform.brickos.io`.
- You have the customer's: organization name, billing email, requested tier and feature set, head count by role, requested custom domain (if any).
- For Stripe sync: the `STRIPE_SECRET_KEY` env var is configured on the SHI api binary, and the customer's pre-created Stripe customer ID (`cus_...`).

## Step 1 — Create the organization

1. `/platform/orgs` → "New organization"
2. Fill in:
   - **Name** — exactly as the customer wants it displayed
   - **Slug** — URL-safe, immutable. Use `acme-clinic` not `Acme Clinic`.
   - **Type** — `clinic` / `enterprise` / `personal` / `demo`
   - **Billing email** — the address that receives invoices
   - **Admin email** — assigns the org_owner role; must be an existing SHI user
3. Save. Note the new org ID from the URL.

## Step 2 — Configure branding

1. Open `/platform/orgs/{id}` → Branding tab
2. Upload logo (PNG or SVG, ≤ 200 KB). Stored as base64 in `branding.logo_base64`.
3. Pick primary + accent colors. Use the customer's brand guide hex codes; the preview pane mirrors how they will appear.
4. Optional: footer text.
5. **Role labels** — if the customer uses different terminology, override here:
   - `org_owner` → "Practice owner" / "Clinic admin" / etc.
   - `practitioner` → "Doctor" / "Coach" / "Therapist"
   - `member` → "Patient" / "Client" / "Athlete"
   The members tab and seat bars on the org-detail page pick these up immediately.
6. Save.
7. Optional: add a custom domain (`clinic.example.com`). Domain enters `ssl_status='pending'`. Operations will provision SSL via the manual cert flow within 24 h and flip it to `active`. The customer cannot use the domain until SSL is active.

## Step 3 — Generate the org license JWT

1. Switch to the License tab
2. "Generate new license" → form opens
3. Tier dropdown — pick the customer's contract tier. Use `custom` if they negotiated a non-standard bundle.
4. Multi-app feature picker — check every feature the customer should have. The picker is grouped by app namespace (`shi.*`, `crm.*`, `link.*`, `branding.*`, `support.*`). Your starting point should be the tier's default features; check additional ones for upsells.
5. Seat caps — `max_owners`, `max_practitioners`, `max_members`. Use `-1` for unlimited members (e.g. a clinic with thousands of patients on a flat rate).
6. Expires — pick the preset (1 / 6 / 12 months) or enter a custom day count. Match the contract length.
7. Notes — free-form. Use this to record the contract reference, any special pricing notes, and the deal owner.
8. Live JWT preview — verify the claims look right.
9. "Generate JWT" → the form posts to `POST /admin/organizations/{id}/license` which signs the JWT, persists it in `brickos.org_licenses`, and revokes any previously-active license inside the same transaction.
10. Result panel appears with the JWT token, copy/download/email buttons.

## Step 4 — Create the Stripe invoice

1. Switch to the Invoices tab
2. "New invoice" → form opens
3. Currency — usually EUR
4. Line items — add rows from the dropdown. The 7 canonical Horizon line items are:
   - SHI Horizon Practice Base (€499)
   - Additional patient seats (block of 10) (€89/block)
   - Additional practitioner seat (€39 each)
   - Custom domain (per month) (€49)
   - M&E (calculated)
   - Onboarding (€1500, one-time)
   - Priority support SLA (per year, €199)
5. Quantity per line according to the contract; per-line unit price is editable for negotiated discounts.
6. Memo — short reference (e.g. "Acme Clinic — Q2 2026 Horizon contract").
7. Due in — usually 30 days for clinics, 14 for SMB.
8. **Stripe customer ID** — paste the `cus_...` ID from the Stripe dashboard.
9. "Save and sync to Stripe" — this:
   - Creates the local `org_invoices` row (status = draft)
   - Creates a Stripe draft via `POST /v1/invoices`
   - Adds every line item via `POST /v1/invoiceitems`
   - Finalizes via `POST /v1/invoices/{id}/finalize`
   - Sends the email via `POST /v1/invoices/{id}/send`
   - Stamps `stripe_invoice_id` and flips status to `sent` locally
10. Verify in the row table that `stripe_invoice_id` is populated.

## Step 5 — Email the JWT to the customer

1. On the License tab result panel, click "Email to customer" — this fans out the `license_renewed` template via the manual send flow (#476). The template carries brickos.io chrome (not SHI chrome) per design 022 §1.3.
2. Alternatively: download the .jwt file and attach it to a signed email manually. The auto path is preferred so the audit log records the send.

## Step 6 — Validate end-to-end

1. Sign in as the customer's admin email.
2. Switch to the new org via the org switcher in the user profile dropdown (#484).
3. Confirm the role labels show the customer's terminology (Doctor / Patient / etc).
4. Confirm a feature you enabled (e.g. `crm.lead_capture`) is reachable in the UI.
5. Confirm a feature you did NOT enable returns a 403 / upgrade prompt.

## Renewal — 30 days before expiry

1. The org will appear in the Orgs list filter "Expires within 30 days" (#477).
2. Open the org detail → License tab.
3. Click "Renew" — this clones the current license with a fresh 365-day window via the same generate endpoint. The previous license is auto-revoked inside the transaction.
4. Repeat steps 4 and 5 to invoice and notify.

## Mid-period revocation

1. Org detail → License tab.
2. Enter a revoke reason (free-form). This becomes the `reason` column in `brickos.org_licenses_revoked` and is visible on the Revocation list page (#483).
3. "Revoke" — confirm the dialog. The license is added to the revocation list and the next 60 s cache reload propagates the revocation to every running app.
4. Restoration is possible (within 30 days, before the row is pruned) via `/platform/licensing/revocations` → "Restore".

## Common troubleshooting

- **"Stripe customer ID required" on sync** — make sure the customer has been pre-created in the Stripe dashboard and the `cus_...` ID is on hand.
- **JWT generation fails with "license signing key not found"** — check that `LICENSE_SIGNING_KEY_PATH` is set on the SHI api binary and points at a readable PEM file. In dev, this defaults to the committed dev key.
- **Customer can't see a feature you enabled** — verify the feature slug is in the issued JWT's `features` array, not just in `brickos.tier_features`. The runtime check reads the JWT.
- **Custom domain returns 502** — `ssl_status` is still `pending`. Operations needs to complete the cert provisioning before the domain works.
- **"Seat limit reached" on add member** — the org has hit the cap on the active license's `max_practitioners` or `max_members` field. Upgrade the license, then retry.

## References

- design 022 §11 (Customer onboarding flow)
- design 022 §3.9 (Stripe Invoices manual flow)
- Issue tracker: #477, #478, #479, #480, #481, #482, #483, #484, #485, #486
- Developer guide: `docs/dev/licensing.md`
