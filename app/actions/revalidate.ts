'use server'

import { revalidatePath } from 'next/cache'

/**
 * Revalida los paths del dashboard y rutas después de cambios
 */
export async function revalidateDashboard() {
  revalidatePath('/admin/dashboard')
  revalidatePath('/admin/routes')
  revalidatePath('/admin/routes/history')
  revalidatePath('/admin/routes/generate-smart')
}

/**
 * Revalida un path específico
 */
export async function revalidateSpecificPath(path: string) {
  revalidatePath(path)
}

