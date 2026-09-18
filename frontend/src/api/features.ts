import { client } from './client'

export interface Features {
  image_gen: boolean
  learning: boolean
}

export async function getFeatures(): Promise<Features> {
  const res = await client.get<Features>('/features')
  return res.data
}
