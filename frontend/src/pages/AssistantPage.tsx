import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getFeatures } from '../api/features'

/**
 * AI 建议台。学习层(后端 A6)未启用时显示占位说明;
 * 启用后这里接 POST /scripts/{id}/suggest 和 POST /scripts/generate。
 */
export default function AssistantPage() {
  const featuresQuery = useQuery({ queryKey: ['features'], queryFn: getFeatures })
  const enabled = featuresQuery.data?.learning ?? false

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      <aside className="flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-4">
          <h1 className="text-lg font-semibold">Creator OS</h1>
        </div>
        <nav className="p-2">
          <Link
            to="/"
            className="block rounded px-2 py-1.5 text-sm text-gray-800 hover:bg-gray-100"
          >
            ← 返回脚本库
          </Link>
        </nav>
      </aside>

      <main className="flex flex-1 items-center justify-center p-8">
        {enabled ? (
          <p className="text-gray-500">学习层已启用(界面待接入 A6 接口)</p>
        ) : (
          <div className="max-w-md text-center">
            <p className="text-3xl">🤖</p>
            <p className="mt-2 font-medium text-gray-600">学习层未启用</p>
            <p className="mt-3 text-sm leading-relaxed text-gray-400">
              这里将来会基于你积累的高表现脚本和发布数据,给出脚本优化建议、
              按选题生成符合你风格的新草稿(后端任务卡 A6)。
              <br />
              先用工具攒数据——脚本多了、发布数据多了,建议才有含金量。
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
