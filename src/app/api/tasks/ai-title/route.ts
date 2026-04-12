import { NextRequest, NextResponse } from 'next/server'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

const SYSTEM_PROMPT = `You are an assistant for a developer's Kanban board. Summarize the following technical task description into a highly concise, 4 to 6 word title. Return ONLY the raw string title, no quotes, no markdown, no conversational text.`

export async function POST(request: NextRequest) {
  const apiKey = process.env.GOOGLE_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { error: 'GOOGLE_API_KEY environment variable is not configured' },
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

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${SYSTEM_PROMPT}\n\nDescription:\n${description}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 50,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API error:', errorText)
      return NextResponse.json(
        { error: 'Failed to generate title from Gemini API' },
        { status: 502 }
      )
    }

    const data = await response.json()
    const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!generatedText) {
      return NextResponse.json(
        { error: 'No title generated from Gemini API' },
        { status: 502 }
      )
    }

    // Clean up the response - remove any quotes, trim whitespace
    const title = generatedText
      .replace(/^["']|["']$/g, '')
      .trim()
      .slice(0, 100) // Ensure reasonable length

    return NextResponse.json({ title })
  } catch (error) {
    console.error('AI title generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error generating title' },
      { status: 500 }
    )
  }
}
