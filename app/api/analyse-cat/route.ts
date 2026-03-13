import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mediaType } = await req.json();

    if (!imageBase64 || !mediaType) {
      return NextResponse.json({ error: 'Missing image data' }, { status: 400 });
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: `You are analysing a photo of a cat for a community cat tracking app.
Analyse the image carefully and respond ONLY with a JSON object in this exact format, no other text:
{
  "coat": "coat color and markings e.g. Orange tabby with white chest and paws, or null if unclear",
  "eyes": "eye color e.g. Green, Golden yellow, or null if not visible",
  "tnr": "one of: None | Left ear | Right ear | Unknown",
  "gender": "one of: Male | Female | Unknown",
  "age": "one of: Kitten | Young | Adult | Senior | Unknown",
  "health_status": "one of: Healthy | Unhealthy | Unknown",
  "friendliness": "one of: Friendly | Shy | Hostile | Unknown — infer from body language and posture",
  "tail": "tail description e.g. Long and bushy, Bobtail, Crooked tip, or null if not visible",
  "scars": "any visible scars or injuries e.g. Small notch on right ear, or null if none visible"
}
Be conservative — use Unknown or null if you genuinely cannot determine something from the photo.
If the image does not contain a cat, respond with: {"error": "No cat detected in this photo"}`,
            },
          ],
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    try {
      const parsed = JSON.parse(text);
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json({ error: 'Could not parse AI response' }, { status: 500 });
    }
  } catch (err: any) {
    console.error('AI analysis error:', err);
    return NextResponse.json({ error: err.message || 'Analysis failed' }, { status: 500 });
  }
}