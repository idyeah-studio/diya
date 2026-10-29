'use client'
import { Metric, Tag } from '@idyeah/diya'

/** Stage three of the Relight picture: a screen made of DIYA parts, Oriel's
    Invoices in miniature (same invented customers). Decorative. */
export function ProScreen() {
  return (
    <div className="ld-built" aria-hidden="true">
      <div className="ld-built-nav">
        <strong>Oriel</strong>
        <span>Overview</span>
        <span data-on="">Invoices</span>
        <span>Customers</span>
        <span>Settings</span>
      </div>
      <div className="ld-built-main">
        <div className="ld-built-metrics">
          <div>
            <Metric label="Outstanding" value="$18,420" size="small" />
          </div>
          <div>
            <Metric label="Paid this month" value="$42,900" size="small" />
          </div>
        </div>
        <div className="ld-built-table">
          <span>Customer</span>
          <span>Status</span>
          <span>Amount</span>
          <span>Ferro Bikes</span>
          <span>
            <Tag label="Status" tone="success" size="small">
              Paid
            </Tag>
          </span>
          <span>$4,200</span>
          <span>Saltmarsh Coffee</span>
          <span>
            <Tag label="Status" tone="warning" size="small">
              Due Friday
            </Tag>
          </span>
          <span>$1,860</span>
        </div>
      </div>
    </div>
  )
}
