import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  const { data, error } = await supabase
    .from('effects')
    .select('id, name, preview_image_url');

  if (error) {
    console.error('Effects fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch effects' }, { status: 500 });
  }

  return NextResponse.json({ effects: data });
}
