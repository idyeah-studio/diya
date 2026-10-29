'use client'
import type { ReactNode } from 'react'
import { Tabs } from '@idyeah/diya'
import { isPackageManager, PACKAGE_MANAGERS, type PackageManager } from '../site/package-manager'

/** npm · pnpm · yarn · bun, as DIYA's pill tabs. Only the selected panel renders its content. */
export function PackageManagerTabs({
  value,
  onChange,
  children,
}: {
  value: PackageManager
  onChange: (value: PackageManager) => void
  children: ReactNode
}) {
  return (
    <div className="code-step-pm">
      <Tabs
        label="Package manager"
        variant="pill"
        size="small"
        value={value}
        onValueChange={(next) => isPackageManager(next) && onChange(next)}
        items={PACKAGE_MANAGERS.map((manager) => ({
          value: manager,
          label: manager,
          content: manager === value ? children : null,
        }))}
      />
    </div>
  )
}
