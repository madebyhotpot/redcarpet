import { supabase } from '@/lib/supabase';
import { tasks } from '@trigger.dev/sdk/v3';
import { NextRequest, NextResponse } from 'next/server';
import type { generateShot } from '@/trigger/generate-shot';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { image_url, effect_id } = body;

  if (!image_url || !effect_id) {
    return NextResponse.json(
      { error: 'image_url and effect_id are required' },
      { status: 400 }
    );
  }

  // Insert shot record
  const { data: shot, error } = await supabase
    .from('shots')
    .insert({ image_url, effect_id, result_url: null, result_type: null })
    .select('id')
    .single();

  if (error || !shot) {
    console.error('Shot insert error:', error);
    return NextResponse.json({ error: 'Failed to create shot' }, { status: 500 });
  }

  // Trigger background job
  await tasks.trigger<typeof generateShot>('generate-shot', { shotId: shot.id });

  return NextResponse.json({ id: shot.id }, { status: 201 });
}
