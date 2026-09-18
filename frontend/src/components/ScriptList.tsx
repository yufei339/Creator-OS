import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createScript, listScripts } from '../api/scripts'
import type { Script } from '../types/script'
import Modal from './Modal'

interface ScriptListProps {
  selectedId: string | null
  onSelect: (id: string) => void
}

const STATUS_DOT: Record<string, string> = {
  draft: 'bg-gray-300',
  ready: 'bg-blue-400',
  shot: 'bg-amber-400',
  published: 'bg-green-500',
}

/** 左侧栏:脚本按 series 分组 + 新建按钮。 */
export default function ScriptList({ selectedId, onSelect }: ScriptListProps) {
  const queryClient = useQueryClient()
  const scriptsQuery = useQuery({ queryKey: ['scripts'], queryFn: () => listScripts() })

  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newSeries, setNewSeries] = useState('')

  const createMutation = useMutation({
    mutationFn: () =>
      createScript({ title: newTitle.trim(), series: newSeries.trim() || null }),
    onSuccess: (script) => {
      queryClient.invalidateQueries({ queryKey: ['scripts'] })
      setShowCreate(false)
      setNewTitle('')
      setNewSeries('')
      onSelect(script.id)
    },
  })

  // 按 series 分组,未填 series 的归入「未分组」
  const groups = useMemo(() => {
    const map = new Map<string, Script[]>()
    for (const s of scriptsQuery.data ?? []) {
      const key = s.series ?? '未分组'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(s)
    }
    return [...map.entries()]
  }, [scriptsQuery.data])

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 p-4">
        <h1 className="text-lg font-semibold">Creator OS</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded bg-gray-900 px-2.5 py-1 text-sm text-white hover:bg-gray-700"
        >
          + 新建
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {scriptsQuery.isPending && <p className="p-2 text-sm text-gray-400">加载中…</p>}
        {scriptsQuery.isError && (
          <p className="p-2 text-sm text-red-500">加载失败:{scriptsQuery.error.message}</p>
        )}
        {scriptsQuery.data?.length === 0 && (
          <p className="p-2 text-sm text-gray-400">还没有脚本,点右上角新建</p>
        )}
        {groups.map(([series, scripts]) => (
          <div key={series} className="mb-3">
            <p className="px-2 py-1 text-xs font-medium tracking-wide text-gray-400">
              {series}
            </p>
            {scripts.map((script) => (
              <button
                key={script.id}
                onClick={() => onSelect(script.id)}
                className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm ${
                  script.id === selectedId
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-800 hover:bg-gray-100'
                }`}
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[script.status]}`}
                />
                <span className="truncate">{script.title}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-gray-200 p-2">
        <Link
          to="/assistant"
          className="block rounded px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
        >
          🤖 AI 建议台
        </Link>
      </div>

      {showCreate && (
        <Modal title="新建脚本" onClose={() => setShowCreate(false)}>
          <div className="space-y-3">
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="标题(必填)"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
            <input
              value={newSeries}
              onChange={(e) => setNewSeries(e.target.value)}
              placeholder="系列(可选,如:美食)"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
            {createMutation.isError && (
              <p className="text-sm text-red-500">{createMutation.error.message}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
              >
                取消
              </button>
              <button
                disabled={!newTitle.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate()}
                className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-700 disabled:opacity-40"
              >
                {createMutation.isPending ? '创建中…' : '创建'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </aside>
  )
}
