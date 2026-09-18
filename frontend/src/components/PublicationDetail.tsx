import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  createMetric,
  deletePublication,
  listMetrics,
  updatePublication,
} from '../api/publications'
import type { Metric, Publication } from '../types/publication'
import Modal from './Modal'

interface PublicationDetailProps {
  publication: Publication
  scriptId: string
  onDeleted: () => void
}

// 图表用色:经 dataviz 校验的类别色前两槽(白底通过全部检查)
const COLOR_VIEWS = '#2a78d6'
const COLOR_LIKES = '#008300'
const COLOR_GRID = '#e1e0d9'
const COLOR_MUTED = '#898781'

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

/** 单序列迷你曲线图。一个指标一张图、单 Y 轴(不做双轴)。 */
function MetricChart({
  data,
  dataKey,
  color,
  title,
}: {
  data: Metric[]
  dataKey: 'views' | 'likes'
  color: string
  title: string
}) {
  const points = data.filter((m) => m[dataKey] !== null)
  if (points.length < 2) return null
  return (
    <div className="mt-3">
      <p className="mb-1 text-xs font-medium text-gray-500">{title}</p>
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={points} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={COLOR_GRID} strokeDasharray="0" vertical={false} />
          <XAxis
            dataKey="recorded_at"
            tickFormatter={fmtDate}
            tick={{ fontSize: 11, fill: COLOR_MUTED }}
            tickLine={false}
            axisLine={{ stroke: COLOR_GRID }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: COLOR_MUTED }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip
            labelFormatter={(v) => new Date(String(v)).toLocaleString('zh-CN')}
            formatter={(value) => [String(value), title]}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={{ r: 3, fill: color }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

const METRIC_FIELDS = [
  { key: 'views', label: '播放量' },
  { key: 'likes', label: '点赞' },
  { key: 'comments', label: '评论' },
  { key: 'shares', label: '转发' },
  { key: 'saves', label: '收藏' },
  { key: 'completion_rate', label: '完播率(0-1)' },
] as const

/** 发布物详情:数据曲线 + 手动回填表单 + 暂停/删除。 */
export default function PublicationDetail({
  publication: pub,
  scriptId,
  onDeleted,
}: PublicationDetailProps) {
  const queryClient = useQueryClient()
  const metricsQuery = useQuery({
    queryKey: ['metrics', pub.id],
    queryFn: () => listMetrics(pub.id),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['metrics', pub.id] })
    queryClient.invalidateQueries({ queryKey: ['publications', scriptId] })
  }

  const [form, setForm] = useState<Record<string, string>>({})
  const metricMutation = useMutation({
    mutationFn: () =>
      createMetric(pub.id, {
        views: form.views ? Number(form.views) : null,
        likes: form.likes ? Number(form.likes) : null,
        comments: form.comments ? Number(form.comments) : null,
        shares: form.shares ? Number(form.shares) : null,
        saves: form.saves ? Number(form.saves) : null,
        completion_rate: form.completion_rate ? Number(form.completion_rate) : null,
      }),
    onSuccess: () => {
      invalidate()
      setForm({})
    },
  })

  const toggleMutation = useMutation({
    mutationFn: () =>
      updatePublication(pub.id, {
        track_status: pub.track_status === 'active' ? 'paused' : 'active',
      }),
    onSuccess: invalidate,
  })

  const [showDelete, setShowDelete] = useState(false)
  const deleteMutation = useMutation({
    mutationFn: () => deletePublication(pub.id),
    onSuccess: () => {
      invalidate()
      onDeleted()
    },
  })

  // 曲线按时间正序画
  const metricsAsc = [...(metricsQuery.data ?? [])].reverse()
  const isAutoTracked = pub.platform === 'youtube' && !!pub.external_id

  return (
    <div className="mt-1 rounded border border-gray-200 bg-white p-3">
      {/* 操作行 */}
      <div className="flex items-center gap-2 text-sm">
        {pub.external_url && (
          <a
            href={pub.external_url}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline"
          >
            打开链接 ↗
          </a>
        )}
        <button
          onClick={() => toggleMutation.mutate()}
          disabled={toggleMutation.isPending}
          className="ml-auto rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100"
        >
          {pub.track_status === 'active' ? '暂停追踪' : '恢复追踪'}
        </button>
        <button
          onClick={() => setShowDelete(true)}
          className="rounded border border-red-200 px-2 py-1 text-xs text-red-500 hover:bg-red-50"
        >
          删除
        </button>
      </div>

      {/* 数据曲线 */}
      {metricsQuery.isPending && <p className="mt-2 text-sm text-gray-400">加载数据中…</p>}
      {metricsAsc.length < 2 && !metricsQuery.isPending && (
        <p className="mt-2 text-sm text-gray-400">
          {metricsAsc.length === 0
            ? '还没有数据记录。'
            : '只有一条数据,再记录一次就能画出增长曲线。'}
        </p>
      )}
      <MetricChart data={metricsAsc} dataKey="views" color={COLOR_VIEWS} title="播放量" />
      <MetricChart data={metricsAsc} dataKey="likes" color={COLOR_LIKES} title="点赞" />

      {/* 手动回填(YouTube 自动追踪则提示) */}
      {isAutoTracked ? (
        <p className="mt-3 rounded bg-green-50 px-3 py-2 text-xs text-green-700">
          YouTube 数据每天自动同步,无需手动回填。
        </p>
      ) : (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <p className="mb-2 text-xs font-medium text-gray-500">手动更新数据</p>
          <div className="grid grid-cols-3 gap-2">
            {METRIC_FIELDS.map((f) => (
              <input
                key={f.key}
                type="number"
                placeholder={f.label}
                value={form[f.key] ?? ''}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                className="rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-gray-500 focus:outline-none"
              />
            ))}
          </div>
          {metricMutation.isError && (
            <p className="mt-2 text-xs text-red-500">{metricMutation.error.message}</p>
          )}
          <button
            disabled={
              metricMutation.isPending || !Object.values(form).some((v) => v !== '')
            }
            onClick={() => metricMutation.mutate()}
            className="mt-2 rounded bg-gray-900 px-3 py-1.5 text-xs text-white hover:bg-gray-700 disabled:opacity-40"
          >
            {metricMutation.isPending ? '记录中…' : '记录一条数据'}
          </button>
        </div>
      )}

      {showDelete && (
        <Modal title="删除发布物" onClose={() => setShowDelete(false)}>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              确定删除这条发布物?它的全部数据记录会一并删除。
            </p>
            {deleteMutation.isError && (
              <p className="text-sm text-red-500">{deleteMutation.error.message}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDelete(false)}
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
