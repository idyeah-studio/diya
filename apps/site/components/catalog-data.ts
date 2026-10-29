type DataDensity = 'Light' | 'Dense'
export const chartData = [
  { name: 'Jan', direct: 120, organic: 86, referral: 42, social: 65, email: 32, paid: 94 },
  { name: 'Feb', direct: 156, organic: 110, referral: 55, social: 82, email: 46, paid: 115 },
  { name: 'Mar', direct: 142, organic: 124, referral: 63, social: 71, email: 39, paid: 108 },
  { name: 'Apr', direct: 210, organic: 148, referral: 77, social: 96, email: 58, paid: 138 },
  { name: 'May', direct: 192, organic: 173, referral: 90, social: 112, email: 65, paid: 156 },
  { name: 'Jun', direct: 258, organic: 198, referral: 102, social: 134, email: 81, paid: 184 },
]
export const channels = [
  { key: 'direct', name: 'Direct' },
  { key: 'organic', name: 'Organic' },
  { key: 'referral', name: 'Referral' },
  { key: 'social', name: 'Social' },
  { key: 'email', name: 'Email' },
  { key: 'paid', name: 'Paid' },
] as const
export function acquisitionTotal(density: DataDensity) {
  return chartData.reduce(
    (total, row) =>
      total +
      channels.slice(0, density === 'Dense' ? 6 : 3).reduce((sum, c) => sum + row[c.key], 0),
    0
  )
}
export function allocationData(density: DataDensity) {
  return density === 'Dense'
    ? [
        { name: 'Platform', value: 360 },
        { name: 'Mobile', value: 260 },
        { name: 'Campaigns', value: 220 },
        { name: 'Content', value: 160 },
        { name: 'Infrastructure', value: 140 },
        { name: 'Support', value: 100 },
      ]
    : [
        { name: 'Product', value: 620 },
        { name: 'Marketing', value: 380 },
        { name: 'Operations', value: 240 },
      ]
}
