import { SupabaseClient } from '@supabase/supabase-js'
import { USERS_PER_PAGE } from '@/lib/constants/user-roles'

/**
 * User Filters Interface
 */
export interface UserFilters {
  role?: string
  search?: string
  isActive?: boolean
  page?: number
}

/**
 * Paginated Users Result
 */
export interface PaginatedUsers {
  users: any[]
  totalCount: number
  totalPages: number
  currentPage: number
}

/**
 * Create User Data
 */
export interface CreateUserData {
  email: string
  full_name: string
  role: string
  phone?: string
  password: string
  is_active?: boolean
}

/**
 * Update User Data
 */
export interface UpdateUserData {
  full_name?: string
  role?: string
  phone?: string
  is_active?: boolean
}

/**
 * Users Service
 * Handles all user-related data operations
 */
export class UsersService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Fetch users with filters and pagination
   */
  async getUsers(filters: UserFilters = {}): Promise<PaginatedUsers> {
    const { role, search, isActive, page = 1 } = filters
    const from = (page - 1) * USERS_PER_PAGE
    const to = from + USERS_PER_PAGE - 1

    // Build base query
    let query = this.supabase
      .from('profiles')
      .select('*', { count: 'exact' })

    // Apply filters
    query = this.applyFilters(query, { role, search, isActive })

    // Execute query with pagination
    const { data: users, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('Error fetching users:', error)
      throw error
    }

    const totalCount = count || 0
    const totalPages = Math.ceil(totalCount / USERS_PER_PAGE)

    return {
      users: users || [],
      totalCount,
      totalPages,
      currentPage: page,
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string) {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  /**
   * Create new user profile (use API route for full user creation with auth)
   * Note: This only creates the profile, not the auth user.
   * For full user creation with password, use /api/admin/users/create
   */
  async createUserProfile(userData: Omit<CreateUserData, 'password'>) {
    const { data, error } = await this.supabase
      .from('profiles')
      .insert({
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
        phone: userData.phone || null,
        is_active: userData.is_active ?? true,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Update user
   */
  async updateUser(id: string, userData: UpdateUserData) {
    const { data, error } = await this.supabase
      .from('profiles')
      .update({
        ...userData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Toggle user active status
   */
  async toggleUserStatus(id: string, isActive: boolean) {
    const { error } = await this.supabase
      .from('profiles')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw error
  }

  /**
   * Delete user (soft delete by deactivating)
   */
  async deleteUser(id: string) {
    return this.toggleUserStatus(id, false)
  }

  /**
   * Get user statistics by role
   */
  async getUserStats() {
    const { data: users } = await this.supabase
      .from('profiles')
      .select('role, is_active')

    if (!users) return { total: 0, active: 0, byRole: {} }

    const total = users.length
    const active = users.filter((u) => u.is_active).length
    const byRole = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return { total, active, byRole }
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string, excludeId?: string) {
    let query = this.supabase
      .from('profiles')
      .select('id')
      .eq('email', email)

    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { data } = await query.maybeSingle()
    return !!data
  }

  /**
   * Apply filters to query
   */
  private applyFilters(query: any, filters: Omit<UserFilters, 'page'>) {
    const { role, search, isActive } = filters

    if (role && role !== 'all') {
      query = query.eq('role', role)
    }

    if (search && search.trim()) {
      // Search in full_name or email
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    if (isActive !== undefined) {
      query = query.eq('is_active', isActive)
    }

    return query
  }
}

/**
 * Factory function to create UsersService instance
 */
export function createUsersService(supabase: SupabaseClient) {
  return new UsersService(supabase)
}

