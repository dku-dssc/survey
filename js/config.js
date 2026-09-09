// ===== Configuration, department data, API settings, state variables, admin session timer =====
// 원본 index.html에서 분리됨 (v5.0.1)

const DKU_DEPARTMENTS = {
  문과대학: ['국어국문학과', '사학과', '철학과', '영미인문학과'],
  법과대학: ['법학과'],
  사회과학대학: [
    '정치외교학과',
    '행정학과',
    '도시계획·부동산학부 도시지역계획학전공',
    '도시계획·부동산학부 부동산학전공',
    '미디어커뮤니케이션학부 저널리즘전공',
    '미디어커뮤니케이션학부 영상콘텐츠전공',
    '미디어커뮤니케이션학부 광고홍보전공',
    '상담학과',
  ],
  경영경제대학: [
    '경제학과',
    '무역학과',
    '경영학부 경영학전공',
    '경영학부 회계학전공',
    '산업경영학과(야)',
  ],
  공과대학: [
    '전자전기공학과',
    '융합반도체공학과',
    '고분자시스템공학부 고분자공학전공',
    '고분자시스템공학부 파이버융합소재공학전공',
    '토목환경공학과',
    '기계공학과',
    '화학공학과',
    '건축학부 건축학전공',
    '건축학부 건축공학전공',
  ],
  SW융합대학: [
    '소프트웨어학과',
    '컴퓨터공학과',
    '통계데이터사이언스학과',
    '사이버보안학과',
  ],
  사범대학: [
    '한문교육과',
    '특수교육과',
    '수학교육과',
    '과학교육과',
    '체육교육과',
    '교직교육과',
  ],
  '음악·예술대학': [
    '도예과',
    '디자인학부 커뮤니케이션디자인전공',
    '디자인학부 패션산업디자인전공',
    '공연영화학부 연극전공',
    '공연영화학부 영화전공',
    '공연영화학부 뮤지컬전공',
    '무용과',
    '음악학부 피아노전공',
    '음악학부 관현악전공',
    '음악학부 성악전공',
    '음악학부 작곡전공',
    '음악학부 국악전공',
  ],
  프리무스국제대학: [
    '국제경영학과',
    '모바일시스템공학과',
    '바이오소재융합공학과',
    '한국학과',
    '연기영상예술학과',
    '글로벌기초교육학부',
  ],
  외국어대학: [
    '아시아중동학부 중국학전공',
    '아시아중동학부 일본학전공',
    '아시아중동학부 몽골학전공',
    '아시아중동학부 중동학전공',
    '아시아중동학부 베트남학전공',
    '유럽중남미학부 독일학전공',
    '유럽중남미학부 프랑스학전공',
    '유럽중남미학부 스페인중남미학전공',
    '유럽중남미학부 러시아학전공',
    '유럽중남미학부 포르투갈브라질학전공',
    '영어과',
    '글로벌한국어과',
  ],
  과학기술대학: [
    '수학과',
    '물리학과',
    '화학과',
    '식품영양학과',
    '신소재공학과',
    '에너지공학과',
    '경영공학과',
    '제약공학과',
  ],
  바이오융합대학: [
    '생명자원학부 식량생명공학전공',
    '생명자원학부 동물생명공학전공',
    '생명자원학부 환경원예학전공',
    '생명자원학부 녹지조경학전공',
    '의생명과학부 의생명시스템학전공',
    '의생명과학부 생명과학전공',
    '의생명과학부 미생물학전공',
    '식품공학과',
    '코스메디컬소재학과',
  ],
  예술대학: [
    '미술학부 공예전공',
    '미술학부 동양화전공',
    '미술학부 서양화전공',
    '미술학부 조소전공',
    '문예창작과',
    '뉴뮤직학부 뮤직테크놀러지전공',
    '뉴뮤직학부 재즈퍼포먼스전공',
    '뉴뮤직학부 싱어송라이팅전공',
  ],
  스포츠과학대학: [
    '생활체육학과',
    '스포츠경영학과',
    '국제스포츠학부 운동처방재활전공',
    '국제스포츠학부 국제스포츠전공',
    '국제스포츠학부 태권도전공',
    '국제스포츠학부 골프전공',
  ],
  의과대학: ['의예과', '의학과'],
  공공인재대학: [
    '공공정책학과',
    '공공정책학과(야)',
    '사회복지학과',
    '식품자원경제학과',
    '해병대군사학과',
  ],
  보건과학대학: [
    '임상병리학과',
    '물리치료학과',
    '보건행정학과',
    '치위생학과',
    '심리치료학과',
  ],
  간호대학: ['간호학과'],
  치과대학: ['치의예과', '치의학과'],
  약학대학: ['약학과'],
};

// Build flat list for searching
const ALL_DEPARTMENTS = [];
for (const [college, depts] of Object.entries(DKU_DEPARTMENTS)) {
  for (const dept of depts) {
    ALL_DEPARTMENTS.push({ college, dept });
  }
}

// ===== API 서버 설정 =====
// 배포 후 실제 Cloudflare Workers URL로 변경하세요
const API_BASE = 'https://dku-survey-api.dku-dssc.workers.dev';
// API_BASE 변조 방지 (콘솔에서 재할당 차단)
Object.defineProperty(window, '_API_BASE_FROZEN', { value: API_BASE, writable: false, configurable: false });

// ===== State =====
let currentPage = 0;
const totalSurveyPages = 8; // pages 1-8 (1=consent, 2=personal, ..., 5=보조기기, 6=대학생활, 7=final, 8=completion)
const formData = {};
var _skipAutoScroll = false; // 페이지 전환 직후 첫 문항 포커스 시 스크롤 방지
let responses = []; // 관리자 패널에서 서버로부터 불러온 데이터 캐시

// v5.1.0: 테스트 모드 — 날짜 시뮬레이션 (localStorage 영속)
var testModeYear = null;  // null이면 현재 연도 사용
var testModeMonth = null; // null이면 비활성
var testModeDay = null;

// 페이지 로드 시 localStorage에서 테스트 모드 복원
(function restoreTestMode() {
  try {
    var saved = localStorage.getItem('dku_test_mode');
    if (saved) {
      var parsed = JSON.parse(saved);
      if (parsed && parsed.month >= 1 && parsed.month <= 12) {
        testModeYear = parsed.year || null;
        testModeMonth = parsed.month;
        testModeDay = parsed.day || null;
      }
    }
  } catch(e) { /* localStorage 접근 불가 시 무시 */ }
})();

// 테스트 모드 또는 실제 날짜 반환 헬퍼
function getEffectiveDate() {
  var now = new Date();
  if (testModeMonth !== null) {
    var y = testModeYear || now.getFullYear();
    var d = testModeDay || now.getDate();
    return new Date(y, testModeMonth - 1, d);
  }
  return now;
}

function applyTestMode() {
  var yr = parseInt(document.getElementById('testModeYear').value);
  var m = parseInt(document.getElementById('testModeMonth').value);
  var d = parseInt(document.getElementById('testModeDay').value);
  if (!m || m < 1 || m > 12) { showToast('월(1~12)을 올바르게 입력하세요.'); return; }
  if (d && (d < 1 || d > 31)) { showToast('일(1~31)을 올바르게 입력하세요.'); return; }
  if (yr && (yr < 2020 || yr > 2099)) { showToast('연도(2020~2099)를 올바르게 입력하세요.'); return; }
  testModeYear = yr || null;
  testModeMonth = m;
  testModeDay = d || null;
  // localStorage에 저장
  try { localStorage.setItem('dku_test_mode', JSON.stringify({ year: testModeYear, month: m, day: testModeDay })); } catch(e) {}
  var label = (yr ? yr + '년 ' : '') + m + '월' + (d ? ' ' + d + '일' : '');
  document.getElementById('testModeStatus').innerHTML = '🧪 <strong style="color:var(--warning);">테스트 모드 활성화</strong> — 시뮬레이션 날짜: ' + label;
  showToast('테스트 모드 적용: ' + label);
  // 학기 라벨 갱신
  if (typeof updateDeadlineSectionLabel === 'function') updateDeadlineSectionLabel(m);
  // 현재 학기 폴더 자동선택 갱신
  if (typeof updateAdminPanel === 'function') updateAdminPanel();
  // 랜딩 페이지 버튼 갱신 (수요조사/만족도 조사 전환)
  if (typeof updateLandingButtons === 'function') updateLandingButtons();
  // v6.0.0: 학기 라벨 전체 갱신
  if (typeof refreshSemesterDisplay === 'function') refreshSemesterDisplay();
}

function clearTestMode() {
  testModeYear = null;
  testModeMonth = null;
  testModeDay = null;
  try { localStorage.removeItem('dku_test_mode'); } catch(e) {}
  var yearEl = document.getElementById('testModeYear');
  var monthEl = document.getElementById('testModeMonth');
  var dayEl = document.getElementById('testModeDay');
  var statusEl = document.getElementById('testModeStatus');
  if (yearEl) yearEl.value = '';
  if (monthEl) monthEl.value = '';
  if (dayEl) dayEl.value = '';
  if (statusEl) statusEl.innerHTML = '';
  showToast('테스트 모드 해제됨');
  if (typeof updateDeadlineSectionLabel === 'function') updateDeadlineSectionLabel();
  if (typeof updateAdminPanel === 'function') updateAdminPanel();
  if (typeof updateLandingButtons === 'function') updateLandingButtons();
  // v6.0.0: 학기 라벨 전체 갱신
  if (typeof refreshSemesterDisplay === 'function') refreshSemesterDisplay();
}

// 테스트 모드 UI 복원 (관리자 패널 열렸을 때 호출)
function restoreTestModeUI() {
  if (testModeMonth !== null) {
    var yearEl = document.getElementById('testModeYear');
    var monthEl = document.getElementById('testModeMonth');
    var dayEl = document.getElementById('testModeDay');
    var statusEl = document.getElementById('testModeStatus');
    if (yearEl && testModeYear) yearEl.value = testModeYear;
    if (monthEl) monthEl.value = testModeMonth;
    if (dayEl && testModeDay) dayEl.value = testModeDay;
    var label = (testModeYear ? testModeYear + '년 ' : '') + testModeMonth + '월' + (testModeDay ? ' ' + testModeDay + '일' : '');
    if (statusEl) statusEl.innerHTML = '🧪 <strong style="color:var(--warning);">테스트 모드 활성화</strong> — 시뮬레이션 날짜: ' + label;
  }
}

// Edit mode state
let isEditMode = false;
let editingDbId = -1; // DB의 실제 ID
let originalEditData = null;

// Admin state
let adminToken = null;
let adminSessionTimer = null;
let adminSessionInterval = null;
let adminSessionExpiry = 0;
let adminLoggedInId = '';
const ADMIN_SESSION_TIMEOUT = 10 * 60 * 1000; // 10분
const ADMIN_SESSION_EXTEND = 30 * 60 * 1000;  // 연장 30분

function startAdminSessionTimer() {
  clearAdminSessionTimer();
  adminSessionExpiry = Date.now() + ADMIN_SESSION_TIMEOUT;
  updateAdminSessionDisplay();
  adminSessionInterval = setInterval(function() {
    var remaining = adminSessionExpiry - Date.now();
    if (remaining <= 0) {
      clearAdminSessionTimer();
      adminToken = null;
      adminLoggedInId = '';
      // 세션 만료 시 열려있는 사이드 패널 모두 닫기
      if (typeof closeAnalyticsPanel === 'function') closeAnalyticsPanel();
      if (typeof closeEmailCompose === 'function') closeEmailCompose();
      showAdminLogin();
      showToast('로그인 시간이 만료되어 자동 로그아웃되었습니다.');
      return;
    }
    updateAdminSessionDisplay();
  }, 1000);
}

function clearAdminSessionTimer() {
  if (adminSessionTimer) { clearTimeout(adminSessionTimer); adminSessionTimer = null; }
  if (adminSessionInterval) { clearInterval(adminSessionInterval); adminSessionInterval = null; }
  adminSessionExpiry = 0;
  var bar = document.getElementById('adminSessionBar');
  if (bar) bar.style.display = 'none';
  var emailBar = document.getElementById('emailLinkBar');
  if (emailBar) { emailBar.style.display = 'none'; emailBar.classList.remove('animate-in'); }
  linkedEmail = null;
}

function updateAdminSessionDisplay() {
  var bar = document.getElementById('adminSessionBar');
  if (!bar) return;
  bar.style.display = 'flex';
  var remaining = Math.max(0, adminSessionExpiry - Date.now());
  var mins = Math.floor(remaining / 60000);
  var secs = Math.floor((remaining % 60000) / 1000);
  var idEl = document.getElementById('adminSessionId');
  var timeEl = document.getElementById('adminSessionTime');
  if (idEl) idEl.textContent = adminLoggedInId;
  if (timeEl) timeEl.textContent = (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
}

function extendAdminSession() {
  if (!adminToken) return;
  adminSessionExpiry += ADMIN_SESSION_EXTEND;
  updateAdminSessionDisplay();
  showToast('로그인 시간이 30분 연장되었습니다.');
}

// Verify page gender
let verifyGender = '';

// ===== Landing Page Functions =====

// 테스트 모드 또는 실제 월에 따라 만족도 조사 버튼 표시/숨김
function updateLandingButtons() {
  var effectiveMonth = getEffectiveDate().getMonth() + 1; // 1-12
  var isSatPeriod = (effectiveMonth === 1 || effectiveMonth === 7);
  var newBtn = document.getElementById('landingNewSurveyBtn');
  var satBtn = document.getElementById('landingSatisfactionBtn');
  // v6.0.0: 1/7월에는 신규 응답 숨기고 만족도 조사로 완전 대체
  if (newBtn) newBtn.style.display = isSatPeriod ? 'none' : '';
  if (satBtn) satBtn.style.display = isSatPeriod ? '' : 'none';
}

// 페이지 로드 시 자동 실행
document.addEventListener('DOMContentLoaded', function() {
  updateLandingButtons();
  // v6.1.2: 테스트 모드 복원 시 학기 라벨 갱신 (getEffectiveDate 사용)
  if (testModeMonth !== null && typeof refreshSemesterDisplay === 'function') {
    refreshSemesterDisplay();
  }
  // 테스트 모드 상태 표시 (배너)
  if (testModeMonth !== null) {
    var banner = document.createElement('div');
    banner.id = 'testModeBanner';
    banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:99999;background:rgba(255,165,0,0.95);color:#000;text-align:center;padding:6px 12px;font-size:12px;font-weight:600;backdrop-filter:blur(10px);';
    banner.textContent = '🧪 테스트 모드: ' + (testModeYear ? testModeYear + '년 ' : '') + testModeMonth + '월' + (testModeDay ? ' ' + testModeDay + '일' : '') + ' 시뮬레이션 중';
    document.body.appendChild(banner);
  }
});
