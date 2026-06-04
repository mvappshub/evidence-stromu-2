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

  const feed = await fetchCapFeed()
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

  return NextResponse.json({
    active: true,
    alerts: alertsForUi,
    affectedTreeCount,
    affectedOrpCount,
    recordsWithoutOrp,
    fetchedAt: new Date().toISOString(),
  })
}
