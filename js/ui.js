// ===== Toast, input handlers, save draft, email domain, accessibility, dark/high-contrast, keyboard nav =====
// 원본 index.html에서 분리됨 (v5.0.1)

// v6.1.2: XSS 방지용 HTML 이스케이프 유틸리티
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

var toastTimer = null;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  if (toastTimer) clearTimeout(toastTimer);
  toast.classList.add('show');
  toastTimer = setTimeout(function () {
    toast.classList.remove('show');
    toastTimer = null;
  }, 2000);
}

// ===== Remove error on input =====
document.addEventListener('input', function (e) {
  if (e.target.classList.contains('form-input')) {
    e.target.classList.remove('error');
  }
});

// ===== Student ID: numbers only, 8 digits =====
document.addEventListener('input', function (e) {
  if (
    (e.target.dataset && e.target.dataset.name === 'studentId') ||
    e.target.id === 'verifyStudentId'
  ) {
    e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 8);
  }
});

// ===== Birthday auto-advance =====
// Works for both new entry and edit mode (same DOM elements)
function setupBirthdateAutoAdvance() {
  var bY = document.getElementById('birthYear');
  var bM = document.getElementById('birthMonth');
  var bD = document.getElementById('birthDay');
  if (!bY || !bM || !bD) return;

  function numOnly(el) { el.value = el.value.replace(/[^0-9]/g, ''); }

  function updateBirthdate() {
    var y = bY.value, m = bM.value.padStart(2,'0'), d = bD.value.padStart(2,'0');
    if (y.length === 4 && bM.value.length >= 1 && bD.value.length >= 1) {
      formData.birthdate = y + '-' + m + '-' + d;
    }
  }

  // Remove old listeners by cloning (ensures clean state for edit mode re-entry)
  var newBY = bY.cloneNode(true);
  var newBM = bM.cloneNode(true);
  var newBD = bD.cloneNode(true);
  bY.parentNode.replaceChild(newBY, bY);
  bM.parentNode.replaceChild(newBM, bM);
  bD.parentNode.replaceChild(newBD, bD);

  newBY.addEventListener('input', function() {
    numOnly(this);
    if (this.value.length === 4) newBM.focus();
    updateBirthdate();
  });
  newBM.addEventListener('input', function() {
    numOnly(this);
    if (this.value.length === 2) newBD.focus();
    updateBirthdate();
  });
  newBD.addEventListener('input', function() {
    numOnly(this);
    if (this.value.length === 2) {
      // 생년월일 완료 → 성별 라디오로 포커스
      var genderGroup = document.querySelector('.option-group[data-name="gender"]');
      if (genderGroup) {
        var firstOption = genderGroup.querySelector('.option-item');
        if (firstOption) { firstOption.focus(); }
      } else {
        this.blur();
      }
    }
    updateBirthdate();
  });

  // v4.2.2: 생년월일 한 자리 → 두 자리 보정 (blur 시)
  newBM.addEventListener('blur', function() {
    var v = this.value.replace(/[^0-9]/g, '');
    if (v.length === 1) this.value = '0' + v;
    updateBirthdate();
  });
  newBD.addEventListener('blur', function() {
    var v = this.value.replace(/[^0-9]/g, '');
    if (v.length === 1) this.value = '0' + v;
    updateBirthdate();
  });
}
setupBirthdateAutoAdvance();

// ===== 성명 → 생년월일 자동 이동 (Enter/Tab/blur) =====
(function() {
  var nameInput = document.querySelector('.form-input[data-name="name"]');
  if (!nameInput) return;
  nameInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (this.value.trim()) {
        var bY = document.getElementById('birthYear');
        if (bY) bY.focus();
      }
    }
  });
  nameInput.addEventListener('blur', function() {
    if (this.value.trim()) {
      setTimeout(function() {
        // blur 후 포커스가 생년월일 필드가 아닌 곳으로 갔다면 생년월일로 이동
        var active = document.activeElement;
        if (active && (active.id === 'birthYear' || active.id === 'birthMonth' || active.id === 'birthDay')) return;
        var bY = document.getElementById('birthYear');
        if (bY && !bY.value) bY.focus();
      }, 100);
    }
  });
})();

// ===== Auto-advance: studentId → phone → email =====
function setupFieldAutoAdvance() {
  var studentIdInput = document.querySelector('.form-input[data-name="studentId"]');
  var phoneInput = document.querySelector('.form-input[data-name="phone"]');
  var emailInput = document.querySelector('.form-input[data-name="email"]');

  if (studentIdInput) {
    studentIdInput.addEventListener('input', function() {
      this.value = this.value.replace(/[^0-9]/g, '');
      if (this.value.length === 8 && phoneInput) {
        phoneInput.focus();
      }
    });
  }
  if (phoneInput) {
    phoneInput.addEventListener('input', function() {
      // 숫자만 추출
      var digits = this.value.replace(/[^0-9]/g, '');
      if (digits.length > 11) digits = digits.substring(0, 11);
      // 하이픈 자동 삽입 (010-1234-5678 형태)
      var formatted = '';
      if (digits.length <= 3) {
        formatted = digits;
      } else if (digits.length <= 7) {
        formatted = digits.substring(0, 3) + '-' + digits.substring(3);
      } else {
        formatted = digits.substring(0, 3) + '-' + digits.substring(3, 7) + '-' + digits.substring(7);
      }
      this.value = formatted;
      if (digits.length === 11 && emailInput) {
        emailInput.focus();
      }
    });
  }
}
setupFieldAutoAdvance();

// ===== Save Draft (임시저장) =====
var DRAFT_KEY = 'dku_survey_draft';

function showSaveDraftModal() {
  // 랜딩 페이지이거나 관리자 패널일 때는 무시
  if (currentPage < 0) {
    showToast('설문을 시작한 후 임시저장할 수 있습니다.');
    return;
  }
  document.getElementById('saveDraftOverlay').classList.add('active');
  var modal = document.getElementById('saveDraftModal');
  modal.style.display = 'block';
  // Force reflow for animation
  modal.offsetHeight;
  modal.classList.add('active');
}

function closeSaveDraftModal() {
  document.getElementById('saveDraftOverlay').classList.remove('active');
  var modal = document.getElementById('saveDraftModal');
  modal.classList.remove('active');
  setTimeout(function() { modal.style.display = 'none'; }, 250);
}

function collectCurrentDraft() {
  var draft = { page: currentPage, data: {} };
  // Collect all text inputs
  document.querySelectorAll('.form-input[data-name]').forEach(function(input) {
    if (input.dataset.name && input.value) {
      if (input.dataset.name === 'phone') {
        draft.data[input.dataset.name] = input.value.replace(/[^0-9]/g, '');
      } else {
        draft.data[input.dataset.name] = input.value;
      }
    }
  });
  // Collect birthdate
  var bY = document.getElementById('birthYear');
  var bM = document.getElementById('birthMonth');
  var bD = document.getElementById('birthDay');
  if (bY && bM && bD && bY.value && bM.value && bD.value) {
    draft.data.birthdate = bY.value + '-' + bM.value.padStart(2,'0') + '-' + bD.value.padStart(2,'0');
  }
  // Collect radio selections
  document.querySelectorAll('.option-group[data-type="radio"]').forEach(function(group) {
    var name = group.dataset.name;
    var selected = group.querySelector('.option-item.selected');
    if (selected) draft.data[name] = selected.dataset.value;
  });
  // Collect checkbox selections
  document.querySelectorAll('.option-group[data-type="checkbox"]').forEach(function(group) {
    var name = group.dataset.name;
    var items = group.querySelectorAll('.option-item.selected');
    if (items.length > 0) {
      draft.data[name] = Array.from(items).map(function(i) { return i.dataset.value; });
    }
  });
  // Collect textareas
  document.querySelectorAll('textarea[data-name]').forEach(function(ta) {
    if (ta.dataset.name && ta.value) draft.data[ta.dataset.name] = ta.value;
  });
  draft.savedAt = new Date().toISOString();
  return draft;
}

function executeSaveDraft() {
  try {
    var draft = collectCurrentDraft();
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    closeSaveDraftModal();
    showToast('임시 저장되었습니다. 같은 브라우저로 다시 접속하면 이어서 작성할 수 있습니다.');
  } catch(e) {
    closeSaveDraftModal();
    showToast('임시 저장에 실패했습니다. 브라우저 설정을 확인해주세요.');
  }
}

function checkAndRestoreDraft() {
  try {
    var saved = localStorage.getItem(DRAFT_KEY);
    if (!saved) return;
    var draft = JSON.parse(saved);
    if (!draft || !draft.data || typeof draft.page !== 'number') return;

    // v4.2.4: 랜딩 버튼 UI를 '이어서 작성하기'로 변경
    var btn = document.getElementById('landingNewSurveyBtn');
    if (btn) {
      var savedDate = '';
      if (draft.savedAt) {
        try {
          var d = new Date(draft.savedAt);
          savedDate = d.getFullYear() + '.' + String(d.getMonth()+1).padStart(2,'0') + '.' + String(d.getDate()).padStart(2,'0') + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
        } catch(e) {}
      }
      btn.innerHTML =
        '<span class="landing-btn-icon"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#1164b1" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg></span>' +
        '<span class="landing-btn-label">이어서 작성하기</span>' +
        '<span class="landing-btn-desc">' + (savedDate ? savedDate + ' 저장됨' : '임시저장된 응답이 있습니다') + '</span>';
      btn.classList.add('draft-resume');
      btn.style.position = 'relative';
    }

    // 클릭 시 바로 복원
    var _origStartNew = startNewSurvey;
    startNewSurvey = function() {
      // Restore draft directly
      _origStartNew();
      Object.assign(formData, draft.data);
      populateFormFromData(draft.data);
      if (draft.page > 1) {
        currentPage = draft.page;
        showPage(draft.page);
      }
      showToast('이전에 저장한 설문을 불러왔습니다.');
      startNewSurvey = _origStartNew;
      // 버튼 원래대로 복원
      var btn2 = document.getElementById('landingNewSurveyBtn');
      if (btn2) {
        btn2.innerHTML =
          '<span class="landing-btn-icon"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#1164b1" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></span>' +
          '<span class="landing-btn-label">신규 응답 작성</span>' +
          '<span class="landing-btn-desc">새로운 설문을 작성합니다</span>';
        btn2.classList.remove('draft-resume');
        btn2.style.position = '';
      }
    };
  } catch(e) {
    // localStorage 접근 불가 시 무시
  }
}

// 페이지 로드 시 임시저장 체크
checkAndRestoreDraft();

// ===== Email Domain Autocomplete =====
(function() {
  var EMAIL_DOMAINS = [
    'gmail.com', 'naver.com', 'kakao.com', 'daum.net', 'hanmail.net',
    'outlook.com', 'icloud.com', 'nate.com', 'dankook.ac.kr', 'hotmail.com', 'yahoo.com'
  ];
  var emailInput = document.getElementById('emailInput');
  var dropdown = document.getElementById('emailDomainDropdown');
  if (!emailInput || !dropdown) return;

  var highlightIndex = -1;

  function showDomains(prefix) {
    var atIdx = emailInput.value.indexOf('@');
    if (atIdx < 0) { dropdown.classList.remove('show'); return; }
    var localPart = emailInput.value.substring(0, atIdx);
    var typedDomain = emailInput.value.substring(atIdx + 1).toLowerCase();
    var filtered = EMAIL_DOMAINS.filter(function(d) {
      return d.indexOf(typedDomain) === 0;
    });
    if (filtered.length === 0 || (filtered.length === 1 && filtered[0] === typedDomain)) {
      dropdown.classList.remove('show');
      return;
    }
    dropdown.innerHTML = '';
    highlightIndex = -1;
    filtered.forEach(function(domain, i) {
      var item = document.createElement('div');
      item.className = 'email-domain-item';
      item.textContent = localPart + '@' + domain;
      item.addEventListener('mousedown', function(e) {
        e.preventDefault();
        emailInput.value = localPart + '@' + domain;
        formData.email = emailInput.value;
        dropdown.classList.remove('show');
        // 이메일 완료 → 선호 연락 방식으로 이동
        setTimeout(function() {
          var contactPrefGroup = document.querySelector('.option-group[data-name="contactPref"]');
          if (contactPrefGroup) {
            var firstOpt = contactPrefGroup.querySelector('.option-item');
            if (firstOpt) firstOpt.focus();
          }
        }, 150);
      });
      dropdown.appendChild(item);
    });
    dropdown.classList.add('show');
  }

  emailInput.addEventListener('input', function() {
    showDomains();
    // .com 등 완전한 이메일 수동 입력 시 자동 이동
    var val = this.value;
    if (val.indexOf('@') > 0 && !dropdown.classList.contains('show')) {
      // 드롭다운이 닫혔다 = 도메인이 완전히 입력됨
      var domainPart = val.substring(val.indexOf('@') + 1);
      if (domainPart.length >= 4 && domainPart.indexOf('.') > 0) {
        var afterDot = domainPart.substring(domainPart.lastIndexOf('.') + 1);
        if (afterDot.length >= 2 && afterDot.length <= 5) {
          formData.email = val;
          setTimeout(function() {
            var contactPrefGroup = document.querySelector('.option-group[data-name="contactPref"]');
            if (contactPrefGroup) {
              var firstOpt = contactPrefGroup.querySelector('.option-item');
              if (firstOpt) firstOpt.focus();
            }
          }, 300);
        }
      }
    }
  });
  emailInput.addEventListener('focus', function() {
    if (this.value.indexOf('@') >= 0) showDomains();
  });
  emailInput.addEventListener('blur', function() {
    setTimeout(function() { dropdown.classList.remove('show'); }, 150);
  });
  emailInput.addEventListener('keydown', function(e) {
    var items = dropdown.querySelectorAll('.email-domain-item');
    if (!dropdown.classList.contains('show') || items.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      highlightIndex = Math.min(highlightIndex + 1, items.length - 1);
      items.forEach(function(it, i) { it.classList.toggle('highlighted', i === highlightIndex); });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlightIndex = Math.max(highlightIndex - 1, 0);
      items.forEach(function(it, i) { it.classList.toggle('highlighted', i === highlightIndex); });
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      items[highlightIndex].dispatchEvent(new MouseEvent('mousedown'));
    } else if (e.key === 'Escape') {
      dropdown.classList.remove('show');
    }
  });
})();

// ===== Accessibility Controls =====
// Font size: base 15px, range 9~21 (step 2pt). Level 0 = 15px.
// Font weight: base 400, range 200~800 (step 200). Level 0 = 400.
let currentFontSizeLevel = 0; // -3 to +3 → 9px to 21px
let currentFontWeightLevel = 0; // -1 to +2 → 200 to 800
let a11yStyleEl = null;

function getA11yStyleEl() {
  if (!a11yStyleEl) {
    a11yStyleEl = document.createElement('style');
    a11yStyleEl.id = 'a11y-dynamic-styles';
    document.head.appendChild(a11yStyleEl);
  }
  return a11yStyleEl;
}

function applyA11yStyles() {
  var css = '';
  if (currentFontSizeLevel !== 0) {
    var delta = currentFontSizeLevel * 2; // -6 to +6 px
    css += ':root { --a11y-size-delta: ' + delta + 'px; }\n';
    css += 'html { font-size: ' + (15 + delta) + 'px !important; }\n';
    css += 'body, body * { font-size: inherit; }\n';
    var overrides = {
      'body': 15, '.form-label': 15, '.form-input': 15, '.option-label': 14,
      '.btn': 15, '.header-logo span': 15,
      '.header-badge': 11, '.section-header h2': 22, '.section-header p': 14,
      '.section-icon': 32, '.intro-hero h1': 26, '.intro-hero .subtitle': 15,
      '.intro-info': 14, '.intro-info .notice': 13, '.intro-info .contact': 13,
      '.landing-btn .landing-btn-label': 16, '.landing-btn .landing-btn-desc': 12,
      '.landing-btn .landing-btn-icon': 40,
      '.consent-box': 13, '.consent-box h4': 14,
      '.progress-text': 12, '.error-msg': 12,
      '.stat-value': 28, '.stat-card .stat-label': 12,
      '.response-card .name': 15, '.response-card .meta': 12,
      '.modified-badge': 11, '.toast': 14,
      '.autocomplete-college': 12, '.autocomplete-item': 14,
      '.autocomplete-no-result': 13, '.diff-mode-label': 11,
      '.diff-view-btn': 12,
      '.completion-page h2': 24, '.completion-page p': 15,
      '.letter-preview': 14, '.letter-preview h4': 18,
      '.enrollment-section h4': 14, '.enrollment-file-card': 13,
      '.mapping-popup h4': 16, '.mapping-row': 13,
      '.mismatch-badge': 11, '.match-badge': 11,
      '.admin-panel h3': 20, '.admin-close': 24,
      '.verify-error': 14
    };
    for (var sel in overrides) {
      css += sel + ' { font-size: ' + Math.max(10, overrides[sel] + delta) + 'px !important; }\n';
    }
  }
  if (currentFontWeightLevel !== 0) {
    var weightVal = 400 + (currentFontWeightLevel * 200); // 200, 400, 600, 800
    css += 'body * { font-weight: ' + weightVal + ' !important; }\n';
    var boldWeight = Math.min(900, weightVal + 200);
    var extraBoldWeight = Math.min(900, weightVal + 300);
    css += 'strong, b, .form-label, h1, h2, h3, h4, .section-header h2, .stat-value, .response-card .name, .intro-hero h1, .landing-btn .landing-btn-label, .header-logo span { font-weight: ' + boldWeight + ' !important; }\n';
    css += '.section-header h2, .intro-hero h1, h1 { font-weight: ' + extraBoldWeight + ' !important; }\n';
  }
  // Always exclude a11y bar from changes (highest specificity at end)
  css += '#a11yBar .a11y-label { font-size: 12px !important; font-weight: 600 !important; }\n';
  css += '#a11yBar .a11y-btn:not(.dark-mode-toggle) { font-size: 13px !important; font-weight: 600 !important; width: 36px !important; height: 36px !important; }\n';
  css += '#a11yBar .dark-mode-toggle { width: 42px !important; height: 42px !important; }\n';
  // Preserve inline styles on a11y button child spans
  css += '#a11yBar .a11y-btn span[style*="font-size:11px"] { font-size: 11px !important; font-weight: 300 !important; }\n';
  css += '#a11yBar .a11y-btn span[style*="font-size:17px"] { font-size: 17px !important; font-weight: 600 !important; }\n';
  css += '#a11yBar .a11y-btn span[style*="font-weight:200"] { font-size: 13px !important; font-weight: 200 !important; }\n';
  css += '#a11yBar .a11y-btn span[style*="font-weight:800"] { font-size: 13px !important; font-weight: 800 !important; }\n';
  getA11yStyleEl().textContent = css;
}

function adjustFontSize(dir) {
  currentFontSizeLevel = Math.max(-3, Math.min(3, currentFontSizeLevel + dir));
  applyA11yStyles();
  var sizeLabels = {'-3':'매우 작게','-2':'작게','-1':'약간 작게','0':'기본','1':'약간 크게','2':'크게','3':'매우 크게'};
  showToast('글자 크기: ' + sizeLabels[String(currentFontSizeLevel)]);
}

function adjustFontWeight(dir) {
  currentFontWeightLevel = Math.max(-1, Math.min(2, currentFontWeightLevel + dir));
  applyA11yStyles();
  var weightLabels = {'-1':'얇게','0':'기본','1':'두껍게','2':'매우 두껍게'};
  showToast('글자 두께: ' + weightLabels[String(currentFontWeightLevel)]);
}

function resetAccessibility() {
  currentFontSizeLevel = 0;
  currentFontWeightLevel = 0;
  applyA11yStyles();
  // 다크모드와 고대비는 초기화에서 끄지 않음 (별도 토글)
  showToast('설정 초기화');
}

// ===== Dark Mode Toggle =====
var _dmAnimating = false;
var _DM_ANIM_DUR = 600; // ms — CSS와 동일
function toggleDarkMode() {
  if (_dmAnimating) return;
  _dmAnimating = true;
  var body = document.body;
  var isDark = body.classList.toggle('dark-mode');
  var moonIcon = document.querySelector('.moon-icon');
  var sunIcon = document.querySelector('.sun-icon');
  // 클래스 초기화
  moonIcon.classList.remove('arc-set', 'arc-rise');
  sunIcon.classList.remove('arc-set', 'arc-rise');
  void moonIcon.offsetWidth;
  void sunIcon.offsetWidth;
  // 모드 전환 시 구름 즉시 제거
  _hideDmClouds();
  if (isDark) {
    // 라이트→다크: 해가 먼저 지고 → 달이 뜸 (순차)
    sunIcon.style.display = 'block';
    moonIcon.style.display = 'none';
    sunIcon.classList.add('arc-set');
    setTimeout(function() {
      sunIcon.style.display = 'none';
      moonIcon.style.display = 'block';
      moonIcon.classList.add('arc-rise');
      setTimeout(function() {
        _dmAnimating = false;
        _syncDmCloudsWithHighContrast();
      }, _DM_ANIM_DUR);
    }, _DM_ANIM_DUR);
  } else {
    // 다크→라이트: 달이 먼저 지고 → 해가 뜸 (순차)
    moonIcon.style.display = 'block';
    sunIcon.style.display = 'none';
    moonIcon.classList.add('arc-set');
    setTimeout(function() {
      moonIcon.style.display = 'none';
      sunIcon.style.display = 'block';
      sunIcon.classList.add('arc-rise');
      setTimeout(function() {
        _dmAnimating = false;
        _syncDmCloudsWithHighContrast();
      }, _DM_ANIM_DUR);
    }, _DM_ANIM_DUR);
  }
  try { localStorage.setItem('dku_dark_mode', isDark ? '1' : '0'); } catch(e) {}
}

// ===== 구름 (고대비 연동) =====
var _dmCloudsVisible = false;
function _getDmClouds() {
  return {
    small: document.getElementById('dmCloudSmall'),
    big: document.getElementById('dmCloudBig')
  };
}
function _setDmCloudColor() {
  var c = _getDmClouds();
  if (!c.small) return;
  var isDark = document.body.classList.contains('dark-mode');
  var add = isDark ? 'cloud-moon' : 'cloud-sun';
  var rm = isDark ? 'cloud-sun' : 'cloud-moon';
  c.small.classList.remove(rm); c.small.classList.add(add);
  c.big.classList.remove(rm); c.big.classList.add(add);
}
function _showDmClouds() {
  if (_dmCloudsVisible) return;
  var c = _getDmClouds();
  if (!c.small) return;
  _setDmCloudColor();
  c.small.classList.remove('entering-left','entering-right','leaving-left','leaving-right','floating');
  c.big.classList.remove('entering-left','entering-right','leaving-left','leaving-right','floating');
  c.small.classList.add('cloud-visible');
  c.big.classList.add('cloud-visible');
  void c.small.offsetWidth;
  c.small.classList.add('entering-left');
  c.big.classList.add('entering-right');
  setTimeout(function() {
    c.small.classList.remove('entering-left');
    c.big.classList.remove('entering-right');
    c.small.classList.add('floating');
    c.big.classList.add('floating');
  }, 500);
  _dmCloudsVisible = true;
}
function _hideDmClouds() {
  if (!_dmCloudsVisible) return;
  var c = _getDmClouds();
  if (!c.small) return;
  c.small.classList.remove('floating','entering-left','entering-right');
  c.big.classList.remove('floating','entering-left','entering-right');
  void c.small.offsetWidth;
  c.small.classList.add('leaving-left');
  c.big.classList.add('leaving-right');
  setTimeout(function() {
    c.small.classList.remove('leaving-left','cloud-visible');
    c.big.classList.remove('leaving-right','cloud-visible');
  }, 400);
  _dmCloudsVisible = false;
}
function _syncDmCloudsWithHighContrast() {
  var hcOn = document.getElementById('highContrastToggle');
  if (hcOn && hcOn.checked) {
    _setDmCloudColor();
    if (!_dmCloudsVisible) _showDmClouds();
  } else {
    if (_dmCloudsVisible) _hideDmClouds();
  }
}

// ===== High Contrast Toggle =====
function toggleHighContrast() {
  var isOn = document.getElementById('highContrastToggle').checked;
  document.body.classList.toggle('high-contrast', isOn);
  try { localStorage.setItem('dku_high_contrast', isOn ? '1' : '0'); } catch(e) {}
  // 고대비 ON → 구름 등장, OFF → 구름 퇴장
  if (isOn) {
    _showDmClouds();
    showToast('고대비 모드가 켜졌습니다.');
  } else {
    _hideDmClouds();
    showToast('고대비 모드가 꺼졌습니다.');
  }
}

// Restore dark mode & high contrast on load
(function() {
  try {
    if (localStorage.getItem('dku_dark_mode') === '1') {
      document.body.classList.add('dark-mode');
      var sunIcon = document.querySelector('.sun-icon');
      var moonIcon = document.querySelector('.moon-icon');
      if (sunIcon) sunIcon.style.display = 'none';
      if (moonIcon) moonIcon.style.display = 'block';
    }
    if (localStorage.getItem('dku_high_contrast') === '1') {
      document.body.classList.add('high-contrast');
      var toggle = document.getElementById('highContrastToggle');
      if (toggle) toggle.checked = true;
    }
    // 고대비가 켜져 있으면 구름도 즉시 표시 (애니메이션 없이)
    if (localStorage.getItem('dku_high_contrast') === '1') {
      var cs = document.getElementById('dmCloudSmall');
      var cb = document.getElementById('dmCloudBig');
      if (cs && cb) {
        var isDk = document.body.classList.contains('dark-mode');
        cs.classList.add('cloud-visible', 'floating', isDk ? 'cloud-moon' : 'cloud-sun');
        cb.classList.add('cloud-visible', 'floating', isDk ? 'cloud-moon' : 'cloud-sun');
        cs.classList.remove(isDk ? 'cloud-sun' : 'cloud-moon');
        cb.classList.remove(isDk ? 'cloud-sun' : 'cloud-moon');
        _dmCloudsVisible = true;
      }
    }
  } catch(e) {}
})();

// ===== Keyboard Navigation =====
// 모든 option-item에 tabindex, role, 키보드 이벤트 추가
document.querySelectorAll('.option-item').forEach(function(item) {
  item.setAttribute('tabindex', '0');
  var group = item.closest('.option-group');
  var type = group ? group.dataset.type : 'radio';
  item.setAttribute('role', type === 'checkbox' ? 'checkbox' : 'radio');
  item.setAttribute('aria-checked', item.classList.contains('selected') ? 'true' : 'false');

  item.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      item.click();
    }
    // 방향키로 같은 그룹 내 이동
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      var next = item.nextElementSibling;
      while (next && !next.classList.contains('option-item')) next = next.nextElementSibling;
      if (next) next.focus();
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      var prev = item.previousElementSibling;
      while (prev && !prev.classList.contains('option-item')) prev = prev.previousElementSibling;
      if (prev) prev.focus();
    }
  });
});

// 선택 시 aria-checked 업데이트
var origSelectOption = selectOption;
selectOption = function(el) {
  origSelectOption(el);
  var group = el.closest('.option-group');
  group.querySelectorAll('.option-item').forEach(function(item) {
    item.setAttribute('aria-checked', item.classList.contains('selected') ? 'true' : 'false');
  });
};
var origToggleCheckbox = toggleCheckbox;
toggleCheckbox = function(el) {
  origToggleCheckbox(el);
  el.setAttribute('aria-checked', el.classList.contains('selected') ? 'true' : 'false');
};

// 다음/이전/제출 버튼에 명시적 포커스 가능 보장
document.querySelectorAll('.btn, .landing-btn').forEach(function(btn) {
  if (!btn.getAttribute('tabindex')) btn.setAttribute('tabindex', '0');
});

// 토스트에 aria-live 추가
var toastEl = document.getElementById('toast');
if (toastEl) {
  toastEl.setAttribute('role', 'alert');
  toastEl.setAttribute('aria-live', 'polite');
}

// ===== Initialize =====
