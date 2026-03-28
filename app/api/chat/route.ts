import { NextRequest, NextResponse } from 'next/server';
import { buildLocalCopilotReply, buildRecoveryReply } from '@/lib/copilot';
import { getAdminDb } from '@/lib/firebaseAdmin';
import {
  buildRationalizationReply,
  getRouteRationalizationDataset,
  isRationalizationQuestion,
} from '@/lib/routeRationalization';
import { FleetSnapshot, generateFleetSnapshot } from '@/lib/snapshot';

export const dynamic = 'force-dynamic';

const CACHE_PATH = { collection: 'cache', doc: 'latest_snapshot' };
const MAX_SNAPSHOT_AGE_MS = 15 * 60 * 1000;

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  Connection: 'keep-alive',
  'Cache-Control': 'no-cache, no-transform',
};

function buildSystemPrompt(snapshot: FleetSnapshot): string {
  return [
    'You are Bus Sathi Bot for RTO officers.',
    'Answer only from the provided fleet snapshot context.',
    'If data is missing, say so clearly and suggest where to verify in the dashboard.',
    'Be concise, operational, and include key numbers.',
    `Snapshot generatedAt: ${new Date(snapshot.generatedAt).toISOString()}`,
    '',
    'Fleet Snapshot JSON:',
    JSON.stringify(snapshot),
  ].join('\n');
}

function getLatestUserQuestion(messages: any[]): string {
  const lastUserMessage = [...messages]
    .reverse()
    .find((message) => message?.role === 'user' && typeof message?.content === 'string' && message.content.trim());

  return lastUserMessage?.content?.trim() || 'Give me a fleet overview.';
}

function sseFromOpenAI(stream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = stream.getReader();
      let buffer = '';

      const send = (token: string) => {
        if (!token) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;

            const data = trimmed.slice(5).trim();
            if (!data || data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (typeof delta === 'string') send(delta);
            } catch {
              // Ignore malformed stream chunks from upstream.
            }
          }
        }
      } finally {
        controller.enqueue(encoder.encode('event: done\ndata: {}\n\n'));
        controller.close();
      }
    },
  });
}

function sseFromText(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const chunks = text.match(/.{1,140}(\s|$)|.{1,140}/g) || [text];

  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: chunk })}\n\n`));
      }

      controller.enqueue(encoder.encode('event: done\ndata: {}\n\n'));
      controller.close();
    },
  });
}

async function getSnapshot(): Promise<FleetSnapshot> {
  const adminDb = getAdminDb();
  const cacheRef = adminDb.collection(CACHE_PATH.collection).doc(CACHE_PATH.doc);
  const cachedSnapshot = await cacheRef.get();

  if (cachedSnapshot.exists) {
    const data = cachedSnapshot.data() as FleetSnapshot;
    const isFresh = Boolean(data?.generatedAt) && Date.now() - data.generatedAt < MAX_SNAPSHOT_AGE_MS;
    const hasTrips = Array.isArray(data?.trips) && data.trips.length > 0;

    if (isFresh && hasTrips) {
      return data;
    }
  }

  const liveSnapshot = await generateFleetSnapshot(adminDb);
  await cacheRef.set(liveSnapshot, { merge: false });
  return liveSnapshot;
}

export async function POST(req: NextRequest) {
  let messages: any[] = [];

  try {
    const body = await req.json();
    messages = Array.isArray(body?.messages) ? body.messages : [];
  } catch {
    return new NextResponse(sseFromText('I could not read that chat request. Please try again.'), {
      headers: SSE_HEADERS,
    });
  }

  try {
    const latestQuestion = getLatestUserQuestion(messages);

    if (isRationalizationQuestion(latestQuestion)) {
      try {
        const rationalizationDataset = await getRouteRationalizationDataset();
        return new NextResponse(sseFromText(buildRationalizationReply(latestQuestion, rationalizationDataset)), {
          headers: SSE_HEADERS,
        });
      } catch (error) {
        console.error('Failed to load route rationalization dataset:', error);
      }
    }

    const snapshot = await getSnapshot();
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return new NextResponse(sseFromText(buildLocalCopilotReply(latestQuestion, snapshot)), {
        headers: SSE_HEADERS,
      });
    }

    let openAiResponse: Response | null = null;

    try {
      openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          stream: true,
          temperature: 0.2,
          messages: [
            { role: 'system', content: buildSystemPrompt(snapshot) },
            ...messages.map((message: any) => ({ role: message.role, content: message.content })),
          ],
        }),
      });
    } catch (error) {
      console.error('Chat completion request failed, falling back to local copilot:', error);
    }

    if (openAiResponse?.ok && openAiResponse.body) {
      return new NextResponse(sseFromOpenAI(openAiResponse.body), {
        headers: SSE_HEADERS,
      });
    }

    if (openAiResponse) {
      const detail = await openAiResponse.text();
      console.error('Chat completion failed, falling back to local copilot:', detail || openAiResponse.statusText);
    }

    return new NextResponse(sseFromText(buildLocalCopilotReply(latestQuestion, snapshot)), {
      headers: SSE_HEADERS,
    });
  } catch (error) {
    console.error('Chat route failed:', error);

    return new NextResponse(sseFromText(buildRecoveryReply(error)), {
      headers: SSE_HEADERS,
    });
  }
}
