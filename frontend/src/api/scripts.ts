import { client } from './client'
import type { Script, ScriptVersion } from '../types/script'

export async function listScripts(series?: string): Promise<Script[]> {
  const res = await client.get<Script[]>('/scripts', {
    params: series ? { series } : undefined,
  })
  return res.data
}

export async function getScript(id: string): Promise<Script> {
  const res = await client.get<Script>(`/scripts/${id}`)
  return res.data
}

export async function createScript(body: {
  title: string
  content?: string
  series?: string | null
  tags?: string[]
}): Promise<Script> {
  const res = await client.post<Script>('/scripts', body)
  return res.data
}

export async function updateScript(
  id: string,
  body: Partial<Pick<Script, 'title' | 'content' | 'status' | 'series' | 'tags'>>,
): Promise<Script> {
  const res = await client.patch<Script>(`/scripts/${id}`, body)
  return res.data
}

export async function deleteScript(id: string): Promise<void> {
  await client.delete(`/scripts/${id}`)
}

export async function listVersions(scriptId: string): Promise<ScriptVersion[]> {
  const res = await client.get<ScriptVersion[]>(`/scripts/${scriptId}/versions`)
  return res.data
}

export async function createVersion(
  scriptId: string,
  body: { content: string; change_note?: string | null },
): Promise<ScriptVersion> {
  const res = await client.post<ScriptVersion>(`/scripts/${scriptId}/versions`, body)
  return res.data
}

export async function restoreVersion(
  scriptId: string,
  versionId: string,
): Promise<Script> {
  const res = await client.post<Script>(`/scripts/${scriptId}/restore/${versionId}`)
  return res.data
}
