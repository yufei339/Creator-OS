import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createPublication, listPublications, uploadFile } from '../api/publications'
import type { Publication, PubType } from '../types/publication'
import Modal from './Modal'
import PublicationDetail from './PublicationDetail'

interface PublicationsPanelProps {
  scriptId: string
}

export const PLATFORM_LABEL: Record<string, string> = {
  douyin: '抖音',
  xiaohongshu: '小红书',
  youtube: 'YouTube',
}

const STALE_DAYS = 3

function isStale(pub: Publication): boolean {
  if (pub.track_status !== 'active') return false
  if (!pub.latest_metric) return true
  const age = Date.now() - new Date(pub.latest_metric.recorded_at).getTime()
  return age > STALE_DAYS * 24 * 3600 * 1000
}

function fmtNum(n: number | null): string {
  if (n === null) return '-'
  return n >= 10000 ? `${(n / 10000).toFixed(1)}w` : String(n)
}

/** 发布物区域:列表 + 添加表单 + 待更新提醒,点击条目展开详情。 */
export default function PublicationsPanel({ scriptId }: PublicationsPanelProps) {
  const queryClient = useQueryClient()
  const pubsQuery = useQuery({
    queryKey: ['publications', scriptId],
    queryFn: () => listPublications(scriptId),
  })

  const [selectedPubId, setSelectedPubId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  // 添加表单状态
  const [formType, setFormType] = useState<PubType>('video')
  const [formPlatform, setFormPlatform] = useState('douyin')
  const [formSource, setFormSource] = useState<'link' | 'upload'>('link')
  const [formUrl, setFormUrl] = useState('')
  const [formFile, setFormFile] = useState<File | null>(null)
  const [formPublishedAt, setFormPublishedAt] = useState('')

  const addMutation = useMutation({
    mutationFn: async () => {
      const pub = await createPublication(scriptId, {
        type: formType,
        source: formSource,
        platform: formPlatform,
        external_url: formSource === 'link' ? formUrl.trim() : null,
        published_at: formPublishedAt ? new Date(formPublishedAt).toISOString() : null,
      })
      // upload 流程:建完记录再拿预签名 URL 直传 R2
      if (formSource === 'upload' && formFile) {
        await uploadFile(pub.id, formFile)
      }
      return pub
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publications', scriptId] })
      setShowAdd(false)
      setFormUrl('')
      setFormFile(null)
      setFormPublishedAt('')
    },
  })

  const pubs = pubsQuery.data ?? []
  const staleCount = pubs.filter(isStale).length
  const selectedPub = pubs.find((p) => p.id === selectedPubId) ?? null

  const canSubmit =
    formSource === 'link' ? formUrl.trim().length > 0 : formFile !== null

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">发布物</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="rounded bg-gray-900 px-2.5 py-1 text-sm text-white hover:bg-gray-700"
        >
          + 添加发布物
        </button>
      </div>

      {staleCount > 0 && (
        <div className="mb-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          有 {staleCount} 个发布物超过 {STALE_DAYS} 天没更新数据了,记得回填
        </div>
      )}

      {pubsQuery.isPending && <p className="text-sm text-gray-400">加载中…</p>}
      {pubsQuery.isError && (
        <p className="text-sm text-red-500">加载失败:{pubsQuery.error.message}</p>
      )}
      {pubs.length === 0 && !pubsQuery.isPending && (
        <p className="text-sm text-gray-400">
          还没有发布物。发布到平台后,把链接挂到这里开始追踪数据。
        </p>
      )}

      <ul className="space-y-2">
        {pubs.map((pub) => (
          <li key={pub.id}>
            <button
              onClick={() =>
                setSelectedPubId(pub.id === selectedPubId ? null : pub.id)
              }
              className={`w-full rounded border px-3 py-2 text-left text-sm ${
                pub.id === selectedPubId
                  ? 'border-gray-900 bg-white'
                  : 'border-gray-200 bg-white hover:border-gray-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {PLATFORM_LABEL[pub.platform] ?? pub.platform}
                </span>
                <span className="text-xs text-gray-400">
                  {pub.type === 'video' ? '视频' : '图文'}
                </span>
                {pub.platform === 'youtube' && pub.external_id && (
                  <span className="rounded bg-green-50 px-1.5 py-0.5 text-xs text-green-700">
                    自动追踪中
                  </span>
                )}
                {pub.track_status === 'paused' && (
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                    已暂停
                  </span>
                )}
                {isStale(pub) && (
                  <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700">
                    待更新
                  </span>
                )}
                <span className="ml-auto text-xs text-gray-400">
                  {pub.published_at
                    ? new Date(pub.published_at).toLocaleDateString('zh-CN')
                    : ''}
                </span>
              </div>
              <div className="mt-1 flex gap-4 text-xs text-gray-500">
                <span>播放 {fmtNum(pub.latest_metric?.views ?? null)}</span>
                <span>赞 {fmtNum(pub.latest_metric?.likes ?? null)}</span>
                <span>评论 {fmtNum(pub.latest_metric?.comments ?? null)}</span>
                {pub.latest_metric && (
                  <span className="ml-auto">
                    更新于{' '}
                    {new Date(pub.latest_metric.recorded_at).toLocaleDateString('zh-CN')}
                  </span>
                )}
              </div>
            </button>
            {pub.id === selectedPubId && selectedPub && (
              <PublicationDetail
                publication={selectedPub}
                scriptId={scriptId}
                onDeleted={() => setSelectedPubId(null)}
              />
            )}
          </li>
        ))}
      </ul>

      {showAdd && (
        <Modal title="添加发布物" onClose={() => setShowAdd(false)}>
          <div className="space-y-3">
            <div className="flex gap-2">
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as PubType)}
                className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm"
              >
                <option value="video">视频</option>
                <option value="image_text">图文</option>
              </select>
              <select
                value={formPlatform}
                onChange={(e) => setFormPlatform(e.target.value)}
                className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm"
              >
                <option value="douyin">抖音</option>
                <option value="xiaohongshu">小红书</option>
                <option value="youtube">YouTube</option>
              </select>
            </div>

            <div className="flex gap-3 text-sm">
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  checked={formSource === 'link'}
                  onChange={() => setFormSource('link')}
                />
                贴链接
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  checked={formSource === 'upload'}
                  onChange={() => setFormSource('upload')}
                />
                上传文件
              </label>
            </div>

            {formSource === 'link' ? (
              <input
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="发布后的链接(YouTube 链接会自动开启数据追踪)"
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
              />
            ) : (
              <input
                type="file"
                onChange={(e) => setFormFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm"
              />
            )}

            <label className="block text-sm text-gray-500">
              发布时间(可选)
              <input
                type="datetime-local"
                value={formPublishedAt}
                onChange={(e) => setFormPublishedAt(e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
              />
            </label>

            {addMutation.isError && (
              <p className="text-sm text-red-500">{addMutation.error.message}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAdd(false)}
                className="rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
              >
                取消
              </button>
              <button
                disabled={!canSubmit || addMutation.isPending}
                onClick={() => addMutation.mutate()}
                className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-700 disabled:opacity-40"
              >
                {addMutation.isPending ? '提交中…' : '添加'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
