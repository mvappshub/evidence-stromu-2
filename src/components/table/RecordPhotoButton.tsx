'use client'

import { useState } from 'react'
import { Camera, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { RecordEditDraft } from '@/components/table/use-record-edit-draft'

export function RecordPhotoButton({
  draft,
  onPhotoPath,
}: {
  draft: RecordEditDraft
  onPhotoPath: (path: string | null) => void
}) {
  const [uploading, setUploading] = useState(false)

  const upload = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('photo', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('fail')
      const data = await res.json()
      onPhotoPath(data.path)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="size-6" type="button" title="Fotografie">
          {uploading ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Camera className={`size-3 ${draft.photoPath ? 'text-[#58a6ff]' : ''}`} />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2 rounded-sm" align="start" onClick={(e) => e.stopPropagation()}>
        {draft.photoPath ? (
          <div className="space-y-2">
            <img src={draft.photoPath} alt="" className="w-full max-h-24 object-cover border border-border" />
            <div className="flex gap-1">
              <label className="text-[10px] px-2 py-1 border border-border cursor-pointer hover:bg-accent">
                změnit
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) upload(f)
                  }}
                />
              </label>
              <button
                type="button"
                className="text-[10px] px-2 py-1 text-destructive hover:bg-accent"
                onClick={() => onPhotoPath(null)}
              >
                <X className="size-3 inline" />
              </button>
            </div>
          </div>
        ) : (
          <label className="block text-center text-[10px] text-muted-foreground cursor-pointer py-3 border border-dashed border-border hover:bg-accent">
            nahrát foto
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) upload(f)
              }}
            />
          </label>
        )}
      </PopoverContent>
    </Popover>
  )
}
