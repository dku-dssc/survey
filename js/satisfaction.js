// ===== 교수·학습지원만족도 조사 (1/7월 전용) =====
// v6.1.2

var satSurveyData = null; // 학생의 수요조사 응답 데이터
var satStudentHash = null; // 본인확인용 해시
var satEditMode = false; // v6.1.2: 만족도 응답 수정 모드

// v6.1.2: 기존 응답 수정 라우팅 — 1/7월에는 만족도 조사 수정, 그 외에는 수요조사 수정
function handleEditResponse() {
  var effectiveMonth = getEffectiveDate().getMonth() + 1;
  if (effectiveMonth === 1 || effectiveMonth === 7) {
    // 만족도 조사 시기 → 만족도 조사 본인확인 페이지로
    startSatisfactionEdit();
  } else {
    // 일반 시기 → 수요조사 수정 본인확인 페이지로
    showVerifyPage();
  }
}

// v6.1.2: 만족도 조사 수정 시작 — 본인확인 페이지 표시
function startSatisfactionEdit() {
  satEditMode = true;
  document.querySelectorAll('.survey-page').forEach(function(p) {
    p.classList.remove('active');
    p.style.display = '';
  });
  var satVerify = document.querySelector('[data-page="sat-verify"]');
  if (satVerify) {
    satVerify.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// 만족도 조사 시작
function startSatisfactionSurvey() {
  // 현재 월 확인 (테스트 모드 포함)
  var effectiveMonth = getEffectiveDate().getMonth() + 1;
  if (effectiveMonth !== 1 && effectiveMonth !== 7) {
    showToast('만족도 조사는 1월과 7월에만 참여할 수 있습니다.');
    return;
  }
  // 모든 설문 페이지 숨기기 (active 클래스 제거 + inline display 초기화)
  document.querySelectorAll('.survey-page').forEach(function(p) {
    p.classList.remove('active');
    p.style.display = '';
  });
  // 만족도 본인확인 페이지 표시
  var satVerify = document.querySelector('[data-page="sat-verify"]');
  if (satVerify) {
    satVerify.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// 만족도 조사 취소 → 랜딩 페이지로
function cancelSatisfactionSurvey() {
  // v6.0.0: 만족도 전용 페이지만 숨기고, 나머지는 inline display 초기화
  document.querySelectorAll('.survey-page').forEach(function(p) {
    var pg = p.getAttribute('data-page');
    if (pg === 'sat-verify' || pg === 'sat-rate' || pg === 'sat-complete') {
      p.style.display = 'none';
    } else {
      p.style.display = '';  // inline display 제거 → CSS .active로 제어
    }
  });
  satSurveyData = null;
  satStudentHash = null;
  satEditMode = false;
  // 입력 필드 초기화 (v6.1.2: 3-field DOB)
  var fields = ['satVerifyName', 'satVerifyBirthYear', 'satVerifyBirthMonth', 'satVerifyBirthDay', 'satVerifyStudentId'];
  fields.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
  var errorEl = document.getElementById('satVerifyError');
  if (errorEl) errorEl.style.display = 'none';
  // 랜딩 페이지 표시
  if (typeof showPage === 'function') {
    currentPage = 0;
    showPage(0);
  }
}

// 학생 본인확인 → 수요조사 참여 데이터 조회
async function verifySatisfactionStudent() {
  var name = document.getElementById('satVerifyName').value.trim();
  var sby = document.getElementById('satVerifyBirthYear').value.trim();
  var sbm = document.getElementById('satVerifyBirthMonth').value.trim();
  var sbd = document.getElementById('satVerifyBirthDay').value.trim();
  // 생년월일 조합: YYYY-MM-DD
  var birth = '';
  if (sby && sbm && sbd) {
    birth = sby.padStart(4, '0') + '-' + sbm.padStart(2, '0') + '-' + sbd.padStart(2, '0');
  }
  var studentId = document.getElementById('satVerifyStudentId').value.trim();
  var errorEl = document.getElementById('satVerifyError');

  if (!name || !birth || !studentId) {
    if (errorEl) {
      errorEl.textContent = '모든 항목을 입력해주세요.';
      errorEl.style.display = 'block';
    }
    return;
  }

  if (errorEl) errorEl.style.display = 'none';

  try {
    // 서버에 본인확인 요청 — 수요조사 응답에서 page4 데이터 반환
    var resp = await fetch(API_BASE + '/api/satisfaction/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, studentId: studentId, birthDate: birth })
    });
    var result = await resp.json();

    if (!resp.ok || !result.success) {
      if (errorEl) {
        errorEl.textContent = result.error || '수요조사에 참여한 학생 정보와 일치하지 않습니다.';
        errorEl.style.display = 'block';
      }
      return;
    }

    // 이미 만족도 조사 제출한 경우
    if (result.alreadySubmitted && !satEditMode) {
      // 새로운 제출 시도인데 이미 제출됨 → 에러 표시
      if (errorEl) {
        errorEl.textContent = '이미 만족도 조사를 제출하셨습니다. "기존 응답 수정" 버튼을 이용해주세요.';
        errorEl.style.display = 'block';
      }
      return;
    }

    if (result.alreadySubmitted && satEditMode && !result.existingSatisfactionData) {
      // 수정 모드인데 기존 데이터 복호화 실패
      if (errorEl) {
        errorEl.textContent = '기존 만족도 응답을 불러올 수 없습니다.';
        errorEl.style.display = 'block';
      }
      return;
    }

    if (!result.alreadySubmitted && satEditMode) {
      // 수정 모드인데 만족도 응답이 없음
      if (errorEl) {
        errorEl.textContent = '만족도 조사를 아직 제출하지 않으셨습니다.';
        errorEl.style.display = 'block';
      }
      return;
    }

    satSurveyData = result.teachSupportItems || [];
    satStudentHash = result.identityHash;

    // 항목별 평가 UI 생성
    renderSatisfactionRatingItems(satSurveyData);

    // v6.1.2: 수정 모드 시 기존 데이터 채우기
    if (satEditMode && result.existingSatisfactionData) {
      prefillSatisfactionData(result.existingSatisfactionData);
    }

    // 평가 페이지로 전환
    document.querySelectorAll('.survey-page').forEach(function(p) {
      p.classList.remove('active');
      p.style.display = '';
    });
    var satRate = document.querySelector('[data-page="sat-rate"]');
    if (satRate) {
      satRate.style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  } catch(e) {
    if (errorEl) {
      errorEl.textContent = '서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.';
      errorEl.style.display = 'block';
    }
  }
}

// 교수·학습지원 항목별 만족도 평가 UI 렌더링
function renderSatisfactionRatingItems(items) {
  var container = document.getElementById('satRatingItems');
  if (!container) return;

  if (!items || items.length === 0) {
    container.innerHTML = '<div class="glass-card"><p style="text-align:center;color:var(--text-tertiary);padding:20px;">요청한 교수·학습지원 항목이 없습니다.</p></div>';
    return;
  }

  // 카테고리별 분류
  var categories = {
    commonSupport: { label: '공통', items: [] },
    theorySupport: { label: '이론 수업', items: [] },
    labSupport: { label: '실험·실습 수업', items: [] },
    fieldSupport: { label: '현장실습수업', items: [] },
    evalSupport: { label: '평가 지원', items: [] }
  };

  items.forEach(function(item) {
    var cat = categories[item.category];
    if (cat) {
      cat.items.push(item.value);
    }
  });

  var html = '';
  Object.keys(categories).forEach(function(catKey) {
    var cat = categories[catKey];
    if (cat.items.length === 0) return;

    html += '<div class="glass-card">';
    html += '<div class="form-group">';
    html += '<label class="form-label" style="font-weight:700;font-size:15px;margin-bottom:12px;">' + escapeHtml(cat.label) + '</label>';

    cat.items.forEach(function(itemValue, idx) {
      var ratingName = 'sat_' + catKey + '_' + idx;
      html += '<div class="sat-item-row">';
      html += '<div class="sat-item-label">' + escapeHtml(itemValue) + '</div>';
      html += '<div class="option-group sat-rating-group" data-name="' + ratingName + '" data-type="radio" data-item-value="' + encodeURIComponent(itemValue) + '" data-item-category="' + catKey + '">';
      for (var score = 1; score <= 5; score++) {
        var scoreLabel = score === 1 ? '매우 불만족' : score === 2 ? '불만족' : score === 3 ? '보통' : score === 4 ? '만족' : '매우 만족';
        html += '<div class="option-item sat-score-item" data-value="' + score + '" onclick="selectOption(this)">';
        html += '<div class="custom-radio"></div>';
        html += '<span class="option-label">' + score + '점</span>';
        html += '</div>';
      }
      html += '</div>';
      html += '</div>';
    });

    html += '</div></div>';
  });

  container.innerHTML = html;
}

// 만족도 조사 제출
async function submitSatisfactionSurvey() {
  // 항목별 점수 수집
  var itemRatings = [];
  var ratingGroups = document.querySelectorAll('.sat-rating-group');
  var allRated = true;

  ratingGroups.forEach(function(group) {
    var selected = group.querySelector('.option-item.selected');
    var itemValue = decodeURIComponent(group.getAttribute('data-item-value') || '');
    var category = group.getAttribute('data-item-category') || '';
    if (selected) {
      itemRatings.push({
        category: category,
        item: itemValue,
        score: parseInt(selected.getAttribute('data-value'))
      });
    } else {
      allRated = false;
    }
  });

  if (!allRated) {
    showToast('모든 항목의 만족도를 평가해주세요.');
    // 첫 번째 미평가 항목으로 스크롤
    var firstUnrated = document.querySelector('.sat-rating-group:not(:has(.option-item.selected))');
    if (firstUnrated) firstUnrated.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  // 전반적 만족도
  var overallGroup = document.querySelector('[data-name="satOverallRating"]');
  var overallSelected = overallGroup ? overallGroup.querySelector('.option-item.selected') : null;
  if (!overallSelected) {
    showToast('전반적 만족도를 평가해주세요.');
    if (overallGroup) overallGroup.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  var overallScore = parseInt(overallSelected.getAttribute('data-value'));

  // 서술형 필수 응답
  var additionalSupport = document.getElementById('satAdditionalSupport').value.trim();
  var suggestions = document.getElementById('satSuggestions').value.trim();

  if (!additionalSupport) {
    showToast('실제로 지원받으신 내용을 작성해주세요.');
    document.getElementById('satAdditionalSupport').scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  if (!suggestions) {
    showToast('개선 사항이나 건의사항을 작성해주세요.');
    document.getElementById('satSuggestions').scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  // 제출
  try {
    var payload = {
      identityHash: satStudentHash,
      itemRatings: itemRatings,
      overallScore: overallScore,
      additionalSupport: additionalSupport,
      suggestions: suggestions
    };

    // v6.1.2: 수정 모드면 update, 아니면 submit
    var apiUrl = satEditMode ? (API_BASE + '/api/satisfaction/update') : (API_BASE + '/api/satisfaction/submit');
    var apiMethod = satEditMode ? 'PUT' : 'POST';

    var resp = await fetch(apiUrl, {
      method: apiMethod,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    var result = await resp.json();

    if (!resp.ok || !result.success) {
      showToast(result.error || (satEditMode ? '수정에 실패했습니다.' : '제출에 실패했습니다.') + ' 다시 시도해주세요.');
      return;
    }

    // 완료 페이지로 전환
    document.querySelectorAll('.survey-page').forEach(function(p) {
      p.classList.remove('active');
      p.style.display = '';
    });
    var satComplete = document.querySelector('[data-page="sat-complete"]');
    if (satComplete) {
      satComplete.style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    satSurveyData = null;
    satStudentHash = null;
    satEditMode = false;
  } catch(e) {
    showToast('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
  }
}

// v6.1.2: 기존 만족도 데이터로 폼 채우기
function prefillSatisfactionData(data) {
  // 항목별 점수 채우기
  if (data.itemRatings && Array.isArray(data.itemRatings)) {
    data.itemRatings.forEach(function(rating) {
      var groups = document.querySelectorAll('.sat-rating-group');
      groups.forEach(function(group) {
        var cat = group.getAttribute('data-item-category');
        var itemVal = decodeURIComponent(group.getAttribute('data-item-value') || '');
        if (cat === rating.category && itemVal === rating.item) {
          var scoreItems = group.querySelectorAll('.option-item');
          scoreItems.forEach(function(si) {
            if (parseInt(si.getAttribute('data-value')) === rating.score) {
              si.classList.add('selected');
            }
          });
        }
      });
    });
  }
  // 전반적 만족도
  if (data.overallScore) {
    var overallGroup = document.querySelector('[data-name="satOverallRating"]');
    if (overallGroup) {
      var items = overallGroup.querySelectorAll('.option-item');
      items.forEach(function(item) {
        if (parseInt(item.getAttribute('data-value')) === data.overallScore) {
          item.classList.add('selected');
        }
      });
    }
  }
  // 서술형
  if (data.additionalSupport) {
    var el = document.getElementById('satAdditionalSupport');
    if (el) el.value = data.additionalSupport;
  }
  if (data.suggestions) {
    var el2 = document.getElementById('satSuggestions');
    if (el2) el2.value = data.suggestions;
  }
  showToast('기존 만족도 응답을 불러왔습니다. 수정 후 제출해주세요.');
}

// ===== v6.1.2: 만족도 조사 본인확인 키보드 네비게이션 (기존 응답 수정과 동일) =====
(function() {
  // 성명 → Enter/ArrowDown → 생년월일(연도)
  document.addEventListener('keydown', function(e) {
    if (e.target.id === 'satVerifyName' && (e.key === 'Enter' || e.key === 'ArrowDown')) {
      e.preventDefault();
      var vy = document.getElementById('satVerifyBirthYear');
      if (vy) vy.focus();
    }
  });

  // 생년월일 자동 이동 + 숫자만 입력
  ['satVerifyBirthYear', 'satVerifyBirthMonth', 'satVerifyBirthDay'].forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', function() {
      // 숫자만 허용
      this.value = this.value.replace(/[^0-9]/g, '');
      var maxLen = parseInt(this.maxLength) || (id === 'satVerifyBirthYear' ? 4 : 2);
      if (this.value.length >= maxLen) {
        // 다음 필드로 자동 이동
        if (id === 'satVerifyBirthYear') {
          var nm = document.getElementById('satVerifyBirthMonth');
          if (nm) nm.focus();
        } else if (id === 'satVerifyBirthMonth') {
          var nd = document.getElementById('satVerifyBirthDay');
          if (nd) nd.focus();
        } else if (id === 'satVerifyBirthDay') {
          var ns = document.getElementById('satVerifyStudentId');
          if (ns) ns.focus();
        }
      }
    });
    // Enter/ArrowDown도 다음으로 이동
    el.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (id === 'satVerifyBirthYear') {
          var nm = document.getElementById('satVerifyBirthMonth');
          if (nm) nm.focus();
        } else if (id === 'satVerifyBirthMonth') {
          var nd = document.getElementById('satVerifyBirthDay');
          if (nd) nd.focus();
        } else if (id === 'satVerifyBirthDay') {
          var ns = document.getElementById('satVerifyStudentId');
          if (ns) ns.focus();
        }
      }
    });
  });

  // 학번 필드 숫자만 허용
  var satStudentIdEl = document.getElementById('satVerifyStudentId');
  if (satStudentIdEl) {
    satStudentIdEl.addEventListener('input', function() {
      this.value = this.value.replace(/[^0-9]/g, '');
    });
  }
})();
