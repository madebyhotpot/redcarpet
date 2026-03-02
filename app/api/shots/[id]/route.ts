import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabase
    .from('shots')
    .select('id, image_url, effect_id, result_url, result_type')
    .eq('id', id)
    .single();

  if (error || !data) {
    if (error?.code === 'PGRST116') {
      return NextResponse.json({ error: 'Shot not found' }, { status: 404 });
    }
    console.error('Shot fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch shot' }, { status: 500 });
  }

  return NextResponse.json(data);
}
