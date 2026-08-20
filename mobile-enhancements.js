// Mobile-only calendar navigation and request-calendar enhancements.
(function () {
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
      const { badgeClass, displayLabel } = getShiftBadgeAndLabel(shift);
      const dayCell = document.createElement('button');
      dayCell.type = 'button';
      dayCell.className = 'mini-cal-day mobile-request-calendar-day';
      if (getHolidayName(year, month, day) || date.getDay() === 0) dayCell.classList.add('sunday');
      if (date.getDay() === 6) dayCell.classList.add('saturday');
      if (dateStr === selectedDate) dayCell.classList.add('is-selected');
      dayCell.setAttribute('aria-label', `${month + 1}월 ${day}일, ${shift}`);
      dayCell.innerHTML = `<span class="mini-cal-day-num">${day}</span><span class="badge ${badgeClass}">${displayLabel}</span>`;
      dayCell.addEventListener('click', () => {
        if (dateInput) dateInput.value = dateStr;
        container.querySelectorAll('.mobile-request-calendar-day').forEach((cell) => cell.classList.remove('is-selected'));
        dayCell.classList.add('is-selected');
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

  function initializeMobileEnhancements() {
    const dateInput = document.getElementById('mobile-request-date');
    if (dateInput) dateInput.addEventListener('change', renderMobileRequestCalendar);

    document.querySelectorAll('[data-mobile-month-delta]').forEach((button) => {
      button.addEventListener('click', () => changeMobileMonth(Number(button.dataset.mobileMonthDelta)));
    });

    document.querySelectorAll('[data-mobile-screen="request"]').forEach((button) => {
      button.addEventListener('click', renderMobileRequestCalendar);
    });

    renderMobileRequestCalendar();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMobileEnhancements);
  } else {
    initializeMobileEnhancements();
  }
})();

