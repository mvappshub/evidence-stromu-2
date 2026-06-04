import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

export async function requireAuth(_req?: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user) {
    return { userId: (session.user as Record<string, unknown>).id as string }
  }

  return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
}
