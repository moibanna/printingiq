# PrintingIQ online database (Supabase)

Without these settings the website runs as a demo: everything a vendor or customer adds stays on their own phone or
browser. Turning on Supabase makes vendor accounts, inquiries, price requests, offers and ratings shared and real.

## 1. Database

1. Create a project at [supabase.com](https://supabase.com) (region: Frankfurt is closest to Iraq).
2. Dashboard → **SQL Editor** → paste all of `schema.sql` → **Run**. It is safe to run again after updates.
3. Project Settings → **API**: copy the **Project URL** and the **anon public** key into Netlify
   (Site configuration → Environment variables) as `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`,
   then redeploy. Never put the `service_role` key in Netlify or the app.

## 2. Server functions

Install the Supabase command line once, log in and link the project, then deploy:

```bash
npx supabase login
```

```bash
npx supabase link --project-ref <your-project-ref>
```

```bash
npx supabase functions deploy notify-vendor --no-verify-jwt
```

```bash
npx supabase functions deploy ai-assist
```

| Function | What it does | Secrets it needs |
|---|---|---|
| `notify-vendor` | Phone notifications for new inquiries and price requests | none |
| `ai-assist` | Reads product photos and price lists (Claude) for vendors adding products | `ANTHROPIC_API_KEY` |
| `whatsapp-bot` | Vendors add products by sending a photo to PrintingIQ's WhatsApp number | see section 4 |

Set a secret with `npx supabase secrets set NAME=value` (the values never go in the app or in Git).
The AI helper allows each vendor 60 AI readings a day (`AI_DAILY_LIMIT` in `functions/_shared/ai.ts`).

## 3. Daily sync of linked shops

In GitHub → repository Settings → Secrets and variables → Actions, add `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY`. The nightly sync then imports shops vendors linked from their dashboard, after you
approve each one in the `shop_links` table (see `scripts/sync/README.md`).

## 4. WhatsApp bot for vendors

Vendors send a product photo with the price as caption ("25000", "25$", "15 الف") to PrintingIQ's WhatsApp number.
The product appears in their shop with names in Kurdish, Arabic and English, and the bot replies with its link.
"delete" / "حذف" / "بسڕەوە" removes the last one. Vendors are recognised by the phone or WhatsApp number on their shop.

It uses Meta's WhatsApp Business Cloud API, so it needs a phone number that is **not** already used in the normal
WhatsApp or WhatsApp Business app.

1. [developers.facebook.com](https://developers.facebook.com) → create an app of type **Business** → add **WhatsApp**.
2. In WhatsApp → API Setup, add and verify the PrintingIQ number; note its **Phone number ID**.
3. In Meta Business settings, create a **system user**, give it the app with `whatsapp_business_messaging`, and
   generate a permanent token.
4. Set the secrets and deploy:

   ```bash
   npx supabase secrets set WHATSAPP_TOKEN=... WHATSAPP_PHONE_NUMBER_ID=... WHATSAPP_APP_SECRET=... WHATSAPP_VERIFY_TOKEN=<any long random text> SITE_URL=https://<your site>
   ```

   ```bash
   npx supabase functions deploy whatsapp-bot --no-verify-jwt
   ```

5. Meta app → WhatsApp → Configuration → Webhook: callback URL
   `https://<project-ref>.supabase.co/functions/v1/whatsapp-bot`, verify token = your `WHATSAPP_VERIFY_TOKEN`,
   then subscribe to **messages**.
6. Add the number to Netlify as `EXPO_PUBLIC_WHATSAPP_BOT` (e.g. `9647501234567`) so vendors see
   "Send photos on WhatsApp" under Add many products.

Meta charges per conversation after the free monthly allowance; replies within 24 hours of a vendor's message are
"service" conversations, the cheapest kind.
