import { CardGridSkeleton, PageHeaderSkeleton } from '@/components/ui/Skeleton'

export default function ToolsLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <PageHeaderSkeleton />
      <CardGridSkeleton count={6} cols={3} />
    </div>
  )
}
