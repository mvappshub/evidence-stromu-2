export interface TreeRecord {
  recordNumber: number
  plantedAt: string // ISO date
  speciesLatin: string
  lat: number
  lng: number
  locality: string | null
  photoPath: string | null
  note: string | null
  createdById: string
  createdAt: string
  updatedAt: string
  reminders?: Reminder[]
}

export interface Reminder {
  id: string
  text: string
  mode: "interval" | "date"
  intervalNum: number | null
  intervalUnit: "day" | "week" | "month" | "year" | null
  startAt: string | null
  dueAt: string | null
  nextDueAt: string
  active: boolean
  recordNumber: number
  createdAt: string
}

export type ViewMode = "map" | "list" | "both"

export interface RecordsResponse {
  records: TreeRecord[]
  count: number
  limit: number
  offset: number
}
