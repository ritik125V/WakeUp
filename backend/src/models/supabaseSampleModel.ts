import { getSupabaseClient } from '../config/supabase.js';

export interface SampleProfile {
  id?: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at?: string;
}

export class SupabaseProfileModel {
  private tableName = 'profiles';

  /**
   * Fetch all profiles from Supabase SQL table
   */
  async getAll(): Promise<SampleProfile[] | null> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client is not initialized');

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*');

    if (error) {
      console.error('Error fetching profiles from Supabase:', error);
      throw error;
    }

    return data as SampleProfile[];
  }

  /**
   * Fetch a profile by ID
   */
  async getById(id: string): Promise<SampleProfile | null> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client is not initialized');

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Error fetching profile ${id} from Supabase:`, error);
      throw error;
    }

    return data as SampleProfile;
  }

  /**
   * Create a new profile record in Supabase
   */
  async create(profile: SampleProfile): Promise<SampleProfile | null> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client is not initialized');

    const { data, error } = await supabase
      .from(this.tableName)
      .insert([profile])
      .select()
      .single();

    if (error) {
      console.error('Error creating profile in Supabase:', error);
      throw error;
    }

    return data as SampleProfile;
  }
}
