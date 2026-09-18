// 对应后端 ScriptOut / VersionOut 的返回结构

export type ScriptStatus = 'draft' | 'ready' | 'shot' | 'published'

export interface Script {
  id: string
  title: string
  content: string
  status: ScriptStatus
  series: string | null
  tags: string[]
  created_at: string
  updated_at: string
}

export interface ScriptVersion {
  id: string
  script_id: string
  content: string
  change_note: string | null
  created_at: string
}
