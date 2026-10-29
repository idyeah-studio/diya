'use client'
import { createContext, useContext, type AnchorHTMLAttributes, type ComponentType, type ExoticComponent, type Ref } from 'react'

/** The props DIYA passes to a router link. */
export type DiyaLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; ref?: Ref<HTMLAnchorElement> }

/**
 * A router link that takes anchor props, such as Next.js `Link` or a React Router `Link` adapter.
 * Exotic components (forwardRef, memo) count too: React 18's types keep them apart from ComponentType.
 */
export type DiyaLinkComponent = ComponentType<DiyaLinkProps> | ExoticComponent<DiyaLinkProps>

export const LinkComponentContext = createContext<DiyaLinkComponent | 'a'>('a')

/** The link element DIYA renders for items with an `href`: the provider's `linkComponent`, or a plain anchor. */
export function useDiyaLinkComponent() {
  return useContext(LinkComponentContext)
}
