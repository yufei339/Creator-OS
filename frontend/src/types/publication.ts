// 对应后端 PublicationOut / MetricOut

export type PubType = 'video' | 'image_text'
export type PubSource = 'link' | 'upload'
export type TrackStatus = 'active' | 'paused'

export interface Metric {
  id: string
  publication_id: string
  views: number | null
  completion_rate: number | null
  likes: number | null
  comments: number | null
  shares: number | null
  saves: number | null
  collected_by: 'auto' | 'manual'
  recorded_at: string
}

export interface Publication {
  id: string
  script_id: string
  type: PubType
  source: PubSource
  platform: string
  external_url: string | null
  storage_key: string | null
  external_id: string | null
  track_status: TrackStatus
  published_at: string | null
  created_at: string
  latest_metric: Metric | null
}

export interface MetricCreate {
  views?: number | null
  likes?: number | null
  comments?: number | null
  shares?: number | null
  saves?: number | null
  completion_rate?: number | null
}
