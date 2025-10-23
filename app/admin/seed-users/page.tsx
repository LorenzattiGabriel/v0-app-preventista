"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, XCircle, Loader2, Users } from "lucide-react"

export default function SeedUsersPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleSeedUsers = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/seed-users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        error: "Failed to seed users",
        message: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Seed Mock Users</h1>
        <p className="text-muted-foreground">Create test users for all roles in the system</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Mock Users Generator
          </CardTitle>
          <CardDescription>This will create 17 test users across all roles with predefined credentials</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-semibold mb-2">Administrativos (2)</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• admin@distribuidora.com</li>
                <li>• admin2@distribuidora.com</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Preventistas (3)</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• preventista1@distribuidora.com</li>
                <li>• preventista2@distribuidora.com</li>
                <li>• preventista3@distribuidora.com</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Encargados de Armado (3)</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• armado1@distribuidora.com</li>
                <li>• armado2@distribuidora.com</li>
                <li>• armado3@distribuidora.com</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Repartidores (4)</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• repartidor1@distribuidora.com</li>
                <li>• repartidor2@distribuidora.com</li>
                <li>• repartidor3@distribuidora.com</li>
                <li>• repartidor4@distribuidora.com</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Clientes (5)</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• cliente1@email.com</li>
                <li>• cliente2@email.com</li>
                <li>• cliente3@email.com</li>
                <li>• cliente4@email.com</li>
                <li>• cliente5@email.com</li>
              </ul>
            </div>
          </div>

          <Alert>
            <AlertDescription>
              <strong>Default passwords:</strong> admin123, prev123, armado123, repar123, cliente123
            </AlertDescription>
          </Alert>

          <Button onClick={handleSeedUsers} disabled={loading} className="w-full" size="lg">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Users...
              </>
            ) : (
              <>
                <Users className="mr-2 h-4 w-4" />
                Create Mock Users
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.summary && (
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{result.summary.total}</div>
                  <div className="text-sm text-muted-foreground">Total</div>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{result.summary.success}</div>
                  <div className="text-sm text-muted-foreground">Success</div>
                </div>
                <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">{result.summary.errors}</div>
                  <div className="text-sm text-muted-foreground">Errors</div>
                </div>
              </div>
            )}

            {result.results?.success && result.results.success.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Successfully Created
                </h3>
                <ul className="space-y-1 text-sm">
                  {result.results.success.map((email: string) => (
                    <li key={email} className="text-muted-foreground">
                      ✓ {email}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.results?.errors && result.results.errors.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2 text-red-600 dark:text-red-400">
                  <XCircle className="h-4 w-4" />
                  Errors
                </h3>
                <ul className="space-y-2 text-sm">
                  {result.results.errors.map((error: any, index: number) => (
                    <li key={index} className="text-red-600 dark:text-red-400">
                      ✗ {error.email}: {error.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.error && (
              <Alert variant="destructive">
                <AlertDescription>
                  {result.error}: {result.message}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
