import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@/lib/supabase/server'
import { getPostHogClient } from '@/lib/posthog-server'

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.1-flash-lite-preview'

const SYSTEM_PROMPT = `You are an assistant for someone's Kanban board. Summarize the following technical task description into a highly concise, 3 to 6 word title. Return ONLY the raw string title, no quotes, no markdown, no conversational text.`

function normalizeTitle(raw: string | undefined) {
  if (!raw) return null

  const title = raw
    .replace(/^\s*["']|["']\s*$/g, '')
    .trim()
    .slice(0, 100)

  return title.length > 0 ? title : null
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Missing Gemini API key. Set GEMINI_API_KEY (preferred) or GOOGLE_API_KEY.' },
      { status: 500 }
    )
  }

  try {
    const body = await request.json()
    const { description } = body

    if (!description || typeof description !== 'string') {
      return NextResponse.json(
        { error: 'description is required and must be a string' },
        { status: 400 }
      )
    }

    const ai = new GoogleGenAI({ apiKey })

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: description,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.3,
        maxOutputTokens: 50,
      },
    })

    const title = normalizeTitle(response.text)
    if (!title) {
      return NextResponse.json(
        { error: 'No title generated from Gemini API', model: GEMINI_MODEL },
        { status: 502 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const posthog = getPostHogClient()
    posthog.capture({
      distinctId: user?.id ?? 'anonymous',
      event: 'ai_title_generated',
      properties: { model: GEMINI_MODEL },
    })
    await posthog.shutdown()

    return NextResponse.json({ title })
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown Gemini error'
    console.error('AI title generation error:', details)

    return NextResponse.json(
      {
        error: 'Failed to generate title from Gemini API',
        details,
        model: GEMINI_MODEL,
      },
      { status: 502 }
    )
  }
}
