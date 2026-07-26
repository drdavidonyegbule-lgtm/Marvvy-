import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db/schema';

/**
 * Handoff API
 *
 * POST /api/conversations/handoff
 * Body: { conversationId, action: "takeover" | "release" | "status", timeoutMinutes?: number }
 *
 * - "takeover": Admin takes control, Marvvy stops responding
 * - "release":  Admin releases, Marvvy resumes immediately
 * - "status":   Check current handoff state
 */

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const { conversationId, action, timeoutMinutes } = body;
    const db = getDb();

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId required' }, { status: 400 });
    }

    const conv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId) as any;
    if (!conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    switch (action) {
      case 'takeover': {
        db.prepare(
          `UPDATE conversations SET
           handoff_status = 'human',
           handoff_admin_id = ?,
           handoff_started_at = datetime('now'),
           last_human_message_at = datetime('now'),
           handoff_timeout_minutes = ?,
           updated_at = datetime('now')
           WHERE id = ?`
        ).run(auth.admin!.id, timeoutMinutes || conv.handoff_timeout_minutes || 10, conversationId);

        return NextResponse.json({
          success: true,
          action: 'takeover',
          conversationId,
          message: `You now have control. Marvvy is paused. She'll auto-resume after ${timeoutMinutes || conv.handoff_timeout_minutes || 10} minutes of your inactivity.`,
          timeoutMinutes: timeoutMinutes || conv.handoff_timeout_minutes || 10,
        });
      }

      case 'release': {
        db.prepare(
          `UPDATE conversations SET
           handoff_status = 'agent',
           handoff_admin_id = NULL,
           handoff_started_at = NULL,
           last_human_message_at = NULL,
           updated_at = datetime('now')
           WHERE id = ?`
        ).run(conversationId);

        return NextResponse.json({
          success: true,
          action: 'release',
          conversationId,
          message: 'Marvvy has resumed control.',
        });
      }

      case 'status': {
        return NextResponse.json({
          conversationId,
          handoffStatus: conv.handoff_status,
          controlledBy: conv.handoff_admin_id,
          startedAt: conv.handoff_started_at,
          lastHumanMessage: conv.last_human_message_at,
          timeoutMinutes: conv.handoff_timeout_minutes,
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action. Use: takeover, release, or status' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET — list conversations under human control
export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const db = getDb();
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get('filter') || 'all';

  let sql = `
    SELECT c.*, cust.name as customer_name, cust.phone, cust.email
    FROM conversations c
    JOIN customers cust ON c.customer_id = cust.id
  `;

  if (filter === 'human') {
    sql += " WHERE c.handoff_status = 'human'";
  } else if (filter === 'agent') {
    sql += " WHERE c.handoff_status = 'agent'";
  }

  sql += ' ORDER BY c.updated_at DESC LIMIT 50';

  const conversations = db.prepare(sql).all();
  return NextResponse.json({ conversations });
}
