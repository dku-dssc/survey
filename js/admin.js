// ===== Admin panel: login, session, responses, folders, diff, autocomplete =====
// 원본 index.html에서 분리됨 (v5.0.1)

// v4.2.4: 폴더 정렬 2단계 닫기 로직 (toggleFolderSort 부근 참조)

// v6.0.0: 관리자 패널 열려있을 때 배경 스크롤 완전 차단
var _adminScrollGuardActive = false;
var _adminSavedScrollY = 0;
function _adminScrollGuard() {
  if (_adminScrollGuardActive) {
    window.scrollTo(0, 0);
  }
}

// v6.0.0: 모든 사이드 패널(이메일, 통계 분석 등)과 오버레이를 완전히 닫는 헬퍼
function closeAllSidePanels() {
  // 이메일 작성 패널
  var emailOverlay = document.getElementById('emailComposeOverlay');
  var emailPanel = document.getElementById('emailComposePanel');
  if (emailOverlay) emailOverlay.style.display = 'none';
  if (emailPanel) { emailPanel.style.display = 'none'; emailPanel.style.width = ''; emailPanel.style.transition = ''; }
  // 통계 분석 패널
  var analyticsOverlay = document.getElementById('analyticsOverlay');
  var analyticsPanel = document.getElementById('analyticsPanel');
  if (analyticsOverlay) analyticsOverlay.style.display = 'none';
  if (analyticsPanel) { analyticsPanel.style.display = 'none'; analyticsPanel.style.width = ''; analyticsPanel.style.transition = ''; }
  // 패널 디바이더 정리
  if (typeof hidePanelDivider === 'function') hidePanelDivider();
}

// v6.1: 관리자 패널 명시적 열기/닫기 (toggle 대신 add/remove로 상태 동기화 보장)
function openAdmin() {
  if (_loginInProgress) return;
  if (!foldersLoaded && adminToken) {
    loadFoldersFromServer().then(function() { updateAdminPanel(); });
  }
  var panel = document.getElementById('adminPanel');
  var overlay = document.getElementById('overlay');
  panel.classList.add('open');
  overlay.classList.add('show');
  // body 스크롤 잠금
  _adminSavedScrollY = window.scrollY;
  document.body.dataset.scrollY = _adminSavedScrollY;
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.top = '-' + _adminSavedScrollY + 'px';
  document.body.style.left = '0';
  document.body.style.right = '0';
  document.body.style.width = '100%';
  _adminScrollGuardActive = true;
  window.addEventListener('scroll', _adminScrollGuard, { passive: false });
  if (!adminToken && !isMasterMode) {
    showAdminLogin();
  }
}

function closeAdmin() {
  var panel = document.getElementById('adminPanel');
  var overlay = document.getElementById('overlay');
  // 1) 사이드 패널 먼저 정리 (hidePanelDivider 포함)
  closeAllSidePanels();
  // 2) analytics.js가 설정한 인라인 style 완전 제거 → CSS 기본값 복원
  panel.style.right = '';
  panel.style.filter = '';
  panel.style.opacity = '';
  panel.style.transition = '';
  // 3) 클래스 제거로 CSS right:-500px 적용
  panel.classList.remove('open');
  overlay.classList.remove('show');
  _adminScrollGuardActive = false;
  window.removeEventListener('scroll', _adminScrollGuard);
  var scrollY = parseInt(document.body.dataset.scrollY || '0', 10);
  document.documentElement.style.overflow = '';
  document.body.style.overflow = '';
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.right = '';
  document.body.style.width = '';
  window.scrollTo(0, scrollY);
}

function toggleAdmin() {
  if (_loginInProgress) return;
  var panel = document.getElementById('adminPanel');
  if (panel.classList.contains('open')) {
    closeAdmin();
  } else {
    openAdmin();
  }
}

function showAdminLogin() {
  _loginInProgress = false;  // v6.0.0: 세션 만료 후 X 버튼 작동 보장
  document.getElementById('adminLoginScreen').style.display = 'block';
  document.getElementById('adminContent').style.display = 'none';
  // ★ 근본 해결: input 요소를 완전히 교체하여 브라우저 autofill 상태를 근절
  // .value = '' 만으로는 :-webkit-autofill 의사 클래스가 해제되지 않아
  // 노란색 배경이 잔존하는 문제가 있었음 (v4.2.0 수정)
  resetAdminInputElement('adminIdInput', 'text', '아이디', 'off');
  resetAdminInputElement('adminPasswordInput', 'password', '비밀번호', 'new-password');
}

function resetAdminInputElement(id, type, placeholder, autocompleteVal) {
  var old = document.getElementById(id);
  if (!old) return;
  var fresh = document.createElement('input');
  fresh.type = type;
  fresh.id = id;
  fresh.className = 'form-input';
  fresh.placeholder = placeholder;
  fresh.setAttribute('autocomplete', autocompleteVal);
  fresh.setAttribute('data-lpignore', 'true');
  fresh.setAttribute('data-form-type', 'other');
  fresh.style.cssText = old.style.cssText;
  // v6.0.0: input focus 시 배경 스크롤 방지
  fresh.addEventListener('focus', function(e) {
    if (_adminScrollGuardActive) {
      // 브라우저의 scrollIntoView 방지 — 즉시 scroll 복원
      setTimeout(function() { window.scrollTo(0, 0); }, 0);
    }
  });
  // password 필드의 Enter 키 핸들러 복원
  if (type === 'password') {
    fresh.onkeypress = function(event) {
      if (event.key === 'Enter') { event.preventDefault(); adminLoginSubmit(); }
    };
  }
  old.parentNode.replaceChild(fresh, old);
}

function showAdminContent() {
  document.getElementById('adminLoginScreen').style.display = 'none';
  document.getElementById('adminContent').style.display = 'block';
}

var isMasterMode = false;
var masterToken = null;

var _loginInProgress = false;  // 로그인 중복 실행 방지

function showLoginDonut() {
  var existing = document.querySelector('.login-donut-overlay');
  if (existing) existing.remove();

  var svgNS = 'http://www.w3.org/2000/svg';
  var overlay = document.createElement('div');
  overlay.className = 'login-donut-overlay';
  overlay.id = 'loginDonutOverlay';

  var svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 56 56');
  svg.setAttribute('class', 'login-donut-svg spinning');
  svg.id = 'loginDonutSvg';

  var defs = document.createElementNS(svgNS, 'defs');
  var grad = document.createElementNS(svgNS, 'linearGradient');
  grad.id = 'loginDonutGrad';
  grad.setAttribute('gradientTransform', 'rotate(60)');
  grad.setAttribute('gradientUnits', 'userSpaceOnUse');
  grad.setAttribute('x1', '3.5'); grad.setAttribute('y1', '3.5');
  grad.setAttribute('x2', '52.5'); grad.setAttribute('y2', '52.5');
  [{o:'0%',c:'#e2f8ff'},{o:'20%',c:'#b8efff'},{o:'45%',c:'#62d4ff'},{o:'70%',c:'#3dbef5'},{o:'100%',c:'#1da8e9'}]
  .forEach(function(s) {
    var stop = document.createElementNS(svgNS, 'stop');
    stop.setAttribute('offset', s.o); stop.setAttribute('stop-color', s.c);
    grad.appendChild(stop);
  });
  defs.appendChild(grad);
  svg.appendChild(defs);

  var track = document.createElementNS(svgNS, 'circle');
  track.setAttribute('class', 'login-donut-track');
  track.setAttribute('cx', '28'); track.setAttribute('cy', '28');
  track.setAttribute('r', '22.5');
  track.id = 'loginDonutTrack';
  svg.appendChild(track);

  var arc = document.createElementNS(svgNS, 'circle');
  arc.setAttribute('class', 'login-donut-arc');
  arc.id = 'loginDonutArc';
  arc.setAttribute('cx', '28'); arc.setAttribute('cy', '28');
  arc.setAttribute('r', '22.5');
  arc.style.strokeDasharray = '92 48.5';
  svg.appendChild(arc);

  overlay.appendChild(svg);
  document.body.appendChild(overlay);
  return { overlay: overlay, svg: svg };
}

function loginSuccessAnimation(callback) {
  var svgNS = 'http://www.w3.org/2000/svg';
  var OUTER_EDGE = 24.5;
  var svg = document.getElementById('loginDonutSvg');
  var overlay = document.getElementById('loginDonutOverlay');
  var arc = document.getElementById('loginDonutArc');
  var track = document.getElementById('loginDonutTrack');
  var grad = document.getElementById('loginDonutGrad');
  if (!svg || !overlay || !arc) { if (callback) callback(); return; }

  var R = 22.5;
  var circumference = 2 * Math.PI * R;

  // ─── Phase 1: 아크 닫힘 (부분 호 → 완전한 링) ───
  svg.classList.remove('spinning');
  var cs = getComputedStyle(svg);
  var frozenTransform = cs.transform;
  svg.style.animation = 'none';
  svg.style.transform = frozenTransform && frozenTransform !== 'none'
    ? frozenTransform : 'translate(-50%, -50%)';

  var p1Start = null;
  var P1_DUR = 420;
  var initDash = 92;

  function phase1(ts) {
    if (!p1Start) p1Start = ts;
    var p = Math.min((ts - p1Start) / P1_DUR, 1);
    var ep = 1 - Math.pow(1 - p, 3);
    var dash = initDash + (circumference - initDash) * ep;
    arc.style.strokeDasharray = dash + ' ' + (circumference - dash);
    if (p < 1) {
      requestAnimationFrame(phase1);
    } else {
      arc.style.strokeDasharray = circumference + ' 0';
      setTimeout(phase2, 50);
    }
  }

  // ─── Phase 2: 링이 안쪽으로 두꺼워져서 원 됨 ───
  function phase2() {
    if (track) { track.style.transition = 'opacity 0.15s'; track.style.opacity = '0'; }
    arc.style.strokeLinecap = 'butt';
    arc.style.strokeDasharray = circumference * 5 + ' 0';

    var p2Start = null;
    var P2_DUR = 420;
    var startSW = 4;
    var endSW = OUTER_EDGE * 2;
    var startR = 22.5;

    function animate2(ts) {
      if (!p2Start) p2Start = ts;
      var p = Math.min((ts - p2Start) / P2_DUR, 1);
      var ep;
      if (p < 0.6) {
        var t = p / 0.6;
        ep = t * t * (3 - 2 * t);
        ep *= 0.82;
      } else {
        var t2 = (p - 0.6) / 0.4;
        ep = 0.82 + 0.22 * t2;
        ep += 0.03 * Math.sin(t2 * Math.PI * 2) * (1 - t2);
      }
      ep = Math.min(ep, 1.03);

      var sw = startSW + (endSW - startSW) * Math.min(ep, 1);
      var r = startR - startR * Math.min(ep, 1);
      r = Math.max(r, 0.5);
      arc.style.strokeWidth = sw;
      arc.setAttribute('r', r);
      var newCirc = 2 * Math.PI * r;
      arc.style.strokeDasharray = (newCirc + 10) + ' 0';

      if (p < 1) {
        requestAnimationFrame(animate2);
      } else {
        overlay.style.backdropFilter = 'none';
        overlay.style.webkitBackdropFilter = 'none';
        overlay.style.background = 'transparent';

        var cssCircle = document.createElement('div');
        cssCircle.id = 'loginCssCircle';
        cssCircle.style.cssText = 'position:absolute; top:50%; left:50%;'
          + 'transform:translate(-50%,-50%);'
          + 'width:56px; height:56px; border-radius:50%;'
          + 'background-color:#3dbef5;'
          + 'background-image:linear-gradient(150deg, #e2f8ff 0%, #b8efff 20%, #62d4ff 45%, #3dbef5 70%, #1da8e9 100%);'
          + 'box-shadow:0 0 10px rgba(98,212,255,0.4);'
          + 'z-index:10;';
        overlay.appendChild(cssCircle);

        requestAnimationFrame(function() { svg.remove(); });
        phase3(cssCircle);
      }
    }
    requestAnimationFrame(animate2);
  }

  // ─── Phase 3+4 통합: 펄스(커짐→점)→끊김 없이 확장 ───
  var cssCircleRef = null;
  var flowRAF = null;
  var vikingStart = null;

  function startGradientFlow() {
    vikingStart = null;
    function flow(ts) {
      if (!vikingStart) vikingStart = ts;
      var elapsed = (ts - vikingStart) / 1000;
      var baseSpeed = 180 + elapsed * 120;
      baseSpeed = Math.min(baseSpeed, 360);
      var angle = 150 + elapsed * baseSpeed;
      var ripple = Math.sin(elapsed * 4 * Math.PI * 2) * 8;
      angle = angle + ripple;
      if (cssCircleRef) {
        cssCircleRef.style.background = 'linear-gradient(' + (angle % 360).toFixed(1) + 'deg, #e2f8ff 0%, #b8efff 20%, #62d4ff 45%, #3dbef5 70%, #1da8e9 100%)';
      }
      flowRAF = requestAnimationFrame(flow);
    }
    requestAnimationFrame(flow);
  }
  function stopGradientFlow() { if (flowRAF) cancelAnimationFrame(flowRAF); }

  function phase3(circle) {
    cssCircleRef = circle;
    spawnLoginBubbles(overlay, 6);

    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var maxDim = Math.max(vw, vh);
    var targetScale = Math.ceil((maxDim * 1.6) / 54);

    var DUR_A = 180;
    var DUR_B = 260;
    var DUR_C = 420;
    var TOTAL = DUR_A + DUR_B + DUR_C;

    var PEAK = 1.18;
    var POINT = 0.02;
    var pStart = null;
    var gradientStarted = false;
    var flashShown = false;

    function animate(ts) {
      if (!pStart) pStart = ts;
      var elapsed = ts - pStart;
      var scale;

      if (elapsed < DUR_A) {
        var t = elapsed / DUR_A;
        scale = 1 + (PEAK - 1) * (1 - Math.pow(1 - t, 3));
      } else if (elapsed < DUR_A + DUR_B) {
        var t = (elapsed - DUR_A) / DUR_B;
        scale = PEAK + (POINT - PEAK) * (t * t * t);
      } else {
        if (!gradientStarted) { startGradientFlow(); gradientStarted = true; }
        if (!flashShown) { showLoginFlash(); flashShown = true; }

        var t = (elapsed - DUR_A - DUR_B) / DUR_C;
        t = Math.min(t, 1);
        var ep;
        if (t < 0.3) {
          ep = 2.5 * t * t;
        } else {
          var t2 = (t - 0.3) / 0.7;
          ep = 0.225 + 0.775 * (1 - Math.pow(1 - t2, 2.8));
        }
        scale = POINT + (targetScale - POINT) * ep;

        var glow = Math.max(0, 1 - ep * 2.5);
        circle.style.boxShadow = '0 0 ' + (10 * glow).toFixed(1) + 'px rgba(77,200,246,' + (0.35 * glow).toFixed(2) + ')';
      }

      circle.style.animation = 'none';
      circle.style.transform = 'translate(-50%,-50%) scale(' + Math.max(scale, 0.01).toFixed(4) + ')';

      if (elapsed < TOTAL) {
        requestAnimationFrame(animate);
      } else {
        stopGradientFlow();
        overlay.remove();
        phase5();
      }
    }
    requestAnimationFrame(animate);
  }

  // ─── Phase 5: Iris-out (페더 엣지 + opacity 페이드, 600ms) ───
  function phase5() {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var maxR = Math.ceil(Math.sqrt(vw * vw + vh * vh) / 2) + 50;

    var iris = document.createElement('div');
    iris.className = 'login-iris-overlay';
    iris.id = 'loginIrisOverlay';
    iris.style.setProperty('--iris-r', '0px');
    iris.style.opacity = '1';
    document.body.appendChild(iris);

    if (callback) callback();

    setTimeout(function() {
      var p5Start = null;
      var P5_DUR = 600;

      function easeOut(t) {
        return 1 - Math.pow(1 - t, 3.5);
      }

      function animate5(ts) {
        if (!p5Start) p5Start = ts;
        var elapsed = ts - p5Start;
        var progress = Math.min(elapsed / P5_DUR, 1);

        // 그라데이션 시계 방향 회전 (160° 시작, 초당 120° 회전)
        var gradAngle = 160 + (elapsed / 1000) * 120;
        iris.style.background =
          'radial-gradient(ellipse at 35% 25%, rgba(220,245,255,0.45) 0%, transparent 55%),'
          + 'radial-gradient(ellipse at 65% 75%, rgba(174,234,255,0.35) 0%, transparent 55%),'
          + 'linear-gradient(' + (gradAngle % 360).toFixed(1) + 'deg,'
          + '#e2f8ff 0%, #b8efff 20%, #8ce3ff 40%,'
          + '#62d4ff 60%, #3dbef5 80%, #1da8e9 100%)';

        var r = Math.round(easeOut(progress) * maxR);
        iris.style.setProperty('--iris-r', r + 'px');

        var opacity = Math.pow(1 - progress, 1.2);
        iris.style.opacity = opacity.toFixed(3);

        if (progress < 1) {
          requestAnimationFrame(animate5);
        } else {
          iris.style.opacity = '0';
          setTimeout(function() { iris.remove(); }, 30);
        }
      }
      requestAnimationFrame(animate5);
    }, 80);
  }

  requestAnimationFrame(phase1);
}

// ── 물방울 (펄스 완료 시) ──
function spawnLoginBubbles(container, count) {
  var colors = [
    'rgba(226,248,255,0.65)', 'rgba(184,239,255,0.6)',
    'rgba(140,227,255,0.55)', 'rgba(226,248,255,0.65)',
  ];
  for (var i = 0; i < count; i++) {
    var angle = (2 * Math.PI / count) * i + (Math.random() - 0.5) * 0.5;
    var dist = 30 + Math.random() * 22;
    var b = document.createElement('div');
    b.className = 'login-bubble';
    b.style.setProperty('--bx', (Math.cos(angle) * dist) + 'px');
    b.style.setProperty('--by', (Math.sin(angle) * dist) + 'px');
    b.style.setProperty('--bc', colors[i % colors.length]);
    b.style.setProperty('--bs', (4 + Math.random() * 4) + 'px');
    b.style.setProperty('--bd', (0.5 + Math.random() * 0.35) + 's');
    b.style.setProperty('--bdelay', (Math.random() * 0.1) + 's');
    container.appendChild(b);
    (function(el) { setTimeout(function() { el.remove(); }, 1100); })(b);
  }
}

// ── 플래시 효과 ──
function showLoginFlash() {
  var f = document.createElement('div');
  f.className = 'login-flash';
  document.body.appendChild(f);
  setTimeout(function() { f.remove(); }, 450);
}




function loginFailAnimation() {
  // 도넛(SVG) 제거
  var overlay = document.querySelector('.login-donut-overlay');
  if (overlay) overlay.remove();
  var iris = document.getElementById('loginIrisOverlay');
  if (iris) iris.remove();
  // 아이디/비번 필드 진동
  var idInput = document.getElementById('adminIdInput');
  var pwInput = document.getElementById('adminPasswordInput');
  [idInput, pwInput].forEach(function(el) {
    if (!el) return;
    el.classList.remove('login-shake');
    void el.offsetWidth;
    el.classList.add('login-shake');
    el.addEventListener('animationend', function() {
      el.classList.remove('login-shake');
    }, { once: true });
  });
}

async function adminLoginSubmit() {
  if (_loginInProgress) return;  // 중복 실행 방지
  // 스크롤 방지: 현재 스크롤 위치 보존
  var scrollPos = window.scrollY;
  window.scrollTo(0, scrollPos);
  var idInput = document.getElementById('adminIdInput');
  const pw = document.getElementById('adminPasswordInput').value;
  var adminId = idInput ? idInput.value.trim() : '';

  if (!adminId || !pw) {
    showToast('아이디와 비밀번호를 모두 입력하세요.');
    return;
  }

  _loginInProgress = true;
  showLoginDonut();

  try {
    const resp = await fetch(API_BASE + '/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: adminId, password: pw }),
    });

    const result = await resp.json();
    if (!resp.ok) {
      _loginInProgress = false;
      loginFailAnimation();
      showToast(result.error || '로그인에 실패했습니다.');
      return;
    }

    if (result.role === 'master') {
      // 마스터 모드: 설문으로 진입, 필수문항 스킵 가능
      masterToken = result.token;
      isMasterMode = true;
      adminLoggedInId = adminId;
      loginSuccessAnimation(function() {
        _loginInProgress = false;
        toggleAdmin(); // 패널 닫기
        startNewSurvey();
        showToast('마스터 모드로 설문을 시작합니다.');
      });
    } else {
      // 일반 관리자
      adminToken = result.token;
      adminLoggedInId = adminId;
      startAdminSessionTimer();
      // 로그인 성공 애니메이션 후 관리자 패널 표시
      loginSuccessAnimation(async function() {
        _loginInProgress = false;
        showAdminContent();
        showAdminTab('responses');
        showToast('관리자 로그인 성공!');
        await loadAdminResponses();
        await loadFoldersFromServer();
        await loadEnrollmentData();
        await loadLinkedEmail();
        await loadTotalStudents();
        // 폴더 로드 완료 후 패널 갱신 (로드 전 첫 렌더에서 빈 목록이었으므로)
        updateAdminPanel();
        var emailBar = document.getElementById('emailLinkBar');
        if (emailBar) {
          emailBar.style.display = 'flex';
          emailBar.classList.add('animate-in');
        }
        // v4.2.2: DB 사용량을 이메일 바 바로 아래에 표시
        if (adminToken) {
          renderDbUsageIndicator(document.getElementById('emailLinkBar'));
        }
      });
    }
  } catch (err) {
    _loginInProgress = false;
    loginFailAnimation();
    showToast('서버 연결 실패');
  }
}

// v4.2.2: DB 사용량 표시 렌더링 함수
// afterElement: 이 요소 바로 다음에 indicator를 삽입
function renderDbUsageIndicator(afterElement) {
  // 기존 indicator 있으면 제거
  var old = document.getElementById('dbUsageIndicator');
  if (old) old.remove();
  var indicator = document.createElement('div');
  indicator.id = 'dbUsageIndicator';
  indicator.style.cssText = 'margin-top:8px;padding:10px 14px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:10px;font-size:12px;color:var(--text-tertiary);display:flex;align-items:center;gap:8px;';
  indicator.innerHTML = '<span style="font-size:14px;">⏳</span> 저장 공간 조회 중...';
  afterElement.insertAdjacentElement('afterend', indicator);
  fetchDbSize().then(function(data) {
    if (!data || !data.success) {
      indicator.innerHTML = '<span style="font-size:14px;">⚠️</span> 저장 공간 정보를 가져올 수 없습니다.';
      return;
    }
    var usedBytes = data.used_bytes || 0;
    var maxBytes = data.max_bytes || (5 * 1024 * 1024 * 1024); // 5GB default
    var usedGB = (usedBytes / (1024*1024*1024)).toFixed(2);
    var maxGB = (maxBytes / (1024*1024*1024)).toFixed(0);
    var pct = maxBytes > 0 ? (usedBytes / maxBytes * 100) : 0;
    var barColor, warnIcon;
    if (pct >= 100) { barColor = '#1c1c1e'; warnIcon = '⚫'; }
    else if (pct >= 90) { barColor = '#ff3b30'; warnIcon = '🔴'; }
    else if (pct > 80) { barColor = '#ff9500'; warnIcon = '🟡'; }
    else { barColor = '#34c759'; warnIcon = '🟢'; }
    var warnMsg = '';
    if (pct >= 100) warnMsg = '<div style="color:#ff3b30;font-size:11px;margin-top:4px;font-weight:600;">⚠ 저장 공간이 가득 찼습니다. 데이터 삭제가 필요합니다.</div>';
    else if (pct >= 90) warnMsg = '<div style="color:#ff3b30;font-size:11px;margin-top:4px;">⚠ 저장 공간이 거의 가득 찼습니다.</div>';
    else if (pct > 80) warnMsg = '<div style="color:#ff9500;font-size:11px;margin-top:4px;">저장 공간 사용량이 높습니다.</div>';
    indicator.innerHTML = '<span style="font-size:14px;">' + warnIcon + '</span>' +
      '<div style="flex:1;">' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:4px;">' +
      '<span>저장 공간</span><span style="font-weight:600;color:var(--text-primary);">' + usedGB + 'GB / ' + maxGB + 'GB (' + pct.toFixed(1) + '%)</span></div>' +
      '<div style="height:6px;background:rgba(0,0,0,0.08);border-radius:3px;overflow:hidden;">' +
      '<div style="height:100%;width:' + Math.min(pct,100) + '%;background:' + barColor + ';border-radius:3px;transition:width 0.5s;"></div>' +
      '</div>' + warnMsg + '</div>';
  }).catch(function(err) {
    console.error('DB indicator 렌더 실패:', err);
    indicator.innerHTML = '<span style="font-size:14px;">⚠️</span> 저장 공간 정보를 가져올 수 없습니다.';
  });
}

async function loadAdminResponses() {
  if (!adminToken) return;

  try {
    const resp = await fetch(API_BASE + '/api/admin/responses', {
      headers: { Authorization: 'Bearer ' + adminToken },
    });

    const result = await resp.json();
    if (!resp.ok) {
      if (resp.status === 401) {
        adminToken = null;
        linkedEmail = null;
        clearAdminSessionTimer();
        closeAllSidePanels();  // v6.0.0: 사이드 패널 정리
        showAdminLogin();
        showToast('세션이 만료되었습니다. 다시 로그인하세요.');
        return;
      }
      throw new Error(result.error);
    }

    responses = result.responses;
    updateAdminPanel();
  } catch (err) {
    showToast('응답 데이터 불러오기 실패');
  }
}

function showAdminTab(tab) {
  document.getElementById('adminResponses').style.display =
    tab === 'responses' ? 'block' : 'none';
  document.getElementById('adminLetter').style.display =
    tab === 'letter' ? 'block' : 'none';
  document.getElementById('adminSettings').style.display =
    tab === 'settings' ? 'block' : 'none';
  ['tabResponses','tabLetter','tabSettings'].forEach(function(id) {
    var el = document.getElementById(id);
    var match = (id === 'tabResponses' && tab === 'responses') ||
                (id === 'tabLetter' && tab === 'letter') ||
                (id === 'tabSettings' && tab === 'settings');
    el.classList.toggle('btn-primary', match);
    el.classList.toggle('btn-secondary', !match);
  });
  if (tab === 'settings') {
    renderEnrollmentFiles();
    renderCurrentMapping();
    loadDeadlineSettings();
  }
}


// ===== 폴더 관리 (v4.2.0 → v4.2.2 서버 연동) =====
var customFolders = []; // [{id, name, createdAt, items: []}]
var foldersLoaded = false;

// v4.2.2: 서버에서 폴더 목록 불러오기
async function loadFoldersFromServer() {
  try {
    if (!adminToken) return;
    var resp = await fetch(API_BASE + '/api/admin/folders', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    if (!resp.ok) return;
    var data = await resp.json();
    if (data.success && data.folders) {
      customFolders = data.folders.map(function(f) {
        return {
          id: 'cf_' + f.id,
          serverId: f.id,
          name: f.name,
          createdAt: f.created_at,
          sortOrder: f.sort_order,
          items: f.items ? (typeof f.items === 'string' ? JSON.parse(f.items) : f.items) : []
        };
      });
      foldersLoaded = true;
    }
  } catch(e) { console.error('폴더 로드 실패:', e); }
}

// v4.2.2: 서버에 폴더 생성
async function createFolderOnServer(name) {
  try {
    if (!adminToken) { console.error('폴더 생성: 토큰 없음'); return null; }
    var resp = await fetch(API_BASE + '/api/admin/folders', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + adminToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name })
    });
    if (!resp.ok) {
      var errText = await resp.text();
      console.error('폴더 생성 API 에러:', resp.status, errText);
      return null;
    }
    var data = await resp.json();
    console.log('폴더 생성 응답:', JSON.stringify(data));
    return data.folder || null;
  } catch(e) { console.error('폴더 생성 실패:', e); return null; }
}

// v4.2.2: 서버 폴더 업데이트
async function updateFolderOnServer(serverId, updates) {
  try {
    if (!adminToken) return false;
    var resp = await fetch(API_BASE + '/api/admin/folders/' + serverId, {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + adminToken, 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return resp.ok;
  } catch(e) { console.error('폴더 수정 실패:', e); return false; }
}

// v4.2.2: 서버 폴더 삭제
async function deleteFolderOnServer(serverId) {
  try {
    if (!adminToken) return false;
    var resp = await fetch(API_BASE + '/api/admin/folders/' + serverId, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    return resp.ok;
  } catch(e) { console.error('폴더 삭제 실패:', e); return false; }
}

// v4.2.2: D1 DB 사용량 조회
async function fetchDbSize() {
  try {
    if (!adminToken) { console.warn('DB사용량: 토큰 없음'); return null; }
    console.log('DB사용량 조회 시작, 토큰:', adminToken ? adminToken.substring(0,8) + '...' : 'null');
    var resp = await fetch(API_BASE + '/api/admin/db-size', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    console.log('DB사용량 응답 상태:', resp.status);
    if (!resp.ok) {
      var errText = await resp.text();
      console.error('DB사용량 API 에러:', resp.status, errText);
      return null;
    }
    var data = await resp.json();
    console.log('DB사용량 데이터:', JSON.stringify(data));
    return data;
  } catch(e) { console.error('DB사용량 조회 실패:', e); return null; }
}
var folderDeleteMode = false;
var folderSortKey = 'name'; // 'name', 'created', 'size'
var folderSortDir = 'asc'; // 'asc', 'desc'
var selectedCustomFolder = null;
var checkedFolderIds = new Set();

function generateFolderId() {
  return 'f_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
}

async function addNewFolder() {
  folderDeleteMode = false;
  checkedFolderIds.clear();
  var serverFolder = await createFolderOnServer('새 폴더');
  if (!serverFolder) { showToast('폴더 생성에 실패했습니다.'); return; }
  var newFolder = {
    id: 'cf_' + serverFolder.id,
    serverId: serverFolder.id,
    name: serverFolder.name,
    createdAt: serverFolder.created_at,
    sortOrder: serverFolder.sort_order,
    items: []
  };
  customFolders.push(newFolder);
  updateAdminPanel();
  setTimeout(function() {
    var nameEl = document.querySelector('[data-folder-id="' + newFolder.id + '"] .semester-folder-name');
    if (nameEl) startFolderNameEdit(nameEl, newFolder.id);
  }, 100);
}

function toggleFolderDeleteMode() {
  folderDeleteMode = !folderDeleteMode;
  checkedFolderIds.clear();
  updateAdminPanel();
}

// v4.2.6: 자물쇠 클릭 시 좌우 진동
function shakeLockIcon(el) {
  if (!el) return;
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
  el.addEventListener('animationend', function() { el.classList.remove('shake'); }, { once: true });
}
// v4.2.7: 폴더 아이콘 클릭 → 부모의 자물쇠 진동
function shakeParentLock(iconEl) {
  var folder = iconEl.closest('.semester-folder');
  if (folder) shakeLockIcon(folder.querySelector('.folder-lock-icon'));
}

function toggleFolderCheck(folderId, e) {
  if (e) e.stopPropagation();
  if (checkedFolderIds.has(folderId)) {
    checkedFolderIds.delete(folderId);
  } else {
    checkedFolderIds.add(folderId);
  }
  updateAdminPanel();
}

function confirmDeleteFolders() {
  if (checkedFolderIds.size === 0) return;
  var count = checkedFolderIds.size;
  // Show custom modal
  var modalHtml = '<div class="folder-delete-modal-overlay" id="folderDeleteModal">' +
    '<div class="folder-delete-modal">' +
    '<h4>⚠️ 폴더 삭제</h4>' +
    '<p>선택한 ' + count + '개 폴더와 안에 있는 모든 내용물은<br/><strong>복구할 수 없습니다.</strong><br/>정말 삭제하시겠습니까?</p>' +
    '<div class="folder-delete-modal-actions">' +
    '<button class="cancel-btn" onclick="closeFolderDeleteModal()">취소</button>' +
    '<button class="confirm-delete-btn" onclick="executeDeleteFolders()">삭제</button>' +
    '</div></div></div>';
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeFolderDeleteModal() {
  var m = document.getElementById('folderDeleteModal');
  if (m) m.remove();
}

async function executeDeleteFolders() {
  // v4.2.2: 서버에서도 삭제
  for (var cid of checkedFolderIds) {
    var folder = customFolders.find(function(f) { return f.id === cid; });
    if (folder && folder.serverId) await deleteFolderOnServer(folder.serverId);
  }
  customFolders = customFolders.filter(function(f) {
    return !checkedFolderIds.has(f.id);
  });
  checkedFolderIds.clear();
  folderDeleteMode = false;
  closeFolderDeleteModal();
  updateAdminPanel();
  showToast('폴더가 삭제되었습니다.');
}

// v4.2.4: 2단계 정렬 닫기 로직
var sortOptionClicked = false; // Phase 2 전환 플래그

function toggleFolderSort() {
  var opts = document.getElementById('folderSortOptions');
  var wrap = document.getElementById('folderSortWrap');
  if (!opts || !wrap) return;
  var isOpen = opts.classList.toggle('open');
  wrap.classList.toggle('sort-open', isOpen);
  if (isOpen) {
    sortOptionClicked = false; // Phase 1 시작
    setTimeout(function() {
      var panel = document.querySelector('.admin-panel');
      if (panel) {
        var wrapRect = wrap.getBoundingClientRect();
        var panelRect = panel.getBoundingClientRect();
        if (wrapRect.bottom + 130 > panelRect.bottom) {
          panel.scrollBy({ top: 150, behavior: 'smooth' });
        }
      }
    }, 50);
  } else {
    sortOptionClicked = false;
  }
}

function closeFolderSortPanel() {
  var opts = document.getElementById('folderSortOptions');
  var wrap = document.getElementById('folderSortWrap');
  if (!opts || !wrap) return;
  opts.classList.remove('open');
  wrap.classList.remove('sort-open');
  sortOptionClicked = false;
}

// Phase 1: ESC 또는 바깥 클릭으로 닫힘
// Phase 2: ESC/바깥클릭 시 닫히지만, 마우스가 영역 안이면 유지
document.addEventListener('click', function(e) {
  var wrap = document.getElementById('folderSortWrap');
  if (!wrap) return;
  var opts = document.getElementById('folderSortOptions');
  if (!opts || !opts.classList.contains('open')) return;
  if (!wrap.contains(e.target)) {
    // 바깥 클릭 — Phase 1이든 2든 닫힘
    closeFolderSortPanel();
  }
});
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    var opts = document.getElementById('folderSortOptions');
    if (opts && opts.classList.contains('open')) {
      closeFolderSortPanel();
    }
  }
});
// Phase 2: 옵션 클릭 후 마우스가 영역 밖으로 나가면 닫힘
document.addEventListener('mouseover', function(e) {
  if (!sortOptionClicked) return; // Phase 1에서는 mouseleave 무시
  var wrap = document.getElementById('folderSortWrap');
  if (!wrap) return;
  var opts = document.getElementById('folderSortOptions');
  if (!opts || !opts.classList.contains('open')) return;
  if (!wrap.contains(e.target)) {
    closeFolderSortPanel();
  }
});

function setFolderSort(key) {
  if (folderSortKey === key) {
    folderSortDir = folderSortDir === 'asc' ? 'desc' : 'asc';
  } else {
    folderSortKey = key;
    folderSortDir = 'asc';
  }
  sortCustomFolders();
  // v4.2.6: Phase 2 전환 — 이후 마우스가 밖으로 나가면 닫힘
  sortOptionClicked = true;
  // 폴더 순서 반영 후 드롭다운 다시 열기
  updateAdminPanel();
  // updateAdminPanel()이 DOM을 다시 그리므로 드롭다운 재오픈
  var opts2 = document.getElementById('folderSortOptions');
  var wrap2 = document.getElementById('folderSortWrap');
  if (opts2) opts2.classList.add('open');
  if (wrap2) wrap2.classList.add('sort-open');
}

// v4.2.4: 정렬 2단계 닫기 — toggleFolderSort 부근에 구현

function sortCustomFolders() {
  var dir = folderSortDir === 'asc' ? 1 : -1;
  customFolders.sort(function(a, b) {
    var result = 0;
    if (folderSortKey === 'name') {
      result = a.name.localeCompare(b.name, 'ko');
    } else if (folderSortKey === 'created') {
      result = new Date(a.createdAt) - new Date(b.createdAt);
    } else if (folderSortKey === 'size') {
      var sizeA = (a.items || []).length;
      var sizeB = (b.items || []).length;
      result = sizeA - sizeB;
      // 동급이면 이름순
      if (result === 0) result = a.name.localeCompare(b.name, 'ko');
    }
    return result * dir;
  });
}

// ===== v4.2.3: 폴더 내 파일 관리 =====

async function loadFolderFiles(cf) {
  if (!cf.serverId || !adminToken) return;
  var listEl = document.getElementById('folderFiles_' + cf.id);
  if (!listEl) return;
  try {
    var resp = await fetch(API_BASE + '/api/admin/folders/' + cf.serverId + '/files', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    if (!resp.ok) { listEl.innerHTML = '<p style="text-align:center;color:var(--text-tertiary);padding:20px 0;">파일 목록을 불러올 수 없습니다.</p>'; return; }
    var data = await resp.json();
    if (!data.success || !data.files || data.files.length === 0) {
      listEl.innerHTML = '<p style="text-align:center;color:var(--text-tertiary);padding:20px 0;">이 폴더는 비어 있습니다.</p>';
      return;
    }
    listEl.innerHTML = data.files.map(function(f) {
      var meta = f.metadata ? (typeof f.metadata === 'string' ? JSON.parse(f.metadata) : f.metadata) : {};
      var typeIcon = f.file_type === 'survey-response' ? '📋' : '📄';
      var badge = f.file_type === 'survey-response'
        ? '<span class="folder-file-badge survey">설문</span>'
        : '<span class="folder-file-badge upload">업로드</span>';
      var metaText = '';
      if (meta.disabilityType) metaText += escapeHtml(meta.disabilityType) + ' · ';
      if (meta.studentId) metaText += escapeHtml(meta.studentId) + ' · ';
      metaText += formatFileSize(f.file_size) + ' · ' + new Date(f.created_at).toLocaleDateString('ko-KR');
      return '<div class="folder-file-item">' +
        '<div class="folder-file-info">' +
        '<div class="folder-file-name">' + typeIcon + ' ' + escapeHtml(f.file_name) + badge + '</div>' +
        '<div class="folder-file-meta">' + metaText + '</div>' +
        '</div>' +
        '<button class="folder-file-delete-btn" onclick="deleteFolderFile(' + cf.serverId + ',' + f.id + ',\'' + cf.id + '\')">삭제</button>' +
        '</div>';
    }).join('');
  } catch(e) {
    console.error('폴더 파일 로드 실패:', e);
    listEl.innerHTML = '<p style="text-align:center;color:var(--text-tertiary);padding:20px 0;">파일 목록 로드 오류</p>';
  }
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  var units = ['B', 'KB', 'MB'];
  var i = 0;
  var size = bytes;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
  return size.toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
}

function uploadFileToFolder(cfId) {
  var cf = customFolders.find(function(f) { return f.id === cfId; });
  if (!cf || !cf.serverId) return;
  var input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.hwp';
  input.addEventListener('change', async function() {
    if (!input.files || input.files.length === 0) return;
    var uploadCount = 0;
    for (var i = 0; i < input.files.length; i++) {
      var file = input.files[i];
      if (file.size > 2 * 1024 * 1024) {
        showToast(file.name + ': 2MB 초과 (건너뜀)');
        continue;
      }
      try {
        var base64 = await fileToBase64(file);
        var resp = await fetch(API_BASE + '/api/admin/folders/' + cf.serverId + '/files', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + adminToken, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_name: file.name,
            file_type: 'upload',
            file_size: file.size,
            file_data: base64,
            metadata: { originalType: file.type }
          })
        });
        if (resp.ok) uploadCount++;
        else showToast(file.name + ' 업로드 실패');
      } catch(e) {
        console.error('파일 업로드 실패:', e);
        showToast(file.name + ' 업로드 오류');
      }
    }
    if (uploadCount > 0) {
      showToast(uploadCount + '개 파일 업로드 완료');
      loadFolderFiles(cf);
    }
  });
  input.click();
}

function fileToBase64(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload = function() { resolve(reader.result.split(',')[1]); };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function importSurveyDataToFolder(cfId) {
  var cf = customFolders.find(function(f) { return f.id === cfId; });
  if (!cf || !cf.serverId) return;
  if (responses.length === 0) { showToast('설문 응답 데이터가 없습니다.'); return; }

  // 장애 유형별 그룹핑 모달
  var disabilityGroups = {};
  responses.forEach(function(r, idx) {
    var dtype = r.disability || '미분류';
    if (!disabilityGroups[dtype]) disabilityGroups[dtype] = [];
    disabilityGroups[dtype].push({ index: idx, name: r.name || '이름없음', studentId: r.studentId || '' });
  });

  var typeList = Object.keys(disabilityGroups).sort();
  var modalHtml = '<div class="folder-delete-modal-overlay" id="surveyImportModal">' +
    '<div class="folder-delete-modal" style="max-width:420px;text-align:left;">' +
    '<h4 style="color:var(--primary);">📋 설문 데이터 가져오기</h4>' +
    '<p style="font-size:12px;margin-bottom:12px;">가져올 장애 유형을 선택하세요. 선택한 유형의 학생 데이터가 이 폴더에 추가됩니다.</p>' +
    '<div style="max-height:250px;overflow-y:auto;margin-bottom:16px;">';
  typeList.forEach(function(dt) {
    var count = disabilityGroups[dt].length;
    modalHtml += '<label style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;cursor:pointer;font-size:13px;transition:background 0.15s;" onmouseover="this.style.background=\'rgba(0,113,227,0.06)\'" onmouseout="this.style.background=\'transparent\'">' +
      '<input type="checkbox" class="survey-import-check" value="' + dt + '" checked style="accent-color:var(--primary);width:16px;height:16px;">' +
      '<span style="font-weight:600;">' + dt + '</span>' +
      '<span style="color:var(--text-tertiary);font-size:11px;margin-left:auto;">' + count + '명</span>' +
      '</label>';
  });
  modalHtml += '</div>' +
    '<div class="folder-delete-modal-actions">' +
    '<button class="cancel-btn" onclick="document.getElementById(\'surveyImportModal\').remove()">취소</button>' +
    '<button class="confirm-delete-btn" style="background:var(--primary);" onclick="executeSurveyImport(\'' + cfId + '\')">가져오기</button>' +
    '</div></div></div>';
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function executeSurveyImport(cfId) {
  var cf = customFolders.find(function(f) { return f.id === cfId; });
  if (!cf || !cf.serverId) return;

  var checks = document.querySelectorAll('.survey-import-check:checked');
  var selectedTypes = [];
  checks.forEach(function(c) { selectedTypes.push(c.value); });

  if (selectedTypes.length === 0) { showToast('하나 이상의 유형을 선택하세요.'); return; }

  // 선택된 장애 유형에 해당하는 응답 ID 수집
  var responseIds = [];
  responses.forEach(function(r, idx) {
    var dtype = r.disability || '미분류';
    if (selectedTypes.includes(dtype)) {
      responseIds.push(r.id || idx);
    }
  });

  if (responseIds.length === 0) { showToast('해당하는 응답이 없습니다.'); return; }

  try {
    var resp = await fetch(API_BASE + '/api/admin/folders/' + cf.serverId + '/files/survey-data', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + adminToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ response_ids: responseIds })
    });
    var data = await resp.json();
    if (data.success) {
      showToast(data.imported + '개 학생 데이터가 추가되었습니다.');
      loadFolderFiles(cf);
    } else {
      showToast('데이터 가져오기 실패: ' + (data.error || ''));
    }
  } catch(e) {
    console.error('설문 데이터 가져오기 실패:', e);
    showToast('데이터 가져오기 오류');
  }

  var modal = document.getElementById('surveyImportModal');
  if (modal) modal.remove();
}

async function deleteFolderFile(serverId, fileId, cfId) {
  if (!confirm('이 파일을 삭제하시겠습니까?')) return;
  try {
    var resp = await fetch(API_BASE + '/api/admin/folders/' + serverId + '/files/' + fileId, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    if (resp.ok) {
      showToast('파일이 삭제되었습니다.');
      var cf = customFolders.find(function(f) { return f.id === cfId; });
      if (cf) loadFolderFiles(cf);
    } else {
      showToast('파일 삭제 실패');
    }
  } catch(e) {
    console.error('파일 삭제 오류:', e);
    showToast('파일 삭제 오류');
  }
}

function startFolderNameEdit(nameEl, folderId) {
  if (folderDeleteMode) return; // 삭제 모드에서는 이름 편집 차단
  var folder = customFolders.find(function(f) { return f.id === folderId; });
  if (!folder) return;
  // textarea로 Shift+Enter 줄바꿈 지원 (최대 3줄, v4.2.1)
  var ta = document.createElement('textarea');
  ta.className = 'semester-folder-name-input';
  ta.value = folder.name.replace(/<br\s*\/?>/gi, '\n');
  ta.setAttribute('data-folder-id', folderId);
  ta.rows = Math.min(3, (folder.name.match(/<br/gi) || []).length + 1);
  ta.style.resize = 'none';
  ta.style.overflow = 'hidden';
  ta.style.height = 'auto';
  ta.style.minHeight = '16px';

  var finished = false;
  function finishEdit() {
    if (finished) return;
    finished = true;
    var lines = ta.value.split('\n').slice(0, 3); // 최대 3줄
    var trimmed = lines.map(function(l) { return l.trim(); }).filter(function(l) { return l; });
    var newName = trimmed.join('<br>') || '새 폴더';
    folder.name = newName;
    if (folder.serverId) updateFolderOnServer(folder.serverId, { name: newName });
    updateAdminPanel();
  }

  ta.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && e.shiftKey) {
      // 현재 줄 수 체크 (최대 3줄)
      var lineCount = ta.value.split('\n').length;
      if (lineCount >= 3) { e.preventDefault(); return; }
      // 줄바꿈 허용 — 기본 동작
      setTimeout(function() {
        ta.style.height = 'auto';
        ta.style.height = ta.scrollHeight + 'px';
      }, 0);
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); finishEdit();
    } else if (e.key === 'Escape') {
      finishEdit();
    }
  });
  ta.addEventListener('blur', finishEdit);

  nameEl.innerHTML = '';
  nameEl.appendChild(ta);
  ta.focus();
  ta.select();
  // 초기 높이 맞추기
  setTimeout(function() { ta.style.height = ta.scrollHeight + 'px'; }, 0);
}

function selectCustomFolder(folderId) {
  if (folderDeleteMode) return;
  selectedCustomFolder = folderId;
  updateAdminPanel();
}

function backToFolders() {
  selectedCustomFolder = null;
  currentSatisfactionFolder = null; // v6.1.2
  currentSemesterFolder = null;
  updateAdminPanel();
}

// Drag & drop for folder reorder (simplified for grid)
var folderDragState = { dragging: null, overTarget: null };

function onFolderDragStart(e, folderId) {
  if (folderDeleteMode) { e.preventDefault(); return; }
  folderDragState.dragging = folderId;
  e.dataTransfer.effectAllowed = 'move';
  e.target.style.opacity = '0.5';
}

function onFolderDragOver(e, folderId) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  folderDragState.overTarget = folderId;
}

function onFolderDragEnd(e) {
  e.target.style.opacity = '1';
  if (folderDragState.dragging && folderDragState.overTarget &&
      folderDragState.dragging !== folderDragState.overTarget) {
    var fromIdx = customFolders.findIndex(function(f) { return f.id === folderDragState.dragging; });
    var toIdx = customFolders.findIndex(function(f) { return f.id === folderDragState.overTarget; });
    if (fromIdx >= 0 && toIdx >= 0) {
      var item = customFolders.splice(fromIdx, 1)[0];
      customFolders.splice(toIdx, 0, item);
      updateAdminPanel();
    }
  }
  folderDragState.dragging = null;
  folderDragState.overTarget = null;
}

// ===== 학기 폴더 관련 =====
var currentSemesterFolder = null;
var currentSatisfactionFolder = null; // v6.1.2: 만족도 조사 폴더 선택 상태
var cachedSatisfactionResponses = null; // v6.1.2: 만족도 응답 캐시

function getSemesterFromDate(dateStr) {
  var d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  var y = d.getFullYear();
  var m = d.getMonth() + 1;
  return { year: y, semester: (m >= 7) ? 2 : 1 };
}

// v5.2.0: 지원 요청 현황 막대 그래프
function renderSupportRequestChart() {
  var container = document.getElementById('supportRequestChart');
  if (!container) return;
  if (responses.length === 0) {
    container.innerHTML = '<div style="color:var(--text-tertiary);font-size:11px;">응답 데이터 없음</div>';
    return;
  }
  // 지원 유형별 집계 — teachSupport 필드에서 추출
  var supportCounts = {};
  responses.forEach(function(r) {
    var ts = r.teachSupport;
    if (!ts) return;
    var items = Array.isArray(ts) ? ts : [ts];
    items.forEach(function(item) {
      if (item && item.trim()) {
        supportCounts[item.trim()] = (supportCounts[item.trim()] || 0) + 1;
      }
    });
  });
  // 정렬 (많은 순)
  var sorted = Object.keys(supportCounts).sort(function(a, b) {
    return supportCounts[b] - supportCounts[a];
  });
  if (sorted.length === 0) {
    container.innerHTML = '<div style="color:var(--text-tertiary);font-size:11px;">지원 요청 데이터 없음</div>';
    return;
  }
  var maxCount = supportCounts[sorted[0]];
  var top = sorted.slice(0, 5); // 상위 5개
  var html = '';
  top.forEach(function(label) {
    var count = supportCounts[label];
    var pct = Math.round((count / maxCount) * 100);
    // 라벨 축약
    var shortLabel = label.length > 6 ? label.substring(0, 6) + '…' : label;
    html += '<div class="support-bar-row">';
    html += '<span class="support-bar-label" title="' + escapeHtml(label) + '">' + escapeHtml(shortLabel) + '</span>';
    html += '<div class="support-bar-track"><div class="support-bar-fill" style="width:' + pct + '%"></div></div>';
    html += '<span class="support-bar-count">' + count + '명</span>';
    html += '</div>';
  });
  if (sorted.length > 5) {
    html += '<div style="font-size:10px;color:var(--text-tertiary);text-align:right;margin-top:2px;">외 ' + (sorted.length - 5) + '개</div>';
  }
  container.innerHTML = html;
}

// v6.1.2: 만족도(%) 업데이트 — 만족도 조사 API에서 실제 데이터 조회
async function updateSatisfactionRate() {
  var el = document.getElementById('satisfactionRate');
  if (!el) return;
  if (!adminToken) { el.textContent = '—'; return; }
  try {
    var resp = await fetch(API_BASE + '/api/admin/satisfaction', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    if (!resp.ok) { el.textContent = '—'; return; }
    var data = await resp.json();
    if (!data.success || !data.responses || data.responses.length === 0) {
      el.textContent = '—';
      return;
    }
    // overallScore 평균 계산 (1~5점 → 백분율)
    var total = 0;
    var count = 0;
    data.responses.forEach(function(r) {
      if (r.overallScore && typeof r.overallScore === 'number') {
        total += r.overallScore;
        count++;
      }
    });
    if (count === 0) { el.textContent = '—'; return; }
    var avg = total / count;
    var pct = Math.round((avg / 5) * 100);
    el.textContent = pct + '%';
  } catch(e) {
    el.textContent = '—';
  }
}

// v6.1.2: 만족도 조사 학기별 그룹 생성 (API 데이터 기반)
function getSatisfactionSemesters(demandGroups) {
  // 수요조사 그룹의 학기에서 만족도 조사 학기 유추
  // 수요조사 1학기(7~12월) → 해당 년도 1학기 만족도 (7월)
  // 수요조사 2학기(1~6월) → 전년도 2학기 만족도 (1월)
  var semesters = [];
  var seen = {};
  demandGroups.forEach(function(g) {
    // 해당 학기에 대응하는 만족도 조사 학기 키
    var key = g.year + '-' + g.semester;
    if (!seen[key]) {
      seen[key] = true;
      semesters.push({ year: g.year, semester: g.semester, count: 0 });
    }
  });
  // 만족도 응답 수는 비동기로 가져오므로 일단 0으로 세팅 (updateSatisfactionFolderCounts에서 갱신)
  updateSatisfactionFolderCounts(semesters);
  return semesters;
}

// v6.1.2: 만족도 폴더 응답 수 비동기 업데이트
async function updateSatisfactionFolderCounts(semesters) {
  if (!adminToken) return;
  for (var i = 0; i < semesters.length; i++) {
    var s = semesters[i];
    var semesterKey = s.year + '-' + s.semester;
    try {
      var resp = await fetch(API_BASE + '/api/admin/satisfaction?semester=' + encodeURIComponent(semesterKey), {
        headers: { 'Authorization': 'Bearer ' + adminToken }
      });
      if (resp.ok) {
        var data = await resp.json();
        if (data.success && data.responses) {
          // DOM에서 해당 폴더의 카운트 업데이트
          var countEls = document.querySelectorAll('.semester-folder .semester-folder-name');
          countEls.forEach(function(nameEl) {
            if (nameEl.textContent.includes('만족도 조사') && nameEl.textContent.includes(s.year + '년 ' + s.semester + '학기')) {
              var countEl = nameEl.parentElement.querySelector('.semester-folder-count');
              if (countEl) countEl.textContent = data.responses.length + '건';
            }
          });
        }
      }
    } catch(e) { /* 무시 */ }
  }
}

function selectSatisfactionFolder(year, semester) {
  if (folderDeleteMode) return;
  currentSemesterFolder = null;
  selectedCustomFolder = null;
  currentSatisfactionFolder = { year: year, semester: semester };
  updateAdminPanel();
}

// v6.1.2: 만족도 조사 폴더 내 응답 로딩
async function loadSatisfactionFolderData(year, semester) {
  var list = document.getElementById('responseList');
  if (!list || !adminToken) return;
  var semesterKey = year + '-' + semester;
  try {
    var resp = await fetch(API_BASE + '/api/admin/satisfaction?semester=' + encodeURIComponent(semesterKey), {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    if (!resp.ok) {
      list.innerHTML = '<div class="folder-breadcrumb"><span class="bc-link" onclick="backToFolders()">📂 응답 목록</span><span class="bc-sep"> › </span><span>만족도 조사 — ' + year + '년 ' + semester + '학기</span></div>' +
        '<p style="text-align:center;color:var(--text-tertiary);padding:20px 0;">만족도 데이터를 불러올 수 없습니다.</p>';
      return;
    }
    var data = await resp.json();
    if (!data.success || !data.responses || data.responses.length === 0) {
      list.innerHTML = '<div class="folder-breadcrumb"><span class="bc-link" onclick="backToFolders()">📂 응답 목록</span><span class="bc-sep"> › </span><span>만족도 조사 — ' + year + '년 ' + semester + '학기</span></div>' +
        '<p style="text-align:center;color:var(--text-tertiary);padding:20px 0;">이 학기에는 만족도 조사 응답이 없습니다.</p>';
      return;
    }
    var bcHtml = '<div class="folder-breadcrumb"><span class="bc-link" onclick="backToFolders()">📂 응답 목록</span><span class="bc-sep"> › </span><span>만족도 조사 — ' + year + '년 ' + semester + '학기</span></div>';
    var cardsHtml = data.responses.map(function(r, idx) {
      var scoreText = r.overallScore ? (r.overallScore + '/5점') : '-';
      var submittedDate = r.submittedAt ? new Date(r.submittedAt).toLocaleDateString('ko-KR') : '-';
      var itemCount = r.itemRatings ? r.itemRatings.length : 0;
      // 항목별 평균
      var itemAvg = '-';
      if (r.itemRatings && r.itemRatings.length > 0) {
        var sum = 0;
        r.itemRatings.forEach(function(ir) { sum += ir.score; });
        itemAvg = (sum / r.itemRatings.length).toFixed(1);
      }
      return '<div class="glass-card" style="margin-bottom:12px;padding:16px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
        '<strong>응답 #' + (idx + 1) + '</strong>' +
        '<span style="font-size:12px;color:var(--text-tertiary);">' + escapeHtml(submittedDate) + '</span>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;">' +
        '<div>전반적 만족도: <strong>' + escapeHtml(scoreText) + '</strong></div>' +
        '<div>항목별 평균: <strong>' + escapeHtml(itemAvg) + '</strong>점 (' + itemCount + '개)</div>' +
        '</div>' +
        (r.additionalSupport ? '<div style="margin-top:8px;font-size:12px;color:var(--text-secondary);"><strong>실제 지원 내용:</strong> ' + escapeHtml(r.additionalSupport).substring(0, 100) + (r.additionalSupport.length > 100 ? '...' : '') + '</div>' : '') +
        (r.suggestions ? '<div style="margin-top:4px;font-size:12px;color:var(--text-secondary);"><strong>개선사항:</strong> ' + escapeHtml(r.suggestions).substring(0, 100) + (r.suggestions.length > 100 ? '...' : '') + '</div>' : '') +
        '</div>';
    }).join('');
    list.innerHTML = bcHtml + cardsHtml;
  } catch(e) {
    list.innerHTML = '<div class="folder-breadcrumb"><span class="bc-link" onclick="backToFolders()">📂 응답 목록</span><span class="bc-sep"> › </span><span>만족도 조사 — ' + year + '년 ' + semester + '학기</span></div>' +
      '<p style="text-align:center;color:var(--text-tertiary);padding:20px 0;">서버 연결에 실패했습니다.</p>';
  }
}

function groupResponsesBySemester() {
  var groups = {};
  responses.forEach(function(r) {
    if (!r.submittedAt) return;
    var si = getSemesterFromDate(r.submittedAt);
    if (!si) return;
    var key = si.year + '-' + si.semester;
    if (!groups[key]) groups[key] = { year: si.year, semester: si.semester, responses: [] };
    groups[key].responses.push(r);
  });
  return Object.keys(groups).sort().reverse().map(function(k) { return groups[k]; });
}

function selectSemesterFolder(year, semester) {
  if (folderDeleteMode) return;
  currentSatisfactionFolder = null; // v6.1.2
  if (year === null) {
    currentSemesterFolder = null;
  } else {
    currentSemesterFolder = { year: year, semester: semester };
  }
  updateAdminPanel();
}

var totalRegisteredStudents = 0; // v5.0.0: 전체 장애학생 수

function updateAdminPanel() {
  document.getElementById('totalResponses').textContent =
    responses.length;
  const today = (typeof getEffectiveDate === 'function' ? getEffectiveDate() : new Date()).toDateString();
  document.getElementById('todayResponses').textContent =
    responses.filter(
      (r) =>
        r.submittedAt && new Date(r.submittedAt).toDateString() === today,
    ).length;
  // v5.0.0: 응답률 업데이트
  var rateEl = document.getElementById('responseRate');
  if (rateEl) {
    if (totalRegisteredStudents > 0) {
      var pct = Math.min(100, Math.round((responses.length / totalRegisteredStudents) * 100));
      rateEl.textContent = pct + '%';
    } else {
      rateEl.textContent = '—';
    }
  }

  // v5.2.0: 지원 요청 현황 그래프 업데이트
  renderSupportRequestChart();

  // v5.2.0: 만족도(%) 업데이트
  updateSatisfactionRate();

  const list = document.getElementById('responseList');

  if (responses.length === 0) {
    currentSemesterFolder = null;
    list.innerHTML = '<p style="text-align:center;color:var(--text-tertiary);padding:40px 0;">아직 응답이 없습니다.</p>';
    updateLetterSelect();
    return;
  }

  var groups = groupResponsesBySemester();

  // STATE 1: No folder selected → show only folders (v4.2.0: + custom folders + mgmt buttons)
  if (!currentSemesterFolder && !selectedCustomFolder && !currentSatisfactionFolder) {
    var folderHtml = '<div class="semester-folders' + (folderDeleteMode ? ' delete-mode' : '') + '">';
    // Semester folders
    groups.forEach(function(g) {
      var hasDocs = g.responses.length > 0;
      var folderClass = 'semester-folder ' + (hasDocs ? 'folder-has' : 'folder-empty');
      folderHtml += '<div class="' + folderClass + '">';
      // v4.2.5: 삭제 모드 시 시스템 폴더에 자물쇠 아이콘 표시
      folderHtml += '<div class="folder-lock-icon ' + (folderDeleteMode ? 'visible' : '') + '" onclick="event.stopPropagation();shakeLockIcon(this)">' +
        '<svg width="24" height="29.5" viewBox="0 0 24 27.7" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M8 10.5V7.5a4 4 0 0 1 8 0V10.5" stroke="#4a4a4a" stroke-width="2.5" stroke-linecap="round" fill="none"/>' +
        '<rect x="4.5" y="10" width="15" height="13.28" rx="2.2" fill="#4a4a4a"/>' +
        '<circle cx="12" cy="15.5" r="1.6" fill="#d0d0d0"/>' +
        '<rect x="11.25" y="15.5" width="1.5" height="3.6" rx="0.5" fill="#d0d0d0"/>' +
        '</svg></div>';
      var docsSvg = hasDocs ? '<rect class="folder-docs" x="6" y="12" width="52" height="7" rx="1.5" fill="white"/>' : '';
      // v4.2.5: 딥 블루 B안 — 8개 균일 사각 톱니
      var gearSvg = (function() {
        var cx = 32, cy = 34, teeth = 8, outerR = 10, innerR = 7.2, holeR = 3.3, tw = 0.42;
        var pts = [];
        var step = Math.PI * 2 / teeth;
        var half = step * tw / 2;
        for (var i = 0; i < teeth; i++) {
          var a = step * i - Math.PI / 2;
          pts.push([cx + innerR * Math.cos(a - step/2 + half), cy + innerR * Math.sin(a - step/2 + half)]);
          pts.push([cx + outerR * Math.cos(a - half), cy + outerR * Math.sin(a - half)]);
          pts.push([cx + outerR * Math.cos(a + half), cy + outerR * Math.sin(a + half)]);
          pts.push([cx + innerR * Math.cos(a + step/2 - half), cy + innerR * Math.sin(a + step/2 - half)]);
        }
        var d = 'M' + pts.map(function(p){ return p[0].toFixed(2)+','+p[1].toFixed(2); }).join('L') + 'Z';
        return '<path d="' + d + '" fill="rgba(20,70,120,0.55)"/>' +
          '<circle cx="' + cx + '" cy="' + cy + '" r="' + holeR + '" fill="#7DCBEA"/>';
      })();
      folderHtml += '<div class="semester-folder-icon" onclick="' + (folderDeleteMode ? 'shakeParentLock(this)' : 'selectSemesterFolder(' + g.year + ',' + g.semester + ')') + '">' +
        '<svg viewBox="0 0 64 52" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<path class="folder-tab-shape" d="M1 14 L1 8 C1 6 2.5 5 4.5 5 L20 5 C22 5 23 6 24 7.5 L27.5 14 Z" fill="#5EB2DE"/>' +
        '<rect class="folder-back-shape" x="1" y="10" width="62" height="20" rx="4" ry="4" fill="#5EB2DE"/>' +
        docsSvg +
        '<rect class="folder-front-shape" x="0.5" y="15" width="63" height="36.5" rx="4.5" ry="4.5" fill="#7DCBEA"/>' +
        gearSvg +
        '</svg>' +
        '</div>';
      folderHtml += '<div class="semester-folder-name"><span class="folder-category-label">교육지원계획</span>' + g.year + '년 ' + g.semester + '학기</div>';
      folderHtml += '<div class="semester-folder-count">' + g.responses.length + '건</div>';
      folderHtml += '</div>';
    });
    // v6.1.2: 만족도 조사 결과 폴더 (시스템 폴더)
    var satSemesters = getSatisfactionSemesters(groups);
    satSemesters.forEach(function(s) {
      var folderClass = 'semester-folder folder-has';
      folderHtml += '<div class="' + folderClass + '">';
      // 삭제 모드 시 자물쇠 아이콘
      folderHtml += '<div class="folder-lock-icon ' + (folderDeleteMode ? 'visible' : '') + '" onclick="event.stopPropagation();shakeLockIcon(this)">' +
        '<svg width="24" height="29.5" viewBox="0 0 24 27.7" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M8 10.5V7.5a4 4 0 0 1 8 0V10.5" stroke="#4a4a4a" stroke-width="2.5" stroke-linecap="round" fill="none"/>' +
        '<rect x="4.5" y="10" width="15" height="13.28" rx="2.2" fill="#4a4a4a"/>' +
        '<circle cx="12" cy="15.5" r="1.6" fill="#d0d0d0"/>' +
        '<rect x="11.25" y="15.5" width="1.5" height="3.6" rx="0.5" fill="#d0d0d0"/>' +
        '</svg></div>';
      var docsSvg = '<rect class="folder-docs" x="6" y="12" width="52" height="7" rx="1.5" fill="white"/>';
      var starSvg = '<polygon points="32,26 35.5,31 41,32 37,36 38,42 32,39 26,42 27,36 23,32 28.5,31" fill="rgba(20,120,70,0.55)" stroke="none"/>';
      folderHtml += '<div class="semester-folder-icon" onclick="' + (folderDeleteMode ? 'shakeParentLock(this)' : 'selectSatisfactionFolder(' + s.year + ',' + s.semester + ')') + '">' +
        '<svg viewBox="0 0 64 52" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<path class="folder-tab-shape" d="M1 14 L1 8 C1 6 2.5 5 4.5 5 L20 5 C22 5 23 6 24 7.5 L27.5 14 Z" fill="#5EDE8A"/>' +
        '<rect class="folder-back-shape" x="1" y="10" width="62" height="20" rx="4" ry="4" fill="#5EDE8A"/>' +
        docsSvg +
        '<rect class="folder-front-shape" x="0.5" y="15" width="63" height="36.5" rx="4.5" ry="4.5" fill="#7CEAA5"/>' +
        starSvg +
        '</svg>' +
        '</div>';
      folderHtml += '<div class="semester-folder-name"><span class="folder-category-label">만족도 조사</span>' + s.year + '년 ' + s.semester + '학기</div>';
      folderHtml += '<div class="semester-folder-count">' + s.count + '건</div>';
      folderHtml += '</div>';
    });
    // Custom folders (v4.2.0)
    customFolders.forEach(function(cf) {
      var hasItems = cf.items && cf.items.length > 0;
      var cfClass = 'semester-folder ' + (hasItems ? 'folder-has' : 'folder-empty');
      var isChecked = checkedFolderIds.has(cf.id);
      folderHtml += '<div class="' + cfClass + '" data-folder-id="' + cf.id + '"' +
        ' draggable="' + (!folderDeleteMode) + '"' +
        ' ondragstart="onFolderDragStart(event,\'' + cf.id + '\')"' +
        ' ondragover="onFolderDragOver(event,\'' + cf.id + '\')"' +
        ' ondragend="onFolderDragEnd(event)">';
      // Delete checkbox
      folderHtml += '<div class="folder-delete-check ' + (folderDeleteMode ? 'visible' : '') + (isChecked ? ' checked' : '') + '" onclick="toggleFolderCheck(\'' + cf.id + '\',event)"></div>';
      var cDocsSvg = hasItems ? '<rect class="folder-docs" x="6" y="12" width="52" height="7" rx="1.5" fill="white"/>' : '';
      folderHtml += '<div class="semester-folder-icon" onclick="' + (folderDeleteMode ? 'toggleFolderCheck(\'' + cf.id + '\',event)' : 'selectCustomFolder(\'' + cf.id + '\')') + '">' +
        '<svg viewBox="0 0 64 52" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<path class="folder-tab-shape" d="M1 14 L1 8 C1 6 2.5 5 4.5 5 L20 5 C22 5 23 6 24 7.5 L27.5 14 Z" fill="#5EB2DE"/>' +
        '<rect class="folder-back-shape" x="1" y="10" width="62" height="20" rx="4" ry="4" fill="#5EB2DE"/>' +
        cDocsSvg +
        '<rect class="folder-front-shape" x="0.5" y="15" width="63" height="36.5" rx="4.5" ry="4.5" fill="#7DCBEA"/>' +
        '</svg></div>';
      folderHtml += '<div class="semester-folder-name" ondblclick="event.stopPropagation();startFolderNameEdit(this,\'' + cf.id + '\')">' + cf.name + '</div>';
      folderHtml += '<div class="semester-folder-count">' + (cf.items ? cf.items.length : 0) + '건</div>';
      folderHtml += '</div>';
    });
    folderHtml += '</div>';

    // Folder management buttons (v4.2.0)
    folderHtml += '<div class="folder-mgmt-bar">';
    folderHtml += '<button class="folder-mgmt-btn" onclick="addNewFolder()">➕ 폴더 추가</button>';
    if (folderDeleteMode && checkedFolderIds.size > 0) {
      folderHtml += '<button class="folder-mgmt-btn delete-mode" onclick="confirmDeleteFolders()">🗑️ 삭제 (' + checkedFolderIds.size + ')</button>';
    } else {
      folderHtml += '<button class="folder-mgmt-btn' + (folderDeleteMode ? ' delete-mode' : '') + '" onclick="toggleFolderDeleteMode()">' +
        (folderDeleteMode ? '✕ 취소' : '🗑️ 폴더 삭제') + '</button>';
    }
    folderHtml += '<div class="folder-sort-wrap" id="folderSortWrap">';
    folderHtml += '<button class="folder-sort-trigger" onclick="toggleFolderSort()">⇅ 정렬</button>';
    var sortOpts = [{key:'name',label:'이름순'},{key:'created',label:'생성일순'},{key:'size',label:'크기순'}];
    folderHtml += '<div class="folder-sort-options" id="folderSortOptions">';
    sortOpts.forEach(function(opt) {
      var isActive = folderSortKey === opt.key;
      var arrow = isActive ? (folderSortDir === 'asc' ? '↑' : '↓') : '';
      folderHtml += '<div class="folder-sort-option' + (isActive ? ' active' : '') + '" onclick="event.stopPropagation();setFolderSort(\'' + opt.key + '\')">' + opt.label + '<span class="sort-arrow">' + arrow + '</span></div>';
    });
    folderHtml += '</div>';
    folderHtml += '</div>';
    folderHtml += '</div>';

    list.innerHTML = folderHtml;
    updateLetterSelect();
    return;
  }

  // STATE 1.5: Custom folder selected (v4.2.0 → v4.2.3: 파일 관리 UI)
  if (selectedCustomFolder) {
    var cf = customFolders.find(function(f) { return f.id === selectedCustomFolder; });
    if (!cf) { selectedCustomFolder = null; /* fall through */ }
    else {
      var cfBcHtml = '<div class="folder-breadcrumb">';
      cfBcHtml += '<span class="bc-link" onclick="backToFolders()">📂 응답 목록</span>';
      cfBcHtml += '<span class="bc-sep"> › </span>';
      cfBcHtml += '<span>' + cf.name.replace(/<br\s*\/?>/gi, ' ') + '</span>';
      cfBcHtml += '</div>';

      // v4.2.3: 파일 관리 액션 버튼
      var cfActions = '<div class="folder-file-actions">';
      cfActions += '<button class="folder-file-btn" onclick="uploadFileToFolder(\'' + cf.id + '\')">📤 파일 업로드</button>';
      cfActions += '<button class="folder-file-btn" onclick="importSurveyDataToFolder(\'' + cf.id + '\')">📋 응답 데이터 가져오기</button>';
      cfActions += '</div>';

      // 파일 목록 (서버에서 로드)
      var cfFileListId = 'folderFiles_' + cf.id;
      var cfContent = '<div id="' + cfFileListId + '"><p style="text-align:center;color:var(--text-tertiary);padding:20px 0;">파일 목록 로딩 중...</p></div>';

      list.innerHTML = cfBcHtml + cfActions + cfContent;

      // 서버에서 파일 목록 로드
      loadFolderFiles(cf);

      updateLetterSelect();
      return;
    }
  }

  // STATE 1.7: 만족도 조사 폴더 선택 (v6.1.2)
  if (currentSatisfactionFolder) {
    var satBcHtml = '<div class="folder-breadcrumb">';
    satBcHtml += '<span class="bc-link" onclick="backToFolders()">📂 응답 목록</span>';
    satBcHtml += '<span class="bc-sep"> › </span>';
    satBcHtml += '<span>만족도 조사 — ' + currentSatisfactionFolder.year + '년 ' + currentSatisfactionFolder.semester + '학기</span>';
    satBcHtml += '</div>';

    list.innerHTML = satBcHtml + '<p style="text-align:center;color:var(--text-tertiary);padding:20px 0;">만족도 조사 응답 로딩 중...</p>';
    // 비동기 로딩
    loadSatisfactionFolderData(currentSatisfactionFolder.year, currentSatisfactionFolder.semester);
    updateLetterSelect();
    return;
  }

  // STATE 2: Folder selected → breadcrumb + response cards only
  var bcHtml = '<div class="folder-breadcrumb">';
  bcHtml += '<span class="bc-link" onclick="selectSemesterFolder(null)">📂 응답 목록</span>';
  bcHtml += '<span class="bc-sep"> › </span>';
  bcHtml += '<span>' + currentSemesterFolder.year + '년 ' + currentSemesterFolder.semester + '학기</span>';
  bcHtml += '</div>';

  var filtered = responses.filter(function(r) {
    if (!r.submittedAt) return false;
    var si = getSemesterFromDate(r.submittedAt);
    return si && si.year === currentSemesterFolder.year && si.semester === currentSemesterFolder.semester;
  });

  var cardsHtml = filtered.length === 0
    ? '<p style="text-align:center;color:var(--text-tertiary);padding:20px 0;">이 학기에는 응답이 없습니다.</p>'
    : filtered.map(function(r) {
        var i = responses.indexOf(r);
        var modBadge = r.modifiedAt ? '<span class="modified-badge">수정됨</span>' : '';
        var xref = crossReferenceResponse(r);
        var xrefBadge = '';
        if (xref) {
          if (xref.notFound) xrefBadge = '<span class="mismatch-badge">명단 미등록</span>';
          else if (!xref.matched) xrefBadge = '<span class="mismatch-badge">정보 불일치</span>';
          else xrefBadge = '<span class="match-badge">검증완료</span>';
        }
        return '<div class="response-card" onclick="viewResponse(' + i + ')" style="position:relative;">' +
          '<div class="name">' + escapeHtml(r.name || '이름 없음') + modBadge + xrefBadge + '</div>' +
          '<div class="meta">' + escapeHtml(r.department || '') + ' · ' + escapeHtml(r.grade || '') + ' · ' +
          (r.submittedAt ? new Date(r.submittedAt).toLocaleDateString('ko-KR') : '') +
          (r.modifiedAt ? ' (수정: ' + new Date(r.modifiedAt).toLocaleDateString('ko-KR') + ')' : '') + '</div>' +
          '<button onclick="event.stopPropagation();deleteResponse(' + i + ')" ' +
          'style="position:absolute;top:8px;right:8px;background:#ff3b30;color:white;border:none;' +
          'border-radius:6px;padding:4px 10px;font-size:11px;cursor:pointer;" title="삭제">삭제</button></div>';
      }).join('');

  list.innerHTML = bcHtml + cardsHtml;
  updateLetterSelect();
}

function updateLetterSelect() {
  // Letter student select
  const select = document.getElementById('letterStudentSelect');
  if (!select) return;
  select.innerHTML =
    '<option value="">학생을 선택하세요</option>' +
    responses
      .map(
        (r, i) =>
          '<option value="' +
          i +
          '">' +
          escapeHtml(r.name) +
          ' (' +
          escapeHtml(r.studentId || '') +
          ')</option>',
      )
      .join('');
}

async function deleteResponse(idx) {
  const r = responses[idx];
  if (!r || !r._dbId) {
    showToast('삭제할 수 없습니다.');
    return;
  }
  if (
    !confirm(
      (r.name || '알 수 없음') +
        ' 학생의 응답을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.',
    )
  )
    return;

  try {
    const resp = await fetch(
      API_BASE + '/api/admin/response/' + r._dbId,
      {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + adminToken },
      },
    );

    if (!resp.ok) throw new Error('삭제 실패');

    responses.splice(idx, 1);
    updateAdminPanel();
    showToast('응답이 삭제되었습니다.');
  } catch (err) {
    showToast('삭제 중 오류 발생: ' + err.message);
  }
}

// ===== Word-level diff engine (no space tracking) =====
function computeWordDiff(original, modified) {
  // Tokenize: split by whitespace into words only (spaces are NOT tracked)
  function tokenize(text) {
    return text.split(/\s+/).filter(function(w) { return w.length > 0; });
  }

  const origWords = tokenize(original);
  const modWords = tokenize(modified);

  // LCS-based diff on words
  const m = origWords.length;
  const n = modWords.length;

  // Build LCS table
  const dp = Array(m + 1)
    .fill(null)
    .map(function() { return Array(n + 1).fill(0); });
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (origWords[i - 1] === modWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find diff operations
  let i = m, j = n;
  const ops = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origWords[i - 1] === modWords[j - 1]) {
      ops.unshift({ op: 'equal', value: modWords[j - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.unshift({ op: 'insert', value: modWords[j - 1] });
      j--;
    } else {
      ops.unshift({ op: 'delete', value: origWords[i - 1] });
      i--;
    }
  }

  // Merge adjacent delete+insert into "replace"
  const merged = [];
  let k = 0;
  while (k < ops.length) {
    if (ops[k].op === 'delete' && k + 1 < ops.length && ops[k + 1].op === 'insert') {
      merged.push({ op: 'replace', orig: ops[k].value, mod: ops[k + 1].value });
      k += 2;
    } else {
      merged.push(ops[k]);
      k++;
    }
  }

  return merged;
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderDiffHTML(original, modified) {
  if (!original && !modified) return '';
  if (!original) return '<span>' + escapeHTML(modified) + '</span>';
  if (!modified)
    return (
      '<span class="diff-deleted-text" onclick="toggleDeletedText(this)" data-original="' +
      escapeHTML(original) +
      '">X</span>'
    );
  if (original === modified)
    return '<span>' + escapeHTML(modified) + '</span>';

  const ops = computeWordDiff(String(original), String(modified));
  let html = '';
  let first = true;

  for (const op of ops) {
    if (!first) html += ' ';
    first = false;

    switch (op.op) {
      case 'equal':
        html += escapeHTML(op.value);
        break;
      case 'replace':
        html +=
          '<span class="diff-modified-word" onclick="toggleModifiedWord(this)" data-original="' +
          escapeHTML(op.orig) +
          '" data-modified="' +
          escapeHTML(op.mod) +
          '">' +
          escapeHTML(op.mod) +
          '</span>';
        break;
      case 'insert':
        html +=
          '<span class="diff-modified-word" onclick="toggleModifiedWord(this)" data-original="" data-modified="' +
          escapeHTML(op.value) +
          '">' +
          escapeHTML(op.value) +
          '</span>';
        break;
      case 'delete':
        html +=
          '<span class="diff-deleted-text" onclick="toggleDeletedText(this)" data-original="' +
          escapeHTML(op.value) +
          '">X</span>';
        break;
    }
  }

  return html;
}

function toggleModifiedWord(el) {
  const isShowingOriginal = el.classList.contains('showing-original');
  if (isShowingOriginal) {
    el.textContent = el.dataset.modified;
    el.classList.remove('showing-original', 'diff-original-word');
    el.classList.add('diff-modified-word');
  } else {
    if (el.dataset.original) {
      el.textContent = el.dataset.original;
      el.classList.add('showing-original', 'diff-original-word');
      el.classList.remove('diff-modified-word');
    }
  }
}

function toggleDeletedText(el) {
  const isShowingOriginal = el.classList.contains('showing-original');
  if (isShowingOriginal) {
    el.textContent = 'X';
    el.classList.remove('showing-original', 'diff-deleted-original');
    el.classList.add('diff-deleted-text');
  } else {
    el.textContent = el.dataset.original;
    el.classList.add('showing-original', 'diff-deleted-original');
    el.classList.remove('diff-deleted-text');
  }
}

// Free-text fields eligible for word-level diff rendering
const textDiffFields = [
  'disabilityDetail',
  'assistiveDevice',
  'healthStatus',
  'commonDetail',
  'theoryDetail',
  'labDetail',
  'fieldDetail',
  'evalDetail',
  'deviceDetail',
  'counselDetail',
  'careerDetail',
  'eventDetail',
  'lifeDetail',
  'otherRequest',
];

// Current diff view state for admin response viewer
let currentDiffMode = 'modified'; // 'modified', 'diff', 'original'
let currentViewingResponse = null;
let currentViewingIndex = -1;

const fieldLabelsMap = {
  name: '성명',
  birthdate: '생년월일',
  gender: '성별',
  grade: '학년',
  studentId: '학번',
  phone: '연락처',
  email: '이메일',
  contactPref: '연락 선호 방식',
  department: '학과(부)',
  minor: '부전공',
  disabilityType: '주장애',
  disabilityLevel: '장애정도',
  disabilityDetail: '세부정보',
  assistiveDevice: '사용 보조기기',
  healthStatus: '건강 상태',
  commonSupport: '공통 지원',
  theorySupport: '이론 수업 지원',
  labSupport: '실험·실습 지원',
  fieldSupport: '현장실습 지원',
  evalSupport: '평가 지원',
  deviceSupport: '보조기기/인적 지원',
  counselSupport: '상담 지원',
  careerSupport: '취·창업 지원',
  eventSupport: '학교 행사 지원',
  lifeSupport: '생활 지원',
  commonDetail: '공통 세부 요청',
  theoryDetail: '이론 수업 세부 요청',
  labDetail: '실험·실습 세부 요청',
  fieldDetail: '현장실습 세부 요청',
  evalDetail: '평가 세부 요청',
  deviceDetail: '보조기기 세부 요청',
  counselDetail: '상담 세부 요청',
  careerDetail: '취·창업 세부 요청',
  eventDetail: '학교 행사 세부 요청',
  lifeDetail: '생활 세부 요청',
  otherRequest: '기타 요청사항',
  consent: '개인정보 동의',
  finalConfirm: '최종 확인',
  shareConsent: '공유 동의',
};

const diffSkipKeys = [
  'id',
  'submittedAt',
  'modifiedAt',
  'modifiedFields',
  'originalData',
];

function renderResponseDetails(r, mode) {
  const hasModifications =
    r.modifiedFields && r.modifiedFields.length > 0;

  // Cross-reference check
  var xref = crossReferenceResponse(r);

  let details = '';

  // Show enrollment cross-reference summary at top if available
  if (xref) {
    if (xref.notFound) {
      details += '<div style="padding:8px 12px;border-radius:8px;margin-bottom:8px;background:rgba(255,59,48,0.08);border:1px solid rgba(255,59,48,0.2);font-size:12px;color:#ff3b30;">' +
        '⚠️ 우선수강신청서 명단에 해당 학번이 등록되어 있지 않습니다.</div>';
    } else if (!xref.matched) {
      var mismatchInfo = xref.mismatches.map(function(m) {
        return m.label + ': 설문 "' + m.surveyVal + '" ≠ 명단 "' + m.enrollVal + '"';
      }).join(', ');
      details += '<div style="padding:8px 12px;border-radius:8px;margin-bottom:8px;background:rgba(255,59,48,0.08);border:1px solid rgba(255,59,48,0.2);font-size:12px;color:#ff3b30;">' +
        '⚠️ 정보 불일치: ' + escapeHTML(mismatchInfo) + '</div>';
    } else {
      details += '<div style="padding:8px 12px;border-radius:8px;margin-bottom:8px;background:rgba(52,199,89,0.08);border:1px solid rgba(52,199,89,0.2);font-size:12px;color:#34c759;">' +
        '✅ 우선수강신청서 명단과 일치합니다.</div>';
    }
  }

  for (const [k, v] of Object.entries(r)) {
    if (diffSkipKeys.includes(k)) continue;
    const label = fieldLabelsMap[k] || k;
    const isModified = hasModifications && r.modifiedFields.includes(k);

    let currentVal = Array.isArray(v) ? v.join(', ') : v;
    // 연락처 하이픈 포맷 표시
    if (k === 'phone' && typeof currentVal === 'string') {
      var ph = currentVal.replace(/[^0-9]/g, '');
      if (ph.length === 11) currentVal = ph.substring(0,3)+'-'+ph.substring(3,7)+'-'+ph.substring(7);
    }
    const origRaw =
      r.originalData && r.originalData[k] !== undefined
        ? r.originalData[k]
        : undefined;
    let origVal =
      origRaw !== undefined
        ? Array.isArray(origRaw)
          ? origRaw.join(', ')
          : origRaw
        : undefined;
    // 원본 연락처도 하이픈 포맷
    if (k === 'phone' && typeof origVal === 'string') {
      var oph = origVal.replace(/[^0-9]/g, '');
      if (oph.length === 11) origVal = oph.substring(0,3)+'-'+oph.substring(3,7)+'-'+oph.substring(7);
    }

    let displayHTML;
    if (mode === 'original') {
      displayHTML = escapeHTML(
        origVal !== undefined ? origVal : currentVal,
      );
    } else if (mode === 'diff' && isModified) {
      if (textDiffFields.includes(k)) {
        displayHTML = renderDiffHTML(origVal || '', currentVal || '');
      } else {
        displayHTML =
          '<span class="diff-original-word">' +
          escapeHTML(origVal || '(없음)') +
          '</span> → <span class="diff-modified-word">' +
          escapeHTML(currentVal || '(없음)') +
          '</span>';
      }
    } else {
      displayHTML = escapeHTML(currentVal);
    }

    // Apply mismatch highlighting for name and studentId
    var mismatchClass = '';
    if (xref && !xref.notFound && xref.mismatches) {
      var fieldMismatch = xref.mismatches.find(function(m) { return m.field === k; });
      if (fieldMismatch) {
        mismatchClass = ' mismatch-field';
        displayHTML = '<span class="mismatch-field">' + escapeHTML(currentVal) +
          '</span> <span style="font-size:11px;color:#ff3b30;">(명단: ' + escapeHTML(fieldMismatch.enrollVal) + ')</span>';
      }
    }

    details +=
      '<div style="padding:4px 8px;border-radius:6px;margin-bottom:2px;">' +
      '<strong>' +
      label +
      ':</strong> ' +
      displayHTML +
      '</div>';
  }

  // Show enrolled courses if available
  if (xref && !xref.notFound) {
    var courses = getEnrollmentCoursesByStudentId(r.studentId);
    if (courses.length > 0) {
      details += '<div style="padding:8px;margin-top:8px;border-top:1px solid rgba(255,255,255,0.25);padding-top:8px;">' +
        '<strong>📚 수강 교과목 (' + courses.length + '과목)</strong>' +
        '<div style="margin-top:4px;font-size:12px;line-height:1.8;">';
      courses.forEach(function(c) {
        details += '<div style="padding:2px 0;">· ' + escapeHTML(c.courseName || '') +
          (c.instructorName ? ' (' + escapeHTML(c.instructorName) + ')' : '') + '</div>';
      });
      details += '</div></div>';
    }
  }

  // Add timestamps
  details +=
    '<div style="padding:4px 8px;margin-top:8px;border-top:1px solid rgba(255,255,255,0.25);padding-top:8px;">' +
    '<strong>제출일:</strong> ' +
    new Date(r.submittedAt).toLocaleString('ko-KR') +
    '</div>';
  if (r.modifiedAt) {
    details +=
      '<div style="padding:4px 8px;"><strong>수정일:</strong> ' +
      new Date(r.modifiedAt).toLocaleString('ko-KR') +
      '</div>';
  }

  return details;
}

function setDiffMode(mode) {
  currentDiffMode = mode;
  if (currentViewingIndex < 0 || !currentViewingResponse) return;
  renderResponseView(currentViewingIndex, currentViewingResponse);
}

function toggleOriginalModified() {
  if (currentDiffMode === 'original') {
    setDiffMode('modified');
  } else {
    setDiffMode('original');
  }
}

function renderResponseView(idx, r) {
  const hasModifications =
    r.modifiedFields && r.modifiedFields.length > 0;

  let controls = '';
  if (hasModifications) {
    var toggleLabel = currentDiffMode === 'original' ? '수정본' : '원본';
    controls =
      '<div class="diff-view-controls">' +
      '<button class="diff-view-btn" onclick="toggleOriginalModified()" id="btnToggleView" style="justify-content:center;text-align:center;">' + toggleLabel + '</button>' +
      '<button class="diff-tool-icon' +
      (currentDiffMode === 'diff' ? ' active' : '') +
      '" onclick="setDiffMode(currentDiffMode===\'diff\'?\'modified\':\'diff\')" title="변경 비교">🔧</button>' +
      '<span class="diff-mode-label">' +
      r.modifiedFields.length +
      '개 항목 수정됨</span>' +
      '</div>';
  }

  const details = renderResponseDetails(r, currentDiffMode);

  const list = document.getElementById('responseList');
  list.innerHTML =
    '<button class="btn btn-secondary" onclick="updateAdminPanel()" style="margin-bottom:12px;font-size:13px;">← 목록으로</button>' +
    controls +
    '<div style="background:rgba(255,255,255,0.12);backdrop-filter:blur(28px) saturate(200%);-webkit-backdrop-filter:blur(28px) saturate(200%);border:1px solid rgba(255,255,255,0.4);border-radius:var(--radius-md);padding:20px;font-size:13px;line-height:2;">' +
    details +
    '</div>';
}

function viewResponse(idx) {
  const r = responses[idx];
  currentViewingIndex = idx;
  currentViewingResponse = r;
  currentDiffMode = 'modified';
  renderResponseView(idx, r);
}

// ===== Autocomplete =====
function setupAutocomplete(inputId, dropdownId) {
  const input = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);

  input.addEventListener('input', function () {
    // If auto-filled and value changed at all, clear entirely
    if (deptAutoFilled[inputId] && this.value !== deptAutoFilled[inputId]) {
      this.value = '';
      delete deptAutoFilled[inputId];
      delete formData[input.dataset.name];
    }

    const query = this.value.trim();
    if (query.length === 0) {
      showAllDepartments(dropdown, inputId);
      return;
    }
    filterDepartments(query, dropdown, inputId);
  });

  input.addEventListener('keydown', function (e) {
    // If auto-filled and user presses backspace/delete, clear entirely
    if (deptAutoFilled[inputId] && (e.key === 'Backspace' || e.key === 'Delete')) {
      e.preventDefault();
      this.value = '';
      delete deptAutoFilled[inputId];
      delete formData[input.dataset.name];
      showAllDepartments(dropdown, inputId);
    }
    // 방향키로 드롭다운 탐색
    if (dropdown.classList.contains('show')) {
      var allItems = dropdown.querySelectorAll('.autocomplete-college, .autocomplete-item[style*="block"], .autocomplete-item:not([style*="none"])');
      var visibleItems = Array.from(allItems).filter(function(item) {
        return item.offsetParent !== null;
      });
      var currentIdx = -1;
      var focused = dropdown.querySelector('.dept-highlighted');
      if (focused) currentIdx = visibleItems.indexOf(focused);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (focused) focused.classList.remove('dept-highlighted');
        currentIdx = Math.min(currentIdx + 1, visibleItems.length - 1);
        if (visibleItems[currentIdx]) {
          visibleItems[currentIdx].classList.add('dept-highlighted');
          visibleItems[currentIdx].scrollIntoView({ block: 'nearest' });
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (focused) focused.classList.remove('dept-highlighted');
        currentIdx = Math.max(currentIdx - 1, 0);
        if (visibleItems[currentIdx]) {
          visibleItems[currentIdx].classList.add('dept-highlighted');
          visibleItems[currentIdx].scrollIntoView({ block: 'nearest' });
        }
      } else if (e.key === 'Enter' && focused) {
        e.preventDefault();
        focused.click();
      } else if (e.key === 'Escape') {
        dropdown.classList.remove('show');
      }
    }
  });

  input.addEventListener('focus', function () {
    const query = this.value.trim();
    if (query.length === 0) {
      showAllDepartments(dropdown, inputId);
    } else if (!deptAutoFilled[inputId]) {
      filterDepartments(query, dropdown, inputId);
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', function (e) {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove('show');
    }
  });
}

function showAllDepartments(dropdown, inputId) {
  let html = '';
  for (const [college, depts] of Object.entries(DKU_DEPARTMENTS)) {
    html +=
      '<div class="autocomplete-college" onclick="toggleCollegeGroup(this)">' +
      college +
      ' ▸</div>';
    for (const dept of depts) {
      html +=
        '<div class="autocomplete-item" style="display:none;" data-college="' +
        college +
        '" onclick="selectDepartment(\'' +
        dept.replace(/'/g, "\\'") +
        "', '" +
        inputId +
        '\')">' +
        dept +
        '</div>';
    }
  }
  dropdown.innerHTML = html;
  dropdown.classList.add('show');
}

function toggleCollegeGroup(el) {
  const college = el.textContent.replace(' ▸', '').replace(' ▾', '');
  const dropdown = el.closest('.autocomplete-dropdown');
  const items = dropdown.querySelectorAll(
    '.autocomplete-item[data-college="' + college + '"]',
  );
  const isVisible = items[0] && items[0].style.display !== 'none';

  // Accordion: close all other colleges first
  dropdown.querySelectorAll('.autocomplete-college').forEach(function(otherEl) {
    const otherCollege = otherEl.textContent.replace(' ▸', '').replace(' ▾', '');
    if (otherCollege !== college) {
      dropdown.querySelectorAll('.autocomplete-item[data-college="' + otherCollege + '"]').forEach(function(item) {
        item.style.display = 'none';
      });
      otherEl.textContent = otherCollege + ' ▸';
    }
  });

  items.forEach((item) => {
    item.style.display = isVisible ? 'none' : 'block';
  });

  el.textContent = college + (isVisible ? ' ▸' : ' ▾');
}

function filterDepartments(query, dropdown, inputId) {
  const lowerQuery = query.toLowerCase();
  const matches = {};

  for (const entry of ALL_DEPARTMENTS) {
    // Exact prefix match only
    if (entry.dept.toLowerCase().startsWith(lowerQuery)) {
      if (!matches[entry.college]) matches[entry.college] = [];
      matches[entry.college].push(entry.dept);
    }
  }

  let html = '';
  const colleges = Object.keys(matches);
  if (colleges.length === 0) {
    html =
      '<div class="autocomplete-no-result">검색 결과가 없습니다.</div>';
  } else {
    for (const college of colleges) {
      html += '<div class="autocomplete-college">' + college + '</div>';
      for (const dept of matches[college]) {
        html +=
          '<div class="autocomplete-item" onclick="selectDepartment(\'' +
          dept.replace(/'/g, "\\'") +
          "', '" +
          inputId +
          '\')">' +
          dept +
          '</div>';
      }
    }
  }

  dropdown.innerHTML = html;
  dropdown.classList.add('show');
}

// Track which department inputs have been auto-filled
const deptAutoFilled = {};

function selectDepartment(dept, inputId) {
  const input = document.getElementById(inputId);
  input.value = dept;
  formData[input.dataset.name] = dept;
  deptAutoFilled[inputId] = dept; // mark as auto-filled
  const wrapper = input.closest('.autocomplete-wrapper');
  if (wrapper) {
    const dd = wrapper.querySelector('.autocomplete-dropdown');
    if (dd) dd.classList.remove('show');
  }
  // 학과 선택 후: 포커스 다음으로 이동(비필수 부전공은 스킵) + 부전공 1회 그라데이션
  if (inputId === 'deptInput') {
    if (window.lfAdvanceFrom) window.lfAdvanceFrom(input);
    var minorInput = document.getElementById('minorInput');
    if (minorInput) {
      var minorGroup = minorInput.closest('.form-group');
      var minorLabel = minorGroup ? minorGroup.querySelector('.form-label') : null;
      if (minorLabel && window.triggerLabelGradient) {
        window.triggerLabelGradient(minorLabel);
      }
      // 1초 후 다음 버튼 넛지
      setTimeout(function() {
        var pageEl = minorInput.closest('.survey-page');
        if (pageEl) {
          var nextBtn = pageEl.querySelector('.btn-primary');
          if (nextBtn) {
            nextBtn.classList.remove('btn-nudge');
            void nextBtn.offsetWidth;
            nextBtn.classList.add('btn-nudge');
            nextBtn.addEventListener('animationend', function() {
              nextBtn.classList.remove('btn-nudge');
            }, { once: true });
          }
        }
      }, 1000);
    }
  }
}

// ===== Letter Generation =====
