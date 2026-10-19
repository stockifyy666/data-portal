import { ChartSkeleton, StatCardsSkeleton, PageHeaderSkeleton } from '@/components/ui/Skeleton'

export default function StockDetailLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <PageHeaderSkeleton />
      <StatCardsSkeleton count={5} />
      <ChartSkeleton height={420} />
    </div>
  )
}
