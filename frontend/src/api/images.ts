import { client } from './client'

export interface ScriptImage {
  id: string
  script_id: string
  storage_key: string
  prompt: string | null
  provider: string | null
  created_at: string
  url: string | null
}

export async function listImages(scriptId: string): Promise<ScriptImage[]> {
  const res = await client.get<ScriptImage[]>(`/scripts/${scriptId}/images`)
  return res.data
}

export async function generateImage(
  scriptId: string,
  prompt: string,
): Promise<ScriptImage> {
  const res = await client.post<ScriptImage>(
    `/scripts/${scriptId}/images/generate`,
    { prompt },
    { timeout: 180_000 }, // 生图慢,单独放宽超时
  )
  return res.data
}

export async function deleteImage(id: string): Promise<void> {
  await client.delete(`/images/${id}`)
}
