/**
 * Schermata di accesso.
 *
 * Due modalita':
 *  - email e password: usata in sviluppo con gli utenti di prova, e
 *    disponibile anche in produzione per chi non ha un account Google
 *  - Google: il percorso principale per gli utenti finali
 *
 * Il bottone "Accesso amministrazione" non concede alcun potere: avvia
 * lo stesso accesso Google. E' il database, tramite admin_whitelist, a
 * stabilire chi e' amministratore.
 */
import React, { useState } from 'react'
import { supabase } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, ShieldCheck } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errore, setErrore] = useState(null)
  const [attesa, setAttesa] = useState(false)

  async function accediConPassword(e) {
    e.preventDefault()
    setErrore(null)
    setAttesa(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setAttesa(false)
    if (error) {
      setErrore(
        error.message === 'Invalid login credentials'
          ? 'Email o password non corretti.'
          : error.message,
      )
      return
    }
    window.location.href = '/'
  }

  async function accediConGoogle() {
    setErrore(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    })
    if (error) setErrore(error.message)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Campagna Amica Digital</CardTitle>
          <p className="text-sm text-muted-foreground">Accedi per continuare</p>
        </CardHeader>

        <CardContent className="space-y-4">
          {errore && (
            <Alert variant="destructive">
              <AlertDescription>{errore}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={accediConPassword} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email" type="email" required autoComplete="email"
                value={email} onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password" type="password" required autoComplete="current-password"
                value={password} onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={attesa}>
              {attesa && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Accedi
            </Button>
          </form>

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">oppure</span>
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={accediConGoogle}>
            Continua con Google
          </Button>

          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={accediConGoogle}
          >
            <ShieldCheck className="mr-2 h-4 w-4" />
            Accesso amministrazione
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
