/** @type {import("next").NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // Get code for Screens hands out each screen's own file, read on the
  // server from screens/<id>.tsx; the catalog page's function needs them.
  outputFileTracingIncludes: { '/explore': ['./screens/*.tsx'] },
  // The Screens preview frame is a static Vite build in public/screens-frame
  // (see screens-frame/). Its page answers at /screens-frame?screen=<id>.
  rewrites: async () => [{ source: '/screens-frame', destination: '/screens-frame/index.html' }],
  // /mcp is a page for browsers and the MCP server for agents, chosen by
  // Accept (proxy.ts), so no cache may hand one the other's answer.
  headers: async () => [{ source: '/mcp', headers: [{ key: 'Vary', value: 'Accept' }] }],
}

export default nextConfig
