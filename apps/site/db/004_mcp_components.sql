-- Which DIYA components AI editors ask the MCP server for with get_component,
-- counted by day (lib/mcp/component-log.ts). Runs once on the DIYA database,
-- after 002. Safe to re-run. Touches no waitlist table.
-- Only the component's api.json id (resolved by DIYA, never the words sent),
-- the day and a count: no IP address, no client, no time of day. Rows older
-- than a year are deleted as new ones arrive.

create table if not exists diya_mcp_components (
  day date not null,
  -- An api.json item id, such as "date-picker".
  component text not null check (length(component) between 1 and 80 and component ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  count integer not null default 1 check (count > 0),
  -- Leads with day, so pruning old rows uses it too.
  primary key (day, component)
);
