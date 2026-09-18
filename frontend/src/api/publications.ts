import axios from 'axios'
import { client } from './client'
import type {
  Metric,
  MetricCreate,
  Publication,
  PubType,
  TrackStatus,
} from '../types/publication'

export async function listPublications(scriptId: string): Promise<Publication[]> {
  const res = await client.get<Publication[]>(`/scripts/${scriptId}/publications`)
  return res.data
}

export async function createPublication(
  scriptId: string,
  body: {
    type: PubType
    source: 'link' | 'upload'
    platform: string
    external_url?: string | null
    published_at?: string | null
  },
): Promise<Publication> {
  const res = await client.post<Publication>(`/scripts/${scriptId}/publications`, body)
  return res.data
}

export async function updatePublication(
  id: string,
  body: { track_status: TrackStatus },
): Promise<Publication> {
  const res = await client.patch<Publication>(`/publications/${id}`, body)
  return res.data
}

export async function deletePublication(id: string): Promise<void> {
  await client.delete(`/publications/${id}`)
}

export async function listMetrics(publicationId: string): Promise<Metric[]> {
  const res = await client.get<Metric[]>(`/publications/${publicationId}/metrics`)
  return res.data
}

export async function createMetric(
  publicationId: string,
  body: MetricCreate,
): Promise<Metric> {
  const res = await client.post<Metric>(`/publications/${publicationId}/metrics`, body)
  return res.data
}

/** source=upload 的发布物:拿预签名 PUT url,把文件直传 R2(不经过后端)。 */
export async function uploadFile(publicationId: string, file: File): Promise<string> {
  const contentType = file.type || 'application/octet-stream'
  const res = await client.post<{ upload_url: string; storage_key: string }>(
    `/publications/${publicationId}/upload-url`,
    { content_type: contentType },
  )
  // 直传 R2,用裸 axios(不能带 client 的 baseURL / 拦截器)
  await axios.put(res.data.upload_url, file, {
    headers: { 'Content-Type': contentType },
  })
  return res.data.storage_key
}
