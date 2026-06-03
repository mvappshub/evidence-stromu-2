'use client'

import { Input } from '@/components/ui/input'
import type { RecordEditDraft, RecordsTableMeta } from '@/components/table/use-record-edit-draft'

type EditableInputField = 'speciesLatin' | 'plantedAt' | 'locality' | 'note'

type RecordsTableEditInputProps = {
  meta: RecordsTableMeta
  field: EditableInputField
  type?: 'date' | 'text'
  className?: string
  placeholder?: string
}

export function RecordsTableEditInput({
  meta,
  field,
  type = 'text',
  className,
  placeholder,
}: RecordsTableEditInputProps) {
  const draft = meta.draft!
  return (
    <Input
      type={type}
      className={className}
      placeholder={placeholder}
      value={draft[field]}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => meta.patchField(field, e.target.value)}
    />
  )
}
