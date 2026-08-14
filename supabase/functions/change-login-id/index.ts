import { withSupabase } from 'npm:@supabase/server@^1';

const result = (body: Record<string, unknown>) => Response.json(body, { status: 200 });

export default {
  fetch: withSupabase({ auth: 'user' }, async (request, ctx) => {
    try {
      if (request.method !== 'POST') return result({ ok: false, error: 'POST 요청만 허용됩니다.' });

      const admin = ctx.supabaseAdmin;
      const actorId = String(ctx.userClaims?.sub || '');
      const body = await request.json().catch(() => null);
      const employeeId = String(body?.employeeId || '').trim();
      const newLoginId = String(body?.newLoginId || '').trim().toLowerCase();

      if (!actorId) return result({ ok: false, error: '로그인이 필요합니다.' });
      if (!employeeId || !/^[a-z0-9-]{4,20}$/.test(newLoginId)) {
        return result({ ok: false, error: '새 로그인 ID는 영문 소문자와 숫자, 하이픈으로 4~20자여야 합니다.' });
      }

      const { data: actor, error: actorError } = await admin
        .from('employees')
        .select('role, hall')
        .eq('auth_user_id', actorId)
        .maybeSingle();
      if (actorError) return result({ ok: false, error: `관리자 확인 실패: ${actorError.message}` });
      if (!actor || actor.role !== 'manager' || actor.hall !== 'all') {
        return result({ ok: false, error: '전체 관리자만 로그인 ID를 변경할 수 있습니다.' });
      }

      const { data: target, error: targetError } = await admin
        .from('employees')
        .select('auth_user_id, login_id')
        .eq('id', employeeId)
        .maybeSingle();
      if (targetError) return result({ ok: false, error: `직원 확인 실패: ${targetError.message}` });
      if (!target?.auth_user_id) return result({ ok: false, error: '연결된 로그인 계정을 찾지 못했습니다.' });
      if (target.login_id === newLoginId) return result({ ok: false, error: '현재 사용 중인 ID와 같습니다.' });

      const { data: duplicate } = await admin
        .from('employees')
        .select('id')
        .eq('login_id', newLoginId)
        .neq('id', employeeId)
        .maybeSingle();
      if (duplicate) return result({ ok: false, error: '이미 다른 사용자가 사용 중인 로그인 ID입니다.' });

      const previousEmail = `${target.login_id}@saha.internal`;
      const newEmail = `${newLoginId}@saha.internal`;
      const { error: authError } = await admin.auth.admin.updateUserById(target.auth_user_id, { email: newEmail });
      if (authError) return result({ ok: false, error: `로그인 계정 변경 실패: ${authError.message}` });

      const { error: linkError } = await admin.rpc('change_employee_login_id_link', {
        p_actor_auth_user_id: actorId,
        p_employee_id: employeeId,
        p_new_login_id: newLoginId,
      });
      if (linkError) {
        if (target.login_id) {
          await admin.auth.admin.updateUserById(target.auth_user_id, { email: previousEmail });
        }
        return result({ ok: false, error: `직원 정보 변경 실패: ${linkError.message}` });
      }

      return result({ ok: true, loginId: newLoginId });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return result({ ok: false, error: `서버 처리 실패: ${message}` });
    }
  }),
};
