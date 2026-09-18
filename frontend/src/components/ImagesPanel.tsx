import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getFeatures } from '../api/features'
import { deleteImage, generateImage, listImages, type ScriptImage } from '../api/images'

interface ImagesPanelProps {
  scriptId: string
}

/** 配图区域:prompt 生图 + 图片网格(点击放大、可删、显示 prompt)。 */
export default function ImagesPanel({ scriptId }: ImagesPanelProps) {
  const queryClient = useQueryClient()
  const featuresQuery = useQuery({ queryKey: ['features'], queryFn: getFeatures })
  const enabled = featuresQuery.data?.image_gen ?? false

  const imagesQuery = useQuery({
    queryKey: ['images', scriptId],
    queryFn: () => listImages(scriptId),
    enabled,
  })

  const [prompt, setPrompt] = useState('')
  const generateMutation = useMutation({
    mutationFn: () => generateImage(scriptId, prompt.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['images', scriptId] })
      setPrompt('')
    },
  })

  const [zoomed, setZoomed] = useState<ScriptImage | null>(null)
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteImage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['images', scriptId] })
      setZoomed(null)
    },
  })

  if (featuresQuery.isPending) {
    return <div className="flex-1 bg-gray-50 p-4 text-sm text-gray-400">加载中…</div>
  }

  // 生图未启用(A3 暂停):占位说明,不报错
  if (!enabled) {
    return (
      <div className="flex flex-1 items-center justify-center bg-gray-50 p-8">
        <div className="max-w-sm text-center">
          <p className="text-3xl">🎨</p>
          <p className="mt-2 font-medium text-gray-600">AI 生图未启用</p>
          <p className="mt-2 text-sm text-gray-400">
            在后端 .env 配置 R2 存储和生图 API key(IMAGE_API_KEY)后,这里就能按
            prompt 为脚本生成配图。
          </p>
        </div>
      </div>
    )
  }

  const images = imagesQuery.data ?? []

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
      {/* 生图输入行 */}
      <div className="flex gap-2">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && prompt.trim() && !generateMutation.isPending) {
              generateMutation.mutate()
            }
          }}
          placeholder="描述想要的画面,如:秋日街头,卡其色风衣,胶片质感"
          className="flex-1 rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        />
        <button
          disabled={!prompt.trim() || generateMutation.isPending}
          onClick={() => generateMutation.mutate()}
          className="rounded bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700 disabled:opacity-40"
        >
          {generateMutation.isPending ? '生成中…(约 10-30 秒)' : '生成'}
        </button>
      </div>
      {generateMutation.isError && (
        <p className="mt-2 text-sm text-red-500">
          生成失败:{generateMutation.error.message}
        </p>
      )}

      {/* 图片网格 */}
      {imagesQuery.isPending && <p className="mt-4 text-sm text-gray-400">加载图片中…</p>}
      {imagesQuery.isError && (
        <p className="mt-4 text-sm text-red-500">加载失败:{imagesQuery.error.message}</p>
      )}
      {images.length === 0 && !imagesQuery.isPending && !imagesQuery.isError && (
        <p className="mt-4 text-sm text-gray-400">还没有配图,输入 prompt 生成第一张。</p>
      )}
      <div className="mt-4 grid grid-cols-3 gap-3">
        {images.map((img) => (
          <figure key={img.id} className="group">
            <button onClick={() => setZoomed(img)} className="block w-full">
              {img.url && (
                <img
                  src={img.url}
                  alt={img.prompt ?? ''}
                  className="aspect-square w-full rounded border border-gray-200 object-cover transition group-hover:opacity-90"
                />
              )}
            </button>
            <figcaption
              className="mt-1 truncate text-xs text-gray-400"
              title={img.prompt ?? ''}
            >
              {img.prompt}
            </figcaption>
          </figure>
        ))}
      </div>

      {/* 放大查看 */}
      {zoomed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-8"
          onClick={() => setZoomed(null)}
        >
          <div
            className="max-h-full max-w-3xl overflow-auto rounded-lg bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {zoomed.url && (
              <img src={zoomed.url} alt={zoomed.prompt ?? ''} className="max-w-full" />
            )}
            <div className="mt-3 flex items-start justify-between gap-4">
              <p className="text-sm text-gray-600">{zoomed.prompt}</p>
              <button
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(zoomed.id)}
                className="shrink-0 rounded border border-red-200 px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 disabled:opacity-40"
              >
                {deleteMutation.isPending ? '删除中…' : '删除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 生成中的骨架占位 */}
      {generateMutation.isPending && (
        <div className="mt-3 flex items-center gap-2 text-sm text-gray-400">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
          正在调用生图服务…
        </div>
      )}
    </div>
  )
}
