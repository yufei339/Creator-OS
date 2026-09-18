import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listVersions, restoreVersion } from '../api/scripts'

interface VersionPanelProps {
  scriptId: string
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** 右侧检视器:版本历史列表,每个版本可回滚。 */
export default function VersionPanel({ scriptId }: VersionPanelProps) {
  const queryClient = useQueryClient()
  const versionsQuery = useQuery({
    queryKey: ['versions', scriptId],
    queryFn: () => listVersions(scriptId),
  })

  const restoreMutation = useMutation({
    mutationFn: (versionId: string) => restoreVersion(scriptId, versionId),
    onSuccess: () => {
      // 编辑器读的是 ['script', id],invalidate 后内容自动刷新
      queryClient.invalidateQueries({ queryKey: ['script', scriptId] })
      queryClient.invalidateQueries({ queryKey: ['scripts'] })
    },
  })

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-gray-200 bg-white">
      <div className="border-b border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-700">版本历史</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {versionsQuery.isPending && <p className="text-sm text-gray-400">加载中…</p>}
        {versionsQuery.isError && (
          <p className="text-sm text-red-500">加载失败:{versionsQuery.error.message}</p>
        )}
        {versionsQuery.data?.length === 0 && (
          <p className="text-sm text-gray-400">
            还没有版本。点编辑器的「保存新版本」存一个快照。
          </p>
        )}
        {restoreMutation.isError && (
          <p className="mb-2 text-sm text-red-500">
            回滚失败:{restoreMutation.error.message}
          </p>
        )}
        <ul className="space-y-2">
          {versionsQuery.data?.map((v) => (
            <li key={v.id} className="rounded border border-gray-200 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{formatTime(v.created_at)}</span>
                <button
                  disabled={restoreMutation.isPending}
                  onClick={() => restoreMutation.mutate(v.id)}
                  className="rounded border border-gray-300 px-2 py-0.5 text-xs hover:bg-gray-100 disabled:opacity-40"
                >
                  回滚
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-700">
                {v.change_note || <span className="text-gray-400">(无说明)</span>}
              </p>
              <p className="mt-1 truncate text-xs text-gray-400">{v.content}</p>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
