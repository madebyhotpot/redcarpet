import { task } from '@trigger.dev/sdk/v3';
import { createClient } from '@supabase/supabase-js';
import { put } from '@vercel/blob';
import { fal } from '@fal-ai/client';

interface GenerateShotPayload {
  shotId: string;
}

export const generateShot = task({
  id: 'generate-shot',
  // Allow up to 15 minutes for multi-step AI generation
  maxDuration: 900,
  run: async (payload: GenerateShotPayload) => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Fetch shot + associated effect
    const { data: shot, error: shotError } = await supabase
      .from('shots')
      .select('*, effects(id, name)')
      .eq('id', payload.shotId)
      .single();

    if (shotError || !shot) {
      throw new Error(`Shot not found: ${payload.shotId}`);
    }

    // Step 1: Image-to-image transformation via fal.ai
    // Model: flux-lora or similar image transformation model
    const step1Result = await fal.subscribe('fal-ai/flux/dev/image-to-image', {
      input: {
        image_url: shot.image_url,
        prompt: `${shot.effects.name} style, glamorous red carpet photo, high quality`,
        strength: 0.75,
        num_inference_steps: 28,
      },
    });

    const intermediateImageUrl = (step1Result as unknown as { images: { url: string }[] }).images[0].url;

    // Step 2: Upscale / enhance the result
    const step2Result = await fal.subscribe('fal-ai/esrgan', {
      input: {
        image_url: intermediateImageUrl,
        scale: 2,
      },
    });

    const finalImageUrl = (step2Result as unknown as { image: { url: string } }).image.url;

    // Download and re-upload to Vercel Blob for permanent storage
    const imageBuffer = await fetch(finalImageUrl).then((r) => r.arrayBuffer());
    const { url: resultUrl } = await put(
      `results/${payload.shotId}.jpg`,
      imageBuffer,
      { access: 'public', contentType: 'image/jpeg' }
    );

    // Update shot record with result
    const { error: updateError } = await supabase
      .from('shots')
      .update({ result_url: resultUrl, result_type: 'image' })
      .eq('id', payload.shotId);

    if (updateError) {
      throw new Error(`Failed to update shot: ${updateError.message}`);
    }

    return { resultUrl, resultType: 'image' };
  },
});
