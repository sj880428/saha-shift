(function () {
  const INTERNAL_EMAIL_DOMAIN = 'saha.internal';
  const LOGIN_ID_PATTERN = /^[a-z0-9-]{4,20}$/;
  const STAFF_PASSWORD_PATTERN = /^\d{8}$/;

  function normalizeLoginId(value) {
    return String(value || '').trim().toLowerCase();
  }

  function toInternalEmail(loginId) {
    return `${normalizeLoginId(loginId)}@${INTERNAL_EMAIL_DOMAIN}`;
  }

  function validateLoginId(loginId) {
    return LOGIN_ID_PATTERN.test(normalizeLoginId(loginId));
  }

  function validateStaffPassword(password) {
    return STAFF_PASSWORD_PATTERN.test(String(password || ''));
  }

  async function signIn(loginId, password) {
    const normalizedId = normalizeLoginId(loginId);
    if (!validateLoginId(normalizedId)) {
      throw new Error('아이디는 영문 소문자, 숫자, 하이픈으로 4~20자리를 입력해 주세요.');
    }

    const { data, error } = await window.getDB().auth.signInWithPassword({
      email: toInternalEmail(normalizedId),
      password: String(password || '')
    });
    if (error) throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.');
    return data.user;
  }

  async function signOut() {
    const { error } = await window.getDB().auth.signOut();
    if (error) throw error;
  }

  async function getSessionUser() {
    const { data, error } = await window.getDB().auth.getSession();
    if (error) return null;
    return data.session?.user || null;
  }

  window.SahaAuth = {
    getSessionUser,
    normalizeLoginId,
    signIn,
    signOut,
    toInternalEmail,
    validateLoginId,
    validateStaffPassword
  };
})();
