-- Founder-owned external carts. Staged only: do not deploy without RLS and browser acceptance.
-- No orders, customer PII, credentials, payment tokens or provider API keys are stored.
CREATE TABLE IF NOT EXISTS public.artist_storefronts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  store_name text NOT NULL DEFAULT 'Artist Shop',
  provider text NOT NULL DEFAULT 'other' CHECK (provider IN ('stripe','shopify','square','paypal','other')),
  cart_url text NOT NULL CHECK (
    length(cart_url) BETWEEN 12 AND 1024 AND
    cart_url ~* '^https://[^/[:space:]@?#]+(/[^[:space:]]*)?$'
  ),
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT artist_storefronts_name_length CHECK (length(trim(store_name)) BETWEEN 2 AND 90)
);
ALTER TABLE public.artist_storefronts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.artist_storefronts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.artist_storefronts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.artist_storefronts TO authenticated;

CREATE POLICY artist_storefront_owner_read ON public.artist_storefronts
 FOR SELECT TO authenticated
 USING (user_id = (SELECT auth.uid()));

CREATE POLICY artist_storefront_published_read ON public.artist_storefronts
 FOR SELECT TO anon, authenticated
 USING (
   is_public = true AND EXISTS (
     SELECT 1 FROM public.artist_pages ap
      WHERE ap.user_id = artist_storefronts.user_id
        AND ap.published = true AND ap.approved_at IS NOT NULL
   )
 );

-- Trusted price-lock records are written by the existing verified payment workflow.
-- No client-write permission is granted to the entitlement/price-lock table here.
CREATE POLICY artist_storefront_founder_insert ON public.artist_storefronts
 FOR INSERT TO authenticated
 WITH CHECK (
   user_id = (SELECT auth.uid()) AND EXISTS (
     SELECT 1 FROM public.connect_account_price_locks lock
      WHERE lock.user_id = (SELECT auth.uid())
   )
 );

CREATE POLICY artist_storefront_founder_update ON public.artist_storefronts
 FOR UPDATE TO authenticated
 USING (
   user_id = (SELECT auth.uid()) AND EXISTS (
     SELECT 1 FROM public.connect_account_price_locks lock
      WHERE lock.user_id = (SELECT auth.uid())
   )
 )
 WITH CHECK (
   user_id = (SELECT auth.uid()) AND EXISTS (
     SELECT 1 FROM public.connect_account_price_locks lock
      WHERE lock.user_id = (SELECT auth.uid())
   )
 );

-- Allow artists to remove their own information even if eligibility ends.
CREATE POLICY artist_storefront_owner_delete ON public.artist_storefronts
 FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));
COMMENT ON TABLE public.artist_storefronts IS
 'Optional one-link merchant-owned external shopping cart for one-time $12 Founder eligible artists. Visible publicly only with explicit storefront opt-in and already-approved, published artist page. No payment processing, customers, or order data stored by Connect.';
