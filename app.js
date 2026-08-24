// Supabase Client Config
const SUPABASE_URL = 'https://lhkccdnurzgvtdssjlwz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_RGywmSTTq1lF3bQZ3Pha4Q_gzB-J3wu';
let supabaseClient = null;

function getDB() {
  if (!supabaseClient) {
    const lib = window.supabase;
    if (!lib) {
      throw new Error("Supabase JS SDK not loaded yet.");
    }
    supabaseClient = lib.createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return supabaseClient;
}
window.getDB = getDB;

// State configuration
const SHIFT_CYCLE = ['주간', '주간', '당직', '야간', '휴무', '휴무'];
const ANCHOR_DATE = new Date(2026, 6, 1); // July 1, 2026 (local date)

// Group to shift offset mapping on 2026-07-01 (Anchor Date)
// 1조: 5 (휴) | 2조: 2 (당) | 3조: 3 (야) | 4조: 0 (주) | 5조: 1 (주) | 6조: 4 (휴)
const GROUP_OFFSETS = { 1: 5, 2: 2, 3: 3, 4: 0, 5: 1, 6: 4 };

// Timezone and browser independent date parser/formatter
function parseLocalDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatLocalDate(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// South Korea Solar Holidays Map (fixed day every year)
const SOLAR_HOLIDAYS = {
  '01-01': '신정',
  '03-01': '삼일절',
  '05-05': '어린이날',
  '06-06': '현충일',
  '08-15': '광복절',
  '10-03': '개천절',
  '10-09': '한글날',
  '12-25': '성탄절'
};

// South Korea Lunar Holidays Map (2026-2030 seed data)
const LUNAR_HOLIDAYS = {
  // 2026
  '2026-02-16': '설날', '2026-02-17': '설날', '2026-02-18': '설날',
  '2026-03-02': '대체공휴일',
  '2026-05-24': '부처님오신날', '2026-05-25': '대체공휴일',
  '2026-08-17': '대체공휴일',
  '2026-09-24': '추석', '2026-09-25': '추석', '2026-09-26': '추석',
  '2026-10-05': '대체공휴일',

  // 2027
  '2027-02-06': '설날', '2027-02-07': '설날', '2027-02-08': '설날', '2027-02-09': '대체공휴일',
  '2027-05-13': '부처님오신날',
  '2027-09-14': '추석', '2027-09-15': '추석', '2027-09-16': '추석',

  // 2028
  '2028-01-26': '설날', '2028-01-27': '설날', '2028-01-28': '설날',
  '2028-05-02': '부처님오신날',
  '2028-10-02': '추석', '2028-10-03': '추석', '2028-10-04': '추석',

  // 2029
  '2029-02-12': '설날', '2029-02-13': '설날', '2029-02-14': '설날',
  '2029-05-20': '부처님오신날', '2029-05-21': '대체공휴일',
  '2029-09-21': '추석', '2029-09-22': '추석', '2029-09-23': '추석',

  // 2030
  '2030-02-02': '설날', '2030-02-03': '설날', '2030-02-04': '설날', '2030-02-05': '대체공휴일',
  '2030-05-09': '부처님오신날',
  '2030-09-11': '추석', '2030-09-12': '추석', '2030-09-13': '추석'
};

function getHolidayName(year, month, day) {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const solarKey = `${mm}-${dd}`;
  const lunarKey = `${year}-${solarKey}`;
  
  // 1. Check fixed solar holiday
  if (SOLAR_HOLIDAYS[solarKey]) return SOLAR_HOLIDAYS[solarKey];
  
  // 2. Check pre-seeded lunar holiday for that specific year
  return LUNAR_HOLIDAYS[lunarKey] || null;
}

// South Korea Standard Labor Annual Leave Calculator
function calculateTotalLeave(joinYearMonth) {
  if (!joinYearMonth) return 15;
  const [joinY, joinM] = joinYearMonth.split('-').map(Number);
  const currentY = 2026; // Fixed system timeline current year
  const currentM = 8;    // Fixed system timeline current month (August)
  
  const diffMonths = (currentY - joinY) * 12 + (currentM - joinM);
  if (diffMonths < 0) return 0; // Future hire date fallback
  
  if (diffMonths < 12) {
    // Less than 1 year: 1 day per month worked (max 11)
    return Math.max(0, diffMonths);
  } else {
    // 1 year or more: 15 + 1 day for every 2 years of service (max 25)
    const serviceYears = Math.floor(diffMonths / 12);
    const extraLeave = Math.floor((serviceYears - 1) / 2);
    return Math.min(25, 15 + extraLeave);
  }
}

// Development-only seed data. Real employee information must live only in the database.
const INITIAL_EMPLOYEES = [
  // Girincho Living Hall (6 staff)
  { id: 'emp_g1', name: '기린초1', phoneLast4: '1001', hall: 'girincho', role: 'staff', shiftGroup: 1, joinYearMonth: '2020-03', totalLeave: 17, remainingLeave: 17, usedLeave: 0 },
  { id: 'emp_g2', name: '기린초2', phoneLast4: '1002', hall: 'girincho', role: 'staff', shiftGroup: 2, joinYearMonth: '2021-05', totalLeave: 17, remainingLeave: 17, usedLeave: 0 },
  { id: 'emp_g3', name: '기린초3', phoneLast4: '1003', hall: 'girincho', role: 'staff', shiftGroup: 3, joinYearMonth: '2022-07', totalLeave: 16, remainingLeave: 16, usedLeave: 0 },
  { id: 'emp_g4', name: '기린초4', phoneLast4: '1004', hall: 'girincho', role: 'staff', shiftGroup: 4, joinYearMonth: '2023-09', totalLeave: 16, remainingLeave: 16, usedLeave: 0 },
  { id: 'emp_g5', name: '기린초5', phoneLast4: '1005', hall: 'girincho', role: 'staff', shiftGroup: 5, joinYearMonth: '2024-11', totalLeave: 15, remainingLeave: 15, usedLeave: 0 },
  { id: 'emp_g6', name: '기린초6', phoneLast4: '1006', hall: 'girincho', role: 'staff', shiftGroup: 6, joinYearMonth: '2025-05', totalLeave: 15, remainingLeave: 15, usedLeave: 0 },
  
  // Mulbongseon Living Hall (7 staff)
  { id: 'emp_m1', name: '물봉선1', phoneLast4: '2001', hall: 'mulbongseon', role: 'staff', shiftGroup: 1, joinYearMonth: '2019-01', totalLeave: 18, remainingLeave: 18, usedLeave: 0 },
  { id: 'emp_m2', name: '물봉선2', phoneLast4: '2002', hall: 'mulbongseon', role: 'staff', shiftGroup: 1, joinYearMonth: '2020-04', totalLeave: 17, remainingLeave: 17, usedLeave: 0 },
  { id: 'emp_m3', name: '물봉선3', phoneLast4: '2003', hall: 'mulbongseon', role: 'staff', shiftGroup: 2, joinYearMonth: '2021-08', totalLeave: 17, remainingLeave: 17, usedLeave: 0 },
  { id: 'emp_m4', name: '물봉선4', phoneLast4: '2004', hall: 'mulbongseon', role: 'staff', shiftGroup: 3, joinYearMonth: '2022-10', totalLeave: 16, remainingLeave: 16, usedLeave: 0 },
  { id: 'emp_m5', name: '물봉선5', phoneLast4: '2005', hall: 'mulbongseon', role: 'staff', shiftGroup: 4, joinYearMonth: '2023-12', totalLeave: 16, remainingLeave: 16, usedLeave: 0 },
  { id: 'emp_m6', name: '물봉선6', phoneLast4: '2006', hall: 'mulbongseon', role: 'staff', shiftGroup: 5, joinYearMonth: '2024-06', totalLeave: 15, remainingLeave: 15, usedLeave: 0 },
  { id: 'emp_m7', name: '물봉선7', phoneLast4: '2007', hall: 'mulbongseon', role: 'staff', shiftGroup: 6, joinYearMonth: '2025-02', totalLeave: 15, remainingLeave: 15, usedLeave: 0 },
  
  // Managers (2 Team Leaders + 1 System Admin)
  { id: 'mgr_g', name: '기린초팀장', username: null, hall: 'girincho', role: 'manager', joinYearMonth: '2020-01', totalLeave: 17, remainingLeave: 17, usedLeave: 0 },
  { id: 'mgr_m', name: '물봉선팀장', username: null, hall: 'mulbongseon', role: 'manager', joinYearMonth: '2019-03', totalLeave: 18, remainingLeave: 18, usedLeave: 0 },
  { id: 'mgr_admin', name: '시스템 관리자', username: null, hall: 'all', role: 'manager' }
];

const INITIAL_LEAVE_REQUESTS = [];

// Seed manual shift exceptions from screenshot
const INITIAL_SHIFT_MODIFICATIONS = [
  // Girincho manager July 2026 exceptions
  { employeeId: 'mgr_g', date: '2026-07-03', shift: '야간' },
  { employeeId: 'mgr_g', date: '2026-07-24', shift: '야간' },
  
  // Mulbongseon manager July 2026 exceptions
  { employeeId: 'mgr_m', date: '2026-07-10', shift: '야간' },
  { employeeId: 'mgr_m', date: '2026-07-25', shift: '주간' },
  { employeeId: 'mgr_m', date: '2026-07-27', shift: '휴무' },
  { employeeId: 'mgr_m', date: '2026-07-31', shift: '야간' }
];

// LocalStorage self-healing loaders
function safeGetLocalStorageArray(key, fallback = []) {
  try {
    const val = localStorage.getItem(key);
    if (!val) return fallback;
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) {
      // Filter out any corrupted elements
      return parsed.filter(item => item !== null && item !== undefined && typeof item === 'object');
    }
    return fallback;
  } catch (e) {
    console.error(`Failed to load localStorage key: ${key}`, e);
    return fallback;
  }
}

function safeGetLocalStorageObject(key, fallback = null) {
  try {
    const val = localStorage.getItem(key);
    if (!val) return fallback;
    const parsed = JSON.parse(val);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
    return fallback;
  } catch (e) {
    console.error(`Failed to load localStorage key: ${key}`, e);
    return fallback;
  }
}

function safeGetSessionStorageObject(key, fallback = null) {
  try {
    const val = sessionStorage.getItem(key);
    if (!val) return fallback;
    const parsed = JSON.parse(val);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
    return fallback;
  } catch (e) {
    console.error(`Failed to load sessionStorage key: ${key}`, e);
    return fallback;
  }
}

let globalNotices = [];

// Never restore private schedule data before Supabase Auth confirms the user.
let employees = [];
let leaveRequests = [];
let overtimeRequests = [];
let shiftModifications = [];
let currentUser = null;

function clearPrivateState() {
  employees = [];
  leaveRequests = [];
  overtimeRequests = [];
  shiftModifications = [];
  globalNotices = [];
  ['shift_employees', 'shift_leave_requests', 'shift_overtime_requests', 'shift_modifications', 'shift_global_notices']
    .forEach((key) => localStorage.removeItem(key));
  updateNoticeBanner();
}

// Helper to check and parse sessionStorage safely
function safeGetSessionStorageObject(key, defaultValue) {
  try {
    const val = sessionStorage.getItem(key);
    return val ? JSON.parse(val) : defaultValue;
  } catch (e) {
    console.error("Failed to parse sessionStorage key:", key, e);
    return defaultValue;
  }
}

// 1. Initial Data Seed (Only used for database initialization when empty)
const initialNamesStr = INITIAL_EMPLOYEES.map(e => e.name).sort().join(',');

// Load State from Supabase Server (Async)
async function loadStateFromServer() {
  try {
    // 1. Fetch Employees
    let { data: empData, error: empErr } = await getDB().rpc('get_visible_employees');
    if (empErr) {
      const fallback = await getDB().from('employees').select('*');
      empData = fallback.data;
      empErr = fallback.error;
    }
    if (empErr) throw empErr;
    empData = Array.isArray(empData) ? empData : [];

    // If database is completely empty, initialize it with seed data
    if (!empData || empData.length === 0) {
      const confirmInit = confirm("Supabase 데이터베이스에 등록된 근무자 데이터가 없습니다.\n기본 초기 데이터를 서버에 자동 등록하시겠습니까?");
      if (confirmInit) {
        await initializeDatabaseIfEmpty();
        alert("초기 데이터 등록이 완료되었습니다. 페이지가 새로고침됩니다.");
        location.reload();
      }
      return;
    }

    // 2. Fetch only the request details this user may see. The RPC hides other staff's reasons.
    let { data: leaveData, error: leaveErr } = await getDB().rpc('get_visible_leave_requests');
    if (leaveErr) {
      const fallback = await getDB().from('leave_requests').select('*');
      leaveData = fallback.data;
      leaveErr = fallback.error;
    }
    if (leaveErr) throw leaveErr;
    leaveData = Array.isArray(leaveData) ? leaveData : [];

    // 3. Fetch overtime with the same privacy rule.
    let { data: otData, error: otErr } = await getDB().rpc('get_visible_overtime_requests');
    if (otErr) {
      const fallback = await getDB().from('overtime_requests').select('*');
      otData = fallback.data;
      otErr = fallback.error;
    }
    if (otErr) throw otErr;
    otData = Array.isArray(otData) ? otData : [];

    // 4. Fetch Shift Modifications
    const { data: modData, error: modErr } = await getDB().from('shift_modifications').select('*');
    if (modErr) throw modErr;

    // 5. Fetch Global Notices
    const { data: noticeData, error: noticeErr } = await getDB().from('global_notices').select('*').order('created_at', { ascending: true });
    if (noticeErr) throw noticeErr;

    // Map database structures to local JS schemas
    employees = empData.map(e => ({
      id: e.id,
      name: e.name,
      phoneLast4: null,
      username: e.login_id,
      loginId: e.login_id,
      authUserId: e.auth_user_id,
      hall: e.hall,
      role: e.role,
      shiftGroup: e.shift_group,
      joinYearMonth: e.join_year_month,
      totalLeave: e.total_leave,
      remainingLeave: e.remaining_leave,
      usedLeave: e.used_leave
    }));

    leaveRequests = leaveData.map(l => ({
      id: l.id,
      groupId: l.group_id,
      employeeId: l.employee_id,
      employeeName: l.employee_name,
      hall: l.hall,
      date: l.date,
      leaveType: l.leave_type,
      reason: l.reason,
      status: l.status
    }));

    overtimeRequests = otData.map(o => ({
      id: o.id,
      employeeId: o.employee_id,
      employeeName: o.employee_name,
      hall: o.hall,
      date: o.date,
      timeOfDay: o.time_of_day,
      hours: o.hours,
      reason: o.reason,
      status: o.status
    }));

    shiftModifications = modData.map(m => ({
      id: m.id,
      employeeId: m.employee_id,
      date: m.date,
      shift: m.shift,
      otMorning: m.ot_morning,
      otAfternoon: m.ot_afternoon
    }));

    globalNotices = noticeData.map(n => n.content);

    // Save to local storage cache so that NEXT reload/refresh is 0ms instant
    localStorage.setItem('shift_employees', JSON.stringify(employees));
    localStorage.setItem('shift_leave_requests', JSON.stringify(leaveRequests));
    localStorage.setItem('shift_overtime_requests', JSON.stringify(overtimeRequests));
    localStorage.setItem('shift_modifications', JSON.stringify(shiftModifications));
    localStorage.setItem('shift_global_notices', JSON.stringify(globalNotices));

    updateNoticeBanner();
  } catch (err) {
    console.error("Failed to load state from Supabase:", err);
    alert("데이터베이스 로딩 중 오류가 발생했습니다:\n" + (err.message || err));
  }
}

// Initialize Supabase database with default seed data
async function initializeDatabaseIfEmpty() {
  console.log("Initializing Supabase database with default seed data...");
  try {
    // 1. Insert Employees
    const dbEmps = INITIAL_EMPLOYEES.map(e => ({
      id: e.id,
      name: e.name,
      login_id: e.loginId || null,
      auth_user_id: e.authUserId || null,
      hall: e.hall,
      role: e.role,
      shift_group: e.shiftGroup || null,
      join_year_month: e.joinYearMonth || null,
      total_leave: e.totalLeave || 15,
      remaining_leave: e.remainingLeave || 15,
      used_leave: e.usedLeave || 0
    }));
    const { error: empErr } = await getDB().from('employees').insert(dbEmps);
    if (empErr) throw empErr;

    // 2. Insert Leave Requests
    const dbLeaves = INITIAL_LEAVE_REQUESTS.map(l => ({
      id: l.id,
      group_id: l.groupId || null,
      employee_id: l.employeeId,
      employee_name: l.employeeName,
      hall: l.hall,
      date: l.date,
      leave_type: l.reason || '연가',
      reason: l.reason || '연가 신청',
      status: l.status || 'approved'
    }));
    const { error: leaveErr } = await getDB().from('leave_requests').insert(dbLeaves);
    if (leaveErr) throw leaveErr;

    // 3. Insert Shift Modifications
    const dbMods = INITIAL_SHIFT_MODIFICATIONS.map(m => ({
      id: `mod_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      employee_id: m.employeeId,
      date: m.date,
      shift: m.shift,
      ot_morning: m.otMorning || 0,
      ot_afternoon: m.otAfternoon || 0
    }));
    const { error: modErr } = await getDB().from('shift_modifications').insert(dbMods);
    if (modErr) throw modErr;

    console.log("Database initialized successfully!");
    await loadStateFromServer();
  } catch (err) {
    console.error("Failed to initialize database:", err);
    alert("서버 데이터베이스 초기화 중 오류가 발생했습니다:\n" + (err.message || err.details || JSON.stringify(err)));
    throw err;
  }
}

// Display settings (Defaults to current system date)
const todayDate = new Date();
let currentYear = todayDate.getFullYear();
let currentMonth = todayDate.getMonth();

// Modal variables
let editingShiftData = null;



// Save helper
// Save helper (Async Supabase Sync-upsert and delete sync)
let isLocallySaving = false; // Flag to prevent redundant realtime reloads on local save actions

async function saveState() {
  isLocallySaving = true; // Block incoming realtime updates while local save is in progress
  try {
    // 1. Upsert Employees
    const dbEmps = employees.map(e => ({
      id: e.id,
      name: e.name,
      username: e.username,
      login_id: e.loginId || null,
      auth_user_id: e.authUserId || null,
      hall: e.hall,
      role: e.role,
      shift_group: e.shiftGroup,
      join_year_month: e.joinYearMonth,
      total_leave: e.totalLeave,
      remaining_leave: e.remainingLeave,
      used_leave: e.usedLeave
    }));
    await getDB().from('employees').upsert(dbEmps);

    // 2. Sync Leave Requests
    const dbLeaves = leaveRequests.map(l => ({
      id: l.id,
      group_id: l.groupId || null,
      employee_id: l.employeeId,
      employee_name: l.employeeName,
      hall: l.hall,
      date: l.date,
      leave_type: l.leaveType || '연가',
      reason: l.reason,
      status: l.status
    }));
    if (dbLeaves.length > 0) {
      await getDB().from('leave_requests').upsert(dbLeaves);
      const localLeaveIds = dbLeaves.map(l => l.id);
      await getDB().from('leave_requests').delete().not('id', 'in', localLeaveIds);
    } else {
      await getDB().from('leave_requests').delete().neq('id', 'placeholder');
    }

    // 3. Sync Overtime Requests
    const dbOts = overtimeRequests.map(o => ({
      id: o.id,
      employee_id: o.employeeId,
      employee_name: o.employeeName,
      hall: o.hall,
      date: o.date,
      time_of_day: o.timeOfDay,
      hours: o.hours,
      reason: o.reason,
      status: o.status
    }));
    if (dbOts.length > 0) {
      await getDB().from('overtime_requests').upsert(dbOts);
      const localOtIds = dbOts.map(o => o.id);
      await getDB().from('overtime_requests').delete().not('id', 'in', localOtIds);
    } else {
      await getDB().from('overtime_requests').delete().neq('id', 'placeholder');
    }

    // 4. Sync Shift Modifications
    const dbMods = shiftModifications.map(m => ({
      id: m.id || `mod_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      employee_id: m.employeeId,
      date: m.date,
      shift: m.shift,
      ot_morning: m.otMorning || 0,
      ot_afternoon: m.otAfternoon || 0
    }));
    if (dbMods.length > 0) {
      await getDB().from('shift_modifications').upsert(dbMods);
      const localModIds = dbMods.map(m => m.id);
      await getDB().from('shift_modifications').delete().not('id', 'in', localModIds);
    } else {
      await getDB().from('shift_modifications').delete().neq('id', 'placeholder');
    }

    // 5. Sync Global Notices
    await getDB().from('global_notices').delete().neq('id', 'placeholder');
    const dbNotices = globalNotices.map((content, idx) => ({
      id: `n_${idx}_${Date.now()}`,
      content: content
    }));
    if (dbNotices.length > 0) {
      await getDB().from('global_notices').insert(dbNotices);
    }

    updateNoticeBanner();
  } catch (err) {
    console.error("Failed to save state to Supabase:", err);
  } finally {
    // Release the local save lock after a small cooldown to ignore immediate echoed realtime events
    setTimeout(() => {
      isLocallySaving = false;
    }, 1500);
  }
}

// Request-specific writes. Staff actions must never synchronize or delete whole tables.
async function createLeaveRequest(request) {
  const row = {
    id: request.id,
    group_id: request.groupId || null,
    employee_id: currentUser.id,
    employee_name: currentUser.name,
    hall: currentUser.hall,
    date: request.date,
    leave_type: request.leaveType,
    reason: request.reason,
    status: 'pending'
  };
  const { error } = await getDB().from('leave_requests').insert(row);
  if (error) throw error;
  leaveRequests.push({ ...request, employeeId: currentUser.id, employeeName: currentUser.name, hall: currentUser.hall, status: 'pending' });
}

async function updateOwnLeaveRequest(requestId, changes) {
  const allowed = { reason: changes.reason, leave_type: changes.leaveType, status: 'pending' };
  const { error } = await getDB().from('leave_requests').update(allowed).eq('id', requestId).eq('employee_id', currentUser.id).eq('status', 'pending');
  if (error) throw error;
}

async function createOvertimeRequest(request) {
  const row = {
    id: request.id,
    employee_id: currentUser.id,
    employee_name: currentUser.name,
    hall: currentUser.hall,
    date: request.date,
    time_of_day: request.timeOfDay,
    hours: request.hours,
    reason: request.reason,
    status: 'pending'
  };
  const { error } = await getDB().from('overtime_requests').insert(row);
  if (error) throw error;
  overtimeRequests.push({ ...request, employeeId: currentUser.id, employeeName: currentUser.name, hall: currentUser.hall, status: 'pending' });
}

async function updateOwnOvertimeRequest(requestId, changes) {
  const allowed = { time_of_day: changes.timeOfDay, hours: changes.hours, reason: changes.reason, status: 'pending' };
  const { error } = await getDB().from('overtime_requests').update(allowed).eq('id', requestId).eq('employee_id', currentUser.id).eq('status', 'pending');
  if (error) throw error;
}

async function updateRequestStatus(table, requestId, status) {
  if (!currentUser || currentUser.role !== 'manager') throw new Error('관리자 권한이 필요합니다.');
  const { error } = await getDB().from(table).update({ status }).eq('id', requestId);
  if (error) throw error;
}

async function deleteRequestAsManager(table, requestId) {
  if (!currentUser || !isUserAdmin()) throw new Error('관리자 권한이 필요합니다.');
  const { data, error } = await getDB().from(table).delete().eq('id', requestId).select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('삭제할 신청 내역을 서버에서 찾지 못했습니다.');
}

async function deleteOwnRequest(table, requestId) {
  const { data, error } = await getDB()
    .from(table)
    .delete()
    .eq('id', requestId)
    .eq('employee_id', currentUser.id)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('취소할 신청을 서버에서 찾지 못했습니다. 새로고침 후 다시 시도해 주세요.');
}

async function saveEmployeeLeaveCounts(employee) {
  const { error } = await getDB().from('employees').update({
    total_leave: employee.totalLeave,
    remaining_leave: employee.remainingLeave,
    used_leave: employee.usedLeave
  }).eq('id', employee.id);
  if (error) throw error;
}

async function updateManagerProfile(managerId, changes) {
  if (!currentUser || currentUser.hall !== 'all') throw new Error('전체 관리자 권한이 필요합니다.');
  const { error } = await getDB().from('employees').update({ name: changes.name, hall: changes.hall }).eq('id', managerId).eq('role', 'manager');
  if (error) throw error;
}

// Admin checking helper: grants admin status to team leaders and system admin
function isUserAdmin() {
  return currentUser && currentUser.role === 'manager';
}

// Get Monday-to-Sunday week boundaries for a date
function getWeekRange(dateStr) {
  const d = parseLocalDate(dateStr);
  const day = d.getDay(); // 0: Sunday, 1: Monday, ..., 6: Saturday
  const start = new Date(d);
  const diff = day === 0 ? -6 : -(day - 1);
  start.setDate(d.getDate() + diff); // Monday
  const end = new Date(start);
  end.setDate(start.getDate() + 6); // Sunday
  
  return {
    startStr: formatLocalDate(start),
    endStr: formatLocalDate(end)
  };
}

// Calculate total overtime hours in the target date's week range (can supply custom mods array)
function getWeeklyOvertimeTotal(employeeId, targetDateStr, excludeRequestId = null, mods = shiftModifications) {
  const { startStr, endStr } = getWeekRange(targetDateStr);
  const employee = employees.find(e => e.id === employeeId);
  if (!employee) return 0;

  let total = 0;
  let currentDate = parseLocalDate(startStr);
  const endDate = parseLocalDate(endStr);

  while (currentDate <= endDate) {
    const dateStr = formatLocalDate(currentDate);
    total += getOvertimeHoursWithMods(employee, dateStr, mods, excludeRequestId);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return total;
}

// Calculate total overtime hours in the target date's month range (can supply custom mods array)
function getMonthlyOvertimeTotal(employeeId, year, month, excludeRequestId = null, mods = shiftModifications) {
  const employee = employees.find(e => e.id === employeeId);
  if (!employee) return 0;

  let total = 0;
  const totalDays = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= totalDays; day++) {
    const dateStr = formatDateString(year, month, day);
    total += getOvertimeHoursWithMods(employee, dateStr, mods, excludeRequestId);
  }

  return total;
}

// Helper: Generate overtime display HTML (includes pending requests formatted distinctly)
function getOvertimeCellHtml(employee, dateStr, type) {
  if (employee.id === 'mgr_admin') return '';
  
  const leaveReq = leaveRequests.find(req => req && req.employeeId === employee.id && req.date === dateStr && req.status === 'approved');
  if (leaveReq) return '';

  const shift = calculateShift(employee, dateStr);
  const isOffDay = (shift === '휴무' || shift === '휴' || shift === '휴무(대기)');

  // If it is an off-day (휴무), regardless of morning/afternoon, we sum all hours and display them on the right (afternoon).
  if (isOffDay) {
    if (type === 'morning') return ''; // Render nothing on the left
    
    // For afternoon (right), sum morning + afternoon hours
    const modification = shiftModifications.find(mod => mod && mod.employeeId === employee.id && mod.date === dateStr);
    let displayHours = 0;
    let pendingHours = 0;
    
    if (modification) {
      const morningOt = parseInt(modification.otMorning || 0);
      const afternoonOt = parseInt(modification.otAfternoon || 0);
      displayHours = morningOt + afternoonOt;
    } else {
      // Sum approved overtime for both morning and afternoon
      const approved = overtimeRequests.filter(req => req && req.employeeId === employee.id && req.date === dateStr && req.status === 'approved');
      displayHours = approved.reduce((sum, r) => sum + parseInt(r.hours || 0), 0);
      
      // Sum pending overtime for both morning and afternoon
      const pending = overtimeRequests.filter(req => req && req.employeeId === employee.id && req.date === dateStr && req.status === 'pending');
      pendingHours = pending.reduce((sum, r) => sum + parseInt(r.hours || 0), 0);
    }
    
    const prefix = 'overtime-label-suffix';
    let html = '';
    if (displayHours > 0) {
      html += `<span class="${prefix}">${displayHours}</span>`;
    }
    if (pendingHours > 0) {
      html += `<span class="${prefix} pending-ot" style="margin: 0 1px;">${pendingHours}</span>`;
    }
    return html;
  }

  // Normal work days logic
  const modification = shiftModifications.find(mod => mod && mod.employeeId === employee.id && mod.date === dateStr);
  let displayHours = 0;
  let pendingHours = 0;
  let isOverridden = false;

  if (modification) {
    isOverridden = true;
    if (modification.shift && modification.shift.startsWith('보상휴가 (')) {
      const match = modification.shift.match(/\d+/);
      const hours = match ? parseInt(match[0]) : 1;
      displayHours = type === 'afternoon' ? -hours : 0;
    } else {
      if (type === 'morning') {
        displayHours = parseInt(modification.otMorning || 0);
      } else {
        displayHours = parseInt(modification.otAfternoon || 0);
      }
    }
  } else {
    // Calculate base shift overtime for afternoon
    if (type === 'afternoon') {
      if (shift === '당직') displayHours = 3;
      else if (shift === '야간') displayHours = 4;
    }
    
    // Add approved extra overtime
    const approved = overtimeRequests.filter(req => req && req.employeeId === employee.id && req.date === dateStr && req.status === 'approved' && req.timeOfDay === type);
    displayHours += approved.reduce((sum, r) => sum + parseInt(r.hours || 0), 0);

    // Fetch pending overtime
    const pending = overtimeRequests.filter(req => req && req.employeeId === employee.id && req.date === dateStr && req.status === 'pending' && req.timeOfDay === type);
    pendingHours = pending.reduce((sum, r) => sum + parseInt(r.hours || 0), 0);
  }

  const prefix = type === 'morning' ? 'overtime-label-prefix' : 'overtime-label-suffix';
  let html = '';
  
  if (displayHours !== 0) {
    let showSolid = true;
    if (type === 'afternoon' && !isOverridden) {
      const shift = calculateShift(employee, dateStr);
      let baseOt = (shift === '당직') ? 3 : (shift === '야간' ? 4 : 0);
      if (displayHours === baseOt) showSolid = false;
    }
    if (showSolid) {
      html += `<span class="${prefix}">${displayHours}</span>`;
    }
  }
  
  if (pendingHours > 0) {
    html += `<span class="${prefix} pending-ot" style="margin: 0 1px;">${pendingHours}</span>`;
  }
  
  return html;
}

// Helper: Calculate daily overtime hours with a custom modifications array and optional excludeRequestId
function getOvertimeHoursWithMods(employee, dateStr, mods, excludeRequestId = null) {
  if (employee.id === 'mgr_admin') return 0;
  
  const leaveReq = leaveRequests.find(req => 
    req &&
    req.employeeId === employee.id && 
    req.date === dateStr &&
    req.status === 'approved'
  );
  if (leaveReq) return 0;

  const modification = mods.find(mod => 
    mod &&
    mod.employeeId === employee.id && 
    mod.date === dateStr
  );
  
  // Morning overtime
  let morningOt = 0;
  if (modification) {
    if (modification.shift && modification.shift.startsWith('보상휴가 (')) {
      morningOt = 0;
    } else if (modification.otMorning !== undefined && modification.otMorning !== null && modification.otMorning !== '') {
      morningOt = parseInt(modification.otMorning || 0);
    }
  } else {
    const approvedOtMorning = overtimeRequests.filter(req => 
      req && 
      req.employeeId === employee.id && 
      req.date === dateStr && 
      req.status !== 'rejected' && 
      req.id !== excludeRequestId &&
      req.timeOfDay === 'morning'
    );
    morningOt = approvedOtMorning.reduce((sum, r) => sum + parseInt(r.hours || 0), 0);
  }

  // Afternoon overtime
  let afternoonOt = 0;
  if (modification) {
    if (modification.shift && modification.shift.startsWith('보상휴가 (')) {
      afternoonOt = 0;
    } else if (modification.otAfternoon !== undefined && modification.otAfternoon !== null && modification.otAfternoon !== '') {
      afternoonOt = parseInt(modification.otAfternoon || 0);
    } else {
      // Default to base overtime of the modified shift!
      const modifiedShift = modification.shift || calculateShift(employee, dateStr);
      if (modifiedShift === '당직') afternoonOt = 3;
      else if (modifiedShift === '야간') afternoonOt = 4;
    }
  } else {
    const shift = calculateShift(employee, dateStr);
    let baseOt = 0;
    if (shift === '당직') baseOt = 3;
    else if (shift === '야간') baseOt = 4;
    
    const approvedOtAfternoon = overtimeRequests.filter(req => 
      req && 
      req.employeeId === employee.id && 
      req.date === dateStr && 
      req.status !== 'rejected' && 
      req.id !== excludeRequestId &&
      req.timeOfDay === 'afternoon'
    );
    afternoonOt = baseOt + approvedOtAfternoon.reduce((sum, r) => sum + parseInt(r.hours || 0), 0);
  }

  return morningOt + afternoonOt;
}

// Calculate individual day overtime hours (includes base shifts: 당직=3, 야간=4)
function getOvertimeHours(employee, dateStr) {
  return getOvertimeHoursWithMods(employee, dateStr, shiftModifications);
}

// Custom approved display hours on calendar cells (Excludes standard 당직 3h / 야간 4h)
function getDisplayOvertimeMorning(employee, dateStr) {
  if (employee.id === 'mgr_admin') return 0;
  
  const leaveReq = leaveRequests.find(req => req && req.employeeId === employee.id && req.date === dateStr && req.status === 'approved');
  if (leaveReq) return 0;

  const modification = shiftModifications.find(mod => mod && mod.employeeId === employee.id && mod.date === dateStr);
  if (modification && modification.otMorning !== undefined && modification.otMorning !== null && modification.otMorning !== '') {
    return parseInt(modification.otMorning || 0);
  }

  const approvedOtMorning = overtimeRequests.filter(req => req && req.employeeId === employee.id && req.date === dateStr && req.status === 'approved' && req.timeOfDay === 'morning');
  return approvedOtMorning.reduce((sum, r) => sum + parseInt(r.hours || 0), 0);
}

function getDisplayOvertimeAfternoon(employee, dateStr) {
  if (employee.id === 'mgr_admin') return 0;
  
  const leaveReq = leaveRequests.find(req => req && req.employeeId === employee.id && req.date === dateStr && req.status === 'approved');
  if (leaveReq) return 0;

  const modification = shiftModifications.find(mod => mod && mod.employeeId === employee.id && mod.date === dateStr);
  
  // If there is a manual override, check if it differs from the standard base shift overtime
  if (modification && modification.otAfternoon !== undefined && modification.otAfternoon !== null && modification.otAfternoon !== '') {
    const shift = modification.shift;
    let baseOt = 0;
    if (shift === '당직') baseOt = 3;
    else if (shift === '야간') baseOt = 4;
    
    const manualVal = parseInt(modification.otAfternoon || 0);
    return manualVal !== baseOt ? manualVal : 0;
  }

  const approvedOtAfternoon = overtimeRequests.filter(req => req && req.employeeId === employee.id && req.date === dateStr && req.status === 'approved' && req.timeOfDay === 'afternoon');
  return approvedOtAfternoon.reduce((sum, r) => sum + parseInt(r.hours || 0), 0);
}

// Calculate shift for a specific employee on a specific date string (YYYY-MM-DD)
function calculateShift(employee, dateStr) {
  // If system admin (developer), no shifts
  if (employee.id === 'mgr_admin') return '';

  // 1. Check if they have a leave request on this date
  const leaveReq = leaveRequests.find(req => 
    req.employeeId === employee.id && 
    req.date === dateStr &&
    req.status !== 'rejected'
  );
  if (leaveReq) {
    const lType = leaveReq.leaveType || '연가';
    if (lType === '공가') {
      return leaveReq.status === 'approved' ? '공가' : '공가(대기)';
    } else if (lType === '병가') {
      return leaveReq.status === 'approved' ? '병가' : '병가(대기)';
    } else if (lType === '안식년') {
      return leaveReq.status === 'approved' ? '안식년' : '안식년(대기)';
    }
    return leaveReq.status === 'approved' ? '연가' : '연가(대기)';
  }

  // 2. Check if there's a manual shift modification
  const modification = shiftModifications.find(mod => 
    mod.employeeId === employee.id && 
    mod.date === dateStr
  );
  if (modification) return modification.shift;

  // 3. Special shift schedule logic for Team Leaders
  if (employee.role === 'manager') {
    const d = parseLocalDate(dateStr);
    const day = d.getDay();
    // Default Weekdays: 주간, Weekends: 휴무
    return (day === 0 || day === 6) ? '휴무' : '주간';
  }

  // 4. Calculate staff rotational shift based on shiftGroup (1조 ~ 6조)
  const dateObj = parseLocalDate(dateStr);
  const timeDiff = dateObj.getTime() - ANCHOR_DATE.getTime();
  const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  
  const group = employee.shiftGroup || 1;
  const startOffset = GROUP_OFFSETS[group];
  
  // Modulo index
  let index = (daysDiff + startOffset) % 6;
  if (index < 0) index += 6;

  return SHIFT_CYCLE[index];
}

// Calculate default cycle shift for a specific employee on a specific date string (before leaves or modifications)
function calculateDefaultCycleShift(employee, dateStr) {
  if (employee.id === 'mgr_admin') return '';
  
  if (employee.role === 'manager') {
    const d = parseLocalDate(dateStr);
    const day = d.getDay();
    return (day === 0 || day === 6) ? '휴무' : '주간';
  }

  const dateObj = parseLocalDate(dateStr);
  const timeDiff = dateObj.getTime() - ANCHOR_DATE.getTime();
  const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  
  const group = employee.shiftGroup || 1;
  const startOffset = GROUP_OFFSETS[group];
  
  let index = (daysDiff + startOffset) % 6;
  if (index < 0) index += 6;

  return SHIFT_CYCLE[index];
}

// Format Date object as YYYY-MM-DD
function formatDateString(year, month, day) {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

// Get Korean weekday text
function getKoranWeekday(year, month, day) {
  const d = new Date(year, month, day);
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  return weekdays[d.getDay()];
}

// Check theme settings on startup (Forced to Light Theme for perfect readability)
function initTheme() {
  document.documentElement.setAttribute('data-theme', 'light');
  localStorage.setItem('app-theme', 'light');
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.style.display = 'none'; // Ensure button is hidden
  }
}

// Initialize Application UI
async function initApp() {
  initTheme();

  // Local visual preview only. This never reads or writes the live Supabase project.
  const isPreviewMode = new URLSearchParams(window.location.search).get('preview') === '1';
  if (isPreviewMode) {
    employees = INITIAL_EMPLOYEES.map((employee) => ({ ...employee }));
    leaveRequests = [];
    overtimeRequests = [];
    shiftModifications = INITIAL_SHIFT_MODIFICATIONS.map((item) => ({ ...item }));
    currentUser = employees.find((employee) => employee.id === 'emp_g1') || null;
  }
  
  // Render the shell first. Private schedule data is loaded only after Auth confirms a session.
  updateLoginUI();
  updateNoticeBanner();
  renderRoster();
  
  // Fetch fresh server state in background and update UI on completion
  if (!isPreviewMode) {
    const sessionUser = await window.SahaAuth.getSessionUser();
    if (sessionUser) {
      await loadStateFromServer();
      currentUser = employees.find((employee) => employee.authUserId === sessionUser.id) || null;
      updateLoginUI();
      renderRoster();
      if (currentUser && currentUser.role === 'manager') {
        renderAdminDashboard();
      } else if (currentUser) {
        renderMyPage();
      }
    } else {
      clearPrivateState();
      updateLoginUI();
      renderRoster();
    }
  }
  
  // Hook Theme Toggle (Forced light mode override)
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('app-theme', 'light');
    });
  }

  // Bind Collapsible Sections Toggles
  document.querySelectorAll('.collapse-trigger').forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      // Handle when clicked sub element inside button
      const button = e.target.closest('.collapse-trigger');
      if (!button) return;
      
      const targetId = button.dataset.target;
      const targetContainer = document.getElementById(targetId);
      if (targetContainer) {
        const isCollapsed = targetContainer.classList.toggle('collapsed');
        button.classList.toggle('collapsed', isCollapsed);
      }
    });
  });



  // Reactivity: Auto calculate leaves on Join Date change inside the edit modal
  document.getElementById('edit-emp-join').addEventListener('input', (e) => {
    const val = e.target.value; // YYYY-MM
    if (val) {
      const calculated = calculateTotalLeave(val);
      document.getElementById('edit-emp-total').value = calculated;
    }
  });

  // Mobile Tab Select Handlers
  const mobileTabBtns = document.querySelectorAll('.mobile-tab-btn');
  if (mobileTabBtns.length > 0) {
    document.body.classList.add('show-tab-girincho');
    mobileTabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.target.getAttribute('data-tab');
        document.body.dataset.mobileHall = tab;
        mobileTabBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        document.body.classList.remove('show-tab-girincho', 'show-tab-mulbongseon', 'show-tab-managers');
        document.body.classList.add('show-tab-' + tab);
      });
    });
  }

  // Admin Dashboard Month/Hall/Sort Filters Handler
  const adminFilter = document.getElementById('admin-month-filter');
  if (adminFilter) {
    adminFilter.addEventListener('change', () => {
      renderAdminDashboard();
    });
  }
  const adminHallFilter = document.getElementById('admin-hall-filter');
  if (adminHallFilter) {
    adminHallFilter.addEventListener('change', () => {
      renderAdminDashboard();
    });
  }
  const adminSortFilter = document.getElementById('admin-sort-filter');
  if (adminSortFilter) {
    adminSortFilter.addEventListener('change', () => {
      renderAdminDashboard();
    });
  }

  // Admin Cell Approval Modal Close Handler
  const cellApprovalClose = document.getElementById('admin-cell-approval-close');
  if (cellApprovalClose) {
    cellApprovalClose.addEventListener('click', () => {
      document.getElementById('admin-cell-approval-overlay').classList.remove('active');
    });
  }

  // Render Login state
  initYearMonthDropdowns();
  
  // Set up event listeners
  setupEventListeners();
  setupMobileStaffNavigation();
  if (!isPreviewMode) subscribeRealtimeChanges();
}

// Subscribe to Realtime DB updates via Supabase
let realtimeTimeout = null;
function subscribeRealtimeChanges() {
  getDB()
    .channel('db-changes')
    .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
      console.log('Realtime change detected:', payload);
      if (isLocallySaving) {
        console.log('Bypassing realtime reload: change triggered by local client.');
        return;
      }
      
      // Debounce multiple fast updates into a single server reload
      clearTimeout(realtimeTimeout);
      realtimeTimeout = setTimeout(async () => {
        console.log('Executing debounced state reload from Supabase...');
        await loadStateFromServer();
        renderRoster();
        renderAdminDashboard();
        renderSpecialLeaveList();
        renderMyPage();
        updateNoticeBanner();
      }, 500);
    })
    .subscribe();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}


// Setup Events
function setupEventListeners() {
  // Login Modal triggers
  const loginOverlay = document.getElementById('login-overlay');
  
  document.getElementById('btn-login-trigger').addEventListener('click', () => {
    // Reset to staff tab on open
    document.querySelectorAll('.auth-tab').forEach(t => {
      if (t.dataset.type === 'staff') t.classList.add('active');
      else t.classList.remove('active');
    });
    document.getElementById('staff-login-fields').style.display = 'block';
    document.getElementById('manager-login-fields').style.display = 'none';
    
    // Manage required attributes
    document.getElementById('staff-login-id').required = true;
    document.getElementById('staff-password').required = true;
    document.getElementById('manager-id').required = false;
    document.getElementById('manager-pw').required = false;

    loginOverlay.classList.add('active');
  });

  document.getElementById('login-modal-close').addEventListener('click', () => {
    loginOverlay.classList.remove('active');
  });

  document.getElementById('login-modal-cancel').addEventListener('click', () => {
    loginOverlay.classList.remove('active');
  });

  // Calendar prev/next buttons
  document.getElementById('prev-month-btn').addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    syncDateAndRender();
  });

  document.getElementById('next-month-btn').addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    syncDateAndRender();
  });

  // Auth tabs inside login modal
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      const type = e.target.dataset.type;
      if (type === 'staff') {
        document.getElementById('staff-login-fields').style.display = 'block';
        document.getElementById('manager-login-fields').style.display = 'none';
        
        // Manage required fields
        document.getElementById('staff-login-id').required = true;
        document.getElementById('staff-password').required = true;
        document.getElementById('manager-id').required = false;
        document.getElementById('manager-pw').required = false;
      } else {
        document.getElementById('staff-login-fields').style.display = 'none';
        document.getElementById('manager-login-fields').style.display = 'block';
        
        // Manage required fields
        document.getElementById('staff-login-id').required = false;
        document.getElementById('staff-password').required = false;
        document.getElementById('manager-id').required = true;
        document.getElementById('manager-pw').required = true;
      }
    });
  });

  // Staff Request Modal Tab toggles
  const tabStaffLeave = document.getElementById('tab-staff-leave');
  const tabStaffOfficialLeave = document.getElementById('tab-staff-official-leave');
  const tabStaffOt = document.getElementById('tab-staff-ot');
  const formStaffLeave = document.getElementById('staff-leave-form');
  const formStaffOfficialLeave = document.getElementById('staff-official-leave-form');
  const formStaffOt = document.getElementById('staff-ot-form');

  if (tabStaffLeave && tabStaffOfficialLeave && tabStaffOt) {
    tabStaffLeave.addEventListener('click', () => {
      tabStaffLeave.classList.add('active');
      tabStaffOfficialLeave.classList.remove('active');
      tabStaffOt.classList.remove('active');
      formStaffLeave.style.display = 'block';
      formStaffOfficialLeave.style.display = 'none';
      formStaffOt.style.display = 'none';
    });

    tabStaffOfficialLeave.addEventListener('click', () => {
      tabStaffOfficialLeave.classList.add('active');
      tabStaffLeave.classList.remove('active');
      tabStaffOt.classList.remove('active');
      formStaffLeave.style.display = 'none';
      formStaffOfficialLeave.style.display = 'block';
      formStaffOt.style.display = 'none';
    });

    tabStaffOt.addEventListener('click', () => {
      tabStaffOt.classList.add('active');
      tabStaffLeave.classList.remove('active');
      tabStaffOfficialLeave.classList.remove('active');
      formStaffLeave.style.display = 'none';
      formStaffOfficialLeave.style.display = 'none';
      formStaffOt.style.display = 'block';
    });
  }

  // Cancel/Close staff modal
  const closeStaffModal = () => {
    document.getElementById('staff-request-overlay').classList.remove('active');
    // Clear input fields
    const leaveReasonInput = document.getElementById('staff-leave-reason');
    if (leaveReasonInput) leaveReasonInput.value = '';
    const officialLeaveReasonInput = document.getElementById('staff-official-leave-reason');
    if (officialLeaveReasonInput) officialLeaveReasonInput.value = '';
    const otReasonInput = document.getElementById('staff-ot-reason');
    if (otReasonInput) otReasonInput.value = '';
    
    // Reset button texts
    const leaveSubmit = document.querySelector('#staff-leave-form button[type="submit"]');
    if (leaveSubmit) leaveSubmit.textContent = '연가 신청 제출';
    const officialLeaveSubmit = document.querySelector('#staff-official-leave-form button[type="submit"]');
    if (officialLeaveSubmit) officialLeaveSubmit.textContent = '공가 신청 제출';
    const otSubmit = document.querySelector('#staff-ot-form button[type="submit"]');
    if (otSubmit) otSubmit.textContent = '시간외 신청 제출';

    editingRequestId = null;
    editingRequestType = null;
    staffRequestData = null;
  };
  document.getElementById('staff-request-close').addEventListener('click', closeStaffModal);
  document.getElementById('staff-leave-cancel').addEventListener('click', closeStaffModal);
  document.getElementById('staff-official-leave-cancel').addEventListener('click', closeStaffModal);
  document.getElementById('staff-ot-cancel').addEventListener('click', closeStaffModal);

  // Staff Leave Form Submit
  formStaffLeave.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser || !staffRequestData) return;

    const { employee, dateStr } = staffRequestData;
    const reason = document.getElementById('staff-leave-reason').value.trim();

    const shiftModification = shiftModifications.find(mod =>
      mod && mod.employeeId === employee.id && mod.date === dateStr
    );
    const scheduledShift = shiftModification
      ? shiftModification.shift
      : calculateDefaultCycleShift(employee, dateStr);
    if (scheduledShift === '휴무' || scheduledShift === '휴' || scheduledShift === '휴무(대기)') {
      alert('휴무라 연가 사용이 어렵습니다.');
      return;
    }

    const empData = employees.find(emp => emp.id === employee.id);
    if (!editingRequestId && empData.remainingLeave <= 0) {
      alert('사용 가능한 잔여 연가가 없습니다.');
      return;
    }

    if (editingRequestId && editingRequestType === 'leave') {
      const req = leaveRequests.find(r => r.id === editingRequestId);
      if (req) {
        try {
          await updateOwnLeaveRequest(req.id, { reason: reason || '개인 사정', leaveType: '연가' });
        } catch (error) {
          alert('연가 신청을 수정하지 못했습니다: ' + (error.message || error));
          return;
        }
        req.reason = reason || '개인 사정';
        req.leaveType = '연가';
        closeStaffModal();
        alert('연가 신청이 수정되었습니다.');
        renderMyPage();
        renderRoster();
        return;
      }
    }

    const duplicated = leaveRequests.some(req => req.employeeId === employee.id && req.date === dateStr && req.status !== 'rejected');
    if (duplicated) {
      alert('해당 날짜에 이미 신청된 연가가 있습니다.');
      return;
    }

    // Check if they have overtime on a off-day in the same week
    const { startStr, endStr } = getWeekRange(dateStr);
    const hasOtInWeek = overtimeRequests.some(r => {
      if (r && r.employeeId === employee.id && r.date >= startStr && r.date <= endStr && r.status !== 'rejected') {
        const tempEmp = employees.find(e => e.id === employee.id);
        const shift = calculateShift(tempEmp, r.date);
        return (shift === '휴무' || shift === '휴' || shift === '휴무(대기)');
      }
      return false;
    });
    if (hasOtInWeek) {
      alert('이번 주 휴무일에 시간외 근무 신청 내역이 있어 연가를 신청할 수 없습니다.');
      return;
    }

    const newRequest = {
      id: 'req_' + Date.now(),
      employeeId: employee.id,
      employeeName: employee.name,
      hall: employee.hall,
      date: dateStr,
      leaveType: '연가',
      reason: reason || '개인 사정',
      status: 'pending'
    };

    try {
      await createLeaveRequest(newRequest);
    } catch (error) {
      alert('연가 신청을 저장하지 못했습니다: ' + (error.message || error));
      return;
    }
    closeStaffModal();
    alert('연가가 신청되어 근무표에 반영 대기 중입니다.');
    renderMyPage();
    renderRoster();
  });

  // Staff Official Leave Form Submit
  const formStaffOfficialLeaveElement = document.getElementById('staff-official-leave-form');
  if (formStaffOfficialLeaveElement) {
    formStaffOfficialLeaveElement.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!currentUser || !staffRequestData) return;

      const { employee, dateStr } = staffRequestData;
      const reason = document.getElementById('staff-official-leave-reason').value.trim();

      if (editingRequestId && editingRequestType === 'leave') {
        const req = leaveRequests.find(r => r.id === editingRequestId);
        if (req) {
          try {
            await updateOwnLeaveRequest(req.id, { reason: reason || '공무 수행', leaveType: '공가' });
          } catch (error) {
            alert('공가 신청을 수정하지 못했습니다: ' + (error.message || error));
            return;
          }
          req.reason = reason || '공무 수행';
          req.leaveType = '공가';
          closeStaffModal();
          alert('공가 신청이 수정되었습니다.');
          renderMyPage();
          renderRoster();
          return;
        }
      }

      const duplicated = leaveRequests.some(req => req.employeeId === employee.id && req.date === dateStr && req.status !== 'rejected');
      if (duplicated) {
        alert('해당 날짜에 이미 신청된 공가가 있습니다.');
        return;
      }

      // Check if they have overtime on a off-day in the same week
      const { startStr, endStr } = getWeekRange(dateStr);
      const hasOtInWeek = overtimeRequests.some(r => {
        if (r && r.employeeId === employee.id && r.date >= startStr && r.date <= endStr && r.status !== 'rejected') {
          const tempEmp = employees.find(e => e.id === employee.id);
          const shift = calculateShift(tempEmp, r.date);
          return (shift === '휴무' || shift === '휴' || shift === '휴무(대기)');
        }
        return false;
      });
      if (hasOtInWeek) {
        alert('이번 주 휴무일에 시간외 근무 신청 내역이 있어 공가를 신청할 수 없습니다.');
        return;
      }

      const newRequest = {
        id: 'req_' + Date.now(),
        employeeId: employee.id,
        employeeName: employee.name,
        hall: employee.hall,
        date: dateStr,
        leaveType: '공가',
        reason: reason || '공무 수행',
        status: 'pending'
      };

      try {
        await createLeaveRequest(newRequest);
      } catch (error) {
        alert('공가 신청을 저장하지 못했습니다: ' + (error.message || error));
        return;
      }
      closeStaffModal();
      alert('공가가 신청되어 근무표에 반영 대기 중입니다.');
      renderMyPage();
      renderRoster();
    });
  }

  // Staff Overtime Form Submit
  formStaffOt.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser || !staffRequestData) return;

    const { employee, dateStr } = staffRequestData;
    const timeOfDay = document.getElementById('staff-ot-time-of-day').value;
    const hours = parseInt(document.getElementById('staff-ot-hours').value);
    const reason = document.getElementById('staff-ot-reason').value.trim();

    // 1. Daily Overtime limit check (Max 4 hours total per day including automatic shifts)
    const shift = calculateShift(employee, dateStr);
    const baseOt = (shift === '당직') ? 3 : (shift === '야간' ? 4 : 0);
    
    // Sum existing approved extra overtime on that day
    const approvedOtReq = overtimeRequests.filter(r => r.employeeId === employee.id && r.date === dateStr && r.status === 'approved' && r.id !== editingRequestId);
    const approvedOtHours = approvedOtReq.reduce((sum, r) => sum + parseInt(r.hours || 0), 0);
    
    if (baseOt + approvedOtHours + hours > 4) {
      alert(`하루 최대 시간외 근무 수당 한도(4시간)를 초과합니다. (당일 이미 배정된 시간외: ${baseOt + approvedOtHours}시간, 추가 신청: ${hours}시간)`);
      return;
    }

    // 2. Weekly Overtime limit check (Max 12 hours total per week including automatic shifts)
    const currentWeeklyTotal = getWeeklyOvertimeTotal(employee.id, dateStr, editingRequestId);
    if (currentWeeklyTotal + hours > 12) {
      alert(`일주일 최대 시간외 근무 한도(12시간)를 초과합니다. (현재 주간 누적: ${currentWeeklyTotal}시간, 추가 신청: ${hours}시간)`);
      return;
    }

    // 3. Monthly Overtime limit check (Max 40 hours total per month including automatic shifts)
    const reqDate = parseLocalDate(dateStr);
    const rYear = reqDate.getFullYear();
    const rMonth = reqDate.getMonth();
    const currentMonthlyTotal = getMonthlyOvertimeTotal(employee.id, rYear, rMonth, editingRequestId);
    if (currentMonthlyTotal + hours > 40) {
      alert(`한 달 최대 시간외 근무 한도(40시간)를 초과합니다. (현재 월간 누적: ${currentMonthlyTotal}시간, 추가 신청: ${hours}시간)`);
      return;
    }

    // 4. Overtime on off day check (Leave/Compensatory leave users cannot request overtime on off days in that week)
    if (shift === '휴무' || shift === '휴' || shift === '휴무(대기)') {
      const { startStr, endStr } = getWeekRange(dateStr);
      
      // Check for 연가/공가 (Leave requests)
      const hasLeaveInWeek = leaveRequests.some(r => r && r.employeeId === employee.id && r.date >= startStr && r.date <= endStr && r.status !== 'rejected' && r.id !== editingRequestId);
      if (hasLeaveInWeek) {
        const foundReq = leaveRequests.find(r => r && r.employeeId === employee.id && r.date >= startStr && r.date <= endStr && r.status !== 'rejected' && r.id !== editingRequestId);
        const typeLabel = foundReq ? (foundReq.leaveType || '연가') : '연가';
        alert(`이번 주에 ${typeLabel} 신청 내역이 있어 휴무일에 시간외 근무를 신청할 수 없습니다.`);
        return;
      }

      // Check for 보상휴가 (Compensatory leave overrides)
      const hasCompLeaveInWeek = shiftModifications.some(mod => {
        return mod && 
               mod.employeeId === employee.id && 
               mod.date >= startStr && 
               mod.date <= endStr && 
               (mod.shift === '보상휴가' || (mod.shift && mod.shift.startsWith('보상휴가 (')));
      });
      if (hasCompLeaveInWeek) {
        alert('이번 주에 보상휴가 부여 내역이 있어 휴무일에 시간외 근무를 신청할 수 없습니다.');
        return;
      }
      
      const proceed = confirm('휴무일에 시간외 근무를 신청하시면 이번 주에는 연가나 보상휴가를 사용하실 수 없습니다. 계속 신청하시겠습니까?');
      if (!proceed) return;
    }

    if (editingRequestId && editingRequestType === 'overtime') {
      const req = overtimeRequests.find(r => r.id === editingRequestId);
      if (req) {
        try {
          await updateOwnOvertimeRequest(req.id, { timeOfDay, hours, reason: reason || '시간외 근무' });
        } catch (error) {
          alert('시간외 신청을 수정하지 못했습니다: ' + (error.message || error));
          return;
        }
        req.timeOfDay = timeOfDay;
        req.hours = hours;
        req.reason = reason || '시간외 근무';
        closeStaffModal();
        alert('시간외 근무 신청이 수정되었습니다.');
        renderMyPage();
        renderRoster();
        return;
      }
    }

    // Check if already requested for this date & timeOfDay
    const duplicated = overtimeRequests.some(req => req.employeeId === employee.id && req.date === dateStr && req.timeOfDay === timeOfDay && req.status !== 'rejected');
    if (duplicated) {
      alert(`해당 날짜의 ${timeOfDay === 'morning' ? '오전' : '오후'}에 이미 신청된 시간외 근무가 있습니다.`);
      return;
    }

    const newRequest = {
      id: 'ot_' + Date.now(),
      employeeId: employee.id,
      employeeName: employee.name,
      hall: employee.hall,
      date: dateStr,
      timeOfDay: timeOfDay,
      hours: hours,
      reason: reason || '시간외 근무',
      status: 'pending'
    };

    try {
      await createOvertimeRequest(newRequest);
    } catch (error) {
      alert('시간외 신청을 저장하지 못했습니다: ' + (error.message || error));
      return;
    }
    closeStaffModal();
    alert('시간외 근무가 신청되어 결재 대기 상태로 등록되었습니다.');
    renderMyPage();
    renderRoster();
  });

  // Submit Login through Supabase Auth. Passwords are never stored in employees.
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const activeTab = document.querySelector('.auth-tab.active').dataset.type;
    const loginId = activeTab === 'staff'
      ? document.getElementById('staff-login-id').value.trim()
      : document.getElementById('manager-id').value.trim();
    const password = activeTab === 'staff'
      ? document.getElementById('staff-password').value.trim()
      : document.getElementById('manager-pw').value;

    if (activeTab === 'staff' && !/^\d{8}$/.test(password)) {
      alert('직원 비밀번호는 숫자 8자리로 입력해 주세요.');
      return;
    }

    try {
      const authUser = await window.SahaAuth.signIn(loginId, password);
      await loadStateFromServer();
      const found = employees.find((employee) => employee.authUserId === authUser.id);

      if (!found || (activeTab === 'staff' && found.role !== 'staff') || (activeTab === 'manager' && found.role !== 'manager')) {
        await window.SahaAuth.signOut();
        clearPrivateState();
        alert('이 계정은 선택한 로그인 종류와 맞지 않습니다. 관리자에게 확인해 주세요.');
        return;
      }

      currentUser = found;
      updateLoginUI();
      loginOverlay.classList.remove('active');
      renderRoster();
      if (found.role === 'manager') renderAdminDashboard();
      else renderMyPage();
      alert(`${found.name}님, 로그인되었습니다.`);
    } catch (error) {
      console.error('Login failed:', error);
      alert('아이디 또는 비밀번호가 맞지 않습니다. 다시 확인해 주세요.');
    }
  });

  // Logout
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await window.SahaAuth.signOut();
      currentUser = null;
      clearPrivateState();
      updateLoginUI();
      renderRoster();
      alert('로그아웃되었습니다.');
    });
  }

  const passwordOverlay = document.getElementById('password-change-overlay');
  const openPasswordButton = document.getElementById('btn-change-password');
  const closePasswordDialog = () => {
    passwordOverlay.classList.remove('active');
    document.getElementById('password-change-form').reset();
  };

  openPasswordButton.addEventListener('click', () => {
    if (!currentUser) return;
    document.getElementById('password-change-form').reset();
    passwordOverlay.classList.add('active');
  });
  document.getElementById('password-change-close').addEventListener('click', closePasswordDialog);
  document.getElementById('password-change-cancel').addEventListener('click', closePasswordDialog);
  document.getElementById('password-change-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const password = document.getElementById('new-password').value;
    const confirmation = document.getElementById('new-password-confirm').value;
    if (!/^\d{8}$/.test(password)) {
      alert('새 비밀번호는 숫자 8자리로 입력해 주세요.');
      return;
    }
    if (password !== confirmation) {
      alert('새 비밀번호 두 칸이 서로 다릅니다.');
      return;
    }
    try {
      await window.SahaAuth.changePassword(password);
      closePasswordDialog();
      alert('비밀번호가 변경되었습니다. 다음 로그인부터 새 비밀번호를 사용해 주세요.');
    } catch (error) {
      console.error('Password change failed:', error);
      alert('비밀번호를 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }
  });

  // Edit Shift Form Dialog handlers
  document.getElementById('edit-shift-cancel').addEventListener('click', () => {
    document.getElementById('edit-shift-overlay').classList.remove('active');
  });
  
  document.getElementById('edit-shift-close').addEventListener('click', () => {
    document.getElementById('edit-shift-overlay').classList.remove('active');
  });

  document.getElementById('edit-shift-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!editingShiftData || !currentUser || !isUserAdmin()) return;

    const selectedShift = document.getElementById('edit-shift-select').value;
    const otMorningVal = document.getElementById('edit-shift-ot-morning').value;
    const otAfternoonVal = document.getElementById('edit-shift-ot-afternoon').value;
    const { employeeId, dateStr } = editingShiftData;

    const mHours = otMorningVal !== '' ? parseInt(otMorningVal) : 0;
    
    const shiftDefaultAfternoon = (selectedShift === '당직') ? 3 : (selectedShift === '야간' ? 4 : 0);
    const aHours = otAfternoonVal !== '' ? parseInt(otAfternoonVal) : shiftDefaultAfternoon;

    // 1. Daily Limit validation check: warns but allows manager bypass
    if (mHours + aHours > 4) {
      const proceed = confirm(`하루 최대 시간외 한도(4시간)를 초과합니다. (지정 시간: ${mHours + aHours}시간)\n그래도 수동 변경하시겠습니까?`);
      if (!proceed) return;
    }

    // 2. Weekly Limit validation check: warns but allows manager bypass
    // Build temp modifications array to calculate weekly sum
    const tempModifications = shiftModifications.filter(mod => !(mod.employeeId === employeeId && mod.date === dateStr));
    tempModifications.push({
      employeeId: employeeId,
      date: dateStr,
      shift: selectedShift,
      otMorning: otMorningVal !== '' ? parseInt(otMorningVal) : null,
      otAfternoon: otAfternoonVal !== '' ? parseInt(otAfternoonVal) : null
    });

    const weeklyOtTotal = getWeeklyOvertimeTotal(employeeId, dateStr, null, tempModifications);
    if (weeklyOtTotal > 12) {
      const proceed = confirm(`일주일 최대 시간외 한도(12시간)를 초과합니다. (주간 총계: ${weeklyOtTotal}시간)\n그래도 수동 변경하시겠습니까?`);
      if (!proceed) return;
    }

    // 3. Monthly Limit validation check: warns but allows manager bypass
    const reqDate = parseLocalDate(dateStr);
    const rYear = reqDate.getFullYear();
    const rMonth = reqDate.getMonth();
    const monthlyOtTotal = getMonthlyOvertimeTotal(employeeId, rYear, rMonth, null, tempModifications);
    if (monthlyOtTotal > 40) {
      const proceed = confirm(`한 달 최대 시간외 한도(40시간)를 초과합니다. (월간 총계: ${monthlyOtTotal}시간)\n그래도 수동 변경하시겠습니까?`);
      if (!proceed) return;
    }

    // 4. Overtime on off day validation check: warns manager if there is a leave in that week
    if ((selectedShift === '휴무' || selectedShift === '휴') && (mHours > 0 || aHours > 0)) {
      const { startStr, endStr } = getWeekRange(dateStr);
      const hasLeaveInWeek = leaveRequests.some(r => r && r.employeeId === employeeId && r.date >= startStr && r.date <= endStr && r.status !== 'rejected');
      if (hasLeaveInWeek) {
        const proceed = confirm('이번 주에 해당 직원의 연가 내역이 있어 휴무일에 시간외 근무를 신청할 수 없는 주간입니다.\n그래도 수동 지정하시겠습니까?');
        if (!proceed) return;
      }
    }

    // Apply change
    shiftModifications = shiftModifications.filter(mod => !(mod.employeeId === employeeId && mod.date === dateStr));
    leaveRequests = leaveRequests.filter(req => !(req.employeeId === employeeId && req.date === dateStr));
    
    shiftModifications.push({
      employeeId: employeeId,
      date: dateStr,
      shift: selectedShift,
      otMorning: otMorningVal !== '' ? parseInt(otMorningVal) : null,
      otAfternoon: otAfternoonVal !== '' ? parseInt(otAfternoonVal) : null
    });

    saveState();
    document.getElementById('edit-shift-overlay').classList.remove('active');
    
    recalculateEmployeeLeaveCounts();
    saveState();

    renderRoster();
    alert('근무 및 시간외 설정이 수동 변경되었습니다.');
  });

  // Edit Employee Form Dialog handlers
  document.getElementById('edit-employee-cancel').addEventListener('click', () => {
    document.getElementById('edit-employee-overlay').classList.remove('active');
  });
  
  document.getElementById('edit-employee-close').addEventListener('click', () => {
    document.getElementById('edit-employee-overlay').classList.remove('active');
  });

  document.getElementById('edit-employee-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-emp-id').value;
    const name = document.getElementById('edit-emp-name').value.trim();
    const hall = document.getElementById('edit-emp-hall').value;
    const joinYearMonth = document.getElementById('edit-emp-join').value;
    const totalLeave = parseInt(document.getElementById('edit-emp-total').value);
    const shiftGroup = parseInt(document.getElementById('edit-emp-group').value);

    const emp = employees.find(e => e.id === id);
    if (emp) {
      emp.name = name;
      emp.hall = hall; // Save updated living hall!
      emp.joinYearMonth = joinYearMonth;
      emp.totalLeave = totalLeave;
      emp.shiftGroup = shiftGroup; // Save group change!
      
      recalculateEmployeeLeaveCounts();
      saveState();
      
      document.getElementById('edit-employee-overlay').classList.remove('active');
      renderRoster();
      renderAdminDashboard();
      
      if (currentUser && currentUser.id === id) {
        currentUser = emp;
        saveState();
        updateLoginUI();
      }
      
      alert('직원 소속 생활관 및 신상 정보가 수정되었습니다.');
    }
  });

  // Edit Manager Form submission
  document.getElementById('edit-manager-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-mgr-id').value;
    const name = document.getElementById('edit-mgr-name').value.trim();
    const hall = document.getElementById('edit-mgr-hall').value;

    const mgr = employees.find(e => e.id === id);
    if (mgr) {
      try {
        await updateManagerProfile(id, { name, hall });
      } catch (error) {
        alert('관리자 정보를 수정하지 못했습니다: ' + (error.message || error));
        return;
      }
      mgr.name = name;
      mgr.hall = hall;
      
      document.getElementById('edit-manager-overlay').classList.remove('active');
      renderAdminManagers();
      
      if (currentUser && currentUser.id === id) {
        currentUser = mgr;
        updateLoginUI();
      }
      
      alert('관리자 기본 정보가 수정되었습니다. 로그인 계정 인계는 권한 양도 버튼을 사용하세요.');
    }
  });

  const closeMgrBtn = document.getElementById('edit-manager-close');
  if (closeMgrBtn) {
    closeMgrBtn.addEventListener('click', () => {
      document.getElementById('edit-manager-overlay').classList.remove('active');
    });
  }
  const cancelMgrBtn = document.getElementById('edit-manager-cancel');
  if (cancelMgrBtn) {
    cancelMgrBtn.addEventListener('click', () => {
      document.getElementById('edit-manager-overlay').classList.remove('active');
    });
  }

  const transferOverlay = document.getElementById('transfer-manager-overlay');
  const closeTransfer = () => {
    transferOverlay.classList.remove('active');
    document.getElementById('transfer-manager-form').reset();
  };
  document.getElementById('transfer-manager-close').addEventListener('click', closeTransfer);
  document.getElementById('transfer-manager-cancel').addEventListener('click', closeTransfer);
  document.getElementById('transfer-manager-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser || currentUser.hall !== 'all') return;
    if (!confirm('기존 관리자 계정 연결을 해제하고 후임자에게 권한을 넘기시겠습니까?')) return;

    const payload = {
      managerEmployeeId: document.getElementById('transfer-manager-id').value,
      newManagerName: document.getElementById('transfer-manager-name').value.trim(),
      newLoginId: document.getElementById('transfer-manager-login-id').value.trim().toLowerCase(),
      newPassword: document.getElementById('transfer-manager-password').value,
      transferNote: document.getElementById('transfer-manager-note').value.trim()
    };
    const submitButton = e.submitter;
    if (submitButton) submitButton.disabled = true;
    try {
      const { data, error } = await getDB().functions.invoke('transfer-manager', { body: payload });
      if (error) {
        let serverMessage = error.message || String(error);
        try {
          const errorBody = await error.context?.json();
          serverMessage = errorBody?.error || errorBody?.message || serverMessage;
        } catch (_) {
          // Keep the original message when the server did not return JSON.
        }
        throw new Error(serverMessage);
      }
      if (!data || !data.ok) throw new Error(data?.error || '권한 양도에 실패했습니다.');
      closeTransfer();
      await loadStateFromServer();
      renderAdminDashboard();
      alert(`권한 양도가 완료되었습니다. 후임자 로그인 ID: ${data.loginId}`);
    } catch (error) {
      alert('권한 양도에 실패했습니다: ' + (error.message || error));
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });

  const loginIdOverlay = document.getElementById('change-login-id-overlay');
  const closeLoginIdChange = () => {
    loginIdOverlay.classList.remove('active');
    document.getElementById('change-login-id-form').reset();
  };
  document.getElementById('change-login-id-close').addEventListener('click', closeLoginIdChange);
  document.getElementById('change-login-id-cancel').addEventListener('click', closeLoginIdChange);
  document.getElementById('change-login-id-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser || currentUser.hall !== 'all') return;
    const employeeId = document.getElementById('change-login-employee-id').value;
    const newLoginId = document.getElementById('change-login-new-id').value.trim().toLowerCase();
    if (!confirm(`로그인 ID를 '${newLoginId}'(으)로 변경하시겠습니까?`)) return;
    const submitButton = e.submitter;
    if (submitButton) submitButton.disabled = true;
    try {
      const { data, error } = await getDB().functions.invoke('change-login-id', { body: { employeeId, newLoginId } });
      if (error) {
        let serverMessage = error.message || String(error);
        try {
          const errorBody = await error.context?.json();
          serverMessage = errorBody?.error || errorBody?.message || serverMessage;
        } catch (_) {
          // Keep the original message when the server did not return JSON.
        }
        throw new Error(serverMessage);
      }
      if (!data?.ok) throw new Error(data?.error || '로그인 ID 변경에 실패했습니다.');
      closeLoginIdChange();
      await loadStateFromServer();
      renderAdminDashboard();
      alert(`로그인 ID가 '${data.loginId}'(으)로 변경되었습니다.`);
    } catch (error) {
      alert('로그인 ID를 변경하지 못했습니다: ' + (error.message || error));
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}

// Recalculate remaining & used leaves based on approved leave requests and manual overrides
function recalculateEmployeeLeaveCounts() {
  employees.forEach(emp => {
    if (emp.role === 'staff' || (emp.role === 'manager' && emp.id !== 'mgr_admin')) {
      const approvedCount = leaveRequests.filter(req => req.employeeId === emp.id && req.status === 'approved' && req.leaveType !== '공가').length;
      const manualLeaveCount = shiftModifications.filter(mod => mod && mod.employeeId === emp.id && mod.shift === '연가').length;
      const totalUsed = approvedCount + manualLeaveCount;
      emp.usedLeave = totalUsed;
      emp.remainingLeave = Math.max(0, emp.totalLeave - totalUsed);
    }
  });
}

// Open Edit Shift Modal (Safety checked: only allowed for admin)
function openEditShiftModal(employee, dateStr, currentShift) {
  if (!isUserAdmin()) {
    return; // Safety guard: exit immediately if non-admin
  }

  editingShiftData = { employeeId: employee.id, dateStr: dateStr };
  
  document.getElementById('edit-shift-instructor').textContent = employee.name;
  document.getElementById('edit-shift-date').textContent = dateStr;
  
  const select = document.getElementById('edit-shift-select');
  const selectOptions = Array.from(select.options).map(opt => opt.value);
  select.value = selectOptions.includes(currentShift) ? currentShift : '주간';

  // Load existing override values
  const modification = shiftModifications.find(mod => mod.employeeId === employee.id && mod.date === dateStr);
  const otMorningInput = document.getElementById('edit-shift-ot-morning');
  const otAfternoonInput = document.getElementById('edit-shift-ot-afternoon');
  
  if (modification) {
    otMorningInput.value = modification.otMorning !== undefined && modification.otMorning !== null ? modification.otMorning : '';
    otAfternoonInput.value = modification.otAfternoon !== undefined && modification.otAfternoon !== null ? modification.otAfternoon : '';
  } else {
    otMorningInput.value = '';
    otAfternoonInput.value = '';
  }

  document.getElementById('edit-shift-overlay').classList.add('active');
}
window.openEditShiftModal = openEditShiftModal;

// Direct Cell Approval Modal Handler (Admin Click Action)
function handleAdminCellClick(employee, dateStr, currentShift) {
  if (!isUserAdmin()) return;

  const pendingLeave = leaveRequests.find(req => req.employeeId === employee.id && req.date === dateStr && req.status === 'pending');
  const pendingOts = overtimeRequests.filter(req => req.employeeId === employee.id && req.date === dateStr && req.status === 'pending');

  if (pendingLeave || pendingOts.length > 0) {
    openAdminCellApprovalModal(employee, dateStr, currentShift, pendingLeave, pendingOts);
  } else {
    openEditShiftModal(employee, dateStr, currentShift);
  }
}
window.handleAdminCellClick = handleAdminCellClick;

function openAdminCellApprovalModal(employee, dateStr, currentShift, pendingLeave, pendingOts) {
  document.getElementById('admin-cell-approval-instructor').textContent = employee.name;
  document.getElementById('admin-cell-approval-date').textContent = dateStr;

  const leaveSection = document.getElementById('admin-cell-approval-leave-section');
  const leaveText = document.getElementById('admin-cell-approval-leave-text');
  
  if (pendingLeave) {
    leaveSection.style.display = 'block';
    const isOfficial = pendingLeave.leaveType === '공가';
    const typeLabel = isOfficial ? '공가' : '연가';
    leaveText.innerHTML = `
      <strong>신청 종류:</strong> <span style="color: #dc2626; font-weight: bold;">${typeLabel}대기</span><br>
      <strong>신청 사유:</strong> ${escapeHtml(pendingLeave.reason || '없음')}
    `;
    
    document.getElementById('btn-admin-cell-approve-leave').onclick = () => {
      window.approveLeave(pendingLeave.id);
      document.getElementById('admin-cell-approval-overlay').classList.remove('active');
    };
    document.getElementById('btn-admin-cell-reject-leave').onclick = () => {
      window.rejectLeave(pendingLeave.id);
      document.getElementById('admin-cell-approval-overlay').classList.remove('active');
    };
  } else {
    leaveSection.style.display = 'none';
  }

  const otSection = document.getElementById('admin-cell-approval-ot-section');
  const otList = document.getElementById('admin-cell-approval-ot-list');

  if (pendingOts && pendingOts.length > 0) {
    otSection.style.display = 'block';
    otList.innerHTML = '';
    
    pendingOts.forEach(req => {
      const item = document.createElement('div');
      item.style.marginBottom = '0.75rem';
      item.style.paddingBottom = '0.75rem';
      item.style.borderBottom = '1px dashed var(--border-color)';
      const timeOfDayText = req.timeOfDay === 'morning' ? '오전' : '오후';
      item.innerHTML = `
        <p style="font-size: 0.8rem; margin-bottom: 0.4rem;">
          <strong>구분:</strong> ${timeOfDayText}<br>
          <strong>신청 시간:</strong> ${req.hours}시간<br>
          <strong>사유:</strong> ${escapeHtml(req.reason || '없음')}
        </p>
        <div style="display: flex; gap: 0.25rem;">
          <button type="button" class="btn btn-primary btn-sm" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" id="approve-ot-${req.id}">승인</button>
          <button type="button" class="btn btn-danger btn-sm" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" id="reject-ot-${req.id}">반려</button>
        </div>
      `;
      otList.appendChild(item);
      
      document.getElementById(`approve-ot-${req.id}`).onclick = () => {
        window.approveOvertime(req.id);
        document.getElementById('admin-cell-approval-overlay').classList.remove('active');
      };
      document.getElementById(`reject-ot-${req.id}`).onclick = () => {
        window.rejectOvertime(req.id);
        document.getElementById('admin-cell-approval-overlay').classList.remove('active');
      };
    });
  } else {
    otSection.style.display = 'none';
  }

  // Handle go manual edit button
  document.getElementById('btn-admin-cell-go-manual').onclick = () => {
    document.getElementById('admin-cell-approval-overlay').classList.remove('active');
    window.openEditShiftModal(employee, dateStr, currentShift);
  };

  document.getElementById('admin-cell-approval-overlay').classList.add('active');
}
window.openAdminCellApprovalModal = openAdminCellApprovalModal;

// Open Staff Request Modal (Staff-only popup on self date cell click)
let staffRequestData = null;
let editingRequestId = null;
let editingRequestType = null;
function openStaffRequestModal(employee, dateStr, currentShift) {
  staffRequestData = { employee, dateStr, currentShift };
  
  document.getElementById('staff-req-name').textContent = employee.name;
  document.getElementById('staff-req-date').textContent = dateStr;

  // Check for pending requests on this date for this employee
  const pendingLeave = leaveRequests.find(r => r.employeeId === employee.id && r.date === dateStr && r.status === 'pending');
  const pendingOts = overtimeRequests.filter(r => r.employeeId === employee.id && r.date === dateStr && r.status === 'pending');

  const cancelPanel = document.getElementById('staff-pending-cancel-panel');
  const cancelList = document.getElementById('staff-pending-cancel-list');
  
  if (cancelPanel && cancelList) {
    cancelList.innerHTML = '';
    const hasPending = pendingLeave || pendingOts.length > 0;
    
    if (hasPending) {
      cancelPanel.style.display = 'block';
      
      if (pendingLeave) {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.alignItems = 'center';
        div.style.fontSize = '0.8rem';
        div.style.color = '#78350f';
        div.style.borderBottom = '1px dashed #fde68a';
        div.style.paddingBottom = '0.25rem';
        
        const isOfficial = pendingLeave.leaveType === '공가';
        const typeIcon = isOfficial ? '🏛️ 대기중 공가' : '🌴 대기중 연가';
        
        div.innerHTML = `
          <span>${typeIcon} (사유: ${escapeHtml(pendingLeave.reason)})</span>
          <div style="display: inline-flex; gap: 0.25rem;">
            <button type="button" class="btn btn-primary btn-sm" onclick="editMyRequest('${pendingLeave.id}', 'leave')" style="padding: 0.15rem 0.35rem; font-size: 0.7rem; font-weight: bold; background-color: #e0f2fe; border-color: #bae6fd; color: #0369a1; border-radius: 0.25rem; border: 1px solid; cursor: pointer;">수정</button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="cancelMyRequestDirectly('${pendingLeave.id}', 'leave')" style="padding: 0.15rem 0.35rem; font-size: 0.7rem; font-weight: bold; background-color: #fee2e2; border-color: #fca5a5; color: #dc2626; border-radius: 0.25rem; border: 1px solid; cursor: pointer;">신청취소</button>
          </div>
        `;
        cancelList.appendChild(div);
      }
      
      pendingOts.forEach(ot => {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.alignItems = 'center';
        div.style.fontSize = '0.8rem';
        div.style.color = '#78350f';
        div.style.borderBottom = '1px dashed #fde68a';
        div.style.paddingBottom = '0.25rem';
        
        const timeLabel = ot.timeOfDay === 'morning' ? '오전' : '오후';
        div.innerHTML = `
          <span>⏰ 대기중 시간외 [${timeLabel}] ${ot.hours}시간 (사유: ${escapeHtml(ot.reason)})</span>
          <div style="display: inline-flex; gap: 0.25rem;">
            <button type="button" class="btn btn-primary btn-sm" onclick="editMyRequest('${ot.id}', 'overtime')" style="padding: 0.15rem 0.35rem; font-size: 0.7rem; font-weight: bold; background-color: #e0f2fe; border-color: #bae6fd; color: #0369a1; border-radius: 0.25rem; border: 1px solid; cursor: pointer;">수정</button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="cancelMyRequestDirectly('${ot.id}', 'overtime')" style="padding: 0.15rem 0.35rem; font-size: 0.7rem; font-weight: bold; background-color: #fee2e2; border-color: #fca5a5; color: #dc2626; border-radius: 0.25rem; border: 1px solid; cursor: pointer;">신청취소</button>
          </div>
        `;
        cancelList.appendChild(div);
      });
    } else {
      cancelPanel.style.display = 'none';
    }
  }
  
  // Reset forms
  document.getElementById('staff-leave-reason').value = '';
  const offLeaveReasonInput = document.getElementById('staff-official-leave-reason');
  if (offLeaveReasonInput) offLeaveReasonInput.value = '';
  document.getElementById('staff-ot-reason').value = '';
  document.getElementById('staff-ot-hours').value = '1';
  document.getElementById('staff-ot-time-of-day').value = 'morning';
  
  // Reset tabs to leave view
  document.getElementById('tab-staff-leave').classList.add('active');
  const tabStaffOfficialLeaveEl = document.getElementById('tab-staff-official-leave');
  if (tabStaffOfficialLeaveEl) tabStaffOfficialLeaveEl.classList.remove('active');
  document.getElementById('tab-staff-ot').classList.remove('active');
  document.getElementById('staff-leave-form').style.display = 'block';
  const formStaffOfficialLeaveEl = document.getElementById('staff-official-leave-form');
  if (formStaffOfficialLeaveEl) formStaffOfficialLeaveEl.style.display = 'none';
  document.getElementById('staff-ot-form').style.display = 'none';

  // Overtime limit check inside modal view
  const weeklyOt = getWeeklyOvertimeTotal(employee.id, dateStr);
  const otForm = document.getElementById('staff-ot-form');
  
  // Remove old warning if any
  const oldWarning = otForm.querySelector('.ot-limit-warning');
  if (oldWarning) oldWarning.remove();
  
  const submitBtn = otForm.querySelector('button[type="submit"]');
  const otInputs = otForm.querySelectorAll('select, input');
  
  if (weeklyOt >= 12) {
    const warningDiv = document.createElement('div');
    warningDiv.className = 'ot-limit-warning';
    warningDiv.style.backgroundColor = '#fef2f2';
    warningDiv.style.color = '#dc2626';
    warningDiv.style.padding = '0.75rem';
    warningDiv.style.borderRadius = '0.375rem';
    warningDiv.style.marginBottom = '1rem';
    warningDiv.style.fontSize = '0.85rem';
    warningDiv.style.fontWeight = 'bold';
    warningDiv.style.lineHeight = '1.4';
    warningDiv.innerHTML = `⚠️ 이번 주는 이미 최대 시간외 한도(12시간)에 도달/초과하여 추가 신청이 불가능합니다.<br>(현재 주간 누적: ${weeklyOt}시간)`;
    
    otForm.insertBefore(warningDiv, otForm.firstChild);
    
    otInputs.forEach(input => input.disabled = true);
    if (submitBtn) submitBtn.disabled = true;
  } else {
    otInputs.forEach(input => input.disabled = false);
    if (submitBtn) submitBtn.disabled = false;
  }
  
  // Show modal
  document.getElementById('staff-request-overlay').classList.add('active');
}
window.openStaffRequestModal = openStaffRequestModal;

// Render My Page (for logged-in staff)
function renderMyPage() {
  if (!currentUser) return;

  const empData = employees.find(emp => emp.id === currentUser.id);
  if (!empData) return;

  // Render stats
  document.getElementById('my-join-year').textContent = empData.joinYearMonth || '-';
  document.getElementById('my-total-leave').textContent = `${empData.totalLeave ?? 0}일`;
  document.getElementById('my-used-leave').textContent = `${empData.usedLeave ?? 0}일`;
  document.getElementById('my-remaining-leave').textContent = `${empData.remainingLeave ?? 0}일`;

  // Calculate current week overtime total (using today's date for current week)
  const todayStr = new Date().toISOString().split('T')[0];
  const weeklyOt = getWeeklyOvertimeTotal(currentUser.id, todayStr);
  document.getElementById('my-weekly-overtime').textContent = `${weeklyOt}시간 / 12시간`;

  // Render personal calendar
  renderMyCalendar();

  // Render My Request History (Leaves and Overtimes)
  const historyTbody = document.getElementById('my-leave-history');
  historyTbody.innerHTML = '';

  const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const myLeaves = leaveRequests.filter(req => req.employeeId === currentUser.id && req.date && req.date.startsWith(prefix)).map(r => ({ ...r, type: 'leave' }));
  const myOts = overtimeRequests.filter(req => req.employeeId === currentUser.id && req.date && req.date.startsWith(prefix)).map(r => ({ ...r, type: 'overtime' }));
  
  const combined = [...myLeaves, ...myOts].sort((a, b) => b.date.localeCompare(a.date));

  if (combined.length === 0) {
    historyTbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">선택한 월에 신청 내역이 없습니다.</td></tr>`;
  } else {
    combined.forEach(req => {
      const tr = document.createElement('tr');
      
      let typeText = req.type === 'leave' ? (req.leaveType === '공가' ? '🏛️ 공가' : '🌴 연가') : '⏰ 시간외';
      let timeLabel = req.type === 'overtime' ? (req.timeOfDay === 'morning' ? '오전' : '오후') : '';
      let detailText = req.type === 'leave' 
        ? escapeHtml(req.reason) 
        : `[${timeLabel}] ${req.hours}시간 (${escapeHtml(req.reason)})`;
      
      let statusBadgeClass = 'badge-pending';
      let statusText = '대기중';
      if (req.status === 'approved') {
        statusBadgeClass = 'badge-approved';
        statusText = '승인됨';
      } else if (req.status === 'rejected') {
        statusBadgeClass = 'badge-rejected';
        statusText = '반려됨';
      }

      // Add cancel button for regular staff
      let cancelBtn = '';
      if (req.status === 'pending') {
        cancelBtn = `<button class="btn btn-secondary btn-sm" onclick="cancelMyRequest('${req.id}', '${req.type}')" style="padding: 0.15rem 0.35rem; font-size: 0.7rem; font-weight: bold;">신청취소</button>`;
      } else {
        cancelBtn = `<span style="font-size: 0.75rem; color: var(--text-muted);">-</span>`;
      }

      tr.innerHTML = `
        <td><strong>${typeText}</strong></td>
        <td>${req.date}</td>
        <td>${detailText}</td>
        <td><span class="badge ${statusBadgeClass}" style="width:auto; height:auto; border-radius:0.375rem; padding:0.25rem 0.5rem; display:inline-flex;">${statusText}</span></td>
        <td>${cancelBtn}</td>
      `;
      historyTbody.appendChild(tr);
    });
  }
}

// Render personal calendar for My Page
function renderMyCalendar() {
  if (!currentUser) return;

  const year = currentYear;
  const month = currentMonth;
  const empData = employees.find(emp => emp.id === currentUser.id);
  if (!empData) return;

  document.getElementById('my-cal-label').textContent = `${year}년 ${month + 1}월 내 근무`;

  const container = document.getElementById('my-mini-calendar');
  container.innerHTML = '';

  // Add weekday header labels to mini-calendar
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  weekdays.forEach((day, idx) => {
    const el = document.createElement('div');
    el.className = 'mini-cal-header';
    el.textContent = day;
    if (idx === 0) el.style.color = '#ef4444'; // Sunday red
    else if (idx === 6) el.style.color = '#3b82f6'; // Saturday blue
    container.appendChild(el);
  });

  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  // Determine starting weekday of the month
  const startDayOfWeek = new Date(year, month, 1).getDay();

  // Populate trailing days of the previous month
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const el = document.createElement('div');
    el.className = 'mini-cal-day other-month';
    el.textContent = prevMonthTotalDays - i;
    container.appendChild(el);
  }

  // Current month days
  for (let day = 1; day <= totalDays; day++) {
    const el = document.createElement('div');
    el.className = 'mini-cal-day';
    
    // Weekday / Holiday colors
    const d = new Date(year, month, day);
    const holidayName = getHolidayName(year, month, day);
    
    if (holidayName) {
      el.classList.add('holiday');
    } else if (d.getDay() === 0) {
      el.classList.add('sunday');
    } else if (d.getDay() === 6) {
      el.classList.add('saturday');
    }

    const dateStr = formatDateString(year, month, day);
    const shift = calculateShift(empData, dateStr);
    
    const { badgeClass, displayLabel } = getShiftBadgeAndLabel(shift);

    const otMorningDisplay = getOvertimeCellHtml(empData, dateStr, 'morning');
    const otAfternoonDisplay = getOvertimeCellHtml(empData, dateStr, 'afternoon');

    el.innerHTML = `
      <span class="mini-cal-day-num">${day}</span>
      <div style="margin-top:0.25rem; display:inline-flex; align-items:center; justify-content:center;">
        ${otMorningDisplay}<span class="badge ${badgeClass}">${displayLabel}</span>${otAfternoonDisplay}
      </div>
      ${holidayName ? `<small class="mini-cal-holiday-name" title="${escapeHtml(holidayName)}">${escapeHtml(holidayName)}</small>` : ''}
    `;

    container.appendChild(el);
  }

  // Keep a stable six-week calendar and show the next month softly, like a phone calendar app.
  const renderedDayCells = startDayOfWeek + totalDays;
  const nextMonthDayCount = Math.max(0, 42 - renderedDayCells);
  for (let day = 1; day <= nextMonthDayCount; day++) {
    const el = document.createElement('div');
    el.className = 'mini-cal-day other-month';
    el.textContent = day;
    container.appendChild(el);
  }
}

// Update UI based on Current User login state
function setMobileStaffScreen(screen) {
  const allowed = ['mine', 'all', 'request'];
  const nextScreen = allowed.includes(screen) ? screen : 'mine';
  document.body.dataset.mobileScreen = nextScreen;
  document.querySelectorAll('.mobile-bottom-nav-btn').forEach((button) => {
    button.classList.toggle('active', button.dataset.mobileScreen === nextScreen);
  });

  if (nextScreen === 'request') {
    const historyTarget = document.getElementById('mobile-request-history');
    const historySource = document.querySelector('.leave-requests-table');
    if (historyTarget && historySource) {
      historyTarget.innerHTML = historySource.outerHTML;
    }
  }
}

function setupMobileStaffNavigation() {
  document.querySelectorAll('.mobile-bottom-nav-btn').forEach((button) => {
    button.addEventListener('click', () => setMobileStaffScreen(button.dataset.mobileScreen));
  });

  const dateInput = document.getElementById('mobile-request-date');
  if (dateInput && !dateInput.value) dateInput.value = formatDateString(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());

  const openButton = document.getElementById('mobile-request-open');
  if (openButton) {
    openButton.addEventListener('click', () => {
      if (!currentUser) return;
      const employee = employees.find((item) => item.id === currentUser.id);
      const dateStr = dateInput && dateInput.value;
      if (!employee || !dateStr) {
        alert('신청할 날짜를 선택해 주세요.');
        return;
      }
      openStaffRequestModal(employee, dateStr, calculateShift(employee, dateStr));
    });
  }

  const mobileLayoutQuery = window.matchMedia('(max-width: 768px)');
  const handleLayoutChange = () => {
    if (currentUser) updateLoginUI();
  };
  if (typeof mobileLayoutQuery.addEventListener === 'function') {
    mobileLayoutQuery.addEventListener('change', handleLayoutChange);
  } else if (typeof mobileLayoutQuery.addListener === 'function') {
    mobileLayoutQuery.addListener(handleLayoutChange);
  }
}

function selectMobileHallForUser() {
  const availableTabs = ['girincho', 'mulbongseon', 'managers'];
  const preferredHall = currentUser && availableTabs.includes(currentUser.hall)
    ? currentUser.hall
    : 'girincho';
  const savedSelection = availableTabs.includes(document.body.dataset.mobileHall)
    ? document.body.dataset.mobileHall
    : null;
  const nextHall = savedSelection || preferredHall;

  document.body.classList.remove('show-tab-girincho', 'show-tab-mulbongseon', 'show-tab-managers');
  document.body.classList.add(`show-tab-${nextHall}`);
  document.querySelectorAll('.mobile-tab-btn').forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === nextHall);
  });
}

// Update UI based on Current User login state
function updateLoginUI() {
  const mypageSection = document.getElementById('mypage-section');
  const adminSection = document.getElementById('admin-section');
  const btnLoginTrigger = document.getElementById('btn-login-trigger');
  const headerUserInfo = document.getElementById('header-user-info');
  const mainContent = document.getElementById('screen-main');
  const guestWelcome = document.getElementById('guest-welcome');

  // Reset inputs in modal
  document.getElementById('staff-login-id').value = '';
  document.getElementById('staff-password').value = '';
  document.getElementById('manager-id').value = '';
  document.getElementById('manager-pw').value = '';

  if (currentUser) {
    if (mainContent) mainContent.style.display = '';
    if (guestWelcome) guestWelcome.style.display = 'none';
    btnLoginTrigger.style.display = 'none';
    
    // Display header user info card inline next to Logo
    if (headerUserInfo) {
      headerUserInfo.style.display = 'flex';
      document.getElementById('header-username-text').textContent = currentUser.name;
      
      let roleText = `${currentUser.hall === 'girincho' ? '기린초생활관' : '물봉선생활관'}`;
      if (currentUser.role === 'manager') {
        roleText = currentUser.hall === 'all'
          ? '전체 관리자'
          : '전체 생활관 팀장';
      }
      document.getElementById('header-role-text').textContent = roleText;
    }

    const isAdmin = isUserAdmin();
    const isPhoneLayout = window.matchMedia('(max-width: 768px)').matches;
    if (isPhoneLayout) {
      document.body.classList.add('staff-mobile-mode');
      selectMobileHallForUser();
      setMobileStaffScreen(document.body.dataset.mobileScreen || 'mine');
      mypageSection.style.display = 'block';
      adminSection.style.display = 'none';
      renderMyPage();
    } else if (isAdmin) {
      document.body.classList.remove('staff-mobile-mode');
      mypageSection.style.display = 'none';
      adminSection.style.display = 'block';
      
      // Update Title of Admin Dashboard
      const dashboardTitle = '통합 시스템 관리자 대시보드';
      document.getElementById('admin-dashboard-title').textContent = dashboardTitle;

      renderAdminDashboard();
    } else {
      document.body.classList.add('staff-mobile-mode');
      setMobileStaffScreen(document.body.dataset.mobileScreen || 'mine');
      mypageSection.style.display = 'block';
      adminSection.style.display = 'none';
      renderMyPage();
    }
  } else {
    if (mainContent) mainContent.style.display = 'none';
    if (guestWelcome) guestWelcome.style.display = 'block';
    document.body.classList.remove('staff-mobile-mode');
    // Guest Mode
    btnLoginTrigger.style.display = 'inline-flex';
    mypageSection.style.display = 'none';
    adminSection.style.display = 'none';
    if (headerUserInfo) {
      headerUserInfo.style.display = 'none';
    }
  }
}

// Get rich descriptive tooltip text on hover
function getShiftTooltipText(shift, emp, dateStr) {
  let text = '';
  if (shift === '주간' || shift === '주') {
    text = '주간 근무: 09:00 ~ 18:00 (휴게 1시간)';
  } else if (shift === '당직' || shift === '당') {
    text = '당직 근무: 07:00 ~ 19:00 (휴게 1시간, 시간외 3시간 포함)';
  } else if (shift === '야간' || shift === '야') {
    text = '야간 근무: 18:00 ~ 익일 09:00 (휴게 5시간, 시간외 4시간 포함)';
  } else if (shift === '휴무' || shift === '휴') {
    text = '휴무일';
  } else if (shift === '연가' || shift === '연') {
    text = '연가 (휴가 승인됨)';
  } else if (shift === '공가' || shift === '공') {
    text = '공가 (공적 휴가 승인됨)';
  } else if (shift === '보상휴가') {
    text = '보상휴가';
  } else if (shift && shift.startsWith('보상휴가')) {
    text = shift;
  } else if (shift === '대') {
    text = '대기 중인 휴가 신청';
  } else {
    text = `${shift || '휴무'} 근무`;
  }

  // Check if there is overtime approved
  const ots = overtimeRequests.filter(req => req.employeeId === emp.id && req.date === dateStr && req.status === 'approved');
  if (ots.length > 0) {
    const otHours = ots.reduce((sum, r) => sum + parseFloat(r.hours), 0);
    text += `\n[추가 시간외 승인: ${otHours}시간]`;
  }

  const pendingOts = overtimeRequests.filter(req => req.employeeId === emp.id && req.date === dateStr && req.status === 'pending');
  if (pendingOts.length > 0) {
    const pOtHours = pendingOts.reduce((sum, r) => sum + parseFloat(r.hours), 0);
    text += `\n[시간외 신청 대기중: ${pOtHours}시간]`;
  }

  return text;
}

// Update stats dashboard cards
function updateStatsDashboard() {
  const totalCountEl = document.getElementById('stat-today-total-count');
  if (!totalCountEl) return;

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  let dayNames = [];
  let dutyNames = [];
  let nightNames = [];

  employees.forEach(emp => {
    if (emp.role === 'staff') {
      const shift = calculateShift(emp, todayStr);
      if (shift === '주간') {
        dayNames.push(emp.name);
      } else if (shift === '당직') {
        dutyNames.push(emp.name);
      } else if (shift === '야간') {
        nightNames.push(emp.name);
      }
    }
  });

  const totalCount = dayNames.length + dutyNames.length + nightNames.length;
  totalCountEl.textContent = `${totalCount}명`;

  document.getElementById('stat-names-day').textContent = dayNames.length > 0 ? `${dayNames.join(', ')} (${dayNames.length}명)` : '없음 (0명)';
  document.getElementById('stat-names-duty').textContent = dutyNames.length > 0 ? `${dutyNames.join(', ')} (${dutyNames.length}명)` : '없음 (0명)';
  document.getElementById('stat-names-night').textContent = nightNames.length > 0 ? `${nightNames.join(', ')} (${nightNames.length}명)` : '없음 (0명)';
}

// Render both Monthly Shift tables (Girincho and Mulbongseon) simultaneously
function renderRoster() {
  const year = currentYear;
  const month = currentMonth;
  
  // Sync selects
  const selectYear = document.getElementById('select-year');
  const selectMonth = document.getElementById('select-month');
  if (selectYear) selectYear.value = year;
  if (selectMonth) selectMonth.value = month;

  const adminSelectYear = document.getElementById('admin-select-year');
  const adminSelectMonth = document.getElementById('admin-select-month');
  if (adminSelectYear) adminSelectYear.value = year;
  if (adminSelectMonth) adminSelectMonth.value = month;
  
  // Render Girincho
  renderRosterForHall('girincho', 'roster-header-row-girincho', 'roster-tbody-girincho');
  // Render Mulbongseon
  renderRosterForHall('mulbongseon', 'roster-header-row-mulbongseon', 'roster-tbody-mulbongseon');
  // Render Managers
  renderRosterForManagers('roster-header-row-managers', 'roster-tbody-managers');

  // Update statistics
  updateStatsDashboard();
}

// Render monthly shift roster for a specific living hall
function renderRosterForHall(hall, headerRowId, tbodyId) {
  const year = currentYear;
  const month = currentMonth;
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  // Set print approval sheet monthly subtext inside each card
  const card = document.getElementById(hall === 'girincho' ? 'schedule-section-girincho' : 'schedule-section-mulbongseon');
  const printMonthLabel = card.querySelector('.print-month-name');
  if (printMonthLabel) {
    printMonthLabel.textContent = `${year}년 ${month + 1}월 근무표`;
  }

  // Get total days in month
  const totalDays = new Date(year, month + 1, 0).getDate();
  
  // Filter employees for current Living Hall
  const filteredEmployees = employees.filter(emp => emp.role === 'staff' && emp.hall === hall);

  // Generate Table Header
  const headerRow = document.getElementById(headerRowId);
  headerRow.innerHTML = '';
  
  // Group col
  const groupTh = document.createElement('th');
  groupTh.textContent = '조';
  groupTh.className = 'group-cell';
  headerRow.appendChild(groupTh);

  // Name col
  const nameTh = document.createElement('th');
  nameTh.textContent = '성명';
  nameTh.className = 'instructor-cell';
  headerRow.appendChild(nameTh);
  
  // Print-only Signature col
  const sigTh = document.createElement('th');
  sigTh.textContent = '서명';
  sigTh.className = 'print-only-cell';
  headerRow.appendChild(sigTh);
  
  for (let day = 1; day <= totalDays; day++) {
    const th = document.createElement('th');
    const weekdayText = getKoranWeekday(year, month, day);
    const holidayName = getHolidayName(year, month, day);
    
    const d = new Date(year, month, day);
    if (holidayName) {
      th.innerHTML = `${day}<br><span style="font-size: 0.75rem; font-weight: normal;">${weekdayText}</span><br><span class="holiday-label" style="font-size: 7px; font-weight: bold; line-height: 1.1; display: block; margin-top: 1px; color: #ef4444; white-space: nowrap;">${holidayName}</span>`;
      th.classList.add('holiday');
    } else {
      th.innerHTML = `${day}<br><span style="font-size: 0.75rem; font-weight: normal;">${weekdayText}</span>`;
      if (d.getDay() === 0) {
        th.classList.add('sunday');
      } else if (d.getDay() === 6) {
        th.classList.add('saturday');
      }
    }
    
    headerRow.appendChild(th);
  }

  // Monthly Overtime Sum Column
  const sumTh = document.createElement('th');
  sumTh.textContent = '합';
  sumTh.style.width = '3rem';
  sumTh.style.textAlign = 'center';
  headerRow.appendChild(sumTh);

  // Generate Table Rows
  const tbody = document.getElementById(tbodyId);
  tbody.innerHTML = '';

  if (filteredEmployees.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = totalDays + 3; // +3 for Group, Name and Sum
    td.className = 'text-center';
    td.textContent = '생활관에 등록된 근무자가 없습니다.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  // Sort employees by shiftGroup
  const sortedEmployees = [...filteredEmployees].sort((a, b) => a.shiftGroup - b.shiftGroup);

  sortedEmployees.forEach(emp => {
    const tr = document.createElement('tr');
    if (emp.shiftGroup % 2 === 0) {
      tr.classList.add('roster-shaded-row');
    }
    
    // Highlight current logged-in employee row
    if (currentUser && currentUser.id === emp.id) {
      tr.classList.add('my-roster-row');
    }
    
    // Group cell
    const groupTd = document.createElement('td');
    groupTd.className = 'group-cell';
    groupTd.innerHTML = `<strong>${emp.shiftGroup}조</strong>`;
    tr.appendChild(groupTd);

    // Employee Name cell
    const nameTd = document.createElement('td');
    nameTd.className = 'instructor-cell';
    nameTd.innerHTML = `<strong>${emp.name}</strong>`;
    tr.appendChild(nameTd);
    
    // Print-only Signature cell
    const sigTd = document.createElement('td');
    sigTd.className = 'print-only-cell';
    sigTd.innerHTML = '&nbsp;';
    tr.appendChild(sigTd);
    
    let monthlyTotalOt = 0;

    // Daily shifts
    let day = 1;
    while (day <= totalDays) {
      const dateStr = formatDateString(year, month, day);
      const shift = calculateShift(emp, dateStr);
      
      // 특별 휴가(병가, 안식년) 연속 렌더링 셀 병합 (화면 - 일반직원)
      if (shift === '병가' || shift === '병가(대기)' || shift === '안식년' || shift === '안식년(대기)') {
        let colspan = 1;
        let checkDay = day + 1;
        while (checkDay <= totalDays) {
          const nextDateStr = formatDateString(year, month, checkDay);
          const nextShift = calculateShift(emp, nextDateStr);
          
          const isSameType = (
            ((shift === '병가' || shift === '병가(대기)') && (nextShift === '병가' || nextShift === '병가(대기)')) ||
            ((shift === '안식년' || shift === '안식년(대기)') && (nextShift === '안식년' || nextShift === '안식년(대기)'))
          );
          if (isSameType) {
            colspan++;
            checkDay++;
          } else {
            break;
          }
        }
        
        const td = document.createElement('td');
        td.className = 'shift-cell special-leave-cell';
        td.setAttribute('colspan', colspan);
        td.setAttribute('title', `${emp.name} - ${shift} (${colspan}일간)`);
        
        const labelText = (shift === '안식년' || shift === '안식년(대기)') ? '안 식 년' : '병 가';
        const cellBadgeClass = (shift === '안식년' || shift === '안식년(대기)') ? 'badge-sabbatical-merged' : 'badge-sick-merged';
        td.innerHTML = `<div class="merged-special-leave ${cellBadgeClass}">${labelText}</div>`;
        
        if (currentUser && isUserAdmin()) {
          td.classList.add('admin-mode');
          td.addEventListener('click', () => {
            alert('이 기간은 관리자 대시보드 내 [🏥 병가 / ✈️ 안식년 일괄 설정] 목록에서 직접 삭제 및 취소하시절 수 있습니다.');
          });
        }
        
        tr.appendChild(td);
        day += colspan;
        continue;
      }
      
      const td = document.createElement('td');
      td.className = 'shift-cell';
      td.setAttribute('title', getShiftTooltipText(shift, emp, dateStr));
      
      const otHours = getOvertimeHours(emp, dateStr);
      monthlyTotalOt += otHours;
      
      const { badgeClass, displayLabel } = getShiftBadgeAndLabel(shift);
      
      const otMorningDisplay = getOvertimeCellHtml(emp, dateStr, 'morning');
      const otAfternoonDisplay = getOvertimeCellHtml(emp, dateStr, 'afternoon');

      td.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; gap: 0.5px; width: 100%; height: 100%;">${otMorningDisplay}<span class="badge ${badgeClass}">${displayLabel}</span>${otAfternoonDisplay}</div>`;
      
      // Click editing or requesting based on role
      if (currentUser) {
        const isAdmin = isUserAdmin();
        const isSelf = currentUser.id === emp.id;
        
        if (isAdmin) {
          td.classList.add('admin-mode');
          td.addEventListener('click', () => {
            window.handleAdminCellClick(emp, dateStr, shift);
          });
        } else if (isSelf) {
          td.classList.add('staff-clickable-mode');
          td.addEventListener('click', () => {
            window.openStaffRequestModal(emp, dateStr, shift);
          });
        }
      }
      
      tr.appendChild(td);
      day++;
    }
    
    // Monthly Sum cell
    const sumTd = document.createElement('td');
    sumTd.style.fontWeight = '700';
    sumTd.style.textAlign = 'center';
    sumTd.textContent = monthlyTotalOt;
    tr.appendChild(sumTd);

    tbody.appendChild(tr);
  });

  renderMobileRosterTable(card, sortedEmployees, year, month, hall);
}

// Phone-only roster: dates continue downward and every employee stays visible as a column.
function renderMobileRosterTable(card, rosterEmployees, year, month, hall) {
  if (!card) return;

  let container = card.querySelector('.mobile-roster-table-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'mobile-roster-table-container';
    card.appendChild(container);
  }

  const hallLabel = hall === 'girincho' ? '기린초생활관' : hall === 'mulbongseon' ? '물봉선생활관' : '생활관 팀장';
  const table = document.createElement('table');
  table.className = 'mobile-roster-table';

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  const dateHeader = document.createElement('th');
  dateHeader.className = 'mobile-roster-date-col';
  dateHeader.innerHTML = `<span>${month + 1}월</span><small>날짜</small>`;
  headerRow.appendChild(dateHeader);

  rosterEmployees.forEach((employee) => {
    const th = document.createElement('th');
    th.innerHTML = `<span>${escapeHtml(employee.name)}</span><small>${employee.role === 'manager' ? '팀장' : `${employee.shiftGroup || '-'}조`}</small>`;
    if (currentUser && currentUser.id === employee.id) th.classList.add('is-me');
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const totalDays = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(year, month, day);
    const dateStr = formatDateString(year, month, day);
    const holidayName = getHolidayName(year, month, day);
    const row = document.createElement('tr');
    const today = new Date();
    const todayDateStr = formatDateString(today.getFullYear(), today.getMonth(), today.getDate());
    if (dateStr === todayDateStr) row.classList.add('is-today');
    if (holidayName || date.getDay() === 0) row.classList.add('is-holiday');
    else if (date.getDay() === 6) row.classList.add('is-saturday');

    const dateCell = document.createElement('th');
    dateCell.className = 'mobile-roster-date-col';
    dateCell.innerHTML = `<strong>${day}</strong><span>${getKoranWeekday(year, month, day)}</span>`;
    if (holidayName) dateCell.title = holidayName;
    row.appendChild(dateCell);

    rosterEmployees.forEach((employee) => {
      const cell = document.createElement('td');
      const shift = calculateShift(employee, dateStr);
      const { badgeClass, displayLabel } = getShiftBadgeAndLabel(shift);
      cell.innerHTML = `<span class="badge ${badgeClass}">${displayLabel}</span>`;
      cell.title = `${hallLabel} · ${employee.name} · ${dateStr} · ${shift}`;
      if (currentUser && currentUser.id === employee.id) cell.classList.add('is-me');

      if (currentUser) {
        if (isUserAdmin()) {
          cell.classList.add('is-actionable');
          cell.addEventListener('click', () => window.handleAdminCellClick(employee, dateStr, shift));
        } else if (currentUser.id === employee.id) {
          cell.classList.add('is-actionable');
          cell.addEventListener('click', () => window.openStaffRequestModal(employee, dateStr, shift));
        }
      }
      row.appendChild(cell);
    });
    tbody.appendChild(row);
  }
  table.appendChild(tbody);
  container.replaceChildren(table);
}

// Render monthly shift roster for Managers (Team Leaders)
function renderRosterForManagers(headerRowId, tbodyId) {
  const year = currentYear;
  const month = currentMonth;
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  // Set print approval sheet monthly subtext inside card
  const card = document.getElementById('schedule-section-managers');
  const printMonthLabel = card.querySelector('.print-month-name');
  if (printMonthLabel) {
    printMonthLabel.textContent = `${year}년 ${month + 1}월 근무표`;
  }

  // Get total days in month
  const totalDays = new Date(year, month + 1, 0).getDate();
  
  // Filter employees for managers (except mgr_admin)
  const filteredEmployees = employees.filter(emp => emp.role === 'manager' && emp.id !== 'mgr_admin');

  // Generate Table Header
  const headerRow = document.getElementById(headerRowId);
  headerRow.innerHTML = '';
  
  // Group col (shows '팀장' for managers)
  const groupTh = document.createElement('th');
  groupTh.textContent = '구분';
  groupTh.className = 'group-cell';
  headerRow.appendChild(groupTh);

  // Name col
  const nameTh = document.createElement('th');
  nameTh.textContent = '성명';
  nameTh.className = 'instructor-cell';
  headerRow.appendChild(nameTh);
  
  // Print-only Signature col
  const sigTh = document.createElement('th');
  sigTh.textContent = '서명';
  sigTh.className = 'print-only-cell';
  headerRow.appendChild(sigTh);
  
  for (let day = 1; day <= totalDays; day++) {
    const th = document.createElement('th');
    const weekdayText = getKoranWeekday(year, month, day);
    const holidayName = getHolidayName(year, month, day);
    
    const d = new Date(year, month, day);
    if (holidayName) {
      th.innerHTML = `${day}<br><span style="font-size: 0.75rem; font-weight: normal;">${weekdayText}</span><br><span class="holiday-label" style="font-size: 7px; font-weight: bold; line-height: 1.1; display: block; margin-top: 1px; color: #ef4444; white-space: nowrap;">${holidayName}</span>`;
      th.classList.add('holiday');
    } else {
      th.innerHTML = `${day}<br><span style="font-size: 0.75rem; font-weight: normal;">${weekdayText}</span>`;
      if (d.getDay() === 0) {
        th.classList.add('sunday');
      } else if (d.getDay() === 6) {
        th.classList.add('saturday');
      }
    }
    
    headerRow.appendChild(th);
  }

  // Sum Column
  const sumTh = document.createElement('th');
  sumTh.textContent = '합';
  sumTh.style.width = '3rem';
  sumTh.style.textAlign = 'center';
  headerRow.appendChild(sumTh);

  // Generate Table Rows
  const tbody = document.getElementById(tbodyId);
  tbody.innerHTML = '';

  filteredEmployees.forEach(emp => {
    const tr = document.createElement('tr');
    
    // Highlight current logged-in manager row
    if (currentUser && currentUser.id === emp.id) {
      tr.classList.add('my-roster-row');
    }
    
    // Group cell
    const groupTd = document.createElement('td');
    groupTd.className = 'group-cell';
    groupTd.innerHTML = `<strong>팀장</strong>`;
    tr.appendChild(groupTd);

    // Employee Name cell
    const nameTd = document.createElement('td');
    nameTd.className = 'instructor-cell';
    nameTd.innerHTML = `<strong>${emp.name}</strong>`;
    tr.appendChild(nameTd);
    
    // Print-only Signature cell
    const sigTd = document.createElement('td');
    sigTd.className = 'print-only-cell';
    sigTd.innerHTML = '&nbsp;';
    tr.appendChild(sigTd);
    
    let monthlyTotalOt = 0;

    // Daily shifts
    let day = 1;
    while (day <= totalDays) {
      const dateStr = formatDateString(year, month, day);
      const shift = calculateShift(emp, dateStr);
      
      // 특별 휴가(병가, 안식년) 연속 렌더링 셀 병합
      if (shift === '병가' || shift === '병가(대기)' || shift === '안식년' || shift === '안식년(대기)') {
        let colspan = 1;
        let checkDay = day + 1;
        while (checkDay <= totalDays) {
          const nextDateStr = formatDateString(year, month, checkDay);
          const nextShift = calculateShift(emp, nextDateStr);
          
          const isSameType = (
            ((shift === '병가' || shift === '병가(대기)') && (nextShift === '병가' || nextShift === '병가(대기)')) ||
            ((shift === '안식년' || shift === '안식년(대기)') && (nextShift === '안식년' || nextShift === '안식년(대기)'))
          );
          if (isSameType) {
            colspan++;
            checkDay++;
          } else {
            break;
          }
        }
        
        const td = document.createElement('td');
        td.className = 'shift-cell special-leave-cell';
        td.setAttribute('colspan', colspan);
        td.setAttribute('title', `${emp.name} - ${shift} (${colspan}일간)`);
        
        const labelText = (shift === '안식년' || shift === '안식년(대기)') ? '안 식 년' : '병 가';
        const cellBadgeClass = (shift === '안식년' || shift === '안식년(대기)') ? 'badge-sabbatical-merged' : 'badge-sick-merged';
        td.innerHTML = `<div class="merged-special-leave ${cellBadgeClass}">${labelText}</div>`;
        
        if (currentUser && isUserAdmin()) {
          td.classList.add('admin-mode');
          td.addEventListener('click', () => {
            alert('이 기간은 관리자 대시보드 내 [🏥 병가 / ✈️ 안식년 일괄 설정] 목록에서 직접 삭제 및 취소하실 수 있습니다.');
          });
        }
        
        tr.appendChild(td);
        day += colspan;
        continue;
      }
      
      const td = document.createElement('td');
      td.className = 'shift-cell';
      td.setAttribute('title', getShiftTooltipText(shift, emp, dateStr));
      
      const otHours = getOvertimeHours(emp, dateStr);
      monthlyTotalOt += otHours;
      
      // Determine badge class and single-character label
      let badgeClass = 'badge-off';
      let displayLabel = '휴';
      if (shift === '주간') { badgeClass = 'badge-day'; displayLabel = '주'; }
      else if (shift === '당직') { badgeClass = 'badge-duty'; displayLabel = '당'; }
      else if (shift === '야간') { badgeClass = 'badge-night'; displayLabel = '야'; }
      else if (shift === '연가') { badgeClass = 'badge-leave'; displayLabel = '연'; }
      else if (shift === '연가(대기)') { badgeClass = 'badge-pending-leave'; displayLabel = '대'; }
      else if (shift === '공가') { badgeClass = 'badge-official-leave'; displayLabel = '공'; }
      else if (shift === '공가(대기)') { badgeClass = 'badge-pending-leave'; displayLabel = '공'; }
      
      const otMorningDisplay = getOvertimeCellHtml(emp, dateStr, 'morning');
      const otAfternoonDisplay = getOvertimeCellHtml(emp, dateStr, 'afternoon');

      td.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; gap: 0.5px; width: 100%; height: 100%;">${otMorningDisplay}<span class="badge ${badgeClass}">${displayLabel}</span>${otAfternoonDisplay}</div>`;
      
      // Click editing or requesting based on role
      if (currentUser) {
        const isAdmin = isUserAdmin();
        const isSelf = currentUser.id === emp.id;
        
        if (isAdmin) {
          td.classList.add('admin-mode');
          td.addEventListener('click', () => {
            window.handleAdminCellClick(emp, dateStr, shift);
          });
        } else if (isSelf) {
          td.classList.add('staff-clickable-mode');
          td.addEventListener('click', () => {
            window.openStaffRequestModal(emp, dateStr, shift);
          });
        }
      }
      
      tr.appendChild(td);
      day++;
    }
    
    // Sum cell
    const sumTd = document.createElement('td');
    sumTd.style.fontWeight = '700';
    sumTd.style.textAlign = 'center';
    sumTd.textContent = monthlyTotalOt;
    tr.appendChild(sumTd);

    tbody.appendChild(tr);
  });

  renderMobileRosterTable(card, filteredEmployees, year, month, 'managers');
}

// Trigger Print for all Living Halls and Team Leaders in the unified layout matching reference image
window.printAllRosters = function() {
  populateMasterPrintTable();
  window.print();
};

// Helper: Populate the hidden Master Print Table matching reference image layout
function populateMasterPrintTable() {
  const year = currentYear;
  const month = currentMonth;
  const totalDays = new Date(year, month + 1, 0).getDate();
  
  // 1. Update Title
  document.getElementById('print-title-month').textContent = `${year}년 ${month + 1}월 근무(시간외) 계획 : 생활지원팀`;

  // 2. Clear & Populate Headers
  const row1 = document.getElementById('print-th-row-1');
  const row2 = document.getElementById('print-th-row-2');
  
  // Reset Row 1 (keep first 4 cells: 생활관, 조, 성명, 서명)
  row1.innerHTML = `
    <th rowspan="2" class="print-hall-col" style="font-size: 7.2pt; letter-spacing: -0.5px;">생활관</th>
    <th rowspan="2" class="print-group-col" style="font-size: 7.5pt;">조</th>
    <th rowspan="2" class="print-name-col" style="font-size: 8.5pt;">성명</th>
    <th rowspan="2" class="print-sig-col" style="font-size: 8.5pt;">서명</th>
  `;
  // Append dates 1..31
  for (let day = 1; day <= totalDays; day++) {
    const th = document.createElement('th');
    th.classList.add('date-col');
    th.style.fontSize = '8pt';
    th.style.width = '2.4%';
    th.textContent = day;
    
    const d = new Date(year, month, day);
    const holidayName = getHolidayName(year, month, day);
    if (holidayName) {
      th.classList.add('holiday');
    } else if (d.getDay() === 0) {
      th.classList.add('sunday');
    } else if (d.getDay() === 6) {
      th.classList.add('saturday');
    }

    if (d.getDay() === 0) {
      th.style.setProperty('border-right', '2.5px solid #000000', 'important');
    }
    row1.appendChild(th);
  }
  // Append sum
  const sumTh = document.createElement('th');
  sumTh.rowSpan = 2;
  sumTh.className = 'print-sum-col';
  sumTh.style.fontSize = '8.5pt';
  sumTh.textContent = '합';
  row1.appendChild(sumTh);

  // Reset Row 2 (populate days of week)
  row2.innerHTML = '';
  for (let day = 1; day <= totalDays; day++) {
    const th = document.createElement('th');
    th.classList.add('date-col');
    th.style.fontSize = '7.5pt';
    th.style.fontWeight = 'normal';
    const d = new Date(year, month, day);
    const holidayName = getHolidayName(year, month, day);
    if (holidayName) {
      th.innerHTML = `${getKoranWeekday(year, month, day)}<br><span class="holiday-label" style="font-size: 6px; font-weight: bold; line-height: 1.1; display: block; margin-top: 1px; color: #ef4444; white-space: nowrap;">${holidayName}</span>`;
      th.classList.add('holiday');
    } else {
      th.textContent = getKoranWeekday(year, month, day);
      if (d.getDay() === 0) {
        th.classList.add('sunday');
      } else if (d.getDay() === 6) {
        th.classList.add('saturday');
      }
    }

    if (d.getDay() === 0) {
      th.style.setProperty('border-right', '2.5px solid #000000', 'important');
    }
    row2.appendChild(th);
  }

  // 3. Populate Rows
  const tbody = document.getElementById('print-master-tbody');
  tbody.innerHTML = '';

  // Girincho Employees
  const girinchoStaff = employees.filter(emp => emp.role === 'staff' && emp.hall === 'girincho').sort((a, b) => a.shiftGroup - b.shiftGroup);
  // Mulbongseon Employees
  const mulbongseonStaff = employees.filter(emp => emp.role === 'staff' && emp.hall === 'mulbongseon').sort((a, b) => a.shiftGroup - b.shiftGroup);
  // Team Leaders
  const teamLeaders = employees.filter(emp => emp.role === 'manager' && emp.id !== 'mgr_admin');

  // Helper to append rows
  const renderSectionRows = (staffList, sectionLabel) => {
    staffList.forEach((emp, index) => {
      const tr = document.createElement('tr');
      const isShaded = (emp.shiftGroup % 2 === 0);
      const bgColor = isShaded ? '#eeeeee' : ''; // light gray shading (matching reference image #eeeeee)
      
      // Merged Hall Cell (rowspan)
      if (index === 0) {
        const hallTd = document.createElement('td');
        hallTd.rowSpan = staffList.length;
        hallTd.className = 'print-hall-col group-cell';
        hallTd.style.fontWeight = 'bold';
        hallTd.style.fontSize = '9.5pt';
        hallTd.style.verticalAlign = 'middle';
        hallTd.style.writingMode = 'vertical-rl';
        hallTd.style.textOrientation = 'upright';
        hallTd.style.letterSpacing = '1px';
        hallTd.style.backgroundColor = '#ffffff'; // explicitly white background for merged hall column
        hallTd.textContent = sectionLabel;
        tr.appendChild(hallTd);
      }

      // Render 조 (Group) Cell
      // If Mulbongseon group 1 has two staff members, we merge them into a single cell spanning 2 rows
      if (sectionLabel === '물봉선' && emp.shiftGroup === 1) {
        if (index === 0) {
          const groupTd = document.createElement('td');
          groupTd.className = 'print-group-col';
          groupTd.rowSpan = 2;
          groupTd.textContent = '1조';
          groupTd.style.verticalAlign = 'middle';
          groupTd.style.fontWeight = 'bold';
          groupTd.style.fontSize = '8.5pt';
          groupTd.style.backgroundColor = bgColor;
          tr.appendChild(groupTd);
        }
        // Skip index === 1 (the second staff row)
      } else {
        const groupTd = document.createElement('td');
        groupTd.className = 'print-group-col';
        groupTd.textContent = `${emp.shiftGroup}조`;
        groupTd.style.verticalAlign = 'middle';
        groupTd.style.fontWeight = 'bold';
        groupTd.style.fontSize = '8.5pt';
        groupTd.style.backgroundColor = bgColor;
        tr.appendChild(groupTd);
      }

      // Name
      const nameTd = document.createElement('td');
      nameTd.className = 'print-name-col';
      nameTd.style.fontWeight = 'bold';
      nameTd.style.backgroundColor = bgColor;
      nameTd.textContent = emp.name;
      tr.appendChild(nameTd);

      // Signature
      const sigTd = document.createElement('td');
      sigTd.className = 'print-sig-col';
      sigTd.style.backgroundColor = bgColor;
      sigTd.innerHTML = '&nbsp;';
      tr.appendChild(sigTd);

      // Shifts 1..31
      let monthlyTotalOt = 0;
      let day = 1;
      while (day <= totalDays) {
        const dateStr = formatDateString(year, month, day);
        const shift = calculateShift(emp, dateStr);
        
        // 특별 휴가(병가, 안식년) 연속 렌더링 셀 병합 (인쇄용 - 일반직원)
        if (shift === '병가' || shift === '병가(대기)' || shift === '안식년' || shift === '안식년(대기)') {
          let colspan = 1;
          let checkDay = day + 1;
          while (checkDay <= totalDays) {
            const nextDateStr = formatDateString(year, month, checkDay);
            const nextShift = calculateShift(emp, nextDateStr);
            
            const isSameType = (
              ((shift === '병가' || shift === '병가(대기)') && (nextShift === '병가' || nextShift === '병가(대기)')) ||
              ((shift === '안식년' || shift === '안식년(대기)') && (nextShift === '안식년' || nextShift === '안식년(대기)'))
            );
            if (isSameType) {
              colspan++;
              checkDay++;
            } else {
              break;
            }
          }
          
          const td = document.createElement('td');
          td.className = 'date-cell special-leave-cell';
          td.setAttribute('colspan', colspan);
          td.setAttribute('title', `${emp.name} - ${shift} (${colspan}일간)`);
          
          const labelText = (shift === '안식년' || shift === '안식년(대기)') ? '안 식 년' : '병 가';
          const cellBadgeClass = (shift === '안식년' || shift === '안식년(대기)') ? 'badge-sabbatical-merged' : 'badge-sick-merged';
          td.innerHTML = `<div class="merged-special-leave ${cellBadgeClass}">${labelText}</div>`;
          
          if (isShaded) {
            td.style.backgroundColor = bgColor;
          }
          
          // 일요일이 병합 범위 내에 포함되어 있는지 체크하여 border-right 부여
          let hasSunday = false;
          for (let offset = 0; offset < colspan; offset++) {
            const d = new Date(year, month, day + offset);
            if (d.getDay() === 0) {
              hasSunday = true;
              break;
            }
          }
          if (hasSunday) {
            td.style.setProperty('border-right', '2.5px solid #000000', 'important');
          }
          
          tr.appendChild(td);
          day += colspan;
          continue;
        }
        
        const td = document.createElement('td');
        td.className = 'date-cell';
        
        const otHours = getOvertimeHours(emp, dateStr);
        monthlyTotalOt += otHours;

        const { badgeClass, displayLabel } = getShiftBadgeAndLabel(shift);
        let printLabel = displayLabel;
        if (shift === '연가' || shift === '연가(대기)') printLabel = '연가';
        else if (shift === '공가' || shift === '공가(대기)') printLabel = '공가';

        const modification = shiftModifications.find(mod => mod && mod.employeeId === emp.id && mod.date === dateStr);
        const isManualOff = (modification && modification.shift === '휴무' && calculateDefaultCycleShift(emp, dateStr) !== '휴무');

        const otMorningDisplay = getOvertimeCellHtml(emp, dateStr, 'morning');
        const otAfternoonDisplay = getOvertimeCellHtml(emp, dateStr, 'afternoon');

        td.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; gap: 0.5px; width: 100%; height: 100%;">${otMorningDisplay}<span class="badge ${badgeClass} ${isManualOff ? 'manual-off' : ''}">${printLabel}</span>${otAfternoonDisplay}</div>`;
        
        if (isShaded) {
          td.style.backgroundColor = bgColor;
        }

        // Weekly thick vertical divider (Sunday to Monday boundary)
        const d = new Date(year, month, day);
        if (d.getDay() === 0) {
          td.style.setProperty('border-right', '2.5px solid #000000', 'important');
        }

        tr.appendChild(td);
        day++;
      }

      // Monthly Overtime Sum
      const sumTd = document.createElement('td');
      sumTd.className = 'print-sum-col';
      sumTd.style.fontWeight = 'bold';
      sumTd.style.backgroundColor = bgColor;
      sumTd.textContent = monthlyTotalOt;
      tr.appendChild(sumTd);

      tbody.appendChild(tr);
    });
  };

  // Helper to append a spacing horizontal separator row
  const appendSeparatorRow = () => {
    const tr = document.createElement('tr');
    tr.className = 'print-separator-row';
    const td = document.createElement('td');
    td.colSpan = 36;
    td.style.backgroundColor = '#eeeeee'; // Light gray separator matching background shading
    td.style.borderTop = '2.5px solid #000000 !important';
    td.style.borderBottom = '2.5px solid #000000 !important';
    td.style.padding = '0';
    td.innerHTML = '&nbsp;';
    tr.appendChild(td);
    tbody.appendChild(tr);
  };

  // Render sections
  renderSectionRows(girinchoStaff, '기린초');
  appendSeparatorRow();
  renderSectionRows(mulbongseonStaff, '물봉선');
  appendSeparatorRow();
  
  // Render Team Leaders
  teamLeaders.forEach((emp, index) => {
    const tr = document.createElement('tr');
    if (index === 0) {
      const leaderTd = document.createElement('td');
      leaderTd.rowSpan = teamLeaders.length;
      leaderTd.colSpan = 2; // Spans both 생활관 and 조 columns!
      leaderTd.className = 'print-hall-col group-cell';
      leaderTd.style.fontWeight = 'bold';
      leaderTd.style.fontSize = '9.5pt';
      leaderTd.style.verticalAlign = 'middle';
      leaderTd.style.writingMode = 'vertical-rl';
      leaderTd.style.textOrientation = 'upright';
      leaderTd.style.letterSpacing = '1px';
      leaderTd.textContent = '팀장';
      tr.appendChild(leaderTd);
    }
    
    // Name
    const nameTd = document.createElement('td');
    nameTd.className = 'print-name-col';
    nameTd.style.fontWeight = 'bold';
    nameTd.textContent = emp.name;
    tr.appendChild(nameTd);

    // Signature
    const sigTd = document.createElement('td');
    sigTd.className = 'print-sig-col';
    sigTd.innerHTML = '&nbsp;';
    tr.appendChild(sigTd);

    // Shifts 1..31
    let monthlyTotalOt = 0;
    let day = 1;
    while (day <= totalDays) {
      const dateStr = formatDateString(year, month, day);
      const shift = calculateShift(emp, dateStr);
      
      // 특별 휴가(병가, 안식년) 연속 렌더링 셀 병합 (인쇄용)
      if (shift === '병가' || shift === '병가(대기)' || shift === '안식년' || shift === '안식년(대기)') {
        let colspan = 1;
        let checkDay = day + 1;
        while (checkDay <= totalDays) {
          const nextDateStr = formatDateString(year, month, checkDay);
          const nextShift = calculateShift(emp, nextDateStr);
          
          const isSameType = (
            ((shift === '병가' || shift === '병가(대기)') && (nextShift === '병가' || nextShift === '병가(대기)')) ||
            ((shift === '안식년' || shift === '안식년(대기)') && (nextShift === '안식년' || nextShift === '안식년(대기)'))
          );
          if (isSameType) {
            colspan++;
            checkDay++;
          } else {
            break;
          }
        }
        
        const td = document.createElement('td');
        td.className = 'date-cell special-leave-cell';
        td.setAttribute('colspan', colspan);
        td.setAttribute('title', `${emp.name} - ${shift} (${colspan}일간)`);
        
        const labelText = (shift === '안식년' || shift === '안식년(대기)') ? '안 식 년' : '병 가';
        const cellBadgeClass = (shift === '안식년' || shift === '안식년(대기)') ? 'badge-sabbatical-merged' : 'badge-sick-merged';
        td.innerHTML = `<div class="merged-special-leave ${cellBadgeClass}">${labelText}</div>`;
        
        // 일요일이 병합 범위 내에 포함되어 있는지 체크하여 border-right 부여
        let hasSunday = false;
        for (let offset = 0; offset < colspan; offset++) {
          const d = new Date(year, month, day + offset);
          if (d.getDay() === 0) {
            hasSunday = true;
            break;
          }
        }
        if (hasSunday) {
          td.style.setProperty('border-right', '2.5px solid #000000', 'important');
        }
        
        tr.appendChild(td);
        day += colspan;
        continue;
      }
      
      const td = document.createElement('td');
      td.className = 'date-cell';
      
      const otHours = getOvertimeHours(emp, dateStr);
      monthlyTotalOt += otHours;

      let badgeClass = 'badge-off';
      let displayLabel = '휴';
      if (shift === '주간') { badgeClass = 'badge-day'; displayLabel = '주'; }
      else if (shift === '당직') { badgeClass = 'badge-duty'; displayLabel = '당'; }
      else if (shift === '야간') { badgeClass = 'badge-night'; displayLabel = '야'; }
      else if (shift === '연가') { badgeClass = 'badge-leave'; displayLabel = '연'; }
      else if (shift === '연가(대기)') { badgeClass = 'badge-pending-leave'; displayLabel = '대'; }
      else if (shift === '공가') { badgeClass = 'badge-official-leave'; displayLabel = '공'; }
      else if (shift === '공가(대기)') { badgeClass = 'badge-pending-leave'; displayLabel = '공'; }

      let printLabel = displayLabel;
      if (shift === '연가' || shift === '연가(대기)') printLabel = '연가';
      else if (shift === '공가' || shift === '공가(대기)') printLabel = '공가';

      const modification = shiftModifications.find(mod => mod && mod.employeeId === emp.id && mod.date === dateStr);
      const isManualOff = (modification && modification.shift === '휴무' && calculateDefaultCycleShift(emp, dateStr) !== '휴무');

      const otMorningDisplay = getOvertimeCellHtml(emp, dateStr, 'morning');
      const otAfternoonDisplay = getOvertimeCellHtml(emp, dateStr, 'afternoon');

      td.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; gap: 0.5px; width: 100%; height: 100%;">${otMorningDisplay}<span class="badge ${badgeClass} ${isManualOff ? 'manual-off' : ''}">${printLabel}</span>${otAfternoonDisplay}</div>`;

      // Weekly thick vertical divider (Sunday to Monday boundary)
      const d = new Date(year, month, day);
      if (d.getDay() === 0) {
        td.style.setProperty('border-right', '2.5px solid #000000', 'important');
      }

      tr.appendChild(td);
      day++;
    }

    // Monthly Overtime Sum (Blank for team leaders)
    const sumTd = document.createElement('td');
    sumTd.className = 'print-sum-col';
    sumTd.style.fontWeight = 'bold';
    sumTd.textContent = '';
    tr.appendChild(sumTd);

    tbody.appendChild(tr);
  });
}

// Render Admin Dashboard
function renderAdminDashboard() {
  if (!currentUser || !isUserAdmin()) return;

  // Initialize and render special leaves (Sick / Sabbatical)
  renderSpecialLeaveEmployeeSelect();
  renderSpecialLeaveList();

  const leaveTbody = document.getElementById('admin-leave-requests-tbody');
  if (leaveTbody) leaveTbody.innerHTML = '';

  // Filter by Month
  const adminFilter = document.getElementById('admin-month-filter');
  const filterVal = adminFilter ? adminFilter.value : 'current';

  const dateSelectContainer = document.getElementById('admin-date-select-container');
  if (dateSelectContainer) {
    dateSelectContainer.style.display = filterVal === 'current' ? 'inline-flex' : 'none';
  }
  
  let relevantLeaveRequests = leaveRequests;
  if (filterVal === 'current') {
    const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    relevantLeaveRequests = leaveRequests.filter(req => req.date && req.date.startsWith(prefix));
  }

  // Apply Living Hall filter
  const hallFilter = document.getElementById('admin-hall-filter') ? document.getElementById('admin-hall-filter').value : 'all';
  if (hallFilter !== 'all') {
    relevantLeaveRequests = relevantLeaveRequests.filter(req => {
      const emp = employees.find(e => e.id === req.employeeId);
      if (hallFilter === 'manager') {
        return emp && emp.role === 'manager';
      }
      return emp && emp.hall === hallFilter && emp.role !== 'manager';
    });
  }

  // Get sort order
  const sortFilter = document.getElementById('admin-sort-filter') ? document.getElementById('admin-sort-filter').value : 'hall-name';

  // Combined sort function
  const sortFunc = (a, b) => {
    // Primary: pending first
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;

    const empA = employees.find(emp => emp.id === a.employeeId);
    const empB = employees.find(emp => emp.id === b.employeeId);

    if (sortFilter === 'hall-name') {
      const hallA = empA ? (empA.hall || '팀장') : '팀장';
      const hallB = empB ? (empB.hall || '팀장') : '팀장';
      const hallCompare = hallA.localeCompare(hallB, 'ko');
      if (hallCompare !== 0) return hallCompare;

      const nameA = empA ? empA.name : (a.employeeName || '');
      const nameB = empB ? empB.name : (b.employeeName || '');
      const nameCompare = nameA.localeCompare(nameB, 'ko');
      if (nameCompare !== 0) return nameCompare;
      
      return a.date.localeCompare(b.date);
    } else if (sortFilter === 'name') {
      const nameA = empA ? empA.name : (a.employeeName || '');
      const nameB = empB ? empB.name : (b.employeeName || '');
      const nameCompare = nameA.localeCompare(nameB, 'ko');
      if (nameCompare !== 0) return nameCompare;
      
      return a.date.localeCompare(b.date);
    } else if (sortFilter === 'date-desc') {
      return b.date.localeCompare(a.date);
    } else if (sortFilter === 'date-asc') {
      return a.date.localeCompare(b.date);
    }
    return 0;
  };

  if (relevantLeaveRequests.length === 0) {
    leaveTbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">해당 월의 연가 신청이 없거나 대기열이 비어있습니다.</td></tr>`;
  } else {
    const sortedLeaveRequests = [...relevantLeaveRequests].sort(sortFunc);

    sortedLeaveRequests.forEach(req => {
      const tr = document.createElement('tr');
      
      let statusBadgeClass = 'badge-pending';
      let statusText = '대기중';
      if (req.status === 'approved') {
        statusBadgeClass = 'badge-approved';
        statusText = '승인됨';
      } else if (req.status === 'rejected') {
        statusBadgeClass = 'badge-rejected';
        statusText = '반려됨';
      }

      const employee = employees.find(emp => emp.id === req.employeeId);
      const isOfficial = req.leaveType === '공가';
      const labelBadge = isOfficial ? `<span style="font-size:0.75rem; color:#0369a1; background-color:#e0f2fe; padding:0.1rem 0.35rem; border-radius:0.25rem; margin-left:0.25rem; font-weight:bold;">공가</span>` : (employee ? `(남음: ${employee.remainingLeave}일)` : '');

      let actionButtons = '';
      if (req.status === 'pending') {
        actionButtons = `
          <div style="display: inline-flex; gap: 0.25rem;">
            <button class="btn btn-primary" style="padding: 0.35rem 0.65rem; font-size: 0.75rem;" onclick="approveLeave('${req.id}')">승인</button>
            <button class="btn btn-danger" style="padding: 0.35rem 0.65rem; font-size: 0.75rem;" onclick="rejectLeave('${req.id}')">반려</button>
          </div>
        `;
      } else if (req.status === 'rejected') {
        actionButtons = `
          <button class="btn btn-danger btn-sm" style="padding: 0.2rem 0.45rem; font-size: 0.7rem; font-weight: bold;" onclick="deleteRejectedLeave('${req.id}')">내역 삭제</button>
        `;
      } else {
        actionButtons = `
          <div style="display: inline-flex; gap: 0.25rem; align-items: center;">
            <span style="font-size: 0.8rem; color: var(--text-muted); margin-right: 0.25rem;">-</span>
            <button class="btn btn-secondary btn-sm" style="padding: 0.15rem 0.35rem; font-size: 0.7rem; font-weight: bold;" onclick="cancelApproval('${req.id}', 'leave')">결재취소</button>
          </div>
        `;
      }

      tr.innerHTML = `
        <td><strong>${req.employeeName}</strong> ${labelBadge}</td>
        <td>${req.date}</td>
        <td>${escapeHtml(req.reason)}</td>
        <td><span class="badge ${statusBadgeClass}" style="width:auto; height:auto; border-radius:0.375rem; padding:0.25rem 0.5rem; display:inline-flex;">${statusText}</span></td>
        <td>${actionButtons}</td>
      `;
      leaveTbody.appendChild(tr);
    });
  }

  // 2. Render Overtime Approval queue: all managers see both halls
  const otTbody = document.getElementById('admin-ot-requests-tbody');
  otTbody.innerHTML = '';

  let relevantOtRequests = overtimeRequests;
  if (filterVal === 'current') {
    const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    relevantOtRequests = overtimeRequests.filter(req => req.date && req.date.startsWith(prefix));
  }

  // Apply Living Hall filter to Overtime
  if (hallFilter !== 'all') {
    relevantOtRequests = relevantOtRequests.filter(req => {
      const emp = employees.find(e => e.id === req.employeeId);
      if (hallFilter === 'manager') {
        return emp && emp.role === 'manager';
      }
      return emp && emp.hall === hallFilter && emp.role !== 'manager';
    });
  }

  if (relevantOtRequests.length === 0) {
    otTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">해당 월의 시간외 신청이 없거나 대기열이 비어있습니다.</td></tr>`;
  } else {
    const sortedOtRequests = [...relevantOtRequests].sort(sortFunc);

    sortedOtRequests.forEach(req => {
      const tr = document.createElement('tr');
      
      let statusBadgeClass = 'badge-pending';
      let statusText = '대기중';
      if (req.status === 'approved') {
        statusBadgeClass = 'badge-approved';
        statusText = '승인됨';
      } else if (req.status === 'rejected') {
        statusBadgeClass = 'badge-rejected';
        statusText = '반려됨';
      }

      const empWeekTotal = getWeeklyOvertimeTotal(req.employeeId, req.date, req.id);
      const timeOfDayText = req.timeOfDay === 'morning' ? '오전' : '오후';

      let actionButtons = '';
      if (req.status === 'pending') {
        actionButtons = `
          <div style="display: inline-flex; gap: 0.25rem;">
            <button class="btn btn-primary" style="padding: 0.35rem 0.65rem; font-size: 0.75rem;" onclick="approveOvertime('${req.id}')">승인</button>
            <button class="btn btn-danger" style="padding: 0.35rem 0.65rem; font-size: 0.75rem;" onclick="rejectOvertime('${req.id}')">반려</button>
          </div>
        `;
      } else {
        actionButtons = `
          <div style="display: inline-flex; gap: 0.25rem; align-items: center;">
            <span style="font-size: 0.8rem; color: var(--text-muted); margin-right: 0.25rem;">-</span>
            <button class="btn btn-secondary btn-sm" style="padding: 0.15rem 0.35rem; font-size: 0.7rem; font-weight: bold;" onclick="cancelApproval('${req.id}', 'overtime')">결재취소</button>
          </div>
        `;
      }

      tr.innerHTML = `
        <td><strong>${req.employeeName}</strong> <span style="font-size:0.75rem; color:var(--text-muted);">(주간 누적: ${empWeekTotal}h)</span></td>
        <td>${req.date}</td>
        <td><strong>[${timeOfDayText}] ${req.hours}시간</strong></td>
        <td>${escapeHtml(req.reason)}</td>
        <td><span class="badge ${statusBadgeClass}" style="width:auto; height:auto; border-radius:0.375rem; padding:0.25rem 0.5rem; display:inline-flex;">${statusText}</span></td>
        <td>${actionButtons}</td>
      `;
      otTbody.appendChild(tr);
    });
  }

  // 3. Render Employee directory management
  renderAdminEmployees();
  renderAdminManagers();
}

// Render list of employees in Living Hall: all managers see both halls
function renderAdminEmployees() {
  if (!currentUser || !isUserAdmin()) return;

  const tbody = document.getElementById('admin-employees-tbody');
  tbody.innerHTML = '';

  const relevantEmployees = employees.filter(emp => emp.role === 'staff');

  relevantEmployees.forEach(emp => {
    const tr = document.createElement('tr');
    const hallLabel = emp.hall === 'girincho' ? '기린초' : '물봉선';
    
    tr.innerHTML = `
      <td><span class="badge" style="background-color:var(--bg-color); color:var(--text-main); border:1px solid var(--border-color); border-radius:0.375rem; width:auto; height:auto; padding:0.25rem 0.5rem; font-size:0.85rem; font-weight:600;">${hallLabel}생활관</span></td>
      <td><strong>${emp.shiftGroup}조</strong></td>
      <td><strong>${emp.name}</strong></td>
      <td><code>${emp.loginId || '미연결'}</code></td>
      <td>${emp.joinYearMonth}</td>
      <td>${emp.totalLeave}일</td>
      <td><strong>${emp.remainingLeave}일</strong> <span style="font-size:0.75rem; color:var(--text-muted);">(사용: ${emp.usedLeave}일)</span></td>
      <td>
        <button class="btn btn-secondary" style="padding:0.35rem 0.75rem;font-size:0.75rem;" onclick="openEditEmployeeModal('${emp.id}')">✏️ 정보/소속 수정</button>
        ${currentUser.hall === 'all' ? `<button class="btn btn-primary" style="padding:0.35rem 0.75rem;font-size:0.75rem;" onclick="openChangeLoginIdModal('${emp.id}')">아이디 변경</button>` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Open modal to edit employee details
window.openEditEmployeeModal = function(employeeId) {
  const emp = employees.find(e => e.id === employeeId);
  if (!emp) return;

  document.getElementById('edit-emp-id').value = emp.id;
  document.getElementById('edit-emp-name').value = emp.name;
  document.getElementById('edit-emp-hall').value = emp.hall; // Load living hall
  document.getElementById('edit-emp-login-id').value = emp.loginId || '미연결';
  document.getElementById('edit-emp-join').value = emp.joinYearMonth;
  document.getElementById('edit-emp-total').value = emp.totalLeave;
  document.getElementById('edit-emp-group').value = emp.shiftGroup || 1;

  document.getElementById('edit-employee-overlay').classList.add('active');
};

// Render list of manager accounts in Admin Dashboard
function renderAdminManagers() {
  if (!currentUser || !isUserAdmin()) return;

  const tbody = document.getElementById('admin-managers-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const managers = employees.filter(emp => emp.role === 'manager');

  managers.forEach(mgr => {
    const tr = document.createElement('tr');
    let roleLabel = '전체 관리자 (개발자)';
    if (mgr.hall === 'girincho') roleLabel = '기린초생활관 팀장';
    else if (mgr.hall === 'mulbongseon') roleLabel = '물봉선생활관 팀장';
    
    tr.innerHTML = `
      <td><span class="badge" style="background-color:var(--bg-color); color:var(--text-main); border:1px solid var(--border-color); border-radius:0.375rem; width:auto; height:auto; padding:0.25rem 0.5rem; font-size:0.85rem; font-weight:600;">${roleLabel}</span></td>
      <td><strong>${mgr.name}</strong></td>
      <td><code>${mgr.loginId || mgr.username || '미연결'}</code></td>
      <td><span class="badge" style="width:auto;height:auto;padding:0.2rem 0.45rem;">${mgr.loginId ? '연결됨' : '미연결'}</span></td>
      <td>
        ${currentUser.hall === 'all' ? `
          <button class="btn btn-secondary" style="padding:0.35rem 0.6rem;font-size:0.75rem;" onclick="openEditManagerModal('${mgr.id}')">정보 수정</button>
          <button class="btn btn-secondary" style="padding:0.35rem 0.6rem;font-size:0.75rem;" onclick="openChangeLoginIdModal('${mgr.id}')">아이디 변경</button>
          <button class="btn btn-primary" style="padding:0.35rem 0.6rem;font-size:0.75rem;" onclick="openManagerTransferModal('${mgr.id}')">권한 양도</button>
        ` : '<span style="color:var(--text-muted);font-size:0.75rem;">조회만 가능</span>'}
      </td>
    `;
    tbody.appendChild(tr);
  });
}
window.renderAdminManagers = renderAdminManagers;

// Open modal to edit manager details
window.openEditManagerModal = function(managerId) {
  if (!currentUser || currentUser.hall !== 'all') return;
  const mgr = employees.find(e => e.id === managerId);
  if (!mgr) return;

  document.getElementById('edit-mgr-id').value = mgr.id;
  document.getElementById('edit-mgr-name').value = mgr.name;
  document.getElementById('edit-mgr-username').value = mgr.loginId || mgr.username || '';
  document.getElementById('edit-mgr-hall').value = mgr.hall || 'girincho';

  document.getElementById('edit-manager-overlay').classList.add('active');
};

window.openManagerTransferModal = function(managerId) {
  if (!currentUser || currentUser.hall !== 'all') return;
  const mgr = employees.find(e => e.id === managerId && e.role === 'manager');
  if (!mgr) return;
  document.getElementById('transfer-manager-id').value = mgr.id;
  document.getElementById('transfer-manager-current').textContent = `현재 담당자: ${mgr.name} / 로그인 ID: ${mgr.loginId || mgr.username || '미연결'}`;
  document.getElementById('transfer-manager-overlay').classList.add('active');
};

window.openChangeLoginIdModal = function(employeeId) {
  if (!currentUser || currentUser.hall !== 'all') return;
  const employee = employees.find(e => e.id === employeeId);
  if (!employee) return alert('사용자 정보를 찾지 못했습니다.');
  document.getElementById('change-login-employee-id').value = employee.id;
  document.getElementById('change-login-current').textContent = `${employee.name} / 현재 ID: ${employee.loginId || '미연결'}`;
  document.getElementById('change-login-new-id').value = employee.loginId || '';
  document.getElementById('change-login-id-overlay').classList.add('active');
};


// Approve Leave handler
window.approveLeave = async function(requestId) {
  const req = leaveRequests.find(r => r.id === requestId);
  if (!req) return;

  const emp = employees.find(e => e.id === req.employeeId);
  if (!emp) return;

  if (emp.remainingLeave <= 0) {
    alert('해당 직원은 잔여 연가가 소진되었습니다.');
    return;
  }

  try {
    await updateRequestStatus('leave_requests', requestId, 'approved');
    req.status = 'approved';
    recalculateEmployeeLeaveCounts();
    await saveEmployeeLeaveCounts(emp);
  } catch (error) {
    alert('연가 승인에 실패했습니다: ' + (error.message || error));
    return;
  }

  alert(`${emp.name} 선생님의 ${req.date} 연가가 정상 승인되었습니다. 즐거운 휴가 되세요! 🌴`);
  renderAdminDashboard();
  renderRoster();
};

// Reject Leave handler
window.rejectLeave = async function(requestId) {
  const req = leaveRequests.find(r => r.id === requestId);
  if (!req) return;

  try {
    await deleteRequestAsManager('leave_requests', requestId);
    leaveRequests = leaveRequests.filter(r => r.id !== requestId);
    recalculateEmployeeLeaveCounts();
    const emp = employees.find(e => e.id === req.employeeId);
    if (emp) await saveEmployeeLeaveCounts(emp);
  } catch (error) {
    alert('연가 반려에 실패했습니다: ' + (error.message || error));
    return;
  }

  alert('연가 신청이 반려되었으며 신청 내역도 삭제되었습니다.');
  renderAdminDashboard();
  renderRoster();
};

// Approve Overtime handler
window.approveOvertime = async function(requestId) {
  const req = overtimeRequests.find(r => r.id === requestId);
  if (!req) return;

  // Verify daily limit before approval
  const employee = employees.find(e => e.id === req.employeeId);
  if (employee) {
    const shift = calculateShift(employee, req.date);
    
    // Verify off day overtime rules
    if (shift === '휴무' || shift === '휴' || shift === '휴무(대기)') {
      const { startStr, endStr } = getWeekRange(req.date);
      const hasLeaveInWeek = leaveRequests.some(r => r && r.employeeId === req.employeeId && r.date >= startStr && r.date <= endStr && r.status !== 'rejected');
      if (hasLeaveInWeek) {
        alert('이번 주에 해당 직원의 연가 신청 내역이 있어 휴무일에 시간외 근무를 승인할 수 없습니다.');
        return;
      }
    }

    const baseOt = (shift === '당직') ? 3 : (shift === '야간' ? 4 : 0);
    const approvedOtReq = overtimeRequests.filter(r => r.employeeId === req.employeeId && r.date === req.date && r.status === 'approved' && r.id !== req.id);
    const approvedOtHours = approvedOtReq.reduce((sum, r) => sum + parseInt(r.hours), 0);
    
    if (baseOt + approvedOtHours + req.hours > 4) {
      alert(`해당 직원의 당일 시간외 근무 수당 한도(4시간)를 초과하여 승인할 수 없습니다. (배정된 시간외: ${baseOt + approvedOtHours}시간, 승인요청: ${req.hours}시간)`);
      return;
    }
  }

  // Verify weekly limit before approval
  const currentWeeklyTotalWithoutThis = getWeeklyOvertimeTotal(req.employeeId, req.date, req.id);
  if (currentWeeklyTotalWithoutThis + req.hours > 12) {
    alert(`해당 직원의 해당 주간 시간외 근무가 한도(12시간)를 초과하여 승인할 수 없습니다. (현재 주간 누적: ${currentWeeklyTotalWithoutThis}시간, 승인 요청: ${req.hours}시간)`);
    return;
  }

  // Verify monthly limit before approval
  const reqDate = parseLocalDate(req.date);
  const rYear = reqDate.getFullYear();
  const rMonth = reqDate.getMonth();
  const currentMonthlyTotalWithoutThis = getMonthlyOvertimeTotal(req.employeeId, rYear, rMonth, req.id);
  if (currentMonthlyTotalWithoutThis + req.hours > 40) {
    alert(`해당 직원의 해당 월간 시간외 근무가 한도(40시간)를 초과하여 승인할 수 없습니다. (현재 월간 누적: ${currentMonthlyTotalWithoutThis}시간, 승인 요청: ${req.hours}시간)`);
    return;
  }

  try {
    await updateRequestStatus('overtime_requests', requestId, 'approved');
    req.status = 'approved';
  } catch (error) {
    alert('시간외 승인에 실패했습니다: ' + (error.message || error));
    return;
  }

  alert(`${req.employeeName} 선생님의 ${req.date} 시간외 근무(${req.hours}시간)가 승인되었습니다.`);
  renderAdminDashboard();
  renderRoster();
};

// Reject Overtime handler
window.rejectOvertime = async function(requestId) {
  const req = overtimeRequests.find(r => r.id === requestId);
  if (!req) return;

  try {
    await updateRequestStatus('overtime_requests', requestId, 'rejected');
    req.status = 'rejected';
  } catch (error) {
    alert('시간외 반려에 실패했습니다: ' + (error.message || error));
    return;
  }

  alert('시간외 근무 신청이 반려 처리되었습니다.');
  renderAdminDashboard();
  renderRoster();
};

// Revert/Cancel Approval handler
window.cancelApproval = async function(requestId, type) {
  if (!currentUser || !isUserAdmin()) return;
  const confirmMessage = type === 'leave'
    ? '승인된 연가를 취소하고 신청 내역도 완전히 삭제하시겠습니까? 잔여 연가는 자동으로 복원됩니다.'
    : '이 신청 건의 결재 처리를 취소하고 다시 대기 상태로 되돌리시겠습니까?';
  if (!confirm(confirmMessage)) return;

  if (type === 'leave') {
    const req = leaveRequests.find(r => r.id === requestId);
    if (req) {
      try {
        await deleteRequestAsManager('leave_requests', requestId);
        leaveRequests = leaveRequests.filter(r => r.id !== requestId);
        recalculateEmployeeLeaveCounts();
        const emp = employees.find(e => e.id === req.employeeId);
        if (emp) await saveEmployeeLeaveCounts(emp);
      } catch (error) {
        alert('결재 취소에 실패했습니다: ' + (error.message || error));
        return;
      }
      alert('연가 승인이 취소되었고 신청 내역도 삭제되었습니다.');
    }
  } else {
    const req = overtimeRequests.find(r => r.id === requestId);
    if (req) {
      try {
        await updateRequestStatus('overtime_requests', requestId, 'pending');
        req.status = 'pending';
      } catch (error) {
        alert('결재 취소에 실패했습니다: ' + (error.message || error));
        return;
      }
      alert('시간외 결재 처리가 취소되어 대기 상태로 변경되었습니다.');
    }
  }

  renderAdminDashboard();
  renderRoster();
  if (currentUser && currentUser.role === 'staff') {
    renderMyPage();
  }
};

window.deleteRejectedLeave = async function(requestId) {
  if (!currentUser || !isUserAdmin()) return;
  if (!confirm('이 반려 내역을 완전히 삭제하시겠습니까?')) return;
  const req = leaveRequests.find(r => r.id === requestId);
  if (!req) return;
  try {
    await deleteRequestAsManager('leave_requests', requestId);
    leaveRequests = leaveRequests.filter(r => r.id !== requestId);
    recalculateEmployeeLeaveCounts();
    const emp = employees.find(e => e.id === req.employeeId);
    if (emp) await saveEmployeeLeaveCounts(emp);
  } catch (error) {
    alert('반려 내역을 삭제하지 못했습니다: ' + (error.message || error));
    return;
  }
  renderAdminDashboard();
  renderRoster();
  alert('반려 내역이 완전히 삭제되었습니다.');
};

// Revert/Cancel My own Request handler (for regular staff)
window.cancelMyRequest = async function(requestId, type) {
  if (!currentUser) return;
  if (!confirm('이 신청 내역을 취소/철회하시겠습니까?')) return;

  try {
    await deleteOwnRequest(type === 'leave' ? 'leave_requests' : 'overtime_requests', requestId);
  } catch (error) {
    alert('신청을 취소하지 못했습니다: ' + (error.message || error));
    return;
  }

  if (type === 'leave') {
    leaveRequests = leaveRequests.filter(r => r.id !== requestId);
    recalculateEmployeeLeaveCounts();
  } else {
    overtimeRequests = overtimeRequests.filter(r => r.id !== requestId);
  }

  renderMyPage();
  renderRoster();
  alert('신청이 취소되었습니다.');
};

// Direct cancellation via calendar date click modal
window.cancelMyRequestDirectly = async function(requestId, type) {
  if (!confirm('정말로 이 대기 중인 신청을 취소하시겠습니까?')) return;
  
  try {
    await deleteOwnRequest(type === 'leave' ? 'leave_requests' : 'overtime_requests', requestId);
  } catch (error) {
    alert('신청을 취소하지 못했습니다: ' + (error.message || error));
    return;
  }

  if (type === 'leave') {
    leaveRequests = leaveRequests.filter(r => r.id !== requestId);
    recalculateEmployeeLeaveCounts();
  } else {
    overtimeRequests = overtimeRequests.filter(r => r.id !== requestId);
  }
  
  // Close staff request modal
  document.getElementById('staff-request-overlay').classList.remove('active');
  
  renderMyPage();
  renderRoster();
  alert('대기 중인 신청이 성공적으로 취소되었습니다.');
};

// Helper: Escape HTML strings to prevent XSS
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Synchronize date selectors and render all pages/dashboards
function syncDateAndRender() {
  const selectYear = document.getElementById('select-year');
  const selectMonth = document.getElementById('select-month');
  const adminSelectYear = document.getElementById('admin-select-year');
  const adminSelectMonth = document.getElementById('admin-select-month');

  if (selectYear) selectYear.value = currentYear;
  if (selectMonth) selectMonth.value = currentMonth;
  if (adminSelectYear) adminSelectYear.value = currentYear;
  if (adminSelectMonth) adminSelectMonth.value = currentMonth;

  renderRoster();
  
  if (currentUser) {
    if (currentUser.role === 'staff') {
      renderMyPage();
    }
    if (isUserAdmin()) {
      renderAdminDashboard();
    }
  }
}
window.syncDateAndRender = syncDateAndRender;

// Initialize Year and Month dropdown selectors and sync their states
function initYearMonthDropdowns() {
  const years = [2024, 2025, 2026, 2027, 2028, 2029, 2030];
  const months = Array.from({ length: 12 }, (_, i) => i); // 0 to 11

  const selectYear = document.getElementById('select-year');
  const selectMonth = document.getElementById('select-month');
  const adminSelectYear = document.getElementById('admin-select-year');
  const adminSelectMonth = document.getElementById('admin-select-month');

  if (selectYear) {
    selectYear.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
    selectYear.value = currentYear;
  }
  if (selectMonth) {
    selectMonth.innerHTML = months.map(m => `<option value="${m}">${m + 1}</option>`).join('');
    selectMonth.value = currentMonth;
  }
  if (adminSelectYear) {
    adminSelectYear.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
    adminSelectYear.value = currentYear;
  }
  if (adminSelectMonth) {
    adminSelectMonth.innerHTML = months.map(m => `<option value="${m}">${m + 1}</option>`).join('');
    adminSelectMonth.value = currentMonth;
  }

  // Bind change events
  const onDateChange = (e) => {
    const isYear = e.target.id.includes('year');
    const val = parseInt(e.target.value);
    if (isYear) {
      currentYear = val;
    } else {
      currentMonth = val;
    }
    syncDateAndRender();
  };

  if (selectYear) selectYear.addEventListener('change', onDateChange);
  if (selectMonth) selectMonth.addEventListener('change', onDateChange);
  if (adminSelectYear) adminSelectYear.addEventListener('change', onDateChange);
  if (adminSelectMonth) adminSelectMonth.addEventListener('change', onDateChange);
}

// Capture A4 Landscape print table layout as a high-resolution PNG image
window.saveRosterAsImage = function() {
  populateMasterPrintTable();
  
  const container = document.getElementById('master-print-layout');
  if (!container) {
    alert('인쇄 양식을 찾을 수 없습니다.');
    return;
  }
  
  // Temporarily force display block and remove print-only class to render it for html2canvas
  const originalDisplay = container.style.display;
  const originalPosition = container.style.position;
  const originalLeft = container.style.left;
  const originalTop = container.style.top;
  const originalBg = container.style.backgroundColor;
  const originalVisibility = container.style.visibility;
  const originalWidth = container.style.width;
  const originalPadding = container.style.padding;
  
  container.classList.remove('print-only'); // Remove class to ignore display:none !important rule
  container.style.display = 'block';
  container.style.position = 'absolute';
  container.style.left = '-9999px'; // Render off-screen
  container.style.top = '-9999px';
  container.style.width = '1122px'; // Force standard A4 landscape width to fit on one page
  container.style.padding = '0.6cm'; // Keep standard print padding margins
  container.style.visibility = 'visible';
  container.style.backgroundColor = '#ffffff'; // White background
  
  // Use html2canvas after a short delay to allow browser repaint/reflow
  setTimeout(() => {
    html2canvas(container, {
      scale: 2, // High resolution scale
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    }).then(canvas => {
      // Restore styling
      container.style.display = originalDisplay;
      container.style.position = originalPosition;
      container.style.left = originalLeft;
      container.style.top = originalTop;
      container.style.backgroundColor = originalBg;
      container.style.visibility = originalVisibility;
      container.style.width = originalWidth;
      container.style.padding = originalPadding;
      container.classList.add('print-only'); // Restore class
      
      // Download PNG securely by appending temporary link to DOM
      const link = document.createElement('a');
      link.download = `근무계획_${currentYear}년_${currentMonth + 1}월.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert('이미지 저장이 완료되었습니다.');
    }).catch(err => {
      // Restore styling in case of error
      container.style.display = originalDisplay;
      container.style.position = originalPosition;
      container.style.left = originalLeft;
      container.style.top = originalTop;
      container.style.backgroundColor = originalBg;
      container.style.visibility = originalVisibility;
      container.style.width = originalWidth;
      container.style.padding = originalPadding;
      container.classList.add('print-only'); // Restore class
      console.error(err);
      alert('이미지 저장 중 오류가 발생했습니다: ' + err.message);
    });
  }, 100);
};

// Safari-safe printing: render the completed roster to one fixed image first,
// then print that image from a dedicated A4 landscape preview window.
window.printSafariRoster = function() {
  populateMasterPrintTable();

  const container = document.getElementById('master-print-layout');
  if (!container) {
    alert('인쇄 양식을 찾을 수 없습니다.');
    return;
  }

  const previewWindow = window.open('', '_blank');
  if (!previewWindow) {
    alert('Safari에서 팝업이 차단되었습니다. 주소창의 팝업 허용을 누른 뒤 다시 시도해 주세요.');
    return;
  }

  previewWindow.document.write(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>Safari 출력 준비 중</title></head><body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:2rem;text-align:center;"><p>근무표 출력 화면을 준비하고 있습니다...</p></body></html>`);
  previewWindow.document.close();

  const original = {
    display: container.style.display,
    position: container.style.position,
    left: container.style.left,
    top: container.style.top,
    backgroundColor: container.style.backgroundColor,
    visibility: container.style.visibility,
    width: container.style.width,
    padding: container.style.padding
  };

  const restoreContainer = () => {
    container.style.display = original.display;
    container.style.position = original.position;
    container.style.left = original.left;
    container.style.top = original.top;
    container.style.backgroundColor = original.backgroundColor;
    container.style.visibility = original.visibility;
    container.style.width = original.width;
    container.style.padding = original.padding;
    container.classList.add('print-only');
  };

  container.classList.remove('print-only');
  container.style.display = 'block';
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '1122px';
  container.style.padding = '0.6cm';
  container.style.visibility = 'visible';
  container.style.backgroundColor = '#ffffff';

  setTimeout(() => {
    html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    }).then((canvas) => {
      restoreContainer();

      const imageData = canvas.toDataURL('image/png');
      const title = `${currentYear}년 ${currentMonth + 1}월 근무표`;
      previewWindow.document.open();
      previewWindow.document.write(`<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    @page { size: A4 landscape; margin: 5mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #eef2f7; }
    .toolbar { position: sticky; top: 0; z-index: 2; display: flex; justify-content: center; gap: 0.75rem; padding: 0.8rem; background: rgba(255,255,255,0.96); border-bottom: 1px solid #dbe2ea; }
    button { border: 0; border-radius: 0.55rem; padding: 0.7rem 1.1rem; font: 600 0.95rem -apple-system,BlinkMacSystemFont,sans-serif; cursor: pointer; }
    .print-button { background: #4f46e5; color: #fff; }
    .close-button { background: #e5e7eb; color: #111827; }
    .sheet { width: min(287mm, calc(100vw - 2rem)); margin: 1rem auto; background: #fff; box-shadow: 0 8px 30px rgba(15,23,42,0.16); }
    .sheet img { display: block; width: 100%; height: auto; }
    @media print {
      html, body { width: 100%; background: #fff; }
      .toolbar { display: none !important; }
      .sheet { width: 287mm; margin: 0; box-shadow: none; break-inside: avoid; page-break-inside: avoid; }
      .sheet img { width: 287mm; height: 200mm; object-fit: contain; object-position: top left; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button class="print-button" onclick="window.print()">🖨️ 인쇄하기 / PDF 저장</button>
    <button class="close-button" onclick="window.close()">닫기</button>
  </div>
  <main class="sheet"><img src="${imageData}" alt="${title}"></main>
</body>
</html>`);
      previewWindow.document.close();
    }).catch((error) => {
      restoreContainer();
      previewWindow.close();
      console.error(error);
      alert('Safari용 출력 화면을 만들지 못했습니다: ' + error.message);
    });
  }, 100);
};

// Staff Request Edit Flow implementation
function editMyRequest(id, type) {
  editingRequestId = id;
  editingRequestType = type;

  if (type === 'leave') {
    const req = leaveRequests.find(r => r.id === id);
    if (!req) return;
    
    if (req.leaveType === '연가') {
      // Switch tab to 연가
      const tab = document.getElementById('tab-staff-leave');
      if (tab) tab.click();
      const input = document.getElementById('staff-leave-reason');
      if (input) input.value = req.reason;
      
      const submitBtn = document.querySelector('#staff-leave-form button[type="submit"]');
      if (submitBtn) submitBtn.textContent = '연가 수정 완료';
    } else {
      // Switch tab to 공가
      const tab = document.getElementById('tab-staff-official-leave');
      if (tab) tab.click();
      const input = document.getElementById('staff-official-leave-reason');
      if (input) input.value = req.reason;
      
      const submitBtn = document.querySelector('#staff-official-leave-form button[type="submit"]');
      if (submitBtn) submitBtn.textContent = '공가 수정 완료';
    }
  } else if (type === 'overtime') {
    const req = overtimeRequests.find(r => r.id === id);
    if (!req) return;
    
    // Switch tab to 시간외
    const tab = document.getElementById('tab-staff-ot');
    if (tab) tab.click();
    const timeSel = document.getElementById('staff-ot-time-of-day');
    if (timeSel) timeSel.value = req.timeOfDay;
    const hourSel = document.getElementById('staff-ot-hours');
    if (hourSel) hourSel.value = req.hours;
    const input = document.getElementById('staff-ot-reason');
    if (input) input.value = req.reason;
    
    const submitBtn = document.querySelector('#staff-ot-form button[type="submit"]');
    if (submitBtn) submitBtn.textContent = '시간외 수정 완료';
  }
}
window.editMyRequest = editMyRequest;

// Update global notice banner visibility and text
function updateNoticeBanner() {
  const banner = document.getElementById('global-notice-banner');
  const textEl = document.getElementById('global-notice-text');
  if (banner && textEl) {
    if (globalNotices && globalNotices.length > 0) {
      // Render as a single line separated list
      textEl.innerHTML = globalNotices.map((n, idx) => `${idx + 1}. ${escapeHtml(n)}`).join(' | ');
      banner.style.display = 'flex';
    } else {
      banner.style.display = 'none';
      textEl.innerHTML = '';
    }
  }
  
  // Update the list of notices in the admin panel
  renderAdminNoticeList();
}

// Render list of notices in admin section with delete buttons
function renderAdminNoticeList() {
  const listEl = document.getElementById('admin-notice-list');
  if (!listEl) return;
  
  listEl.innerHTML = '';
  if (globalNotices.length === 0) {
    listEl.innerHTML = '<li style="color: var(--text-muted); padding: 0.5rem 0;">등록된 공지사항이 없습니다.</li>';
    return;
  }
  
  globalNotices.forEach((notice, idx) => {
    const li = document.createElement('li');
    li.style.display = 'flex';
    li.style.alignItems = 'center';
    li.style.justifyContent = 'space-between';
    li.style.gap = '1rem';
    li.style.marginBottom = '0.5rem';
    li.style.padding = '0.5rem';
    li.style.backgroundColor = 'var(--bg-color)';
    li.style.borderRadius = '0.375rem';
    li.style.border = '1px solid var(--border-color)';
    
    li.innerHTML = `
      <span style="flex: 1; word-break: break-all; font-size: 0.85rem; line-height: 1.4;">${idx + 1}. ${escapeHtml(notice)}</span>
      <button class="btn btn-secondary btn-sm" onclick="deleteNotice(${idx})" style="padding: 0.25rem 0.5rem; font-size: 0.725rem; font-weight: bold; background-color: #ef4444; border-color: #ef4444; color: #fff; cursor: pointer;" type="button">삭제</button>
    `;
    listEl.appendChild(li);
  });
}

// Admin action to add notice (Limit to 5)
window.addNotice = function() {
  if (!isUserAdmin()) return;
  const input = document.getElementById('admin-notice-input');
  if (!input) return;
  
  const val = input.value.trim();
  if (val === '') {
    alert('공지 내용을 입력해 주세요.');
    return;
  }
  
  if (globalNotices.length >= 5) {
    alert('공지사항은 최대 5개까지만 등록할 수 있습니다. 기존 공지를 삭제하고 추가해 주세요.');
    return;
  }
  
  globalNotices.push(val);
  input.value = '';
  saveState();
  alert('공지사항이 추가되었습니다.');
};

// Admin action to delete notice
window.deleteNotice = function(index) {
  if (!isUserAdmin()) return;
  globalNotices.splice(index, 1);
  saveState();
  alert('공지사항이 삭제되었습니다.');
};

// Determine shift display badge class and single-character label (supporting full-day & partial 대휴)
function getShiftBadgeAndLabel(shift) {
  let badgeClass = 'badge-off';
  let displayLabel = '휴';
  
  if (shift === '주간') {
    badgeClass = 'badge-day';
    displayLabel = '주';
  } else if (shift === '당직') {
    badgeClass = 'badge-duty';
    displayLabel = '당';
  } else if (shift === '야간') {
    badgeClass = 'badge-night';
    displayLabel = '야';
  } else if (shift === '연가') {
    badgeClass = 'badge-leave';
    displayLabel = '연';
  } else if (shift === '연가(대기)') {
    badgeClass = 'badge-pending-leave';
    displayLabel = '대';
  } else if (shift === '보상휴가') {
    badgeClass = 'badge-leave';
    displayLabel = '보상';
  } else if (shift === '공가') {
    badgeClass = 'badge-official-leave';
    displayLabel = '공';
  } else if (shift === '공가(대기)') {
    badgeClass = 'badge-pending-leave';
    displayLabel = '공';
  } else if (shift && shift.startsWith('보상휴가 (')) {
    badgeClass = 'badge-day';
    displayLabel = '주';
  }
  
  return { badgeClass, displayLabel };
}

// Export all localStorage shift database keys to a downloadable JSON file
window.exportData = function() {
  const data = {
    employees: employees,
    leaveRequests: leaveRequests,
    overtimeRequests: overtimeRequests,
    shiftModifications: shiftModifications,
    globalNotices: globalNotices
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `사하의집_근무데이터_백업_${new Date().toISOString().split('T')[0]}.json`;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  alert('데이터 백업 파일이 다운로드되었습니다.');
};

// Trigger hidden file input click
window.triggerImport = function() {
  const input = document.getElementById('import-data-file');
  if (input) input.click();
};

// Import database from uploaded JSON file and reload page
window.importData = function(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (data.employees && data.leaveRequests && data.overtimeRequests && data.shiftModifications) {
        employees = data.employees;
        leaveRequests = data.leaveRequests;
        overtimeRequests = data.overtimeRequests;
        shiftModifications = data.shiftModifications;
        if (data.globalNotices) {
          globalNotices = data.globalNotices;
        }
        
        saveState();
        alert('데이터 복원이 성공적으로 완료되었습니다! 변경 사항이 근무표에 적용됩니다.');
        syncDateAndRender();
      } else {
        alert('올바른 백업 파일 형식이 아닙니다. 파일 내용을 확인해 주세요.');
      }
    } catch (err) {
      alert('파일을 읽는 도중 오류가 발생했습니다: ' + err.message);
    }
  };
  reader.readAsText(file);
  event.target.value = ''; // Reset input selection
};

// Render select options for special leave page
function renderSpecialLeaveEmployeeSelect() {
  const select = document.getElementById('special-leave-emp');
  if (!select) return;
  
  select.innerHTML = '';
  // Target all employees except mgr_admin
  const targetList = employees.filter(emp => emp.id !== 'mgr_admin');
  targetList.forEach(emp => {
    const opt = document.createElement('option');
    opt.value = emp.id;
    const roleLabel = emp.role === 'manager' ? '팀장' : (emp.hall === 'girincho' ? '기린초' : '물봉선');
    opt.textContent = `${emp.name} (${roleLabel})`;
    select.appendChild(opt);
  });
}

// Render the list of registered special leaves (Sick / Sabbatical)
function renderSpecialLeaveList() {
  const tbody = document.getElementById('special-leave-list-tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  // Filter special leaves (병가, 안식년)
  const list = leaveRequests.filter(req => req && (req.leaveType === '병가' || req.leaveType === '안식년'));
  
  // Group by groupId
  const groups = {};
  list.forEach(req => {
    const gid = req.groupId || req.id; // Fallback if no groupId (legacy data)
    if (!groups[gid]) {
      groups[gid] = {
        id: gid,
        employeeName: req.employeeName,
        leaveType: req.leaveType,
        dates: []
      };
    }
    groups[gid].dates.push(req.date);
  });
  
  const groupList = Object.values(groups).map(g => {
    g.dates.sort(); // Sort dates chronologically
    return {
      id: g.id,
      employeeName: g.employeeName,
      leaveType: g.leaveType,
      startDate: g.dates[0],
      endDate: g.dates[g.dates.length - 1],
      dateCount: g.dates.length
    };
  });
  
  // Sort by startDate descending (recent first)
  groupList.sort((a, b) => b.startDate.localeCompare(a.startDate));
  
  if (groupList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="padding: 0.75rem; text-align: center; color: var(--text-muted);">등록된 특수 휴가(병가/안식년) 내역이 없습니다.</td></tr>`;
    return;
  }
  
  groupList.forEach(group => {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--border-color)';
    
    const isSick = group.leaveType === '병가';
    const badgeHtml = isSick 
      ? `<span class="badge badge-sick" style="width: auto; height: auto; border-radius: 4px; padding: 2px 6px; font-size: 0.75rem;">🏥 병가</span>`
      : `<span class="badge badge-sabbatical" style="width: auto; height: auto; border-radius: 4px; padding: 2px 6px; font-size: 0.75rem;">✈️ 안식년</span>`;
      
    const dateRangeText = group.startDate === group.endDate 
      ? group.startDate 
      : `${group.startDate} ~ ${group.endDate} (${group.dateCount}일간)`;
      
    tr.innerHTML = `
      <td style="padding: 0.5rem 0.75rem; font-weight: 500;">${group.employeeName}</td>
      <td style="padding: 0.5rem 0.75rem;">${badgeHtml}</td>
      <td style="padding: 0.5rem 0.75rem; color: var(--text-main); font-family: monospace;">${dateRangeText}</td>
      <td style="padding: 0.5rem 0.75rem; text-align: right; padding-right: 1.5rem;">
        <button class="btn btn-secondary btn-sm" onclick="deleteSpecialLeave('${group.id}')" style="background-color: #ef4444; border-color: #ef4444; color: #fff; padding: 2px 8px; font-size: 0.725rem; font-weight: bold; cursor: pointer;" type="button">삭제</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Generate array of YYYY-MM-DD date strings within range
function getDatesInRange(startStr, endStr) {
  const dates = [];
  const start = new Date(startStr);
  const end = new Date(endStr);
  
  // Safety threshold to avoid infinite loop
  let limit = 1000; 
  while (start <= end && limit > 0) {
    const y = start.getFullYear();
    const m = start.getMonth();
    const d = start.getDate();
    dates.push(formatDateString(y, m, d));
    start.setDate(start.getDate() + 1);
    limit--;
  }
  return dates;
}

// Add special leave action
window.addSpecialLeave = function() {
  if (!isUserAdmin()) return;
  
  const empId = document.getElementById('special-leave-emp').value;
  const typeVal = document.getElementById('special-leave-type').value;
  const startVal = document.getElementById('special-leave-start').value;
  const endVal = document.getElementById('special-leave-end').value;
  
  if (!empId) {
    alert('대상 직원을 선택해 주세요.');
    return;
  }
  if (!startVal || !endVal) {
    alert('시작일과 종료일을 입력해 주세요.');
    return;
  }
  if (startVal > endVal) {
    alert('시작일은 종료일보다 이전 날짜여야 합니다.');
    return;
  }
  
  const employee = employees.find(emp => emp.id === empId);
  if (!employee) return;
  
  const dates = getDatesInRange(startVal, endVal);
  if (dates.length === 0) return;
  
  // Confirm action
  if (!confirm(`${employee.name} 선생님의 ${startVal} ~ ${endVal} (${dates.length}일간) 기간에 대해 [${typeVal}]을 등록하시겠습니까?`)) {
    return;
  }
  
  // Generate a group ID for this block of leaves
  const groupId = `group_sl_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  
  // Add leaves for each day (overwrite existing leaves for those days)
  dates.forEach(dStr => {
    // Remove existing leave requests for this employee on this date
    leaveRequests = leaveRequests.filter(req => !(req.employeeId === empId && req.date === dStr));
    
    const newReq = {
      id: `sl_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      groupId: groupId,
      employeeId: empId,
      employeeName: employee.name,
      hall: employee.hall,
      date: dStr,
      leaveType: typeVal,
      reason: `${typeVal} 설정`,
      status: 'approved'
    };
    leaveRequests.push(newReq);
  });
  
  saveState();
  renderRoster();
  renderSpecialLeaveList();
  
  // Reset date fields
  document.getElementById('special-leave-start').value = '';
  document.getElementById('special-leave-end').value = '';
  alert(`${employee.name} 선생님의 [${typeVal}] 등록이 완료되었습니다.`);
};

// Delete special leave action
window.deleteSpecialLeave = function(groupId) {
  if (!isUserAdmin()) return;
  
  const sample = leaveRequests.find(r => r.groupId === groupId || r.id === groupId);
  if (!sample) return;
  
  if (!confirm(`${sample.employeeName} 선생님의 등록된 특별 휴가(병가/안식년) 기간을 일괄 삭제(취소)하시겠습니까?`)) {
    return;
  }
  
  leaveRequests = leaveRequests.filter(r => r.groupId !== groupId && r.id !== groupId);
  saveState();
  renderRoster();
  renderSpecialLeaveList();
  alert('삭제되었습니다.');
};
