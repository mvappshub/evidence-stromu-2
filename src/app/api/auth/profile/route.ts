import { NextRequest, NextResponse } from "next/server"
import { hash, compare } from "bcryptjs"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"

const profileSchema = z.object({
  name: z.string().min(1, "Zadejte jméno").optional(),
  currentPassword: z.string().min(1, "Zadejte aktuální heslo").optional(),
  newPassword: z.string().min(6, "Nové heslo musí mít alespoň 6 znaků").optional(),
}).refine((data) => {
  // If changing password, both current and new are required
  if (data.newPassword && !data.currentPassword) return false
  return true
}, { message: "Pro změnu hesla zadejte aktuální heslo" })

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request)
  if ("error" in auth) return auth.error

  try {
    const body = await request.json()
    const result = profileSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
    }

    const { name, currentPassword, newPassword } = result.data

    // If changing password, verify current password
    if (currentPassword && newPassword) {
      const user = await db.user.findUnique({ where: { id: auth.userId } })
      if (!user) {
        return NextResponse.json({ error: "Uživatel nenalezen" }, { status: 404 })
      }
      const isValid = await compare(currentPassword, user.passwordHash)
      if (!isValid) {
        return NextResponse.json({ error: "Nesprávné aktuální heslo" }, { status: 401 })
      }
      const hashedPassword = await hash(newPassword, 10)
      await db.user.update({
        where: { id: auth.userId },
        data: { passwordHash: hashedPassword },
      })
    }

    // Update name if provided
    if (name) {
      await db.user.update({
        where: { id: auth.userId },
        data: { name },
      })
    }

    // Return updated user
    const updatedUser = await db.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, email: true, name: true },
    })

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error("Profile update error:", error)
    return NextResponse.json({ error: "Chyba při aktualizaci profilu" }, { status: 500 })
  }
}
