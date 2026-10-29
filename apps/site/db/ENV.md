# Waitlist (Relight, part of DIYA Pro) and screen requests: environment

Set these on the Vercel `diya` project (Production, and Preview if you want previews to take real signups).
The list opens at `LAUNCH_AT` (`lib/launch.ts`). Before then the form, the API and the `/waitlist/*` pages are closed, whatever is set, unless `DIYA_CATALOG_PREVIEW=1`; locally, `DIYA_NOW` can pin the clock past launch to try it.
After launch, when any of the six required variables is missing in production, the form shows "The list opens soon" and the API answers 503. In local development, missing variables fall back to an in-memory list and a sender that prints each email, with its links, to the server log.

| Variable | Required | What it's for | Example |
|---|---|---|---|
| `DIYA_DATABASE_URL` | yes | Neon connection string for the DIYA database (its own Neon project, shared with nothing else). Use the pooled string. | `postgres://diya_owner:…@ep-quiet-sun-123456-pooler.us-west-2.aws.neon.tech/diya?sslmode=require` |
| `POSTMARK_SERVER_TOKEN` | yes | Server API token of the DIYA server in Postmark. | `6f1d…-…-…` |
| `POSTMARK_STREAM` | yes | Message stream ID that waitlist mail goes out on. | `diya-waitlist` |
| `DIYA_WAITLIST_FROM` | yes | Sender, exactly as it appears in the From line. Use DIYA's public alias under Vishal's name, never a personal address. The address must be a confirmed Postmark sender or on a verified domain. | `Vishal <diya@idyeah.studio>` |
| `DIYA_SITE_URL` | yes | Public origin used in email links (confirm, leave the list, privacy). Always the site's public origin. | `https://diya13.ai` |
| `DIYA_WAITLIST_SECRET` | yes | Random key for the keyed hashes of IP addresses and emails in rate-limit records (the waitlist's and screen requests'), and for signing both forms' fill-time tokens. 32+ random bytes. Changing it only resets rate limits. | output of `openssl rand -hex 32` |
| `DIYA_POSTAL_ADDRESS` | no | The sender's postal address for email footers: a USPS PO box or a registered private mailbox. Unset or blank means no address is printed anywhere. Keep it out of the repository; set it only in the deployment's environment. | `PO Box 100, Springfield, ST 00000` |
| `DIYA_WAITLIST_REPLY_TO` | no | Reply-To, if replies should go somewhere other than DIYA's public alias. Defaults to `Vishal <diya@idyeah.studio>` (`DEFAULT_REPLY_TO` in `lib/waitlist/config.ts`). | `Vishal <diya@idyeah.studio>` |

## Screen requests

"Don't see your screen?" at the end of the Screens gallery (`/explore?area=screens#request`) takes a description, an optional picture and an email, stores them in `diya_screen_requests` and emails each one to DIYA. It uses the same six variables as the waitlist and opens and closes by the same rules: closed before `LAUNCH_AT` (unless `DIYA_CATALOG_PREVIEW=1`), closed in production when any of the six is missing (the section says "Requests open with the launch." and `POST /api/screen-requests` answers 503), and in local development an in-memory store with the email printed to the server log instead of sent. Nothing is ever sent to the person who asked.

| Variable | Required | What it's for | Example |
|---|---|---|---|
| `DIYA_REQUESTS_TO` | no | Where each request is emailed, with the picture attached and Reply-To set to the person's address. Defaults to `CONTACT_EMAIL` (`diya@idyeah.studio`, in `lib/waitlist/config.ts`). It goes out from `DIYA_WAITLIST_FROM` on `POSTMARK_STREAM`, tagged `screen-request`. | `Vishal <diya@idyeah.studio>` |

Limits live in `lib/screen-requests/config.ts`: 20 to 2,000 characters; one PNG, JPEG or WebP picture, shrunk in the browser to 2,000px and under 3 MB, refused by the server over 3.5 MB or when its first bytes aren't one of those three; a 4 MB body; 5 requests an hour per IP, 3 a day per email, 100 a day in all. Its attempt counts share `diya_waitlist_attempts`, under their own keys. No route serves a request or its picture.

Each email ends with the query that marks the request answered. Run it after you reply, or the request stays for 365 days instead of 90.

- New requests, oldest first: `select id, created_at, email, poster_id, notify_when_ready, image_bytes, request_text from diya_screen_requests where status = 'new' order by created_at;`
- Mark one replied (it's deleted 90 days later): `update diya_screen_requests set status = 'replied', replied_at = now() where id = 12;`
- Close one, such as spam (it's deleted at the next clean-up): `update diya_screen_requests set status = 'closed' where id = 12;`
- Delete someone's requests on request: `delete from diya_screen_requests where email = lower('person@example.com');`
- People to tell when a screen is ready: `select email from diya_screen_requests where poster_id = 'board' and notify_when_ready;` (that one email is a commercial email; see below).
- Save a picture (psql): `\copy (select encode(image, 'base64') from diya_screen_requests where id = 12) to 'request-12.b64'`, then `base64 -d -i request-12.b64 -o request-12.webp` (the type is in `image_type`).
- The clean-up runs each time a request arrives. To run it by hand: `delete from diya_screen_requests where status = 'closed' or replied_at < now() - interval '90 days' or (replied_at is null and created_at < now() - interval '365 days');`
- The emails that brought requests sit in the `DIYA_REQUESTS_TO` inbox and in Postmark (45 days). The privacy page promises the inbox copy goes on the same schedule as the row, so delete it there too.

## Migrations

Run each `*.sql` file in this folder once, in order, against the DIYA database (Neon SQL Editor, or `psql "$DIYA_DATABASE_URL" -f db/001_waitlist.sql`). The files are safe to re-run. `003_screen_requests.sql` must run before the gallery's form opens in production.

## Day-to-day

- Confirmed and still subscribed: `select count(*) from diya_waitlist where confirmed_at is not null and unsubscribed_at is null;`
- Founding members, in order: `select email, confirmed_at from diya_waitlist where founding order by confirmed_at;`
- Delete someone on request (their tokens go with them): `delete from diya_waitlist where email = lower('person@example.com');`
- The sender's legal name lives in `lib/waitlist/config.ts` (`SENDER_ORG`); the postal address comes only from `DIYA_POSTAL_ADDRESS`. DIYA's public contact (`CONTACT_EMAIL`, `diya@idyeah.studio`) lives there too; it is on the privacy page, the unsubscribe page, every email footer and the mailto in `List-Unsubscribe`, so someone has to read that inbox. A "please take me off" email to it counts as leaving the list: do it by hand within 10 business days (sooner is better), with `update diya_waitlist set unsubscribed_at = now(), choice = null, other_text = null, updated_at = now() where email = lower('person@example.com');`.
- `POSTAL_ADDRESS_IN_TRANSACTIONAL` (default `false`) decides whether the confirmation and "already on the list" emails print the postal address. Those two answer the person's own request, so they are most likely transactional or relationship messages under CAN-SPAM, where the address isn't strictly required.

## Before any other email goes out

Anything beyond the two waitlist emails, such as "Relight is ready", the founding offer or any announcement, is most likely a **commercial** email under CAN-SPAM (FTC, "CAN-SPAM Act: A Compliance Guide for Business"), even to people who asked for it. Each one **must**:
- include a valid physical postal address: a current street address, a post office box registered with the USPS, or a private mailbox registered with a commercial mail receiving agency (set `DIYA_POSTAL_ADDRESS`, and build it with `postalAddress: true`, whatever the switch says);
- carry an honest From, Reply-To and subject line;
- have a clear way to opt out that keeps working for at least 30 days after sending, and honor opt-outs within 10 business days (ours is immediate);
- go only to confirmed addresses that haven't left (`confirmed_at is not null and unsubscribed_at is null`).
If it goes to people in the EU or UK, it also has to stay within what they consented to: news about Relight, part of DIYA Pro, and the founding offer. Anything else needs fresh consent.
- The list sends at most 60 emails an hour in total (`RATE_LIMITS.send` in `lib/waitlist/config.ts`); past that the form says the list is busy.
