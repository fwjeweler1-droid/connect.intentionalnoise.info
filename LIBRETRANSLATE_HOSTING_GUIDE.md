# Optional LibreTranslate hosting for Connect

This is an infrastructure guide only. No server or billing was created by this PR.

1. Choose a host you control with Docker support, persistent space for downloaded Argos language models, and HTTPS. Host it behind TLS with request rate-limits and monitoring. A server running only on your personal computer is not a reliable Internet-facing service.
2. Use the official LibreTranslate Docker distribution and its documented arguments. Limit installed language models for RAM/startup needs. Start with English and 1–2 test languages.
3. Set strong access restrictions for the translation service. The Supabase Edge Function can supply `LIBRETRANSLATE_API_KEY` to servers that require an API key. Rate-limit upstream calls and avoid public unauthenticated access.
4. Verify `GET https://YOUR-TRANSLATOR/languages` and `POST https://YOUR-TRANSLATOR/translate` using the documented request body `{"q":"Bonjour","source":"auto","target":"en","format":"text"}`. Do not test with private member text.
5. Add Supabase function secret `LIBRETRANSLATE_URL=https://YOUR-TRANSLATOR/`, plus `LIBRETRANSLATE_API_KEY` if required. Do not put credentials in GitHub or browser code.
6. Use the signed-in Connect inbox to run the two-account acceptance test before approving PR merge or feature rollout.

Official docs: https://docs.libretranslate.com/guides/installation/ and https://docs.libretranslate.com/guides/api_usage/

Costs: LibreTranslate software is free/open source, but Internet hosting and resource usage may cost money. The managed `libretranslate.com` production API requires a purchased key; it is **not** the target setup for this project.
