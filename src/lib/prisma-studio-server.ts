import { spawn, type ChildProcess } from 'node:child_process'

const STUDIO_PORT = Number(process.env.PRISMA_STUDIO_PORT) || 5555
export const PRISMA_STUDIO_URL = `http://127.0.0.1:${STUDIO_PORT}`

type StudioGlobal = typeof globalThis & {
  __prismaStudioProcess?: ChildProcess
  __prismaStudioStartPromise?: Promise<void>
}

export async function isPrismaStudioReachable(): Promise<boolean> {
  try {
    const res = await fetch(PRISMA_STUDIO_URL, {
      signal: AbortSignal.timeout(1500),
    })
    return res.status < 500
  } catch {
    return false
  }
}

async function waitForStudio(timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await isPrismaStudioReachable()) return true
    await new Promise((r) => setTimeout(r, 400))
  }
  return false
}

function startStudioProcess(): Promise<void> {
  const g = globalThis as StudioGlobal
  if (g.__prismaStudioStartPromise) {
    return g.__prismaStudioStartPromise
  }

  g.__prismaStudioStartPromise = new Promise((resolve, reject) => {
    if (g.__prismaStudioProcess && g.__prismaStudioProcess.exitCode === null) {
      resolve()
      return
    }

    const child = spawn(
      'npx',
      ['prisma', 'studio', '--port', String(STUDIO_PORT), '--browser', 'none'],
      {
        cwd: process.cwd(),
        detached: true,
        stdio: 'ignore',
        env: process.env,
        shell: process.platform === 'win32',
      }
    )

    child.on('error', (err) => {
      g.__prismaStudioStartPromise = undefined
      reject(err)
    })

    child.unref()
    g.__prismaStudioProcess = child
    resolve()
  })

  return g.__prismaStudioStartPromise
}

/** Start Prisma Studio if needed (dev only). */
export async function ensurePrismaStudioRunning(): Promise<{
  url: string
  started: boolean
}> {
  if (await isPrismaStudioReachable()) {
    return { url: PRISMA_STUDIO_URL, started: false }
  }

  await startStudioProcess()

  const ready = await waitForStudio(30_000)
  if (!ready) {
    throw new Error(
      'Prisma Studio se nespustilo včas. Zkuste v terminálu: bun run db:studio'
    )
  }

  return { url: PRISMA_STUDIO_URL, started: true }
}
