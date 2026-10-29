-- DIYA waitlist (Relight, part of DIYA Pro). Runs once on the DIYA database (its own Neon project).
-- Safe to re-run: every object is created only when missing.

create table if not exists diya_waitlist (
  id bigint generated always as identity primary key,
  email text not null unique
    check (email = lower(email) and length(email) between 3 and 254),
  choice text
    check (choice in ('dashboard', 'settings', 'admin-table', 'landing', 'other')),
  other_text text
    check (other_text is null or length(other_text) <= 80),
  source text not null
    check (source in ('landing', 'catalog')),
  consent_version text not null,
  founding boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  -- When the last email went out; one per address per day.
  last_email_at timestamptz
);

create index if not exists diya_waitlist_founding_idx
  on diya_waitlist (confirmed_at) where founding;
-- Unconfirmed addresses are deleted 30 days after their last confirmation email.
create index if not exists diya_waitlist_unconfirmed_idx
  on diya_waitlist ((coalesce(last_email_at, created_at))) where confirmed_at is null and unsubscribed_at is null;

-- Confirm and unsubscribe links. Only the SHA-256 of each token is stored.
create table if not exists diya_waitlist_tokens (
  token_hash text primary key,
  signup_id bigint not null references diya_waitlist (id) on delete cascade,
  purpose text not null check (purpose in ('confirm', 'unsubscribe')),
  created_at timestamptz not null,
  expires_at timestamptz,
  used_at timestamptz
);

create index if not exists diya_waitlist_tokens_signup_idx
  on diya_waitlist_tokens (signup_id);

-- Rate-limit attempts, keyed by a keyed hash of the IP address or email.
-- No raw addresses. Rows older than two days are pruned as new ones arrive.
create table if not exists diya_waitlist_attempts (
  key_hash text not null,
  at timestamptz not null
);

create index if not exists diya_waitlist_attempts_key_idx
  on diya_waitlist_attempts (key_hash, at);
create index if not exists diya_waitlist_attempts_at_idx
  on diya_waitlist_attempts (at);
