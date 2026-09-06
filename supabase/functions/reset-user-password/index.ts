import { withSupabase } from 'npm:@supabase/server@^1';

const result = (body: Record<string, unknown>) => Response.json(body, { status: 200 });

function readUserId(request: Request, claims: Record<string, unknown> | undefined): string {
  const claimId = String(claims?.sub || '');
  if (claimId) return claimId;

  try {
    const authorization = request.headers.get('authorization') || '';
    const token = authorization.replace(/^Bearer\s+/i, '');
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return '';
    const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return String(JSON.parse(atob(padded))?.sub || '');
  } catch {
    return '';
  }
}

export default {
  fetch: withSupabase({ auth: 'user' }, async (request, ctx) => {
    try {
      if (request.method !== 'POST') return result({ ok: false, error: 'POST 요청만 허용됩니다.' });

      const admin = ctx.supabaseAdmin;
      const actorId = readUserId(request, ctx.userClaims as Record<string, unknown> | undefined);
      const body = await request.json().catch(() => null);
      const employeeId = String(body?.employeeId || '').trim();
      const newPassword = String(body?.newPassword || '');

      if (!actorId) return result({ ok: false, error: '로그인이 필요합니다.' });
      if (!employeeId || !/^\d{8}$/.test(newPassword)) {
        return result({ ok: false, error: '임시 비밀번호는 숫자 8자리여야 합니다.' });
      }

      const { data: actor, error: actorError } = await admin
        .from('employees')
        .select('id, role, hall')
        .eq('auth_user_id', actorId)
        .maybeSingle();
      if (actorError) return result({ ok: false, error: `관리자 확인 실패: ${actorError.message}` });
      if (!actor || actor.role !== 'manager' || actor.hall !== 'all') {
        return result({ ok: false, error: '전체 관리자만 비밀번호를 초기화할 수 있습니다.' });
      }
      if (actor.id === employeeId) {
        return result({ ok: false, error: '현재 로그인한 관리자 본인의 비밀번호는 상단 비밀번호 메뉴에서 변경해 주세요.' });
      }

      const { data: target, error: targetError } = await admin
        .from('employees')
        .select('name, login_id, auth_user_id')
        .eq('id', employeeId)
        .maybeSingle();
      if (targetError) return result({ ok: false, error: `직원 확인 실패: ${targetError.message}` });
      if (!target?.auth_user_id) return result({ ok: false, error: '연결된 로그인 계정을 찾지 못했습니다.' });

      const { error: resetError } = await admin.auth.admin.updateUserById(target.auth_user_id, {
        password: newPassword,
      });
      if (resetError) return result({ ok: false, error: `비밀번호 초기화 실패: ${resetError.message}` });

      return result({ ok: true, employeeName: target.name, loginId: target.login_id });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return result({ ok: false, error: `서버 처리 실패: ${message}` });
    }
  }),
};
