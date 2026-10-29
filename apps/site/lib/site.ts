// DIYA's public origin, written once. Everything that names the site (metadata,
// sitemap, robots, the MCP and llms.txt channel, the production gates) reads it
// from here. Its own tiny module, so the root layout doesn't load the catalog's
// API data.
export const SITE = 'https://diya13.ai'
