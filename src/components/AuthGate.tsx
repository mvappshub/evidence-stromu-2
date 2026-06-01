'use client'

import { SessionProvider, useSession, signIn } from 'next-auth/react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TreePine, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const loginSchema = z.object({
  email: z.string().email('Zadejte platný e-mail'),
  password: z.string().min(1, 'Zadejte heslo'),
})

const registerSchema = z.object({
  name: z.string().min(1, 'Zadejte jméno'),
  email: z.string().email('Zadejte platný e-mail'),
  password: z.string().min(6, 'Heslo musí mít alespoň 6 znaků'),
  passwordConfirm: z.string().min(1, 'Potvrďte heslo'),
}).refine((data) => data.password === data.passwordConfirm, {
  message: 'Hesla se neshodují',
  path: ['passwordConfirm'],
})

type LoginForm = z.infer<typeof loginSchema>
type RegisterForm = z.infer<typeof registerSchema>

function AuthGateInner({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const [loginLoading, setLoginLoading] = useState(false)
  const [registerLoading, setRegisterLoading] = useState(false)

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', passwordConfirm: '' },
  })

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (session) {
    return <>{children}</>
  }

  const onLogin = async (data: LoginForm) => {
    setLoginLoading(true)
    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      })
      if (result?.error) {
        toast.error('Neplatný e-mail nebo heslo')
      }
    } catch {
      toast.error('Chyba při přihlášení')
    } finally {
      setLoginLoading(false)
    }
  }

  const onRegister = async (data: RegisterForm) => {
    setRegisterLoading(true)
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email, password: data.password, name: data.name }),
      })

      if (!res.ok) {
        const body = await res.json()
        if (res.status === 409) {
          toast.error('Tento e-mail je již registrován')
        } else {
          toast.error(body.error || 'Chyba při registraci')
        }
        return
      }

      toast.success('Registrace úspěšná, přihlašte se')

      // Auto sign in after registration
      await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      })
    } catch {
      toast.error('Chyba při registraci')
    } finally {
      setRegisterLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-green-50 via-background to-emerald-50 dark:from-background dark:via-background dark:to-green-950/20">
      <Card className="w-full max-w-sm shadow-xl border-green-200/50 dark:border-green-900/30">
        <CardHeader className="text-center space-y-2 pb-2">
          <div className="flex items-center justify-center gap-2.5 mb-1">
            <div className="size-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
              <TreePine className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <CardTitle className="text-xl tracking-tight">Evidenční systém výsadby</CardTitle>
          <p className="text-xs text-muted-foreground">Evidence výsadby a údržby stromů</p>
        </CardHeader>
        <CardContent className="pt-2">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Přihlášení</TabsTrigger>
              <TabsTrigger value="register">Registrace</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-4">
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">E-mail</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="vas@email.cz"
                    autoComplete="email"
                    {...loginForm.register('email')}
                  />
                  {loginForm.formState.errors.email && (
                    <p className="text-sm text-destructive">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">Heslo</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••"
                    autoComplete="current-password"
                    {...loginForm.register('password')}
                  />
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={loginLoading}>
                  {loginLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Přihlásit se
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="mt-4">
              <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-name">Jméno</Label>
                  <Input
                    id="reg-name"
                    type="text"
                    placeholder="Jan Novák"
                    autoComplete="name"
                    {...registerForm.register('name')}
                  />
                  {registerForm.formState.errors.name && (
                    <p className="text-sm text-destructive">{registerForm.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-email">E-mail</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="vas@email.cz"
                    autoComplete="email"
                    {...registerForm.register('email')}
                  />
                  {registerForm.formState.errors.email && (
                    <p className="text-sm text-destructive">{registerForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-password">Heslo</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    placeholder="••••••"
                    autoComplete="new-password"
                    {...registerForm.register('password')}
                  />
                  {registerForm.formState.errors.password && (
                    <p className="text-sm text-destructive">{registerForm.formState.errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-password-confirm">Potvrdit heslo</Label>
                  <Input
                    id="reg-password-confirm"
                    type="password"
                    placeholder="••••••"
                    autoComplete="new-password"
                    {...registerForm.register('passwordConfirm')}
                  />
                  {registerForm.formState.errors.passwordConfirm && (
                    <p className="text-sm text-destructive">{registerForm.formState.errors.passwordConfirm.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={registerLoading}>
                  {registerLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Registrovat se
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthGateInner>{children}</AuthGateInner>
    </SessionProvider>
  )
}
