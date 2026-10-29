import { createRoot } from 'react-dom/client'
import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
const v = cva('inline-flex items-center rounded-md', { variants: { variant: { default: 'bg-primary text-primary-foreground' } }, defaultVariants: { variant: 'default' } })
function Button({ asChild, className, ...p }: any) { const C = asChild ? Slot : 'button'; return <C className={twMerge(clsx(v({}), className))} {...p} /> }
createRoot(document.getElementById('root')!).render(<Button>Hi</Button>)
