// Service sự cố. Sau này: GET/PATCH /api/incidents
import { createStore } from './store'
import { seedIncidents, type Incident } from './mock/incidents'

const store = createStore<Incident>('incidents', seedIncidents)

export const incidentsApi = {
  list: async (): Promise<Incident[]> => structuredClone(store.all()),
  update: async (id: string, patch: Partial<Incident>) => structuredClone(store.update(id, patch)),
}
export type { Incident }
