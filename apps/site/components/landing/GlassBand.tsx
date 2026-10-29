'use client'
import { Avatar, Button, Card, DiyaProvider } from '@idyeah/diya'
import { useAppearance } from '../../app/Appearance'

/** The same Card twice, once without and once with the `glass` prop. */
export function GlassCards() {
  const { theme } = useAppearance()
  const card = (
    <Card
      title="Maya Verma"
      description="Joined the studio in June"
      tags={<Avatar name="Maya Verma" />}
      footer={
        <>
          <Button size="small" shape="pill">
            Message
          </Button>
          <Button size="small" shape="pill" variant="outline">
            Profile
          </Button>
        </>
      }
    />
  )
  return (
    <div className="ld-glass-cards">
      <figure>
        <DiyaProvider surface={false} theme={theme} className="ld-glass-card">
          <div inert aria-hidden="true">
            {card}
          </div>
        </DiyaProvider>
        <figcaption>&lt;DiyaProvider&gt;</figcaption>
      </figure>
      <figure>
        <DiyaProvider surface={false} theme={theme} glass className="ld-glass-card">
          <div inert aria-hidden="true">
            {card}
          </div>
        </DiyaProvider>
        <figcaption>&lt;DiyaProvider glass&gt;</figcaption>
      </figure>
    </div>
  )
}
