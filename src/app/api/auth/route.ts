import { NextRequest, NextResponse } from 'next/server';
import { authenticateByPassword, setupAdmins, listAdmins, requireAuth } from '@/lib/auth';

/**
 * Auth API
 *
 * POST /api/auth — login or setup
 *   { action: "login", email, password }      → returns API token
 *   { action: "setup", admins: [{email,name,password}] } → creates super admins
 *
 * GET /api/auth — list admins (requires auth)
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'login': {
        if (!body.email || !body.password) {
          return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
        }

        const admin = authenticateByPassword(body.email, body.password);
        if (!admin) {
          return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        return NextResponse.json({
          success: true,
          admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
          token: admin.token,
          message: `Welcome back, ${admin.name}! Use this token in the Authorization header: Bearer ${admin.token}`,
        });
      }

      case 'setup': {
        // Only allow if no admins exist
        const existing = listAdmins();
        if (existing.length > 0) {
          return NextResponse.json(
            { error: 'Admins already exist. Use login instead.' },
            { status: 403 }
          );
        }

        if (!body.admins || !Array.isArray(body.admins)) {
          return NextResponse.json({ error: 'admins array required' }, { status: 400 });
        }

        setupAdmins(body.admins);

        const created = listAdmins();
        return NextResponse.json({
          success: true,
          admins: created,
          message: `${created.length} admin(s) created. Save your tokens — they won't be shown again.`,
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action. Use: login or setup' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const admins = listAdmins();
  return NextResponse.json({ admins });
}
