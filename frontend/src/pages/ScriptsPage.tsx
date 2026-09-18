import { useCallback, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ImagesPanel from '../components/ImagesPanel'
import Modal from '../components/Modal'
import PublicationsPanel from '../components/PublicationsPanel'
import ScriptEditor from '../components/ScriptEditor'
import ScriptList from '../components/ScriptList'
import VersionPanel from '../components/VersionPanel'

/**
 * 三栏布局:左侧脚本列表 / 中间编辑器 / 右侧版本历史。
 * 选中的脚本 id 存在 URL(/scripts/:id),刷新后仍在。
 */
export default function ScriptsPage() {
  const { id: selectedId } = useParams()
  const navigate = useNavigate()

  // 编辑器有未保存改动时,切换脚本先确认(dirty 用 ref 存,避免每次输入都重渲染整页)
  const dirtyRef = useRef(false)
  const [pendingId, setPendingId] = useState<string | null>(null)

  // 中栏标签页:脚本编辑 / 发布追踪 / 配图
  const [tab, setTab] = useState<'script' | 'publications' | 'images'>('script')

  const handleDirtyChange = useCallback((dirty: boolean) => {
    dirtyRef.current = dirty
  }, [])

  const handleSelect = useCallback(
    (id: string) => {
      if (id === selectedId) return
      if (dirtyRef.current) {
        setPendingId(id)
      } else {
        navigate(`/scripts/${id}`)
      }
    },
    [selectedId, navigate],
  )

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      <ScriptList selectedId={selectedId ?? null} onSelect={handleSelect} />

      {selectedId ? (
        <>
          <main className="flex flex-1 flex-col overflow-hidden">
            <div className="flex gap-1 border-b border-gray-200 bg-white px-4 pt-2">
              {(
                [
                  { key: 'script', label: '脚本' },
                  { key: 'publications', label: '发布' },
                  { key: 'images', label: '配图' },
                ] as const
              ).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`rounded-t px-3 py-1.5 text-sm ${
                    tab === t.key
                      ? 'border border-b-0 border-gray-200 bg-gray-50 font-medium'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {tab === 'script' && (
              <ScriptEditor
                key={selectedId}
                scriptId={selectedId}
                onDirtyChange={handleDirtyChange}
                onDeleted={() => navigate('/')}
              />
            )}
            {tab === 'publications' && (
              <PublicationsPanel key={selectedId} scriptId={selectedId} />
            )}
            {tab === 'images' && <ImagesPanel key={selectedId} scriptId={selectedId} />}
          </main>
          <VersionPanel scriptId={selectedId} />
        </>
      ) : (
        <>
          <main className="flex flex-1 items-center justify-center">
            <p className="text-gray-400">从左侧选择一个脚本,或新建一个</p>
          </main>
          <aside className="w-72 shrink-0 border-l border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-400">版本历史</p>
          </aside>
        </>
      )}

      {/* 未保存改动确认弹窗 */}
      {pendingId && (
        <Modal title="有未保存的改动" onClose={() => setPendingId(null)}>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              当前脚本有未保存的改动,切换后会丢失。确定要切换吗?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPendingId(null)}
                className="rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
              >
                留在本页
              </button>
              <button
                onClick={() => {
                  navigate(`/scripts/${pendingId}`)
                  setPendingId(null)
                }}
                className="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-500"
              >
                放弃改动并切换
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
