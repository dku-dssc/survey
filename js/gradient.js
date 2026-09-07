// ===== Initialization, label gradient system, auto-scroll =====
// 원본 index.html에서 분리됨 (v5.0.1)

hideProgressBar();
updateAdminPanel();

// Setup autocomplete for department and minor fields
setupAutocomplete('deptInput', 'deptDropdown');
setupAutocomplete('minorInput', 'minorDropdown');

// Add demo data for testing
function addDemoData() {
  responses.push({
    id: 1,
    name: '김지수',
    birthdate: '2004-03-15',
    gender: '여자',
    grade: '2학년',
    studentId: '32200001',
    phone: '010-1234-5678',
    email: 'jisu@dankook.ac.kr',
    contactPref: ['문자', '이메일'],
    department: '특수교육과',
    disabilityType: ['시각장애'],
    disabilityLevel: '장애의 정도가 심하지 않음 (경증)',
    assistiveDevice: '휴대용 독서 확대기',
    commonSupport: [
      '학습지원 협조 요청안내문 발송',
      '강의실 좌석 우선 배정 및 조정',
    ],
    theorySupport: [
      '수업자료 사전 제공',
      '강의 영상 자료에 대한 해설, 자막',
    ],
    evalSupport: ['확대 시험지 제공', '시험시간 연장'],
    theoryDetail:
      '확대 인쇄된 유인물을 미리 제공해주시면 감사하겠습니다.',
    consent: '동의합니다',
    finalConfirm: '예',
    shareConsent: '동의',
    submittedAt: new Date().toISOString(),
  });

  responses.push({
    id: 2,
    name: '박민준',
    birthdate: '2003-07-22',
    gender: '남자',
    grade: '3학년',
    studentId: '32100042',
    phone: '010-9876-5432',
    email: 'minjun@dankook.ac.kr',
    contactPref: ['통화'],
    department: '컴퓨터공학과',
    disabilityType: ['지체장애'],
    disabilityLevel: '장애의 정도가 심함 (중증)',
    assistiveDevice: '전동휠체어',
    healthStatus:
      '장시간 앉아있으면 통증이 있어 중간에 휴식이 필요합니다.',
    commonSupport: [
      '학습지원 협조 요청안내문 발송',
      '교수자의 장애 학생에 대한 이해',
      '강의실 좌석 우선 배정 및 조정',
    ],
    theorySupport: [
      '강의실 자리 배치 (거리, 방향 등)',
      '수업 변경 사항은 학교 시스템을 통해 공지',
    ],
    labSupport: ['실습실 자리 배치 (거리, 방향 등)'],
    evalSupport: [
      '시험시간 연장',
      '별도의 시험 장소 제공',
      '시험실 자리 배치 (거리, 방향 등)',
    ],
    deviceSupport: [
      '높낮이 조절 책상',
      '학부생 교육지원인력(장애학생 도우미)',
    ],
    lifeSupport: ['교내 이동 지원'],
    evalDetail: '시험 시 휠체어 진입 가능한 강의실 배정 부탁드립니다.',
    consent: '동의합니다',
    finalConfirm: '예',
    shareConsent: '동의',
    submittedAt: new Date(Date.now() - 86400000).toISOString(),
  });

  updateAdminPanel();
  showToast('데모 데이터 2건이 추가되었습니다.');
}

// Load demo data automatically
addDemoData();

// ===== [2] 필드 라벨 그라데이션 (새 규칙 · 포커스 기반 완전 재작성) =====
// 규칙:
//  0. 필드라벨 포커스는 오직 1개. 포커스된 문항 = 파란 글자, 그 외 = 검정.
//  1. 각 페이지의 첫 포커스 가능 미응답 문항에 그라데이션 루프(답변 완료까지 반복).
//  2. 포커스가 이동하면 이전 문항 그라데이션 중단, 새 문항에서 진행.
//  3. 응답 완료 + 포커스 = 그라데이션 없이 solid 파랑.
//  4. 필수 아닌 서술형 = 포커스 안 함(검정). 화면에 완전히 재등장할 때마다 1회 그라데이션.
//  · 선지형(radio) 선택 = 즉시 다음으로 자동 이동.
//  · 복수응답형(checkbox) 1개 이상 선택 = 응답 완료(solid 파랑), 포커스 유지.
//  · 문항 유형: option-group[data-type=radio]=선지형, =checkbox=복수응답형, 그 외 입력=서술형.
(function() {
  var SWEEP_DUR = 2500;              // CSS lfSweep 지속시간과 일치
  var focusedGroup = null;          // 현재 포커스된 form-group (단 1개)

  // ── label-main 래퍼 초기화: 메인 텍스트만 감싸서 그라데이션 격리 ──
  // helper가 -webkit-text-fill-color: transparent를 상속받지 않게 하기 위함
  document.querySelectorAll('.form-label').forEach(function(label) {
    var main = document.createElement('span');
    main.className = 'label-main';
    var children = Array.from(label.childNodes);
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      // helper는 label-main 바깥에 남김
      if (child.nodeType === 1 && child.classList && child.classList.contains('helper')) continue;
      main.appendChild(child);
    }
    label.insertBefore(main, label.firstChild);
  });

  // ── 재등장 1회 그라데이션(규칙4)용 관찰 ──
  var _obs = null;
  var observed = new Set();
  var wasOut = new WeakMap();

  // ── 유틸 ──
  function getLabel(group){ return group ? group.querySelector('.form-label') : null; }
  function getType(group){
    var og = group.querySelector('.option-group');
    if (og) return og.dataset.type === 'radio' ? 'single' : 'multi';
    return 'text';
  }
  function isRequired(group){ return !!(group && group.querySelector('[data-required="true"]')); }
  function isNonReqText(group){ return getType(group) === 'text' && !isRequired(group); }
  function isFocusable(group){ return !!getLabel(group) && !isNonReqText(group); }
  function isFullyVisible(el){
    if (!el) return false;
    var r = el.getBoundingClientRect();
    return r.height > 0 && r.top >= 0 && r.bottom <= (window.innerHeight || document.documentElement.clientHeight);
  }

  // ── 응답 완료 판정 (특수: 생년월일/학번/전화번호) ──
  function isAnswered(group){
    if (!group) return false;
    var birth = group.querySelector('.birthdate-group');
    if (birth){
      var y = document.getElementById('birthYear'),
          m = document.getElementById('birthMonth'),
          d = document.getElementById('birthDay');
      return !!(y && m && d && y.value.trim() && m.value.trim() && d.value.trim());
    }
    var sid = group.querySelector('[data-name="studentId"]');
    if (sid) return /^[0-9]{8}$/.test((sid.value || '').trim());
    var ph = group.querySelector('[data-name="phone"]');
    if (ph) return (ph.value || '').replace(/[^0-9]/g, '').length === 11;
    var inputs = group.querySelectorAll('.form-input, textarea, select');
    for (var i = 0; i < inputs.length; i++){ if (inputs[i].value && inputs[i].value.trim()) return true; }
    var ogs = group.querySelectorAll('.option-group');
    for (var j = 0; j < ogs.length; j++){ if (ogs[j].querySelector('.option-item.selected')) return true; }
    return false;
  }

  // ── helper 마스크 스윕 유틸 (글자 쪼개기 없음, 두께·레이아웃 변화 없음) ──
  function clearHelperSweep(helper){
    if (!helper) return;
    // 클론 제거
    if (helper._sweepClone) {
      if (helper._sweepClone.parentNode) helper._sweepClone.parentNode.removeChild(helper._sweepClone);
      delete helper._sweepClone;
    }
    helper.classList.remove('helper-settled');
  }
  function sweepHelper(helper){
    if (!helper || !helper.textContent.trim()) return;
    // 이미 진행 중이면 정리
    clearHelperSweep(helper);
    var text = helper.textContent;

    // ★ 핵심: 원본 helper는 절대 건드리지 않음 (숨기지도 않음)
    // label 밖에 검은색 클론을 만들고 CSS mask로 물결 스윕
    // 클론이 원본 위에 겹쳐지면서 회색→검정→회색 효과 연출
    // 글자 쪼개기 없음 → 레이아웃/두께 변화 원천 차단

    var rect = helper.getBoundingClientRect();
    var group = helper.closest('.form-group');
    if (!group) group = helper.parentNode;
    var groupRect = group.getBoundingClientRect();
    var groupStyle = getComputedStyle(group);

    // form-group에 position이 없으면 추가
    if (groupStyle.position === 'static') {
      group.style.position = 'relative';
    }

    var clone = document.createElement('span');
    clone.className = 'helper-clone';
    clone.textContent = text;  // 단일 텍스트 노드 — 글자 쪼개기 없음!
    // 원본과 동일한 폰트 속성 복사
    var helperStyle = getComputedStyle(helper);
    clone.style.fontFamily = helperStyle.fontFamily;
    clone.style.fontSize = helperStyle.fontSize;
    clone.style.fontWeight = helperStyle.fontWeight;
    clone.style.lineHeight = helperStyle.lineHeight;
    clone.style.letterSpacing = helperStyle.letterSpacing;
    clone.style.textAlign = helperStyle.textAlign;
    // 원본 위치에 정확히 배치
    clone.style.top = (rect.top - groupRect.top + group.scrollTop) + 'px';
    clone.style.left = (rect.left - groupRect.left + group.scrollLeft) + 'px';
    clone.style.width = rect.width + 'px';

    group.appendChild(clone);
    helper._sweepClone = clone;

    // animationend로 정리
    clone.addEventListener('animationend', function(){
      if (clone.parentNode) clone.parentNode.removeChild(clone);
      delete helper._sweepClone;
      helper.classList.add('helper-settled');
    }, { once: true });
  }

  // ── 라벨 클래스 제어 ──
  function clearLabel(label){
    if (!label) return;
    label._helperLoopDone = true;
    label.classList.remove('lf-focus', 'lf-sweep', 'lf-loop', 'lf-once', 'lf-settled');
    clearHelperSweep(label.querySelector('.helper'));
  }
  function applyFocusSolid(label){          // 파랑 solid (규칙3)
    if (!label) return;
    label._helperLoopDone = true;
    label.classList.remove('lf-sweep', 'lf-loop', 'lf-once');
    label.classList.add('lf-focus');
    var helper = label.querySelector('.helper');
    if (helper) {
      clearHelperSweep(helper);
      helper.classList.add('helper-settled');
    }
  }
  function applyFocusLoop(label){           // 파랑 + 밴드 루프 (규칙1·2)
    if (!label) return;
    label.classList.remove('lf-once', 'lf-sweep', 'lf-loop');
    var helper = label.querySelector('.helper');
    if (helper) clearHelperSweep(helper);
    var main = label.querySelector('.label-main');
    if (main) void main.offsetWidth;
    label.classList.add('lf-focus', 'lf-sweep', 'lf-loop');
    if (helper && helper.textContent.trim()) {
      label._helperLoopDone = false;
      var onIter = function(e) {
        if (e.target !== main || label._helperLoopDone) return;
        label._helperLoopDone = true;
        label.removeEventListener('animationiteration', onIter);
        // 라벨 그라데이션 이후에 helper 시작 (동시 재생 방지)
        setTimeout(function(){ sweepHelper(helper); }, 400);
      };
      label.addEventListener('animationiteration', onIter);
    }
  }
  function playOnce(label){                 // 검정 + 밴드 1회 (규칙4)
    if (!label) return false;
    if (label === getLabel(focusedGroup)) return false;
    if (!pageAllRequiredAnswered(label)) return false;
    label.classList.remove('lf-focus', 'lf-sweep', 'lf-loop', 'lf-once', 'lf-settled');
    var helper = label.querySelector('.helper');
    if (helper) clearHelperSweep(helper);
    var main = label.querySelector('.label-main');
    if (main) void main.offsetWidth;
    label.classList.add('lf-sweep', 'lf-once');
    label.addEventListener('animationend', function done(e){
      if (e.target !== main) return;
      label.classList.add('lf-settled');
      label.classList.remove('lf-sweep', 'lf-once');
      if (helper && helper.textContent.trim()) {
        sweepHelper(helper);
      }
    }, { once: true });
    return true;
  }

  // ── 포커스 이동 ──
  function renderFocused(){
    var l = getLabel(focusedGroup);
    if (!l) return;
    if (isAnswered(focusedGroup)) applyFocusSolid(l); else applyFocusLoop(l);
  }
  function setFocus(group){
    if (group === focusedGroup){ refreshFocused(); return; }
    if (focusedGroup) clearLabel(getLabel(focusedGroup)); // 이전 포커스 → 검정 (규칙2)
    focusedGroup = group || null;
    if (!focusedGroup) return;
    renderFocused();
  }
  function clearFocus(){
    if (focusedGroup) clearLabel(getLabel(focusedGroup));
    focusedGroup = null;
  }
  // 입력 변화 후 solid/loop 갱신 (불필요한 애니 재시작 방지)
  function refreshFocused(){
    if (!focusedGroup) return;
    var l = getLabel(focusedGroup);
    if (!l) return;
    if (isAnswered(focusedGroup)){
      if (!l.classList.contains('lf-focus') || l.classList.contains('lf-sweep')) applyFocusSolid(l);
    } else {
      if (!l.classList.contains('lf-loop')) applyFocusLoop(l);
    }
  }

  // ── 서술형 입력란 자동 포커스 (필수 서술형에만) ──
  function focusInputIfText(group){
    if (getType(group) !== 'text') return;
    var birth = group.querySelector('.birthdate-group');
    if (birth){ var y = document.getElementById('birthYear'); if (y) y.focus({ preventScroll: true }); return; }
    var inp = group.querySelector('.form-input:not([type="hidden"]), textarea');
    if (inp) inp.focus({ preventScroll: true });
  }

  // ── 다음 포커스 대상 탐색 ──
  function firstFocusableUnanswered(pageEl){
    var gs = Array.from(pageEl.querySelectorAll('.form-group'));
    for (var i = 0; i < gs.length; i++){ if (isFocusable(gs[i]) && !isAnswered(gs[i])) return gs[i]; }
    return null;
  }
  function nextFocusableUnanswered(group){
    var pageEl = group.closest('.survey-page'); if (!pageEl) return null;
    var gs = Array.from(pageEl.querySelectorAll('.form-group'));
    var idx = gs.indexOf(group);
    for (var i = idx + 1; i < gs.length; i++){ if (isFocusable(gs[i]) && !isAnswered(gs[i])) return gs[i]; }
    return null;
  }
  // [전제] 라벨이 속한 페이지의 모든 필수 문항이 응답되었는지
  function pageAllRequiredAnswered(el){
    var pageEl = el && el.closest ? el.closest('.survey-page') : null;
    if (!pageEl) return true;
    var reqs = pageEl.querySelectorAll('[data-required="true"]');
    for (var i = 0; i < reqs.length; i++){
      var g = reqs[i].closest('.form-group');
      if (g && !isAnswered(g)) return false;
    }
    return true;
  }
  // 필수 완료 후, 현재 화면에 완전히 보이는 문항을 1회 스윕
  function sweepVisibleOptionalOnce(pageEl){
    observed.forEach(function(l){
      if (l.closest('.survey-page') !== pageEl) return;
      if (wasOut.get(l) && isFullyVisible(l)){ if (playOnce(l)) wasOut.set(l, false); }
    });
  }

  function advanceFrom(group){
    var next = nextFocusableUnanswered(group);
    if (next){
      setFocus(next);
      focusInputIfText(next);
      scrollFieldIntoView(getLabel(next) || next);
    } else {
      // 다음 포커스 대상 없음: 응답 완료면 solid 파랑 유지(규칙3, 예: 동의 문항), 아니면 검정
      if (isAnswered(group)){
        focusedGroup = group;
        var l = getLabel(group);
        if (l) applyFocusSolid(l);
      } else {
        clearFocus();
      }
      var pageEl = group.closest('.survey-page');
      if (pageEl) nudgeNextButton(pageEl);
    }
    // [전제] 필수 문항이 모두 완료되면, 보이는 비필수 서술형을 1회 스윕
    var pg = group.closest('.survey-page');
    if (pg && pageAllRequiredAnswered(pg)) sweepVisibleOptionalOnce(pg);
  }

  // ── 재등장 1회(규칙4) 관찰 ──
  function setupObserver(){
    _obs = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        var l = e.target;
        if (e.intersectionRatio === 0){ wasOut.set(l, true); }
        else if (e.intersectionRatio >= 0.99 && wasOut.get(l)){ if (playOnce(l)) wasOut.set(l, false); }
      });
    }, { threshold: [0, 0.99, 1] });
  }
  setupObserver();
  function observeLabel(l){
    if (!l || observed.has(l)) return;
    observed.add(l);
    if (!isFullyVisible(l)) wasOut.set(l, true);
    _obs.observe(l);
  }
  function unobserveAll(){
    observed.forEach(function(l){ _obs.unobserve(l); });
    observed.clear();
  }

  // ── 페이지 초기화 ──
  function initPage(page){
    var pageEl = document.querySelector('[data-page="' + page + '"]');
    if (!pageEl) return;
    var groups = Array.from(pageEl.querySelectorAll('.form-group'));

    // 규칙4: 모든 라벨 관찰 등록 (스크롤 재등장 시 1회 그라데이션)
    groups.forEach(function(g){ var l = getLabel(g); if (l) observeLabel(l); });

    // 규칙1: 첫 포커스 가능 미응답 문항 → 루프
    var target = firstFocusableUnanswered(pageEl);
    setFocus(target);
    if (target){
      focusInputIfText(target);
      var pageNum = parseInt(page, 10);
      if (!isNaN(pageNum) && pageNum !== 1) scrollFieldIntoView(getLabel(target) || target);
    }

    // 규칙4: 이미 완전히 보이는 문항은 즉시 1회 재생
    groups.forEach(function(g){
      var l = getLabel(g);
      if (l && isFullyVisible(l)){ if (playOnce(l)) wasOut.set(l, false); }
    });
  }

  // ── showPage 래핑 ──
  var _origShowPage = showPage;
  showPage = function(page, direction){
    _origShowPage(page, direction);
    _skipAutoScroll = true;
    clearFocus();
    unobserveAll();
    setTimeout(function(){
      initPage(page);
      observeNextBtn(page);
      setTimeout(function(){ _skipAutoScroll = false; }, 350);
    }, 400);
  };

  // ── 이벤트: 포커스 진입 ──
  document.addEventListener('focusin', function(e){
    var t = e.target;
    if (!t || !t.matches) return;
    if (!(t.matches('.form-input, textarea, select') || (t.closest && t.closest('.option-group')))) return;
    var group = t.closest('.form-group');
    if (!group) return;
    if (isNonReqText(group)){ clearFocus(); return; }  // 비필수 서술형은 포커스 안 함(검정)
    setFocus(group);
  });

  // ── 이벤트: 선택지 클릭(포커스) ──
  document.addEventListener('click', function(e){
    var oi = e.target.closest && e.target.closest('.option-item');
    if (!oi) return;
    var group = oi.closest('.form-group');
    if (!group || !isFocusable(group)) return;
    if (group !== focusedGroup) setFocus(group);
  });

  // ── selectOption 래핑: 선지형 선택 → solid → 자동 이동 ──
  var _origSelectOption = selectOption;
  selectOption = function(el){
    _origSelectOption(el);
    var group = el.closest('.form-group');
    if (!group) return;
    focusedGroup = group;
    var l = getLabel(group);
    if (l) applyFocusSolid(l);         // 규칙3: 완료+포커스 = solid 파랑
    setTimeout(function(){ advanceFrom(group); }, 280);  // 즉시 자동 이동
  };

  // ── toggleCheckbox 래핑: 복수응답형 → 유지, solid/loop 갱신 ──
  var _origToggleCheckbox = toggleCheckbox;
  toggleCheckbox = function(el){
    _origToggleCheckbox(el);
    var group = el.closest('.form-group');
    if (!group) return;
    if (group !== focusedGroup) setFocus(group); else refreshFocused();
  };

  // ── 이벤트: select(드롭다운) 변경 → 자동 이동 ──
  document.addEventListener('change', function(e){
    var t = e.target;
    if (!t || !t.matches || !t.matches('select')) return;
    if (!t.value || !t.value.trim()) return;
    var group = t.closest('.form-group');
    if (!group || !isFocusable(group)) return;
    setFocus(group);
    setTimeout(function(){ advanceFrom(group); }, 200);
  });

  // ── 이벤트: 입력 → 갱신 + 양식 완성 시 자동 이동(학번/전화번호) ──
  document.addEventListener('input', function(e){
    var t = e.target;
    if (!t || !t.matches || !t.matches('.form-input, textarea')) return;
    var group = t.closest('.form-group');
    if (!group) return;
    if (group === focusedGroup) refreshFocused();
    var name = t.getAttribute('data-name');
    if (name === 'studentId' || name === 'phone'){
      if (isAnswered(group)){
        if (group._lfAdvanced) return;
        group._lfAdvanced = true;
        setTimeout(function(){ advanceFrom(group); }, 200);
      } else {
        group._lfAdvanced = false;
      }
    }
  });

  // ── 이벤트: Enter/ArrowDown → 다음 이동(학번/전화번호, 자동완성 없는 필드) ──
  document.addEventListener('keydown', function(e){
    if (e.key !== 'Enter' && e.key !== 'ArrowDown') return;
    var t = e.target;
    if (!t || !t.matches || !t.matches('.form-input, textarea')) return;
    var name = t.getAttribute('data-name');
    if (name !== 'studentId' && name !== 'phone') return;
    var group = t.closest('.form-group');
    if (!group) return;
    var wrap = t.closest('.autocomplete-wrapper');
    if (wrap && wrap.querySelector('.autocomplete-dropdown.show')) return;
    if (isAnswered(group)){ e.preventDefault(); advanceFrom(group); }
  });

  // ── visibilitychange: 창/탭 전환 후 재등장 1회(규칙4) ──
  document.addEventListener('visibilitychange', function(){
    if (document.visibilityState === 'hidden'){
      observed.forEach(function(l){ wasOut.set(l, true); });
    } else {
      setTimeout(function(){
        observed.forEach(function(l){
          if (wasOut.get(l) && isFullyVisible(l)){ if (playOnce(l)) wasOut.set(l, false); }
        });
      }, 200);
    }
  });

  // ── 다음 버튼: 필수 완료 + 완전히 보일 때마다 팝 애니메이션 ──
  var _nextBtnObserver = null;
  var _nextBtnWasOut = new WeakMap();
  function setupNextBtnObserver(){
    if (_nextBtnObserver) _nextBtnObserver.disconnect();
    _nextBtnObserver = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        var btn = entry.target;
        if (entry.intersectionRatio === 0){ _nextBtnWasOut.set(btn, true); }
        else if (entry.intersectionRatio >= 0.99 && _nextBtnWasOut.get(btn)){
          _nextBtnWasOut.set(btn, false);
          if (areAllRequiredAnswered(btn)){
            btn.classList.remove('btn-ready-pop');
            void btn.offsetWidth;
            btn.classList.add('btn-ready-pop');
            btn.addEventListener('animationend', function(){ btn.classList.remove('btn-ready-pop'); }, { once: true });
          }
        }
      });
    }, { threshold: [0, 0.99, 1.0] });
  }
  setupNextBtnObserver();
  function areAllRequiredAnswered(btnEl){
    var pageEl = btnEl.closest('.survey-page');
    if (!pageEl) return false;
    var requiredFields = pageEl.querySelectorAll('[data-required="true"]');
    for (var i = 0; i < requiredFields.length; i++){
      var field = requiredFields[i];
      if (field.classList.contains('form-input') || field.tagName === 'TEXTAREA' || field.tagName === 'SELECT'){
        if (!field.value || !field.value.trim()) return false;
      } else if (field.classList.contains('option-group') || field.dataset.type === 'radio' || field.dataset.type === 'checkbox'){
        if (!field.querySelector('.option-item.selected')) return false;
      } else if (field.classList.contains('birthdate-group')){
        var y = document.getElementById('birthYear'), m = document.getElementById('birthMonth'), d = document.getElementById('birthDay');
        if (!y || !m || !d || !y.value.trim() || !m.value.trim() || !d.value.trim()) return false;
      } else {
        var inp = field.querySelector && field.querySelector('input, select, textarea');
        if (inp && !inp.value.trim()) return false;
      }
    }
    return true;
  }
  function observeNextBtn(page){
    _nextBtnObserver.disconnect();
    var pageEl = document.querySelector('[data-page="' + page + '"]');
    if (!pageEl) return;
    var nextBtn = pageEl.querySelector('.btn-primary');
    if (!nextBtn) return;
    var rect = nextBtn.getBoundingClientRect();
    var isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
    _nextBtnWasOut.set(nextBtn, !isVisible);
    _nextBtnObserver.observe(nextBtn);
  }
  function nudgeNextButton(pageEl){
    var nextBtn = pageEl.querySelector('.btn-primary');
    if (!nextBtn) return;
    nextBtn.classList.remove('btn-nudge');
    void nextBtn.offsetWidth;
    nextBtn.classList.add('btn-nudge');
    nextBtn.addEventListener('animationend', function(){ nextBtn.classList.remove('btn-nudge'); }, { once: true });
  }

  // ── 외부 호출 인터페이스 ──
  window.triggerLabelGradient = function(label){ if (label) playOnce(label); };  // 비필수 서술형 1회 재생
  window.lfAdvanceFrom = function(el){          // 특정 필드 완료 후 다음으로(학과 등)
    if (!el) return;
    var g = el.closest('.form-group'); if (!g) return;
    focusedGroup = g;
    var l = getLabel(g); if (l && isAnswered(g)) applyFocusSolid(l);
    advanceFrom(g);
  };

  // ── 초기 페이지(이미 표시됨) 수동 트리거 ──
  setTimeout(function(){
    initPage(currentPage);
    observeNextBtn(currentPage);
  }, 500);
})();

// ===== [4] 주관식 입력 시 해당 문항 상단 자동 스크롤 =====
// _disableAutoScroll: 교수·학습지원 분야(page 4) 이후 자동 스크롤 비활성화
function isAutoScrollDisabled() {
  return currentPage >= 4;
}

function scrollFieldIntoView(el) {
  if (_skipAutoScroll) return;
  if (isAutoScrollDisabled()) return;
  var formGroup = el.closest('.form-group');
  var target = formGroup || el;
  // 여유공간 (기존 48px + 20px 추가 = 68px)
  var a11yBar = document.getElementById('a11yBar');
  var offset = a11yBar ? a11yBar.offsetHeight + 68 : 120;
  var rect = target.getBoundingClientRect();
  var scrollTop = window.pageYOffset + rect.top - offset;
  window.scrollTo({ top: Math.max(0, scrollTop), behavior: 'smooth' });
}

(function() {
  // 생년월일 필드 스크롤 중복 방지 (아이폰 대응)
  var _birthScrolledFor = null;
  // 텍스트 입력(주관식), textarea 포커스 시 자동 스크롤
  document.addEventListener('focusin', function(e) {
    var target = e.target;
    if (!target.matches || !target.matches('.form-input, textarea')) return;
    if (_skipAutoScroll) return;
    if (isAutoScrollDisabled()) return;
    // 생년월일 필드: 같은 form-group 내에서 1회만 스크롤
    var isBirthField = (target.id === 'birthYear' || target.id === 'birthMonth' || target.id === 'birthDay');
    if (isBirthField) {
      var birthGroup = target.closest('.form-group');
      if (_birthScrolledFor === birthGroup) return; // 이미 스크롤함
      _birthScrolledFor = birthGroup;
      // 다른 form-group으로 이동하면 리셋
      setTimeout(function() {
        document.addEventListener('focusin', function resetBirth(ev) {
          if (ev.target.closest && ev.target.closest('.form-group') !== birthGroup) {
            _birthScrolledFor = null;
            document.removeEventListener('focusin', resetBirth);
          }
        });
      }, 100);
    }
    // 약간의 딜레이 (키보드 올라오는 시간 고려)
    setTimeout(function() {
      scrollFieldIntoView(target);
    }, 300);
  });
})();
