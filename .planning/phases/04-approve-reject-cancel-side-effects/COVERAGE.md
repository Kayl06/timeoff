# API Coverage — Resend

> Full coverage by default. Opt-outs are explicit, reasoned decisions.
> Surface: official Resend Node SDK (`resend` package). Phase 4 uses `emails.send` only, from session-gated leave BFF routes. Do not add an unauthenticated `/api/send` route.

| capability | decision | reason |
|---|---|---|
| emails.send | INTEGRATE | NOTIF-03/04 approve/reject employee mail after durable writes (D-13, D-14, D-15) |
| emails.get | OPT-OUT | not needed — this phase does not inspect delivery receipts |
| emails.list | OPT-OUT | not needed — no inbox or send-history UI |
| emails.update | OPT-OUT | not needed — no scheduled or editable mail this phase |
| emails.cancel | OPT-OUT | not needed — no scheduled send to cancel |
| emails.receiving | OPT-OUT | explicitly out of scope — inbound mail is not a product surface |
| batch.send | OPT-OUT | not needed — single employee recipient per approve/reject |
| domains.create | OPT-OUT | not needed — domain verify is a Resend dashboard task, not app code |
| domains.list | OPT-OUT | not needed — no domain admin UI |
| domains.get | OPT-OUT | not needed — no domain admin UI |
| domains.update | OPT-OUT | not needed — no domain admin UI |
| domains.remove | OPT-OUT | not needed — no domain admin UI |
| domains.verify | OPT-OUT | not needed — verification stays in the Resend dashboard |
| apiKeys.create | OPT-OUT | explicitly out of scope — never mint keys from the app |
| apiKeys.list | OPT-OUT | explicitly out of scope — never list keys from the app |
| apiKeys.remove | OPT-OUT | explicitly out of scope — never revoke keys from the app |
| audiences.create | OPT-OUT | not needed — no marketing lists |
| audiences.list | OPT-OUT | not needed — no marketing lists |
| audiences.get | OPT-OUT | not needed — no marketing lists |
| audiences.remove | OPT-OUT | not needed — no marketing lists |
| contacts.create | OPT-OUT | not needed — recipient is users.email for the request owner |
| contacts.list | OPT-OUT | not needed — no contact directory |
| contacts.get | OPT-OUT | not needed — no contact directory |
| contacts.update | OPT-OUT | not needed — no contact directory |
| contacts.remove | OPT-OUT | not needed — no contact directory |
| broadcasts.create | OPT-OUT | not needed yet — Phase 6 reset is one transactional send, not a broadcast |
| broadcasts.send | OPT-OUT | not needed yet — same as broadcasts.create |
| broadcasts.list | OPT-OUT | not needed — no campaign UI |
| broadcasts.get | OPT-OUT | not needed — no campaign UI |
| broadcasts.update | OPT-OUT | not needed — no campaign UI |
| broadcasts.remove | OPT-OUT | not needed — no campaign UI |
| templates.create | OPT-OUT | not needed — html/text strings only; do not add react-email |
| templates.list | OPT-OUT | not needed — no template admin |
| templates.get | OPT-OUT | not needed — no template admin |
| templates.update | OPT-OUT | not needed — no template admin |
| templates.remove | OPT-OUT | not needed — no template admin |
| templates.publish | OPT-OUT | not needed — no template admin |
| templates.duplicate | OPT-OUT | not needed — no template admin |
| topics.create | OPT-OUT | not needed — no subscription topics |
| topics.list | OPT-OUT | not needed — no subscription topics |
| topics.get | OPT-OUT | not needed — no subscription topics |
| topics.update | OPT-OUT | not needed — no subscription topics |
| topics.remove | OPT-OUT | not needed — no subscription topics |
| segments.create | OPT-OUT | not needed — no audience segments |
| segments.list | OPT-OUT | not needed — no audience segments |
| webhooks.create | OPT-OUT | not needed yet — delivery webhooks are not required for local 200-on-skip |
| webhooks.list | OPT-OUT | not needed — no webhook admin |
| webhooks.get | OPT-OUT | not needed — no webhook admin |
| webhooks.update | OPT-OUT | not needed — no webhook admin |
| webhooks.remove | OPT-OUT | not needed — no webhook admin |

```coverage
[
  {"capability":"emails.send","decision":"INTEGRATE","reason":""},
  {"capability":"emails.get","decision":"OPT-OUT","reason":"not needed — this phase does not inspect delivery receipts"},
  {"capability":"emails.list","decision":"OPT-OUT","reason":"not needed — no inbox or send-history UI"},
  {"capability":"emails.update","decision":"OPT-OUT","reason":"not needed — no scheduled or editable mail this phase"},
  {"capability":"emails.cancel","decision":"OPT-OUT","reason":"not needed — no scheduled send to cancel"},
  {"capability":"emails.receiving","decision":"OPT-OUT","reason":"explicitly out of scope — inbound mail is not a product surface"},
  {"capability":"batch.send","decision":"OPT-OUT","reason":"not needed — single employee recipient per approve/reject"},
  {"capability":"domains.create","decision":"OPT-OUT","reason":"not needed — domain verify is a Resend dashboard task, not app code"},
  {"capability":"domains.list","decision":"OPT-OUT","reason":"not needed — no domain admin UI"},
  {"capability":"domains.get","decision":"OPT-OUT","reason":"not needed — no domain admin UI"},
  {"capability":"domains.update","decision":"OPT-OUT","reason":"not needed — no domain admin UI"},
  {"capability":"domains.remove","decision":"OPT-OUT","reason":"not needed — no domain admin UI"},
  {"capability":"domains.verify","decision":"OPT-OUT","reason":"not needed — verification stays in the Resend dashboard"},
  {"capability":"apiKeys.create","decision":"OPT-OUT","reason":"explicitly out of scope — never mint keys from the app"},
  {"capability":"apiKeys.list","decision":"OPT-OUT","reason":"explicitly out of scope — never list keys from the app"},
  {"capability":"apiKeys.remove","decision":"OPT-OUT","reason":"explicitly out of scope — never revoke keys from the app"},
  {"capability":"audiences.create","decision":"OPT-OUT","reason":"not needed — no marketing lists"},
  {"capability":"audiences.list","decision":"OPT-OUT","reason":"not needed — no marketing lists"},
  {"capability":"audiences.get","decision":"OPT-OUT","reason":"not needed — no marketing lists"},
  {"capability":"audiences.remove","decision":"OPT-OUT","reason":"not needed — no marketing lists"},
  {"capability":"contacts.create","decision":"OPT-OUT","reason":"not needed — recipient is users.email for the request owner"},
  {"capability":"contacts.list","decision":"OPT-OUT","reason":"not needed — no contact directory"},
  {"capability":"contacts.get","decision":"OPT-OUT","reason":"not needed — no contact directory"},
  {"capability":"contacts.update","decision":"OPT-OUT","reason":"not needed — no contact directory"},
  {"capability":"contacts.remove","decision":"OPT-OUT","reason":"not needed — no contact directory"},
  {"capability":"broadcasts.create","decision":"OPT-OUT","reason":"not needed yet — Phase 6 reset is one transactional send, not a broadcast"},
  {"capability":"broadcasts.send","decision":"OPT-OUT","reason":"not needed yet — same as broadcasts.create"},
  {"capability":"broadcasts.list","decision":"OPT-OUT","reason":"not needed — no campaign UI"},
  {"capability":"broadcasts.get","decision":"OPT-OUT","reason":"not needed — no campaign UI"},
  {"capability":"broadcasts.update","decision":"OPT-OUT","reason":"not needed — no campaign UI"},
  {"capability":"broadcasts.remove","decision":"OPT-OUT","reason":"not needed — no campaign UI"},
  {"capability":"templates.create","decision":"OPT-OUT","reason":"not needed — html/text strings only; do not add react-email"},
  {"capability":"templates.list","decision":"OPT-OUT","reason":"not needed — no template admin"},
  {"capability":"templates.get","decision":"OPT-OUT","reason":"not needed — no template admin"},
  {"capability":"templates.update","decision":"OPT-OUT","reason":"not needed — no template admin"},
  {"capability":"templates.remove","decision":"OPT-OUT","reason":"not needed — no template admin"},
  {"capability":"templates.publish","decision":"OPT-OUT","reason":"not needed — no template admin"},
  {"capability":"templates.duplicate","decision":"OPT-OUT","reason":"not needed — no template admin"},
  {"capability":"topics.create","decision":"OPT-OUT","reason":"not needed — no subscription topics"},
  {"capability":"topics.list","decision":"OPT-OUT","reason":"not needed — no subscription topics"},
  {"capability":"topics.get","decision":"OPT-OUT","reason":"not needed — no subscription topics"},
  {"capability":"topics.update","decision":"OPT-OUT","reason":"not needed — no subscription topics"},
  {"capability":"topics.remove","decision":"OPT-OUT","reason":"not needed — no subscription topics"},
  {"capability":"segments.create","decision":"OPT-OUT","reason":"not needed — no audience segments"},
  {"capability":"segments.list","decision":"OPT-OUT","reason":"not needed — no audience segments"},
  {"capability":"webhooks.create","decision":"OPT-OUT","reason":"not needed yet — delivery webhooks are not required for local 200-on-skip"},
  {"capability":"webhooks.list","decision":"OPT-OUT","reason":"not needed — no webhook admin"},
  {"capability":"webhooks.get","decision":"OPT-OUT","reason":"not needed — no webhook admin"},
  {"capability":"webhooks.update","decision":"OPT-OUT","reason":"not needed — no webhook admin"},
  {"capability":"webhooks.remove","decision":"OPT-OUT","reason":"not needed — no webhook admin"}
]
```
