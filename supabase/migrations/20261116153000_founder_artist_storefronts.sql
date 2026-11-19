-- Founder-owned external carts. Staged only: do not deploy without RLS and browser acceptance.
-- No orders, customer PII, credentials, payment tokens or provider API keys are stored.
CREATE TABLE IF NOT EXISTS public.artist_storefronts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  store_name text NOT NULL DEFAULT 'Artist Shop',
  provider text NOT NULL DEFAULT 'other' CHECK (provider IN ('stripe','shopify','square','paypal','other')),
  cart_url text NOT NULL CHECK (
    length(cart_url) BETWEEN 12 AND 1024 AND
    cart_url ~ '^https://([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?[.])+[a-z]{2,63}/[!-~]*$'
    AND cart_url !~ '[#?]'
    AND strpos(cart_url, chr(92)) = 0
    AND split_part(cart_url, '/', 3) !~ '[.](localhost|local|internal|test|invalid|example|onion)$'
  ),
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT artist_storefronts_name_length CHECK (length(trim(store_name)) BETWEEN 2 AND 90)
);
ALTER TABLE public.artist_storefronts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.artist_storefronts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.artist_storefronts TO authenticated;

CREATE POLICY artist_storefront_owner_read ON public.artist_storefronts
 FOR SELECT TO authenticated
 USING (user_id = (SELECT auth.uid()));

-- Public readers receive only the fields needed to render a shop link.
-- This function deliberately reads across owners and must keep every visibility check.
CREATE FUNCTION public.list_published_artist_shops(p_artist_ids uuid[])
RETURNS TABLE (user_id uuid, cart_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT shop.user_id, shop.cart_url
  FROM public.artist_storefronts AS shop
  WHERE cardinality(p_artist_ids) BETWEEN 1 AND 100
    AND shop.user_id = ANY(p_artist_ids)
    AND shop.is_public
    AND EXISTS (
      SELECT 1 FROM public.artist_pages AS artist
      WHERE artist.user_id = shop.user_id
        AND artist.published AND artist.approved_at IS NOT NULL
    )
    AND EXISTS (
      SELECT 1 FROM public.connect_account_price_locks AS entitlement
      WHERE entitlement.user_id = shop.user_id
    );
$$;
REVOKE ALL ON FUNCTION public.list_published_artist_shops(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_published_artist_shops(uuid[]) TO anon, authenticated;

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
