'use client'

import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/useAuthStore'

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

function getPasswordStrength(password: string): { label: string; color: string; width: string } {
  if (!password) return { label: '', color: '', width: 'w-0' }
  let score = 0
  if (password.length >= 6) score++
  if (password.length >= 10) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { label: 'Slabé', color: 'bg-red-500', width: 'w-1/4' }
  if (score <= 2) return { label: 'Střední', color: 'bg-yellow-500', width: 'w-2/4' }
  if (score <= 3) return { label: 'Dobré', color: 'bg-blue-500', width: 'w-3/4' }
  return { label: 'Silné', color: 'bg-primary', width: 'w-full' }
}

function AuthGateInner({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, setAuth, logout } = useAuthStore()
  const [loginLoading, setLoginLoading] = useState(false)
  const [registerLoading, setRegisterLoading] = useState(false)
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showRegPassword, setShowRegPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', passwordConfirm: '' },
  })

  const regPassword = registerForm.watch('password')
  const passwordStrength = useMemo(() => getPasswordStrength(regPassword || ''), [regPassword])

  // Show loading spinner while checking auth state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // If authenticated, show the app
  if (isAuthenticated) {
    return <>{children}</>
  }

  const onLogin = async (data: LoginForm) => {
    setLoginLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email, password: data.password }),
      })

      const result = await res.json()

      if (!res.ok) {
        toast.error(result.error || 'Neplatný e-mail nebo heslo')
        return
      }

      // Store token and user in auth store (persisted to localStorage)
      if (result.token && result.user) {
        localStorage.removeItem("auth-token")
        localStorage.removeItem("auth-user")
        setAuth(result.token, result.user)
        toast.success('Přihlášení úspěšné')
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

      toast.success('Registrace úspěšná')

      // Auto sign in after registration using custom login endpoint
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email, password: data.password }),
      })

      if (loginRes.ok) {
        const loginResult = await loginRes.json()
        if (loginResult.token && loginResult.user) {
          setAuth(loginResult.token, loginResult.user)
        }
      }
    } catch {
      toast.error('Chyba při registraci')
    } finally {
      setRegisterLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <Card className="w-full max-w-sm rounded-sm border border-border shadow-none bg-card">
        <CardHeader className="pb-2 border-b border-border">
          <CardTitle className="text-[13px] font-normal font-mono">evidence-stromu</CardTitle>
          <CardDescription className="text-[11px]">přihlášení</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-auto p-0 bg-transparent border-b rounded-none">
              <TabsTrigger
                value="login"
                className="rounded-none border-b border-transparent data-[state=active]:border-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent py-2 text-[11px] font-mono"
              >
                Přihlášení
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="rounded-none border-b border-transparent data-[state=active]:border-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent py-2 text-[11px] font-mono"
              >
                Registrace
              </TabsTrigger>
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
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showLoginPassword ? 'text' : 'password'}
                      placeholder="••••••"
                      autoComplete="current-password"
                      className="pr-9"
                      {...loginForm.register('password')}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-2.5 hover:bg-transparent"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      tabIndex={-1}
                    >
                      {showLoginPassword ? (
                        <EyeOff className="size-3.5 text-muted-foreground" />
                      ) : (
                        <Eye className="size-3.5 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="remember-me"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked === true)}
                    />
                    <Label htmlFor="remember-me" className="text-xs text-muted-foreground cursor-pointer">Zapamatovat si mě</Label>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => toast.info('Funkce zatím není dostupná')}
                  >
                    Zapomněli jste heslo?
                  </button>
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
                  <div className="relative">
                    <Input
                      id="reg-password"
                      type={showRegPassword ? 'text' : 'password'}
                      placeholder="••••••"
                      autoComplete="new-password"
                      className="pr-9"
                      {...registerForm.register('password')}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-2.5 hover:bg-transparent"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      tabIndex={-1}
                    >
                      {showRegPassword ? (
                        <EyeOff className="size-3.5 text-muted-foreground" />
                      ) : (
                        <Eye className="size-3.5 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {registerForm.formState.errors.password && (
                    <p className="text-sm text-destructive">{registerForm.formState.errors.password.message}</p>
                  )}
                  {/* Password strength indicator */}
                  {regPassword && regPassword.length > 0 && (
                    <div className="space-y-1">
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-300 ${passwordStrength.color} ${passwordStrength.width}`} />
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Síla hesla: <span className="font-medium">{passwordStrength.label}</span>
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                        <span className={regPassword.length >= 6 ? 'text-primary' : ''}>Min. 6 znaků</span>
                        <span className={/[A-Z]/.test(regPassword) ? 'text-primary' : ''}>Velké písmeno</span>
                        <span className={/[0-9]/.test(regPassword) ? 'text-primary' : ''}>Číslo</span>
                        <span className={/[^A-Za-z0-9]/.test(regPassword) ? 'text-primary' : ''}>Spec. znak</span>
                      </div>
                    </div>
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
        <div className="px-6 pb-3 text-center">
          <p className="text-[9px] text-muted-foreground/50">v1.0.0 — Evidence stromů</p>
        </div>
      </Card>
    </div>
  )
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  return <AuthGateInner>{children}</AuthGateInner>
}
