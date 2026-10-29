-- Screen requests: the "Don't see your screen?" form in the Screens gallery.
-- Runs once on the DIYA database, after 001 (its rate limits count in
-- diya_waitlist_attempts, under their own keys). Safe to re-run.
-- Private: no route ever serves a request or its picture.
-- Closed requests are deleted at the next clean-up, replied ones 90 days after
-- the reply, unanswered ones 365 days after they arrive. When the person ticked
-- "Also tell me when it's ready", the clean-up keeps only the email, the poster
-- or screen name, the consent version and the dates, until the screen ships or
-- 2 years after the request (lib/screen-requests/config.ts).

create table if not exists diya_screen_requests (
  id bigint generated always as identity primary key,
  created_at timestamptz not null,
  email text not null
    check (email = lower(email) and length(email) between 3 and 254),
  -- Null once the request is past its time and only kept for "when it's ready".
  request_text text
    check (request_text is null or length(request_text) between 20 and 2000),
  -- The poster whose "Want this one?" opened the form, if any.
  poster_id text
    check (poster_id is null or length(poster_id) <= 64),
  -- For "when it's ready" without a poster: the screen's name, set by hand on reply.
  screen_name text
    check (screen_name is null or length(screen_name) between 1 and 80),
  -- The separate, optional "Also tell me when it's ready".
  notify_when_ready boolean not null default false,
  consent_version text not null,
  -- The picture, already shrunk by the browser and checked by its first bytes.
  image bytea,
  image_type text
    check (image_type is null or image_type in ('image/png', 'image/jpeg', 'image/webp')),
  image_bytes integer
    check (image_bytes is null or image_bytes between 1 and 3670016),
  -- Keyed one-way hash of the IP address. Never the address itself. Null once trimmed.
  ip_hash text,
  status text not null default 'new'
    check (status in ('new', 'replied', 'closed')),
  replied_at timestamptz,
  -- When the screen shipped and its "when it's ready" email went out (set by hand).
  shipped_at timestamptz,
  check ((image is null) = (image_type is null) and (image is null) = (image_bytes is null)),
  check (status <> 'replied' or replied_at is not null),
  -- Only a request kept for "when it's ready" loses its words, picture and IP hash.
  check (request_text is not null or (notify_when_ready and image is null and ip_hash is null)),
  check (request_text is null or ip_hash is not null)
);

-- The clean-up's clocks.
create index if not exists diya_screen_requests_replied_idx
  on diya_screen_requests (replied_at) where replied_at is not null;
create index if not exists diya_screen_requests_unanswered_idx
  on diya_screen_requests (created_at) where replied_at is null;
