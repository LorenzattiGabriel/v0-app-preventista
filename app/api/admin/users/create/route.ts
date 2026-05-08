import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const getAdminClient = () =>
  createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

export async function POST(request: Request) {
  try {
    // Verify the caller's JWT via Authorization header (reliable on Vercel)
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabaseAdmin = getAdminClient()

    // Verify token and get user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Authorization check - only admins can create users
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'administrativo') {
      return NextResponse.json({ error: 'Sin permisos. Solo administradores pueden crear usuarios.' }, { status: 403 })
    }

    // Get request body
    const body = await request.json()
    const { email, full_name, role, phone, password, is_active } = body

    // Validate required fields
    if (!email || !full_name || !role || !password) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
        { status: 400 }
      )
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      )
    }

    // Check if email already exists in profiles
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingProfile) {
      return NextResponse.json(
        { error: 'Ya existe un usuario con ese email' },
        { status: 400 }
      )
    }

    // 1. Create user in auth.users using admin API
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role
      }
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      return NextResponse.json(
        { error: authError.message || 'Error al crear el usuario en auth.users' },
        { status: 500 }
      )
    }

    // 2. Create profile in profiles table with the same ID from auth.users
    const { data: newProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authUser.user.id, // Use the ID from auth.users
        email,
        full_name,
        role,
        phone: phone || null,
        is_active: is_active ?? true,
      })
      .select()
      .single()

    if (profileError) {
      console.error('Error creating profile:', profileError)
      
      // Rollback: delete the auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      
      return NextResponse.json(
        { error: 'Error al crear el perfil del usuario' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      user: newProfile,
      message: 'Usuario creado exitosamente en auth.users y profiles'
    }, { status: 201 })
  } catch (error) {
    console.error('Error in create user API:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

