import { NextRequest, NextResponse } from 'next/server';

const LIVE_API_URL = 'https://trustcheck-streaming-gateway.onrender.com/analyze-text';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const response = await fetch(LIVE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return new NextResponse(JSON.stringify({ message: 'Error from Live Analysis API', ...data }), { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new NextResponse(JSON.stringify({ message: 'Internal Server Error', error: errorMessage }), { status: 500 });
  }
}
