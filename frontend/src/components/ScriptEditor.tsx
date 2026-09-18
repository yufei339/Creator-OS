import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createVersion, deleteScript, getScript, updateScript } from '../api/scripts'
import type { ScriptStatus } from '../types/script'
import Modal from './Modal'

interface ScriptEditorProps {
  scriptId: string
  onDirtyChange: (dirty: boolean) => void
  onDeleted: () => void
}

const STATUS_OPTIONS: { value: ScriptStatus; label: string }[] = [
  { value: 'draft', label: '草稿' },
  { value: 'ready', label: '可拍' },
  { value: 'shot', label: '已拍' },
  { value: 'published', label: '已发布' },
]

/** 中间编辑器:标题 + 状态 + 内容,保存 / 保存新版本 / 删除。 */
export default function ScriptEditor({
  scriptId,
  onDirtyChange,
  onDeleted,
}: ScriptEditorProps) {
  const queryClient = useQueryClient()
  const scriptQuery = useQuery({
    queryKey: ['script', scriptId],
    queryFn: () => getScript(scriptId),
  })
  const script = scriptQuery.data

  // 编辑器本地状态,脚本切换或服务端内容更新(如回滚)时重置
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [status, setStatus] = useState<ScriptStatus>('draft')
  useEffect(() => {
    if (script) {
      setTitle(script.title)
      setContent(script.content)
      setStatus(script.status)
    }
  }, [script])

  const dirty =
    !!script &&
    (title !== script.title || content !== script.content || status !== script.status)
  useEffect(() => {
    onDirtyChange(dirty)
    return () => onDirtyChange(false)
  }, [dirty, onDirtyChange])

  const saveMutation = useMutation({
    mutationFn: () => updateScript(scriptId, { title, content, status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['script', scriptId] })
      queryClient.invalidateQueries({ queryKey: ['scripts'] })
    },
  })

  const [showVersionModal, setShowVersionModal] = useState(false)
  const [changeNote, setChangeNote] = useState('')
  const versionMutation = useMutation({
    // 存版本前先把当前内容保存,保证快照和所见一致
    mutationFn: async () => {
      await updateScript(scriptId, { title, content, status })
      return createVersion(scriptId, { content, change_note: changeNote.trim() || null })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['script', scriptId] })
      queryClient.invalidateQueries({ queryKey: ['scripts'] })
      queryClient.invalidateQueries({ queryKey: ['versions', scriptId] })
      setShowVersionModal(false)
      setChangeNote('')
    },
  })

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const deleteMutation = useMutation({
    mutationFn: () => deleteScript(scriptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scripts'] })
      onDeleted()
    },
  })

  if (scriptQuery.isPending) {
    return <div className="flex flex-1 items-center justify-center text-gray-400">加载中…</div>
  }
  if (scriptQuery.isError) {
    return (
      <div className="flex flex-1 items-center justify-center text-red-500">
        加载失败:{scriptQuery.error.message}
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* 顶部工具栏 */}
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 rounded border border-transparent px-2 py-1 text-lg font-medium hover:border-gray-200 focus:border-gray-400 focus:outline-none"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ScriptStatus)}
          className="rounded border border-gray-300 px-2 py-1.5 text-sm"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          disabled={!dirty || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
          className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-700 disabled:opacity-40"
        >
          {saveMutation.isPending ? '保存中…' : dirty ? '保存' : '已保存'}
        </button>
        <button
          onClick={() => setShowVersionModal(true)}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100"
        >
          保存新版本
        </button>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="rounded border border-red-200 px-3 py-1.5 text-sm text-red-500 hover:bg-red-50"
        >
          删除
        </button>
      </div>

      {saveMutation.isError && (
        <p className="bg-red-50 px-4 py-2 text-sm text-red-600">
          保存失败:{saveMutation.error.message}
        </p>
      )}

      {/* 内容编辑区 */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="在这里写脚本…"
        className="flex-1 resize-none bg-gray-50 p-6 font-mono text-sm leading-relaxed focus:outline-none"
      />

      {/* 保存新版本弹窗 */}
      {showVersionModal && (
        <Modal title="保存新版本" onClose={() => setShowVersionModal(false)}>
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              会先保存当前内容,再存为一个版本快照。
            </p>
            <input
              autoFocus
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              placeholder="改动说明(可选)"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
            {versionMutation.isError && (
              <p className="text-sm text-red-500">{versionMutation.error.message}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowVersionModal(false)}
                className="rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
              >
                取消
              </button>
              <button
                disabled={versionMutation.isPending}
                onClick={() => versionMutation.mutate()}
                className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-700 disabled:opacity-40"
              >
                {versionMutation.isPending ? '保存中…' : '保存版本'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 删除确认弹窗 */}
      {showDeleteModal && (
        <Modal title="删除脚本" onClose={() => setShowDeleteModal(false)}>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              确定删除「{script?.title}」?版本历史会一并删除,不可恢复。
            </p>
            {deleteMutation.isError && (
              <p className="text-sm text-red-500">{deleteMutation.error.message}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
              >
                取消
              </button>
              <button
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate()}
                className="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-500 disabled:opacity-40"
              >
                {deleteMutation.isPending ? '删除中…' : '确认删除'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
