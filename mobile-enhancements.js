// Mobile-only calendar navigation and request-calendar enhancements.
(function () {
  let selectedPersonalDate = '';
  let personalScheduleSyncPromise = null;

  function personalScheduleStorageKey() {
    return currentUser ? `saha_personal_schedules_${currentUser.id}` : '';
  }

  function personalScheduleDeletedStorageKey() {
    return currentUser ? `saha_personal_schedule_deleted_${currentUser.id}` : '';
  }

  function createPersonalScheduleId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
      const random = Math.floor(Math.random() * 16);
      return (character === 'x' ? random : ((random & 3) | 8)).toString(16);
    });
  }

  function readPersonalSchedules() {
    const key = personalScheduleStorageKey();
    if (!key) return {};
    try {
      const saved = JSON.parse(localStorage.getItem(key) || '{}');
      if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {};
      let migrated = false;
      const normalized = {};
      Object.entries(saved).forEach(([dateStr, rawItems]) => {
        const items = Array.isArray(rawItems) ? rawItems : [rawItems];
        normalized[dateStr] = items.map((item) => {
          if (item && typeof item === 'object' && item.id && item.content) {
            return { id: String(item.id), content: String(item.content).trim(), synced: item.synced === true };
          }
          migrated = true;
          return { id: createPersonalScheduleId(), content: String(item || '').trim(), synced: false };
        }).filter((item) => item.content);
      });
      if (migrated) localStorage.setItem(key, JSON.stringify(normalized));
      return normalized;
    } catch (error) {
      console.warn('개인 일정 데이터를 읽지 못했습니다.', error);
      return {};
    }
  }

  function writePersonalSchedules(schedules) {
    const key = personalScheduleStorageKey();
    if (key) localStorage.setItem(key, JSON.stringify(schedules));
  }

  function readDeletedPersonalScheduleIds() {
    const key = personalScheduleDeletedStorageKey();
    if (!key) return [];
    try {
      const saved = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(saved) ? saved.map(String) : [];
    } catch (error) {
      return [];
    }
  }

  function writeDeletedPersonalScheduleIds(ids) {
    const key = personalScheduleDeletedStorageKey();
    if (key) localStorage.setItem(key, JSON.stringify([...new Set(ids)]));
  }

  function setPersonalScheduleSyncStatus(message) {
    const status = document.getElementById('personal-schedule-sync-status');
    if (status) status.textContent = message;
  }

  function getPersonalScheduleItems(dateStr) {
    return readPersonalSchedules()[dateStr] || [];
  }

  function hasPersonalSchedule(dateStr) {
    return getPersonalScheduleItems(dateStr).length > 0;
  }

  function getPersonalSchedule(dateStr) {
    return getPersonalScheduleItems(dateStr).map((item) => item.content).join(' · ');
  }

  function renderPersonalScheduleList() {
    const list = document.getElementById('personal-schedule-list');
    if (!list) return;
    const items = getPersonalScheduleItems(selectedPersonalDate);
    list.replaceChildren();

    if (!items.length) {
      const empty = document.createElement('p');
      empty.className = 'personal-schedule-list-empty';
      empty.textContent = '아직 저장된 일정이 없어요.';
      list.appendChild(empty);
      return;
    }

    items.forEach((schedule, index) => {
      const item = document.createElement('div');
      item.className = 'personal-schedule-list-item';
      const content = document.createElement('span');
      content.textContent = schedule.content;
      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'personal-schedule-item-delete';
      deleteButton.textContent = '삭제';
      deleteButton.setAttribute('aria-label', `${schedule.content} 일정 삭제`);
      deleteButton.addEventListener('click', () => deletePersonalScheduleItem(index));
      item.append(content, deleteButton);
      list.appendChild(item);
    });
  }

  function selectPersonalCalendarDate(dateStr, shift) {
    selectedPersonalDate = dateStr;
    const label = document.getElementById('personal-schedule-date-label');
    const shiftLabel = document.getElementById('personal-schedule-shift-label');
    const textarea = document.getElementById('personal-schedule-text');
    const saveButton = document.getElementById('personal-schedule-save');
    const overlay = document.getElementById('personal-schedule-overlay');
    const parts = dateStr.split('-').map(Number);

    document.querySelectorAll('.personal-calendar-day').forEach((cell) => {
      cell.classList.toggle('is-selected', cell.dataset.date === dateStr);
    });
    if (label) label.textContent = `${parts[1]}월 ${parts[2]}일 일정`;
    if (shiftLabel) shiftLabel.textContent = `내 근무: ${shift || '-'}`;
    if (textarea) {
      textarea.disabled = false;
      textarea.value = '';
    }
    if (saveButton) saveButton.disabled = false;
    renderPersonalScheduleList();
    if (overlay) overlay.classList.add('active');
  }

  function closePersonalScheduleDialog() {
    const overlay = document.getElementById('personal-schedule-overlay');
    if (overlay) overlay.classList.remove('active');
  }

  async function saveSelectedPersonalSchedule() {
    if (!selectedPersonalDate) return;
    const textarea = document.getElementById('personal-schedule-text');
    const text = String(textarea ? textarea.value : '').trim();
    const schedules = readPersonalSchedules();
    if (!text) {
      if (textarea) textarea.focus();
      return;
    }
    schedules[selectedPersonalDate] = [...getPersonalScheduleItems(selectedPersonalDate), {
      id: createPersonalScheduleId(),
      content: text,
      synced: false
    }];
    writePersonalSchedules(schedules);
    renderMyCalendar();
    if (textarea) textarea.value = '';
    renderPersonalScheduleList();
    if (textarea) textarea.focus();
    await syncPersonalSchedules();
  }

  async function deletePersonalScheduleItem(index) {
    if (!selectedPersonalDate) return;
    const schedules = readPersonalSchedules();
    const items = getPersonalScheduleItems(selectedPersonalDate);
    const [removed] = items.splice(index, 1);
    if (removed && removed.synced) {
      writeDeletedPersonalScheduleIds([...readDeletedPersonalScheduleIds(), removed.id]);
    }
    if (items.length) schedules[selectedPersonalDate] = items;
    else delete schedules[selectedPersonalDate];
    writePersonalSchedules(schedules);
    renderMyCalendar();
    renderPersonalScheduleList();
    await syncPersonalSchedules();
  }

  async function syncPersonalSchedules() {
    if (personalScheduleSyncPromise) return personalScheduleSyncPromise;
    if (!currentUser || !currentUser.authUserId || typeof window.getDB !== 'function' || (typeof isPreviewMode !== 'undefined' && isPreviewMode)) {
      setPersonalScheduleSyncStatus('이 기기에 안전하게 저장돼요.');
      return false;
    }

    personalScheduleSyncPromise = (async () => {
      setPersonalScheduleSyncStatus('계정과 동기화하는 중이에요.');
      try {
        const db = window.getDB();
        const deletedIds = readDeletedPersonalScheduleIds();
        if (deletedIds.length) {
          const { error: deleteError } = await db.from('personal_schedules').delete().in('id', deletedIds);
          if (deleteError) throw deleteError;
        }

        const { data: existingRows, error: fetchError } = await db
          .from('personal_schedules')
          .select('id,schedule_date,content,created_at')
          .order('created_at', { ascending: true });
        if (fetchError) throw fetchError;

        const localSchedules = readPersonalSchedules();
        const pendingRows = [];
        Object.entries(localSchedules).forEach(([dateStr, items]) => {
          items.filter((item) => !item.synced).forEach((item) => {
            const duplicate = (existingRows || []).some((row) => row.schedule_date === dateStr && row.content === item.content);
            if (!duplicate) {
              pendingRows.push({
                id: item.id,
                employee_id: currentUser.id,
                schedule_date: dateStr,
                content: item.content
              });
            }
          });
        });

        if (pendingRows.length) {
          const { error: insertError } = await db.from('personal_schedules').insert(pendingRows);
          if (insertError) throw insertError;
        }

        const { data: syncedRows, error: reloadError } = await db
          .from('personal_schedules')
          .select('id,schedule_date,content,created_at')
          .order('created_at', { ascending: true });
        if (reloadError) throw reloadError;

        const syncedSchedules = {};
        (syncedRows || []).forEach((row) => {
          if (!syncedSchedules[row.schedule_date]) syncedSchedules[row.schedule_date] = [];
          syncedSchedules[row.schedule_date].push({ id: row.id, content: row.content, synced: true });
        });
        writePersonalSchedules(syncedSchedules);
        writeDeletedPersonalScheduleIds([]);
        setPersonalScheduleSyncStatus('아이폰과 안드로이드에서 함께 보여요.');
        renderMyCalendar();
        if (selectedPersonalDate) renderPersonalScheduleList();
        return true;
      } catch (error) {
        console.warn('개인 일정 계정 동기화를 완료하지 못했습니다.', error);
        setPersonalScheduleSyncStatus('연결되면 자동 동기화돼요.');
        return false;
      } finally {
        personalScheduleSyncPromise = null;
      }
    })();
    return personalScheduleSyncPromise;
  }

  window.hasPersonalSchedule = hasPersonalSchedule;
  window.getPersonalSchedule = getPersonalSchedule;
  window.selectPersonalCalendarDate = selectPersonalCalendarDate;
  window.syncPersonalSchedules = syncPersonalSchedules;

  function renderMobileRequestCalendar() {
    const container = document.getElementById('mobile-request-calendar');
    const label = document.getElementById('mobile-request-calendar-label');
    if (!container || !label || !currentUser) return;

    const employee = employees.find((item) => item.id === currentUser.id);
    if (!employee) return;

    const year = currentYear;
    const month = currentMonth;
    const dateInput = document.getElementById('mobile-request-date');
    const selectedDate = dateInput ? dateInput.value : '';
    label.textContent = `${year}년 ${month + 1}월 내 근무`;
    container.innerHTML = '';

    ['일', '월', '화', '수', '목', '금', '토'].forEach((day, index) => {
      const header = document.createElement('div');
      header.className = 'mini-cal-header';
      header.textContent = day;
      if (index === 0) header.classList.add('sunday');
      if (index === 6) header.classList.add('saturday');
      container.appendChild(header);
    });

    const startDayOfWeek = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const previousMonthDays = new Date(year, month, 0).getDate();

    for (let index = startDayOfWeek - 1; index >= 0; index--) {
      const dayCell = document.createElement('div');
      dayCell.className = 'mini-cal-day other-month';
      dayCell.textContent = previousMonthDays - index;
      container.appendChild(dayCell);
    }

    for (let day = 1; day <= totalDays; day++) {
      const dateStr = formatDateString(year, month, day);
      const date = new Date(year, month, day);
      const shift = calculateShift(employee, dateStr);
      const holidayName = getHolidayName(year, month, day);
      const { badgeClass, displayLabel } = getShiftBadgeAndLabel(shift);
      const dayCell = document.createElement('button');
      dayCell.type = 'button';
      dayCell.className = 'mini-cal-day mobile-request-calendar-day';
      if (date.getDay() === 0) dayCell.classList.add('sunday');
      if (date.getDay() === 6) dayCell.classList.add('saturday');
      if (holidayName) dayCell.classList.add('holiday');
      if (dateStr === selectedDate) dayCell.classList.add('is-selected');
      dayCell.setAttribute('aria-label', `${month + 1}월 ${day}일, ${holidayName ? `${holidayName}, ` : ''}${shift}`);
      dayCell.innerHTML = `<span class="mini-cal-day-num">${day}</span><span class="badge ${badgeClass}">${displayLabel}</span>${holidayName ? `<small class="mini-cal-holiday-name" title="${escapeHtml(holidayName)}">${escapeHtml(holidayName)}</small>` : ''}`;
      dayCell.addEventListener('click', () => {
        if (dateInput) dateInput.value = dateStr;
        container.querySelectorAll('.mobile-request-calendar-day').forEach((cell) => cell.classList.remove('is-selected'));
        dayCell.classList.add('is-selected');
        openStaffRequestModal(employee, dateStr, shift);
      });
      container.appendChild(dayCell);
    }

    const renderedDayCells = startDayOfWeek + totalDays;
    for (let day = 1; day <= Math.max(0, 42 - renderedDayCells); day++) {
      const dayCell = document.createElement('div');
      dayCell.className = 'mini-cal-day other-month';
      dayCell.textContent = day;
      container.appendChild(dayCell);
    }
  }

  function changeMobileMonth(delta) {
    currentMonth += delta;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    } else if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    syncDateAndRender();
    renderMobileRequestCalendar();
  }

  function initializeRosterMonthSwipe() {
    let gesture = null;
    let lastChangeAt = 0;

    document.addEventListener('touchstart', (event) => {
      const container = event.target.closest('.mobile-roster-table-container');
      if (!container || event.touches.length !== 1) {
        gesture = null;
        return;
      }

      const touch = event.touches[0];
      gesture = {
        container,
        startX: touch.clientX,
        startY: touch.clientY,
        atTop: container.scrollTop <= 2,
        atBottom: container.scrollHeight - container.clientHeight - container.scrollTop <= 2
      };
    }, { passive: true });

    document.addEventListener('touchend', (event) => {
      if (!gesture || event.changedTouches.length !== 1) return;

      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - gesture.startX;
      const deltaY = touch.clientY - gesture.startY;
      const now = Date.now();
      let monthDelta = 0;

      if (Math.abs(deltaY) >= 75 && Math.abs(deltaY) > Math.abs(deltaX) * 1.25 && now - lastChangeAt > 700) {
        if (gesture.atTop && deltaY > 0) monthDelta = -1;
        if (gesture.atBottom && deltaY < 0) monthDelta = 1;
      }

      const container = gesture.container;
      gesture = null;
      if (!monthDelta) return;

      lastChangeAt = now;
      changeMobileMonth(monthDelta);
      requestAnimationFrame(() => {
        container.scrollTop = monthDelta < 0 ? container.scrollHeight : 0;
      });
    }, { passive: true });

    document.addEventListener('touchcancel', () => {
      gesture = null;
    }, { passive: true });
  }

  function initializeMobileEnhancements() {
    const dateInput = document.getElementById('mobile-request-date');
    if (dateInput) dateInput.addEventListener('change', renderMobileRequestCalendar);

    document.querySelectorAll('[data-mobile-month-delta]').forEach((button) => {
      button.addEventListener('click', () => changeMobileMonth(Number(button.dataset.mobileMonthDelta)));
    });

    document.querySelectorAll('[data-mobile-screen="request"]').forEach((button) => {
      button.addEventListener('click', renderMobileRequestCalendar);
    });

    const personalSaveButton = document.getElementById('personal-schedule-save');
    if (personalSaveButton) personalSaveButton.addEventListener('click', saveSelectedPersonalSchedule);
    const personalCloseButton = document.getElementById('personal-schedule-close');
    if (personalCloseButton) personalCloseButton.addEventListener('click', closePersonalScheduleDialog);
    const personalCancelButton = document.getElementById('personal-schedule-cancel');
    if (personalCancelButton) personalCancelButton.addEventListener('click', closePersonalScheduleDialog);
    const personalOverlay = document.getElementById('personal-schedule-overlay');
    if (personalOverlay) {
      personalOverlay.addEventListener('click', (event) => {
        if (event.target === personalOverlay) closePersonalScheduleDialog();
      });
    }

    initializeRosterMonthSwipe();
    renderMobileRequestCalendar();
    syncPersonalSchedules();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMobileEnhancements);
  } else {
    initializeMobileEnhancements();
  }
})();

