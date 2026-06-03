import { format } from 'date-fns'
import { cs } from 'date-fns/locale'
import type { TreeRecord } from '@/lib/types'
import {
  formatActiveRecordFilterLabels,
  recordFiltersToQueryString,
  type UiRecordFilters,
} from '@/lib/record-filters-client'

/** Open a print window with filtered records (same filters as table/map). */
export async function openPrintReport(ui: UiRecordFilters): Promise<void> {
  const recordsQuery = recordFiltersToQueryString(ui, {
    limit: '5000',
    offset: '0',
    sort: 'recordNumber',
    order: 'desc',
  })

  const [recordsRes, statsRes] = await Promise.all([
    fetch(`/api/records?${recordsQuery}`),
    fetch('/api/records/stats'),
  ])

  if (!recordsRes.ok || !statsRes.ok) return

  const recordsData = await recordsRes.json()
  const statsData = await statsRes.json()
  const records: TreeRecord[] = recordsData.records ?? []
  const recordCount = (recordsData.count as number) ?? records.length
  const topSpecies = (statsData.speciesBreakdown ?? []).slice(0, 5)

  const now = format(new Date(), 'd. MMMM yyyy', { locale: cs })

  const filterLabels = formatActiveRecordFilterLabels(ui)
  const filterText =
    filterLabels.length > 0 ? filterLabels.join(' · ') : 'Žádný filtr'

  const html = `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <title>Evidence výsadby stromů</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; color: #1a1a1a; padding: 20mm 15mm; background: white; }
    h1 { font-size: 20px; font-weight: 700; margin-bottom: 2px; color: #15803d; }
    .subtitle { font-size: 11px; color: #666; margin-bottom: 4px; }
    .filters { font-size: 10px; color: #888; margin-bottom: 12px; padding: 4px 8px; background: #fafafa; border-radius: 4px; border: 1px solid #eee; }
    .summary { display: flex; gap: 24px; margin-bottom: 12px; padding: 10px 12px; background: #f0fdf4; border-radius: 6px; border: 1px solid #bbf7d0; }
    .summary-item { display: flex; flex-direction: column; }
    .summary-label { font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 0.05em; }
    .summary-value { font-size: 16px; font-weight: 700; color: #15803d; }
    .species-list { margin-bottom: 12px; font-size: 10px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #f5f5f5; font-weight: 600; font-size: 9px; text-transform: uppercase; color: #555; padding: 5px 6px; border-bottom: 2px solid #ddd; text-align: left; }
    td { padding: 4px 6px; border-bottom: 1px solid #eee; }
    tr:nth-child(even) td { background: #fafafa; }
    .species-cell { font-style: italic; }
    .coord-cell { font-family: monospace; font-size: 9px; }
    .footer { margin-top: 20px; padding-top: 8px; border-top: 2px solid #3b82f6; font-size: 9px; color: #999; display: flex; justify-content: space-between; }
    @media print { body { padding: 10mm; } .no-print { display: none; } }
  </style>
</head>
<body>
  <h1>Evidence výsadby stromů</h1>
  <p class="subtitle">Vytištěno ${now}</p>
  <p class="filters">Filtr: ${filterText}</p>
  <div class="summary">
    <div class="summary-item"><span class="summary-label">Celkem záznamů</span><span class="summary-value">${recordCount}</span></div>
    <div class="summary-item"><span class="summary-label">Zobrazeno</span><span class="summary-value">${records.length}</span></div>
    <div class="summary-item"><span class="summary-label">Celkem druhů</span><span class="summary-value">${statsData.speciesBreakdown?.length ?? 0}</span></div>
  </div>
  ${topSpecies.length > 0 ? `<div class="species-list"><strong>Nejčastější druhy:</strong> ${topSpecies.map((s: { species: string; count: number }) => `<em>${s.species}</em> (${s.count})`).join(', ')}</div>` : ''}
  <table>
    <thead><tr><th>Číslo</th><th>Druh</th><th>Datum výsadby</th><th>Lokalita</th><th>Zem. šířka</th><th>Zem. délka</th><th>Poznámka</th></tr></thead>
    <tbody>
      ${records.map((r) => `<tr><td>#${r.recordNumber}</td><td class="species-cell">${r.speciesLatin}</td><td>${format(new Date(r.plantedAt), 'd.M.yyyy')}</td><td>${r.locality ?? '—'}</td><td class="coord-cell">${r.lat.toFixed(6)}</td><td class="coord-cell">${r.lng.toFixed(6)}</td><td>${r.note ?? '—'}</td></tr>`).join('')}
    </tbody>
  </table>
  <div class="footer"><span>Evidence výsadby stromů · ${now}</span><span>Celkem ${recordCount} záznamů</span></div>
  <div class="no-print" style="margin-top:20px;text-align:center;">
    <button onclick="window.print()" style="padding:8px 24px;font-size:14px;cursor:pointer;border:1px solid #ccc;border-radius:6px;background:#15803d;color:white;">Tisk</button>
    <button onclick="window.close()" style="padding:8px 24px;font-size:14px;cursor:pointer;border:1px solid #ccc;border-radius:6px;margin-left:8px;">Zavřít</button>
  </div>
</body>
</html>`

  const printWindow = window.open('', '_blank', 'width=900,height=700')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
  }
}
