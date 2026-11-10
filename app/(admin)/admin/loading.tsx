import { StatCardsSkeleton, TableSkeleton, PageHeaderSkeleton } from '@/components/ui/Skeleton'

export default function AdminDashboardLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <PageHeaderSkeleton />
      <StatCardsSkeleton count={4} />
      <TableSkeleton rows={8} cols={5} />
    </div>
  )
}
