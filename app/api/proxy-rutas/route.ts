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
    console.log('📦 Payload:', JSON.stringify(body).substring(0, 200) + '...')
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 segundos timeout
    
    const response = await fetch(`${apiUrl}/api/rutas-inteligentes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-client-id': 'preventista-app-client-id',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId)

    // Obtener el texto de la respuesta primero
    const responseText = await response.text()
    
    console.log('📥 Status:', response.status)
    console.log('📥 Response length:', responseText.length)
    
    // Intentar parsear como JSON
    let data
    try {
      data = responseText ? JSON.parse(responseText) : null
    } catch (parseError) {
      console.error('❌ Error parseando JSON:', responseText.substring(0, 500))
      return NextResponse.json(
        { 
          success: false, 
          error: `El microservicio devolvió una respuesta inválida. Status: ${response.status}` 
        },
        { status: 502 }
      )
    }

    if (!response.ok) {
      console.error('❌ Error del microservicio:', data)
      return NextResponse.json(
        data || { success: false, error: `Error del microservicio: ${response.status}` }, 
        { status: response.status }
      )
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'El microservicio devolvió una respuesta vacía' },
        { status: 502 }
      )
    }

    console.log('✅ Respuesta exitosa del microservicio')
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('❌ Error en proxy:', error)
    
    // Manejar timeout
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { success: false, error: 'Timeout: El microservicio no respondió en 60 segundos' },
        { status: 504 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido en el proxy' 
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

