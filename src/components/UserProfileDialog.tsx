'use client'

import { useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2, User, Lock, Mail, Save } from 'lucide-react'
import { toast } from 'sonner'

const nameSchema = z.object({
  name: z.string().min(1, 'Zadejte jméno'),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Zadejte aktuální heslo'),
  newPassword: z.string().min(6, 'Nové heslo musí mít alespoň 6 znaků'),
  confirmPassword: z.string().min(1, 'Potvrďte nové heslo'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Hesla se neshodují',
  path: ['confirmPassword'],
})

type NameForm = z.infer<typeof nameSchema>
type PasswordForm = z.infer<typeof passwordSchema>

export function UserProfileDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user, setAuth, token } = useAuthStore()
  const [nameLoading, setNameLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)

  const nameForm = useForm<NameForm>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: user?.name || '' },
  })

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  const onNameSubmit = async (data: NameForm) => {
    setNameLoading(true)
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.name }),
      })
      const result = await res.json()
      if (!res.ok) {
        toast.error(result.error || 'Chyba při aktualizaci jména')
        return
      }
      // Update auth store with new name
      if (token && result.user) {
        setAuth(token, result.user)
      }
      toast.success('Jméno aktualizováno')
    } catch {
      toast.error('Chyba při aktualizaci jména')
    } finally {
      setNameLoading(false)
    }
  }

  const onPasswordSubmit = async (data: PasswordForm) => {
    setPasswordLoading(true)
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: data.currentPassword, newPassword: data.newPassword }),
      })
      const result = await res.json()
      if (!res.ok) {
        toast.error(result.error || 'Chyba při změně hesla')
        return
      }
      toast.success('Heslo změněno')
      passwordForm.reset()
    } catch {
      toast.error('Chyba při změně hesla')
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="size-5 text-green-600" />
            Profil uživatele
          </DialogTitle>
          <DialogDescription>Správa vašeho účtu</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" className="gap-1.5">
              <User className="size-3.5" />
              Profil
            </TabsTrigger>
            <TabsTrigger value="password" className="gap-1.5">
              <Lock className="size-3.5" />
              Heslo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-4">
            <form onSubmit={nameForm.handleSubmit(onNameSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profile-email">E-mail</Label>
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md border">
                  <Mail className="size-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{user?.email}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-name">Jméno</Label>
                <Input
                  id="profile-name"
                  placeholder="Vaše jméno"
                  {...nameForm.register('name')}
                />
                {nameForm.formState.errors.name && (
                  <p className="text-sm text-destructive">{nameForm.formState.errors.name.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={nameLoading}>
                {nameLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Uložit jméno
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="password" className="mt-4">
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Aktuální heslo</Label>
                <Input
                  id="current-password"
                  type="password"
                  placeholder="••••••"
                  {...passwordForm.register('currentPassword')}
                />
                {passwordForm.formState.errors.currentPassword && (
                  <p className="text-sm text-destructive">{passwordForm.formState.errors.currentPassword.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">Nové heslo</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••"
                  {...passwordForm.register('newPassword')}
                />
                {passwordForm.formState.errors.newPassword && (
                  <p className="text-sm text-destructive">{passwordForm.formState.errors.newPassword.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Potvrdit nové heslo</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••"
                  {...passwordForm.register('confirmPassword')}
                />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">{passwordForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={passwordLoading}>
                {passwordLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                Změnit heslo
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
