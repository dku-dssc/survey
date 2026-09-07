// ===== Survey form: landing page, verification, navigation, validation, submission =====
// 원본 index.html에서 분리됨 (v5.0.1)

function startNewSurvey() {
  isEditMode = false;
  editingDbId = -1;
  originalEditData = null;
  resetFormData();
  currentPage = 1;
  showPage(currentPage);
  showProgressBar();
}

function showVerifyPage() {
  // Show the verify page
  document
    .querySelectorAll('.survey-page')
    .forEach((p) => p.classList.remove('active'));
  const verifyPage = document.querySelector('[data-page="verify"]');
  if (verifyPage) {
    verifyPage.classList.add('active');
    verifyPage.style.animation = 'none';
    verifyPage.offsetHeight;
    verifyPage.style.animation = '';
  }
  hideProgressBar();
  // Clear verify form
  document.getElementById('verifyName').value = '';
  document.getElementById('verifyBirthYear').value = '';
  document.getElementById('verifyBirthMonth').value = '';
  document.getElementById('verifyBirthDay').value = '';
  document.getElementById('verifyStudentId').value = '';
  verifyGender = '';
  document
    .querySelector('[data-page="verify"]')
    .querySelectorAll('.option-item')
    .forEach((i) => i.classList.remove('selected'));
  document.getElementById('verifyError').classList.remove('show');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleHeaderHomeClick() {
  // 관리자 패널 열려있으면 무시
  var panel = document.getElementById('adminPanel');
  if (panel && panel.classList.contains('open')) return;
  // 설문 진행 중(페이지 1~7)이면 무시
  if (currentPage >= 1 && currentPage <= 8) return;
  // 나머지 경우(랜딩, 완료, 수정확인 페이지 등)만 홈으로 이동
  goToLanding();
}

function goToLanding() {
  currentPage = 0;
  isEditMode = false;
  editingDbId = -1;
  originalEditData = null;
  resetFormData();
  document
    .querySelectorAll('.survey-page')
    .forEach((p) => p.classList.remove('active'));
  document.querySelector('[data-page="0"]').classList.add('active');
  hideProgressBar();
  // Also reset verify fields
  var vn = document.getElementById('verifyName');
  var vby = document.getElementById('verifyBirthYear');
  var vbm = document.getElementById('verifyBirthMonth');
  var vbd = document.getElementById('verifyBirthDay');
  var vs = document.getElementById('verifyStudentId');
  if (vn) vn.value = '';
  if (vby) vby.value = '';
  if (vbm) vbm.value = '';
  if (vbd) vbd.value = '';
  if (vs) vs.value = '';
  verifyGender = '';
  var ve = document.getElementById('verifyError');
  if (ve) ve.classList.remove('show');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  syncFloatingButtons();
}

function selectVerifyGender(el) {
  const parent = el.closest('.option-group');
  parent
    .querySelectorAll('.option-item')
    .forEach((item) => item.classList.remove('selected'));
  el.classList.add('selected');
  verifyGender = el.dataset.value;
}

async function verifyIdentity() {
  const name = document.getElementById('verifyName').value.trim();
  var vby = document.getElementById('verifyBirthYear').value.trim();
  var vbm = document.getElementById('verifyBirthMonth').value.trim();
  var vbd = document.getElementById('verifyBirthDay').value.trim();
  // 생년월일 조합: YYYY-MM-DD
  var birthdate = '';
  if (vby && vbm && vbd) {
    birthdate = vby.padStart(4, '0') + '-' + vbm.padStart(2, '0') + '-' + vbd.padStart(2, '0');
  }
  const studentId = document
    .getElementById('verifyStudentId')
    .value.trim();
  const gender = verifyGender;

  if (!name || !birthdate || !studentId || !gender) {
    showToast('모든 항목을 입력해주세요.');
    return;
  }

  // 서버에 본인확인 요청
  try {
    showToast('본인확인 중...');
    const resp = await fetch(API_BASE + '/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, birthdate, studentId, gender }),
    });

    const result = await resp.json();

    if (!resp.ok || !result.success) {
      document.getElementById('verifyError').classList.add('show');
      return;
    }

    // Match found - enter edit mode
    isEditMode = true;
    editingDbId = result.dbId;
    originalEditData = JSON.parse(JSON.stringify(result.data));

    // Load data into formData
    Object.assign(formData, JSON.parse(JSON.stringify(result.data)));

    // Populate all form fields
    populateFormFromData(formData);

    // Re-setup birthdate auto-advance for edit mode
    setupBirthdateAutoAdvance();

    // Navigate to page 1
    currentPage = 1;
    showPage(currentPage);
    showProgressBar();
    showToast('기존 응답을 불러왔습니다. 수정 후 제출해주세요.');
  } catch (err) {
    console.error('Verify error:', err);
    showToast('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
  }
}

// ===== 본인확인 페이지 키보드 네비게이션 =====
(function() {
  // 성명 → Enter/Tab/ArrowDown → 생년월일(연도)
  document.addEventListener('keydown', function(e) {
    if (e.target.id === 'verifyName' && (e.key === 'Enter' || e.key === 'ArrowDown')) {
      e.preventDefault();
      var vy = document.getElementById('verifyBirthYear');
      if (vy) vy.focus();
    }
  });

  // 생년월일 자동 이동 + 숫자만 입력
  ['verifyBirthYear', 'verifyBirthMonth', 'verifyBirthDay'].forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', function() {
      // 숫자만 허용
      this.value = this.value.replace(/[^0-9]/g, '');
      var maxLen = parseInt(this.maxLength) || (id === 'verifyBirthYear' ? 4 : 2);
      if (this.value.length >= maxLen) {
        // 다음 필드로 자동 이동
        if (id === 'verifyBirthYear') {
          var nm = document.getElementById('verifyBirthMonth');
          if (nm) nm.focus();
        } else if (id === 'verifyBirthMonth') {
          var nd = document.getElementById('verifyBirthDay');
          if (nd) nd.focus();
        } else if (id === 'verifyBirthDay') {
          var ns = document.getElementById('verifyStudentId');
          if (ns) ns.focus();
        }
      }
    });
    // Enter/ArrowDown도 다음으로 이동
    el.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (id === 'verifyBirthYear') {
          var nm = document.getElementById('verifyBirthMonth');
          if (nm) nm.focus();
        } else if (id === 'verifyBirthMonth') {
          var nd = document.getElementById('verifyBirthDay');
          if (nd) nd.focus();
        } else if (id === 'verifyBirthDay') {
          var ns = document.getElementById('verifyStudentId');
          if (ns) ns.focus();
        }
      }
    });
  });
})();

function resetFormData() {
  for (const key in formData) {
    delete formData[key];
  }
  // Clear all form input DOM values
  document.querySelectorAll('.form-input[data-name]').forEach(function(input) {
    if (input.tagName === 'SELECT') {
      input.selectedIndex = 0;
    } else {
      input.value = '';
    }
    input.classList.remove('error');
  });
  // Clear radio/checkbox selections
  document.querySelectorAll('.option-item.selected').forEach(function(item) {
    item.classList.remove('selected');
  });
  // Clear split birthdate fields
  ['birthYear', 'birthMonth', 'birthDay'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) { el.value = ''; el.classList.remove('error'); }
  });
  // Clear department auto-fill state
  for (var k in deptAutoFilled) { delete deptAutoFilled[k]; }
}

function populateFormFromData(data) {
  // Populate text inputs and textareas
  document.querySelectorAll('.form-input[data-name]').forEach((input) => {
    const name = input.dataset.name;
    if (data[name] !== undefined && data[name] !== null) {
      if (!Array.isArray(data[name])) {
        // 연락처는 하이픈 포맷으로 표시
        if (name === 'phone') {
          var digits = String(data[name]).replace(/[^0-9]/g, '');
          if (digits.length === 11) {
            input.value = digits.substring(0, 3) + '-' + digits.substring(3, 7) + '-' + digits.substring(7);
          } else {
            input.value = data[name];
          }
        } else {
          input.value = data[name];
        }
      }
    }
  });

  // Populate split birthdate fields
  if (data.birthdate) {
    var parts = String(data.birthdate).split('-');
    if (parts.length === 3) {
      var bY = document.getElementById('birthYear');
      var bM = document.getElementById('birthMonth');
      var bD = document.getElementById('birthDay');
      if (bY) bY.value = parts[0];
      if (bM) bM.value = parseInt(parts[1], 10).toString();
      if (bD) bD.value = parseInt(parts[2], 10).toString();
    }
  }

  // Mark department inputs as auto-filled if populated
  ['deptInput', 'minorInput'].forEach(function(id) {
    var inp = document.getElementById(id);
    if (inp && inp.value) deptAutoFilled[id] = inp.value;
  });

  // Populate radio groups
  document
    .querySelectorAll('.option-group[data-type="radio"]')
    .forEach((group) => {
      const name = group.dataset.name;
      if (data[name]) {
        group.querySelectorAll('.option-item').forEach((item) => {
          item.classList.remove('selected');
          if (item.dataset.value === data[name]) {
            item.classList.add('selected');
          }
        });
      }
    });

  // Populate checkbox groups
  document
    .querySelectorAll('.option-group[data-type="checkbox"]')
    .forEach((group) => {
      const name = group.dataset.name;
      if (data[name] && Array.isArray(data[name])) {
        group.querySelectorAll('.option-item').forEach((item) => {
          item.classList.remove('selected');
          if (data[name].includes(item.dataset.value)) {
            item.classList.add('selected');
          }
        });
      }
    });
}

// ===== Progress Bar Visibility =====
function showProgressBar() {
  document.getElementById('progressContainer').classList.remove('hidden');
}

function hideProgressBar() {
  document.getElementById('progressContainer').classList.add('hidden');
}

// ===== Page Navigation =====
function syncFloatingButtons() {
  var adminBtn = document.getElementById('adminToggle');
  var saveBtn = document.getElementById('saveDraftBtn');
  if (currentPage >= 1 && currentPage <= 8) {
    // 설문 진행 중 → 자동저장만
    if (adminBtn) adminBtn.style.display = 'none';
    if (saveBtn) saveBtn.style.display = 'flex';
  } else {
    // 홈/기타 → 설정만
    if (adminBtn) adminBtn.style.display = 'flex';
    if (saveBtn) saveBtn.style.display = 'none';
  }
}

function showPage(page, direction) {
  direction = direction || 'forward';
  // 먼저 스크롤을 즉시 맨 위로 (애니메이션 없이)
  window.scrollTo({ top: 0, behavior: 'instant' });

  document
    .querySelectorAll('.survey-page')
    .forEach((p) => p.classList.remove('active'));
  const target = document.querySelector('[data-page="' + page + '"]');
  if (target) {
    target.classList.add('active');
    var animName = direction === 'back' ? 'pageSlideInLeft' : 'pageSlideInRight';
    target.style.animation = 'none';
    target.offsetHeight;
    target.style.animation = animName + ' 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
  }

  // Show/hide progress bar
  if (page === 0 || page === 'verify') {
    hideProgressBar();
  } else {
    showProgressBar();
    updateProgress();
  }
  syncFloatingButtons();
}

function nextPage() {
  if (!isMasterMode && !validatePage(currentPage)) return;
  if (currentPage < 8) {
    currentPage++;
    showPage(currentPage, 'forward');
  }
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    showPage(currentPage, 'back');
  } else if (currentPage === 1) {
    goToLanding();
  }
}

function updateProgress() {
  // Survey pages are 1-8, progress based on 1-8
  const surveyProgress = Math.round(((currentPage - 1) / 7) * 100);
  const progress = Math.max(0, Math.min(100, surveyProgress));
  document.getElementById('progressFill').style.width = progress + '%';
  document.getElementById('progressText').textContent = progress + '%';

  // Update step indicators (pages 1-8)
  const indicators = document.getElementById('stepIndicators');
  indicators.innerHTML = '';
  for (let i = 1; i <= 8; i++) {
    const dot = document.createElement('div');
    dot.className = 'step-dot';
    if (i === currentPage) dot.classList.add('active');
    else if (i < currentPage) dot.classList.add('completed');
    indicators.appendChild(dot);
  }
}

// ===== Option Selection =====
function selectOption(el) {
  const group = el.closest('.option-group');
  group
    .querySelectorAll('.option-item')
    .forEach((item) => item.classList.remove('selected'));
  el.classList.add('selected');
  const name = group.dataset.name;
  formData[name] = el.dataset.value;
}

function toggleCheckbox(el) {
  el.classList.toggle('selected');
  const group = el.closest('.option-group');
  const name = group.dataset.name;
  const selected = [];
  group.querySelectorAll('.option-item.selected').forEach((item) => {
    selected.push(item.dataset.value);
  });
  formData[name] = selected;
}

// ===== Validation =====
function validatePage(page) {
  const pageEl = document.querySelector('[data-page="' + page + '"]');
  if (!pageEl) return true;

  let valid = true;

  // Validate text inputs
  pageEl
    .querySelectorAll('.form-input[data-required="true"]')
    .forEach((input) => {
      if (!input.value.trim()) {
        input.classList.add('error');
        valid = false;
      } else {
        input.classList.remove('error');
      }
    });

  // Validate email
  pageEl
    .querySelectorAll('input[type="email"][data-required="true"]')
    .forEach((input) => {
      if (input.value && !input.value.includes('@')) {
        input.classList.add('error');
        valid = false;
      }
    });

  // Validate student ID: exactly 8 digits
  pageEl
    .querySelectorAll('.form-input[data-name="studentId"]')
    .forEach((input) => {
      if (input.value && !/^[0-9]{8}$/.test(input.value.trim())) {
        input.classList.add('error');
        valid = false;
      }
    });

  // Validate birthdate group (split year/month/day)
  pageEl.querySelectorAll('.birthdate-group[data-required="true"]').forEach(function(group) {
    var bY = group.querySelector('#birthYear');
    var bM = group.querySelector('#birthMonth');
    var bD = group.querySelector('#birthDay');
    if (bY && bM && bD) {
      var hasError = false;
      if (!bY.value || bY.value.length !== 4) { bY.classList.add('error'); hasError = true; } else { bY.classList.remove('error'); }
      if (!bM.value || parseInt(bM.value) < 1 || parseInt(bM.value) > 12) { bM.classList.add('error'); hasError = true; } else { bM.classList.remove('error'); }
      if (!bD.value || parseInt(bD.value) < 1 || parseInt(bD.value) > 31) { bD.classList.add('error'); hasError = true; } else { bD.classList.remove('error'); }
      if (hasError) valid = false;
      else {
        formData.birthdate = bY.value + '-' + bM.value.padStart(2,'0') + '-' + bD.value.padStart(2,'0');
      }
    }
  });

  // Validate department autocomplete (must be a known department)
  pageEl.querySelectorAll('.form-input[data-name="department"]').forEach(function(input) {
    if (input.value.trim()) {
      var isValid = ALL_DEPARTMENTS.some(function(entry) { return entry.dept === input.value.trim(); });
      if (!isValid) {
        input.classList.add('error');
        valid = false;
        showToast('학과(부)를 목록에서 선택해주세요.');
      }
    }
  });

  // Validate phone: exactly 11 digits (숫자만)
  pageEl.querySelectorAll('.form-input[data-name="phone"]').forEach(function(input) {
    var digits = input.value.replace(/[^0-9]/g, '');
    if (digits.length !== 11) {
      input.classList.add('error');
      valid = false;
      showToast('연락처는 숫자 11자리를 입력해주세요.');
    }
  });

  // Validate radio groups
  pageEl
    .querySelectorAll(
      '.option-group[data-required="true"][data-type="radio"]',
    )
    .forEach((group) => {
      if (!group.querySelector('.option-item.selected')) {
        group.style.outline = '2px solid var(--danger)';
        group.style.borderRadius = 'var(--radius-sm)';
        group.style.outlineOffset = '4px';
        valid = false;
      } else {
        group.style.outline = '';
      }
    });

  // Validate checkbox groups
  pageEl
    .querySelectorAll(
      '.option-group[data-required="true"][data-type="checkbox"]',
    )
    .forEach((group) => {
      if (!group.querySelector('.option-item.selected')) {
        group.style.outline = '2px solid var(--danger)';
        group.style.borderRadius = 'var(--radius-sm)';
        group.style.outlineOffset = '4px';
        valid = false;
      } else {
        group.style.outline = '';
      }
    });

  if (!valid) {
    showToast('필수 항목을 모두 입력해주세요.');
  }

  // Collect text inputs
  pageEl.querySelectorAll('.form-input').forEach((input) => {
    if (input.dataset.name && input.value) {
      // 연락처는 숫자만 저장 (하이픈 제거)
      if (input.dataset.name === 'phone') {
        formData[input.dataset.name] = input.value.replace(/[^0-9]/g, '');
      } else {
        formData[input.dataset.name] = input.value;
      }
    }
  });

  return valid;
}

// ===== Submit =====
async function submitSurvey() {
  if (!isMasterMode && !validatePage(currentPage)) return;

  // Collect all remaining data
  document.querySelectorAll('.form-input').forEach((input) => {
    if (input.dataset.name && input.value) {
      if (input.dataset.name === 'phone') {
        formData[input.dataset.name] = input.value.replace(/[^0-9]/g, '');
      } else {
        formData[input.dataset.name] = input.value;
      }
    }
  });
  // Collect split birthdate
  var _bY = document.getElementById('birthYear');
  var _bM = document.getElementById('birthMonth');
  var _bD = document.getElementById('birthDay');
  if (_bY && _bM && _bD && _bY.value && _bM.value && _bD.value) {
    formData.birthdate = _bY.value + '-' + _bM.value.padStart(2,'0') + '-' + _bD.value.padStart(2,'0');
  }

  try {
    showToast('제출 중...');

    if (isEditMode && editingDbId >= 0) {
      // Edit mode: 서버에 수정 요청
      const modifiedFields = [];
      const original = originalEditData;

      for (const key of Object.keys(formData)) {
        if (
          key === 'id' ||
          key === 'submittedAt' ||
          key === 'modifiedAt' ||
          key === 'modifiedFields' ||
          key === 'originalData'
        )
          continue;
        const oldVal = original[key];
        const newVal = formData[key];
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          modifiedFields.push(key);
        }
      }

      const updatedData = { ...formData };
      updatedData.id = original.id;
      updatedData.submittedAt = original.submittedAt;
      updatedData.modifiedFields = modifiedFields;
      updatedData.originalData = original;

      const resp = await fetch(API_BASE + '/api/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dbId: editingDbId,
          name: original.name,
          birthdate: original.birthdate,
          studentId: original.studentId,
          gender: original.gender,
          updatedData: updatedData,
        }),
      });

      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || '수정 실패');

      document.getElementById('completionTitle').textContent =
        '응답이 수정되었습니다';
      document.getElementById('completionMsg').textContent =
        '수정하신 내용이 정상적으로 반영되었습니다.';

      currentPage = 8;
      showPage(8);
      showToast('응답이 성공적으로 수정되었습니다!');

      isEditMode = false;
      editingDbId = -1;
      originalEditData = null;
    } else {
      // New mode: 서버에 신규 제출
      var submitHeaders = { 'Content-Type': 'application/json' };
      if (isMasterMode && masterToken) {
        submitHeaders['Authorization'] = 'Bearer ' + masterToken;
      }
      const resp = await fetch(API_BASE + '/api/submit', {
        method: 'POST',
        headers: submitHeaders,
        body: JSON.stringify(formData),
      });

      const result = await resp.json();

      if (!resp.ok) {
        if (resp.status === 409) {
          showToast(
            '이미 응답이 제출되었습니다. "기존 응답 수정"을 이용해주세요.',
          );
          return;
        }
        throw new Error(result.error || '제출 실패');
      }

      document.getElementById('completionTitle').textContent =
        '제출이 완료되었습니다!';
      document.getElementById('completionMsg').textContent =
        '본인이 작성하신 개인별 교육지원계획 신청이 정상적으로 완료되었습니다.';

      currentPage = 8;
      showPage(8);
      showToast('설문이 성공적으로 제출되었습니다!');
      // 마스터 모드 해제
      if (isMasterMode) {
        isMasterMode = false;
        masterToken = null;
      }
      // 임시저장 데이터 삭제
      try { localStorage.removeItem('dku_survey_draft'); } catch(e) {}
    }
  } catch (err) {
    console.error('Submit error:', err);
    showToast('서버 오류가 발생했습니다: ' + err.message);
  }
}

// ===== Admin Panel =====
