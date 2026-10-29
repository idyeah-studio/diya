-- Screen requests: the "Don't see your screen?" form in the Screens gallery.
-- Runs once on the DIYA database, after 001 (its rate limits count in
-- diya_waitlist_attempts, under their own keys). Safe to re-run.
-- Private: no route ever serves a request or its picture.
-- Closed requests are deleted at the next clean-up, replied ones 90 days after
-- the reply, unanswered ones 365 days after they arrive (lib/screen-requests/config.ts).

create table if not exists diya_screen_requests (
  id bigint generated always as identity primary key,
  created_at timestamptz not null,
  email text not null
    check (email = lower(email) and length(email) between 3 and 254),
  request_text text not null
    check (length(request_text) between 20 and 2000),
  -- The poster whose "Want this one?" opened the form, if any.
  poster_id text
    check (poster_id is null or length(poster_id) <= 64),
  -- The separate, optional "Also tell me when it's ready".
  notify_when_ready boolean not null default false,
  consent_version text not null,
  -- The picture, already shrunk by the browser and checked by its first bytes.
  image bytea,
  image_type text
    check (image_type is null or image_type in ('image/png', 'image/jpeg', 'image/webp')),
  image_bytes integer
    check (image_bytes is null or image_bytes between 1 and 3670016),
  -- Keyed one-way hash of the IP address. Never the address itself.
  ip_hash text not null,
  status text not null default 'new'
    check (status in ('new', 'replied', 'closed')),
  replied_at timestamptz,
  check ((image is null) = (image_type is null) and (image is null) = (image_bytes is null)),
  check (status <> 'replied' or replied_at is not null)
);

-- The clean-up's two clocks.
create index if not exists diya_screen_requests_replied_idx
  on diya_screen_requests (replied_at) where replied_at is not null;
create index if not exists diya_screen_requests_unanswered_idx
  on diya_screen_requests (created_at) where replied_at is null;
