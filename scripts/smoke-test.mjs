/**
 * API smoke tests — run with dev server: bun run dev && bun run test:smoke
 */
const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3000'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options)
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    // not json
  }
  return { res, json, text }
}

function assert(name, condition, detail = '') {
  if (!condition) {
    console.error(`FAIL: ${name}`, detail)
    process.exitCode = 1
    return false
  }
  console.log(`OK: ${name}`)
  return true
}

async function main() {
  console.log(`Smoke tests against ${BASE}\n`)

  const login = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.SMOKE_EMAIL || 'test@example.com',
      password: process.env.SMOKE_PASSWORD || 'password123',
    }),
  })

  assert('login', login.res.ok && login.json?.token, login.text.slice(0, 200))
  const token = login.json?.token
  if (!token) {
    console.error('Cannot continue without token')
    process.exit(1)
  }

  const auth = { Authorization: `Bearer ${token}` }

  const records = await request('/api/records?limit=1', { headers: auth })
  assert('GET /api/records', records.res.ok)

  const created = await request('/api/records', {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      speciesLatin: 'SmokeTestus botanicus',
      plantedAt: '2024-06-01',
      lat: 50.08,
      lng: 14.42,
      locality: 'Smoke test',
    }),
  })
  assert('POST /api/records', created.res.ok && created.json?.record?.recordNumber)
  const recordNumber = created.json?.record?.recordNumber

  const geoAll = await request('/api/records/geojson', { headers: auth })
  assert('GET geojson all', geoAll.res.ok && geoAll.json?.features)

  const geoFiltered = await request(
    '/api/records/geojson?species=SmokeTestus%20botanicus',
    { headers: auth }
  )
  const filteredCount = geoFiltered.json?.features?.length ?? 0
  assert(
    'GET geojson species filter',
    geoFiltered.res.ok && filteredCount >= 1,
    `count=${filteredCount}`
  )

  if (recordNumber) {
    const reminderCreate = await request('/api/reminders', {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recordNumber,
        text: 'Smoke reminder',
        mode: 'date',
        dueAt: '2030-06-01',
      }),
    })
    assert(
      'POST /api/reminders',
      reminderCreate.res.status === 201 && reminderCreate.json?.reminder?.id,
      reminderCreate.text.slice(0, 200)
    )
    const reminderId = reminderCreate.json?.reminder?.id

    if (reminderId) {
      const reminderPatchText = await request(`/api/reminders/${reminderId}`, {
        method: 'PATCH',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Smoke reminder updated' }),
      })
      assert(
        'PATCH /api/reminders/[id] text',
        reminderPatchText.res.ok &&
          reminderPatchText.json?.reminder?.text === 'Smoke reminder updated',
        reminderPatchText.text.slice(0, 200)
      )

      const reminderPatchDue = await request(`/api/reminders/${reminderId}`, {
        method: 'PATCH',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ dueAt: '2030-07-15' }),
      })
      assert(
        'PATCH /api/reminders/[id] dueAt',
        reminderPatchDue.res.ok && reminderPatchDue.json?.reminder?.dueAt,
        reminderPatchDue.text.slice(0, 200)
      )

      const reminderAck = await request(`/api/reminders/${reminderId}/ack`, {
        method: 'POST',
        headers: auth,
      })
      assert(
        'POST /api/reminders/[id]/ack',
        reminderAck.res.ok && reminderAck.json?.action === 'completed',
        reminderAck.text.slice(0, 200)
      )

      const reminderDelete = await request(`/api/reminders/${reminderId}`, {
        method: 'DELETE',
        headers: auth,
      })
      assert(
        'DELETE /api/reminders/[id]',
        reminderDelete.res.ok &&
          reminderDelete.json?.message === 'Reminder deleted successfully',
        reminderDelete.text.slice(0, 200)
      )
    }

    const bulkDel = await request('/api/records/bulk/delete', {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordNumbers: [recordNumber] }),
    })
    assert('POST bulk/delete', bulkDel.res.ok && bulkDel.json?.deleted === 1)
  }

  const importRes = await request('/api/records/import', {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      records: [
        {
          speciesLatin: 'Importus smoke',
          plantedAt: '2024-01-15',
          lat: 49.2,
          lng: 16.6,
        },
      ],
    }),
  })
  assert('POST import JSON', importRes.res.ok && importRes.json?.imported === 1)

  console.log('\nDone.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
