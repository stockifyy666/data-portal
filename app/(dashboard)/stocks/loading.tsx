import { TableSkeleton, PageHeaderSkeleton } from '@/components/ui/Skeleton'

export default function StocksLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <PageHeaderSkeleton />
      <TableSkeleton rows={15} cols={7} />
    </div>
  )
}
