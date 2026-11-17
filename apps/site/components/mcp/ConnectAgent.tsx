'use client'
import { useState } from 'react'
import { Select, Tabs } from '@idyeah/diya'
import { AGENTS, AgentSteps } from './agents'

/**
 * Connect it: DIYA Tabs, one per agent. At phone width the tab row gives way
 * to a native Select (44px, 16px text, so iOS doesn't zoom) driving the same
 * panels. Both are in the page and CSS shows one, so the server and the
 * browser render the same thing at every width.
 */
export function ConnectAgent() {
  const [agent, setAgent] = useState(AGENTS[0].id)
  return (
    <div className="mcp-connect">
      <Select
        className="mcp-agent-select"
        label="Your agent"
        hideLabel
        value={agent}
        onValueChange={(value) => value && setAgent(value)}
        options={AGENTS.map(({ id, label }) => ({ value: id, label }))}
      />
      <Tabs
        className="mcp-agent-tabs"
        label="Your agent"
        value={agent}
        onValueChange={setAgent}
        items={AGENTS.map((item) => ({ value: item.id, label: item.label, content: <AgentSteps agent={item} /> }))}
      />
    </div>
  )
}
