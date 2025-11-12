import { NextRequest, NextResponse } from 'next/server'

/**
 * Proxy para evitar problemas de CORS con el microservicio de rutas inteligentes
 * Esta ruta actúa como intermediario entre el frontend y el microservicio
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const apiUrl = process.env.NEXT_PUBLIC_RUTAS_INTELIGENTES_API_URL || 
                   'https://v0-micro-saa-s-git-develop-talenthubais-projects.vercel.app'
    
    console.log('🔄 Proxy: Reenviando petición a:', `${apiUrl}/api/rutas-inteligentes`)
    
    const response = await fetch(`${apiUrl}/api/rutas-inteligentes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-client-id': 'preventista-app-client-id',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('❌ Error del microservicio:', data)
      return NextResponse.json(data, { status: response.status })
    }

    console.log('✅ Respuesta exitosa del microservicio')
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('❌ Error en proxy:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      },
      { status: 500 }
    )
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

