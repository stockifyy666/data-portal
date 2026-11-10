import { TableSkeleton, PageHeaderSkeleton } from '@/components/ui/Skeleton'

export default function UsersLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <PageHeaderSkeleton />
      <TableSkeleton rows={8} cols={7} />
    </div>
  )
}
