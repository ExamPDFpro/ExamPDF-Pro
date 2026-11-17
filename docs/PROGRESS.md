# ExamPDF Pro — Progress & Resume (updated 2026-11-17)
Rule: never change what exists; only add. Reports in simple Bengali.

| # | Feature | Status | Phase / Notes |
|---|---------|--------|---------------|
| 1 | Review slider | Completed | Phase D (live) |
| 2 | Push notification + website notice | Testing | Phase F live. Secrets set. Needs real-device push test |
| 3 | Call Us + callback | Completed | Phase C (live) |
| 4 | PDF security (60 s signed URL) | Testing | Phase E live. Needs a paid PDF upload + purchase to test 60 s link |
| 5 | Cart 7-day retention | Completed | Phase D (live) |
| 6 | Affiliate fixes + screenshot compression | Completed | Phase A (live) |
| 7 | Affiliate login + dashboard | Completed | Phase B + login fix (live, user-verified) |
| – | Payment-gateway-ready schema | Completed (no gateway enabled) | Phase G, migration 015 |

## Resume
- Migrations 009–015 are applied on Supabase fcintcfmtlnuqvlsrism. Edge functions: submit-payment, download-pdf (v3), send-push (v1).
- Gateway later: add a webhook Edge Function that verifies the provider signature, then calls `gateway_confirm_payment(provider, event_id, order_id, txn, amount, signature_ok)` (service role only).
- Rollback SQL is at the bottom of each migration file.
