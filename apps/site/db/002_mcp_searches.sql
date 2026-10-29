-- What AI editors search DIYA's MCP server for, counted by day (lib/mcp/query-log.ts).
-- Runs once on the DIYA database, after 001. Safe to re-run. Touches no waitlist table.
-- Only the words, the day, whether DIYA had an answer, and a count: no IP address,
-- no client, no time of day. Rows older than a year are deleted as new ones arrive.

create table if not exists diya_mcp_searches (
  day date not null,
  query text not null check (length(query) between 1 and 80),
  -- false when nothing in DIYA fitted: what to build next.
  found boolean not null,
  count integer not null default 1 check (count > 0),
  -- Leads with day, so pruning old rows uses it too.
  primary key (day, query)
);
