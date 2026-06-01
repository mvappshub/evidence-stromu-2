'use client'

import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { format } from 'date-fns'
import { cs } from 'date-fns/locale'
import { czechPlural } from '@/lib/czech-plural'
import type { TreeRecord } from '@/lib/types'

interface PrintViewProps {
  searchQuery: string
  filterSpecies: string
  filterLocality: string
  dateFrom: string | null
  dateTo: string | null
  recordCount: number
}

export function PrintView({
  searchQuery,
  filterSpecies,
  filterLocality,
  dateFrom,
  dateTo,
  recordCount,
}: PrintViewProps) {
  const queryClient = useQueryClient()

  const handlePrint = useCallback(async () => {
    // Build the same query params as the table
    const params = new URLSearchParams()
    if (searchQuery) params.set('search', searchQuery)
    if (filterSpecies) params.set('species', filterSpecies)
    if (filterLocality) params.set('locality', filterLocality)
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)
    params.set('limit', String(Math.min(recordCount, 5000)))
    params.set('offset', '0')
    params.set('sort', 'recordNumber')
    params.set('order', 'desc')

    // Fetch filtered records
    const [recordsRes, statsRes] = await Promise.all([
      fetch(`/api/records?${params.toString()}`),
      fetch('/api/records/stats'),
    ])

    if (!recordsRes.ok || !statsRes.ok) return

    const recordsData = await recordsRes.json()
    const statsData = await statsRes.json()
    const records: TreeRecord[] = recordsData.records ?? []
    const topSpecies = (statsData.speciesBreakdown ?? []).slice(0, 5)

    const now = format(new Date(), 'd. MMMM yyyy', { locale: cs })

    // Build HTML content for the print window
    const html = `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <title>Evidence výsadby stromů</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11px;
      color: #1a1a1a;
      padding: 20mm 15mm;
      background: white;
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 4px;
      color: #15803d;
    }
    .subtitle {
      font-size: 12px;
      color: #666;
      margin-bottom: 16px;
    }
    .summary {
      display: flex;
      gap: 24px;
      margin-bottom: 16px;
      padding: 12px;
      background: #f0fdf4;
      border-radius: 6px;
      border: 1px solid #bbf7d0;
    }
    .summary-item {
      display: flex;
      flex-direction: column;
    }
    .summary-label {
      font-size: 10px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .summary-value {
      font-size: 16px;
      font-weight: 700;
      color: #15803d;
    }
    .species-list {
      margin-bottom: 16px;
      font-size: 11px;
    }
    .species-list span {
      color: #666;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }
    th {
      background: #f5f5f5;
      font-weight: 600;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: #555;
      padding: 6px 8px;
      border-bottom: 2px solid #ddd;
      text-align: left;
    }
    td {
      padding: 5px 8px;
      border-bottom: 1px solid #eee;
      vertical-align: top;
    }
    tr:nth-child(even) td {
      background: #fafafa;
    }
    .species-cell {
      font-style: italic;
    }
    .locality-cell, .note-cell {
      max-width: 150px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .footer {
      margin-top: 24px;
      padding-top: 8px;
      border-top: 1px solid #ddd;
      font-size: 9px;
      color: #999;
      display: flex;
      justify-content: space-between;
    }
    @media print {
      body { padding: 10mm; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <h1>🌳 Evidence výsadby stromů</h1>
  <p class="subtitle">Vytištěno ${now}${searchQuery || filterSpecies || filterLocality || dateFrom || dateTo ? ' • Filtrováno' : ''}</p>

  <div class="summary">
    <div class="summary-item">
      <span class="summary-label">Celkem záznamů</span>
      <span class="summary-value">${recordCount}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Zobrazeno</span>
      <span class="summary-value">${records.length}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Celkem druhů</span>
      <span class="summary-value">${statsData.speciesBreakdown?.length ?? 0}</span>
    </div>
  </div>

  ${topSpecies.length > 0 ? `
  <div class="species-list">
    <strong>Nejčastější druhy:</strong>
    ${topSpecies.map((s: { species: string; count: number }) => `<em>${s.species}</em> (${s.count})`).join(', ')}
  </div>
  ` : ''}

  <table>
    <thead>
      <tr>
        <th>Číslo</th>
        <th>Druh</th>
        <th>Datum</th>
        <th>Lokalita</th>
        <th>Poznámka</th>
      </tr>
    </thead>
    <tbody>
      ${records.map((r: TreeRecord) => `
      <tr>
        <td>#${r.recordNumber}</td>
        <td class="species-cell">${r.speciesLatin}</td>
        <td>${format(new Date(r.plantedAt), 'd.M.yyyy')}</td>
        <td class="locality-cell">${r.locality ?? '—'}</td>
        <td class="note-cell">${r.note ?? '—'}</td>
      </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    <span>Evidence výsadby stromů • ${now}</span>
    <span>Strana 1</span>
  </div>

  <div class="no-print" style="margin-top: 20px; text-align: center;">
    <button onclick="window.print()" style="padding: 8px 24px; font-size: 14px; cursor: pointer; border: 1px solid #ccc; border-radius: 6px; background: #15803d; color: white;">
      🖨️ Tisk
    </button>
    <button onclick="window.close()" style="padding: 8px 24px; font-size: 14px; cursor: pointer; border: 1px solid #ccc; border-radius: 6px; margin-left: 8px;">
      Zavřít
    </button>
  </div>
</body>
</html>`

    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
    }
  }, [searchQuery, filterSpecies, filterLocality, dateFrom, dateTo, recordCount, queryClient])

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={handlePrint}
        >
          <Printer className="size-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">Tisk</TooltipContent>
    </Tooltip>
  )
}
