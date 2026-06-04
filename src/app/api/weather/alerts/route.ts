import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import {
  countDistinctOrpsInSet,
  countRecordsInOrpSet,
  treeCountPerAlert,
} from '@/lib/chmi-cap-affected'
import { fetchCapFeed } from '@/lib/chmi-cap-cache'
import { unionOrpCodes } from '@/lib/chmi-cap-parse'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if ('error' in auth) return auth.error

  try {
  const feed = await fetchCapFeed()
  // #region agent log
  fetch('http://127.0.0.1:7523/ingest/0259359b-fd4a-4d37-9a15-91386e6888b7',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'dc463d'},body:JSON.stringify({sessionId:'dc463d',location:'weather/alerts/route.ts:feed',message:'CAP feed loaded',data:{hasFeed:Boolean(feed),alertCount:feed?.alerts?.length??0},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  if (!feed) {
    return NextResponse.json({
      active: false,
      error: 'unavailable',
      alerts: [],
      affectedTreeCount: 0,
      affectedOrpCount: 0,
      recordsWithoutOrp: 0,
      fetchedAt: null,
    })
  }

  const alerts = feed.alerts
  if (alerts.length === 0) {
    const recordsWithoutOrp = await db.treeRecord.count({
      where: { createdById: auth.userId, orpKod: null },
    })
    return NextResponse.json({
      active: false,
      alerts: [],
      affectedTreeCount: 0,
      affectedOrpCount: 0,
      recordsWithoutOrp,
      fetchedAt: new Date().toISOString(),
    })
  }

  const orpUnion = unionOrpCodes(alerts)
  const userRecords = await db.treeRecord.findMany({
    where: { createdById: auth.userId },
    select: { orpKod: true },
  })

  const affectedTreeCount = countRecordsInOrpSet(userRecords, orpUnion)
  const affectedOrpCount = countDistinctOrpsInSet(userRecords, orpUnion)
  const recordsWithoutOrp = userRecords.filter((r) => r.orpKod == null).length

  const alertsForUi = alerts.map((alert) => ({
    id: alert.id,
    event: alert.event,
    severity: alert.severity,
    orpCount: alert.orpCodes.length,
    treeCount: treeCountPerAlert(userRecords, alert),
  }))

  // #region agent log
  fetch('http://127.0.0.1:7523/ingest/0259359b-fd4a-4d37-9a15-91386e6888b7',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'dc463d'},body:JSON.stringify({sessionId:'dc463d',location:'weather/alerts/route.ts:ok',message:'alerts response ok',data:{active:true,affectedTreeCount,affectedOrpCount},timestamp:Date.now(),hypothesisId:'A',runId:'post-fix'})}).catch(()=>{});
  // #endregion
  return NextResponse.json({
    active: true,
    alerts: alertsForUi,
    affectedTreeCount,
    affectedOrpCount,
    recordsWithoutOrp,
    fetchedAt: new Date().toISOString(),
  })
  } catch (err) {
    const name = err instanceof Error ? err.name : 'unknown'
    const message = err instanceof Error ? err.message.slice(0, 200) : String(err)
    // #region agent log
    fetch('http://127.0.0.1:7523/ingest/0259359b-fd4a-4d37-9a15-91386e6888b7',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'dc463d'},body:JSON.stringify({sessionId:'dc463d',location:'weather/alerts/route.ts:error',message:'alerts route failed',data:{name,message},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    console.error('GET /api/weather/alerts failed:', err)
    return NextResponse.json(
      { error: 'Internal server error', detail: name === 'PrismaClientValidationError' ? 'schema_client_mismatch' : 'unknown' },
      { status: 500 }
    )
  }
}
