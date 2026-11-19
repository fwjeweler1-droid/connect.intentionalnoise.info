# Founder-owned carts — staged rollout (2026-11-16)

## Owner-approved intent
A one-time $12 Founder's Account may connect a seller-controlled external cart URL to its **existing** approved artist page. This is an **additional optional capability**, not a rewrite of the 2026-11-14 price-lock promise or a free custom merchant website. Provider processing fees, shop hosting, fulfillment, tax compliance and capacity remain the seller's responsibility.

This feature must **not** redirect other members' merchandise sales into Intentional Noise LLC's Stripe account. There are no platform booking fees, no payment splits, no stored seller payment credentials, and no order or customer records in Connect.

## Site placement
- **Connect:** source of truth for login, account eligibility, private cart settings, and opt-in publishing.
- **IntentionalNoise.band:** approved artist public page and directory show "Shop this artist" when authorized.
- **IntentionalNoise.info** / **IneedaGig:** public directory/profile references the same published cart URL; no duplicated account or merchant data.
- **IntentionalNoise.com:** company-run CD/merch offers are separate; Merchandise page points Founders to their own shop configuration.

## Current scope
One HTTPS cart/store URL per eligible artist. Provider selector: Stripe, Shopify, Square, PayPal or another secure shopping-cart host. Each artist manages products and a multi-item cart inside that provider, and can remove or unpublish the link independently.

This is *not yet* a native multi-product checkout, merchant website generator, order fulfillment integration, platform-wide cart, subscription or Stripe Connect seller onboarding flow. Those are future developments and require approval, legal/tax review, provider onboarding and separate security testing.

## Safe rollout sequence — DO NOT MERGE OR DEPLOY UNTIL GATES PASS
1. Review migration `supabase/migrations/20261116153000_founder_artist_storefronts.sql` and confirm its read/insert/update/delete grants, private defaults, owner-scoped policies and public approval gate.
2. Install schema into a non-production test instance or approved test branch. Run migration and database advisors; no free member may self-grant a Founder lock.
3. Account tests: (a) non-Founder cannot create/edit others' carts; (b) authorized Founder can save, reload, unpublish and remove; (c) cross-owner access denied; (d) anon SELECT sees only `is_public=true` AND an independently approved, published artist page; (e) unpublish artist page hides shop immediately; (f) private drafts do not appear in any public directory.
4. Link safety: reject non-HTTPS or credential-containing URLs; never embed arbitrary scripts or merchant API keys; external links must use `rel=noopener noreferrer`.
5. Cross-site acceptance: iPhone and Windows, signed-in/out, all published directories, individual artist page, disabled/nonexistent cart, and fallback if backend table unavailable.
6. Review payment-owner boundaries: original free account works unchanged; one-time Founder payment does not become recurring; external cart fees are shown as provider costs; company CD $7 S&H checkout is a distinct company merchant flow.
7. Owner approval to merge/deploy only after tests. No automatic activation from passage of time.

## Rollback
Merge revert of HTML/CSS/JS changes removes all Store links. Do not delete merchant-provider stores, orders or seller accounts. Keep any owner-created `artist_storefronts` rows private and intact for later reconciliation; revoking public SELECT or disabling the feature is preferable to deletion.
