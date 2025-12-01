import { redirect } from 'next/navigation'

/**
 * Armado Orders Index Page
 * Redirects to the dashboard where orders are listed
 */
export default function ArmadoOrdersPage() {
  redirect('/armado/dashboard')
}

