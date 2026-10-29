import { Button, Card, Inline, PageHeader, Stack, Tag, TextLink } from '@idyeah/diya'
import { FirstForm } from './first-form'

// A Server Component. DIYA's components carry their own 'use client', so plain
// props (text, numbers, links) render here; handlers live in first-form.tsx.
export default function Home() {
  return (
    <main className="page">
      <Stack gap={7}>
        <PageHeader
          headingLevel={1}
          title="{{name}}"
          description="Your Next.js app, already dressed. Change app/page.tsx and this page follows."
          tags={<Tag tone="brand">DIYA 1.0</Tag>}
          actions={
            <Inline gap={2}>
              <Button variant="outline" href="https://diya13.ai/explore?area=components" target="_blank">
                Components
              </Button>
              <Button href="https://diya13.ai/explore?area=patterns" target="_blank">
                Browse patterns
              </Button>
            </Inline>
          }
        />

        <div className="steps">
          <Card title="Edit this page" description="It lives in app/page.tsx.">
            Save the file and the browser follows. Stack and Inline handle the spacing, so most screens need
            no CSS of your own.
          </Card>
          <Card title="Borrow a pattern" description="Thirteen finished screens.">
            Sign-in, settings, a data table with filters. Each one has a Get code button that copies a
            complete file.{' '}
            <TextLink href="https://diya13.ai/explore?area=patterns">See them all</TextLink>
          </Card>
          <Card title="Bring your agent" description="AGENTS.md is already here.">
            It points Claude Code, Cursor and Codex at DIYA&rsquo;s docs, so they use the real props
            instead of guessing.
          </Card>
        </div>

        <FirstForm />
      </Stack>
    </main>
  )
}
