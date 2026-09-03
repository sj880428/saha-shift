// Mobile-only calendar navigation and request-calendar enhancements.
(function () {
  let selectedPersonalDate = '';

  function personalScheduleStorageKey() {
    return currentUser ? `saha_personal_schedules_${currentUser.id}` : '';
  }

  function readPersonalSchedules() {
    const key = personalScheduleStorageKey();
    if (!key) return {};
    try {
      const saved = JSON.parse(localStorage.getItem(key) || '{}');
      return saved && typeof saved === 'object' ? saved : {};
    } catch (error) {
      console.warn('개인 일정 데이터를 읽지 못했습니다.', error);
      return {};
    }
  }

  function writePersonalSchedules(schedules) {
    const key = personalScheduleStorageKey();
    if (key) localStorage.setItem(key, JSON.stringify(schedules));
  }

  function hasPersonalSchedule(dateStr) {
    return Boolean(String(readPersonalSchedules()[dateStr] || '').trim());
  }

  function getPersonalSchedule(dateStr) {
    return String(readPersonalSchedules()[dateStr] || '').trim();
  }

  function selectPersonalCalendarDate(dateStr, shift) {
    selectedPersonalDate = dateStr;
    const schedules = readPersonalSchedules();
    const label = document.getElementById('personal-schedule-date-label');
    const shiftLabel = document.getElementById('personal-schedule-shift-label');
    const textarea = document.getElementById('personal-schedule-text');
    const saveButton = document.getElementById('personal-schedule-save');
    const deleteButton = document.getElementById('personal-schedule-delete');
    const overlay = document.getElementById('personal-schedule-overlay');
    const parts = dateStr.split('-').map(Number);

    document.querySelectorAll('.personal-calendar-day').forEach((cell) => {
      cell.classList.toggle('is-selected', cell.dataset.date === dateStr);
    });
    if (label) label.textContent = `${parts[1]}월 ${parts[2]}일 일정`;
    if (shiftLabel) shiftLabel.textContent = `내 근무: ${shift || '-'}`;
    if (textarea) {
      textarea.disabled = false;
      textarea.value = schedules[dateStr] || '';
    }
    if (saveButton) saveButton.disabled = false;
    if (deleteButton) deleteButton.disabled = !hasPersonalSchedule(dateStr);
    if (overlay) overlay.classList.add('active');
  }

  function closePersonalScheduleDialog() {
    const overlay = document.getElementById('personal-schedule-overlay');
    if (overlay) overlay.classList.remove('active');
  }

  function saveSelectedPersonalSchedule() {
    if (!selectedPersonalDate) return;
    const textarea = document.getElementById('personal-schedule-text');
    const text = String(textarea ? textarea.value : '').trim();
    const schedules = readPersonalSchedules();
    if (text) schedules[selectedPersonalDate] = text;
    else delete schedules[selectedPersonalDate];
    writePersonalSchedules(schedules);
    renderMyCalendar();
    closePersonalScheduleDialog();
  }

  function deleteSelectedPersonalSchedule() {
    if (!selectedPersonalDate) return;
    const schedules = readPersonalSchedules();
    delete schedules[selectedPersonalDate];
    writePersonalSchedules(schedules);
    const textarea = document.getElementById('personal-schedule-text');
    if (textarea) textarea.value = '';
    renderMyCalendar();
    closePersonalScheduleDialog();
  }

  window.hasPersonalSchedule = hasPersonalSchedule;
  window.getPersonalSchedule = getPersonalSchedule;
  window.selectPersonalCalendarDate = selectPersonalCalendarDate;

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
    const personalDeleteButton = document.getElementById('personal-schedule-delete');
    if (personalDeleteButton) personalDeleteButton.addEventListener('click', deleteSelectedPersonalSchedule);
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMobileEnhancements);
  } else {
    initializeMobileEnhancements();
  }
})();

