'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TreePine, Loader2, Eye, EyeOff } from 'lucide-react'
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
  return { label: 'Silné', color: 'bg-green-500', width: 'w-full' }
}

function AuthGateInner({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, setAuth, logout, hydrate } = useAuthStore()
  const [loginLoading, setLoginLoading] = useState(false)
  const [registerLoading, setRegisterLoading] = useState(false)
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showRegPassword, setShowRegPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [tiltStyle, setTiltStyle] = useState({ transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg)' })
  const cardRef = useRef<HTMLDivElement>(null)

  // Hydrate auth state from localStorage on mount
  useEffect(() => {
    hydrate()
  }, [hydrate])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    const rotateY = (x - 0.5) * 4
    const rotateX = (0.5 - y) * 4
    setTiltStyle({ transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)` })
  }, [])

  const handleMouseLeave = useCallback(() => {
    setTiltStyle({ transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg)' })
  }, [])

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
    <div className="flex items-center justify-center min-h-screen p-4 mesh-gradient-bg relative overflow-hidden">
      {/* Floating leaf particles */}
      <div className="leaf-particle" style={{ width: 8, height: 8, left: '10%', bottom: '-5%', '--leaf-duration': '14s', '--leaf-delay': '0s' } as React.CSSProperties} />
      <div className="leaf-particle" style={{ width: 6, height: 6, left: '25%', bottom: '-8%', '--leaf-duration': '18s', '--leaf-delay': '2s' } as React.CSSProperties} />
      <div className="leaf-particle" style={{ width: 10, height: 10, left: '45%', bottom: '-3%', '--leaf-duration': '12s', '--leaf-delay': '4s' } as React.CSSProperties} />
      <div className="leaf-particle" style={{ width: 7, height: 7, left: '65%', bottom: '-6%', '--leaf-duration': '16s', '--leaf-delay': '1s' } as React.CSSProperties} />
      <div className="leaf-particle" style={{ width: 5, height: 5, left: '80%', bottom: '-4%', '--leaf-duration': '20s', '--leaf-delay': '3s' } as React.CSSProperties} />
      <div className="leaf-particle" style={{ width: 9, height: 9, left: '55%', bottom: '-7%', '--leaf-duration': '15s', '--leaf-delay': '5s' } as React.CSSProperties} />
      <div className="leaf-particle" style={{ width: 6, height: 6, left: '35%', bottom: '-2%', '--leaf-duration': '17s', '--leaf-delay': '7s' } as React.CSSProperties} />

      {/* Decorative tree SVG on desktop */}
      <div className="hidden lg:flex items-center justify-center mr-8 opacity-15 pointer-events-none select-none">
        <svg width="200" height="300" viewBox="0 0 200 300" fill="none" className="text-green-700 dark:text-green-400">
          {/* Tree trunk */}
          <rect x="88" y="180" width="24" height="120" rx="4" fill="currentColor" opacity="0.6" />
          {/* Tree crown layers */}
          <ellipse cx="100" cy="140" rx="70" ry="55" fill="currentColor" opacity="0.4" />
          <ellipse cx="100" cy="100" rx="55" ry="50" fill="currentColor" opacity="0.5" />
          <ellipse cx="100" cy="65" rx="40" ry="40" fill="currentColor" opacity="0.6" />
          {/* Small roots */}
          <path d="M88 295 Q70 280 55 290" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.3" />
          <path d="M112 295 Q130 280 145 290" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.3" />
        </svg>
      </div>

      <Card
        ref={cardRef}
        className="w-full max-w-md shadow-xl shadow-green-900/10 dark:shadow-green-900/20 border-green-100 dark:border-green-900/30 animate-in fade-in slide-in-from-bottom-4 duration-500 hover-lift parallax-tilt"
        style={tiltStyle}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 size-14 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
            <TreePine className="size-7 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-xl">Evidenční systém výsadby</CardTitle>
          <CardDescription className="text-green-700/70 dark:text-green-400/70 typing-cursor">
            Evidence výsadby a údržby stromů
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-auto p-0 bg-transparent border-b rounded-none">
              <TabsTrigger
                value="login"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-green-600 data-[state=active]:shadow-none data-[state=active]:bg-transparent py-2.5 text-sm font-medium transition-colors"
              >
                Přihlášení
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-green-600 data-[state=active]:shadow-none data-[state=active]:bg-transparent py-2.5 text-sm font-medium transition-colors"
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
                      className="checkbox-green"
                    />
                    <Label htmlFor="remember-me" className="text-xs text-muted-foreground cursor-pointer">Zapamatovat si mě</Label>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-green-700 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 hover:underline"
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
                        <span className={regPassword.length >= 6 ? 'text-green-600 dark:text-green-400' : ''}>Min. 6 znaků</span>
                        <span className={/[A-Z]/.test(regPassword) ? 'text-green-600 dark:text-green-400' : ''}>Velké písmeno</span>
                        <span className={/[0-9]/.test(regPassword) ? 'text-green-600 dark:text-green-400' : ''}>Číslo</span>
                        <span className={/[^A-Za-z0-9]/.test(regPassword) ? 'text-green-600 dark:text-green-400' : ''}>Spec. znak</span>
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
