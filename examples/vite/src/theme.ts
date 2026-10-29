import type { CSSProperties } from 'react'
type ThemeTokens = CSSProperties & { [token: `--${string}`]: string | number | undefined }

// Application preferences: configure public tokens without editing DIYA internals.
export const diyaTheme: { brandColor: string; fontFamily: string; tokens: Record<'light' | 'dark', ThemeTokens> } = {
  brandColor: '#303033',
  fontFamily: '"DIYA Sans", "DIYA Sans Fallback", Arial, sans-serif' ,
  tokens: {
    light: {
      '--dashboard-page': '#f5f5f7',
      '--dashboard-positive': '#2a8703',
      '--dashboard-alert': '#de1c24',
      '--diya-color-text': '#202023',
      '--diya-color-muted': '#626267',
      '--diya-color-accent': '#29292c',
      '--diya-color-accent-text': '#fff',
      '--diya-color-line': '#1d1d1f26',
      '--diya-shadow-raised': 'inset 0 1px 0 #ffffff99, 0 8px 24px #1d1d1f0d, 0 2px 6px #1d1d1f05',
    },
    dark: {
      '--dashboard-page': '#171719',
      '--dashboard-positive': '#95c381',
      '--dashboard-alert': '#ef8e92',
      '--diya-color-text': '#f5f5f7',
      '--diya-color-muted': '#aeaeb2',
      '--diya-color-accent': '#f5f5f7',
      '--diya-color-accent-text': '#202023',
      '--diya-color-line': '#ffffff26',
    },
  },
}
