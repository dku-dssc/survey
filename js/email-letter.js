// ===== Email integration, letter generation, enrollment, deadline settings, calendar =====
// 원본 index.html에서 분리됨 (v5.0.1)

function generateLetter() {
  const idx = document.getElementById('letterStudentSelect').value;
  if (idx === '') {
    document.getElementById('letterPreviewArea').innerHTML = '';
    return;
  }

  const r = responses[idx];
  const supportFields = {
    '공통 지원': 'commonSupport',
    '이론 수업 지원': 'theorySupport',
    '실험·실습 수업 지원': 'labSupport',
    '현장실습수업 지원': 'fieldSupport',
    '평가 지원': 'evalSupport',
    '보조기기 및 인적 지원': 'deviceSupport',
  };

  let supportHtml = '';
  for (const [label, field] of Object.entries(supportFields)) {
    if (r[field] && r[field].length > 0) {
      const items = Array.isArray(r[field]) ? r[field] : [r[field]];
      supportHtml +=
        '<p><strong>▸ ' +
        label +
        '</strong></p><p style="padding-left:16px;">' +
        items.join(', ') +
        '</p>';
    }
  }

  const detailFields = {
    공통: 'commonDetail',
    '이론 수업': 'theoryDetail',
    '실험·실습': 'labDetail',
    현장실습: 'fieldDetail',
    평가: 'evalDetail',
  };

  let detailHtml = '';
  for (const [label, field] of Object.entries(detailFields)) {
    if (r[field]) {
      detailHtml +=
        '<p><strong>▸ ' +
        label +
        ' 세부 요청:</strong> ' +
        r[field] +
        '</p>';
    }
  }

  const today = new Date();
  const dateStr =
    today.getFullYear() +
    '년 ' +
    (today.getMonth() + 1) +
    '월 ' +
    today.getDate() +
    '일';

  const disabilityTypeStr = r.disabilityType
    ? Array.isArray(r.disabilityType)
      ? r.disabilityType.join(', ')
      : r.disabilityType
    : '';

  document.getElementById('letterPreviewArea').innerHTML =
    '<div class="letter-preview">' +
    '<h4>장애학생 학습지원 협조 요청</h4>' +
    '<p style="text-align:right;font-size:12px;color:var(--text-tertiary);">' +
    dateStr +
    '</p>' +
    '<br>' +
    '<p>안녕하세요, 단국대학교 장애학생지원센터입니다.</p>' +
    '<br>' +
    '<p>귀 학과(부)에 소속된 <strong>' +
    (r.name || '○○○') +
    '</strong> 학생(학번: ' +
    (r.studentId || '○○○○○○') +
    ')은 <strong>' +
    (disabilityTypeStr || '○○장애') +
    '</strong>(' +
    (r.disabilityLevel || '장애정도 미기재') +
    ')으로 등록된 장애학생입니다.</p>' +
    '<br>' +
    '<p>「장애인 등에 대한 특수교육법」제 30조의 2에 의거하여 해당 학생의 개인별 교육지원계획에 따른 학습지원 협조를 요청드립니다.</p>' +
    '<br>' +
    '<p><strong>■ 학생 정보</strong></p>' +
    '<p>· 성명: ' +
    (r.name || '-') +
    '</p>' +
    '<p>· 학과(부): ' +
    (r.department || '-') +
    '</p>' +
    '<p>· 학년: ' +
    (r.grade || '-') +
    '</p>' +
    '<p>· 장애유형: ' +
    (disabilityTypeStr || '-') +
    '</p>' +
    '<p>· 장애정도: ' +
    (r.disabilityLevel || '-') +
    '</p>' +
    (r.assistiveDevice
      ? '<p>· 사용 보조기기: ' + r.assistiveDevice + '</p>'
      : '') +
    '<br>' +
    '<p><strong>■ 요청 지원 사항</strong></p>' +
    (supportHtml || '<p>지원 요청사항 없음</p>') +
    '<br>' +
    (detailHtml
      ? '<p><strong>■ 세부 요청 사항</strong></p>' + detailHtml + '<br>'
      : '') +
    '<p>해당 학생의 학습권 보장을 위하여 위 사항에 대한 적극적인 협조를 부탁드립니다.</p>' +
    '<br>' +
    '<p style="text-align:center;margin-top:24px;">단국대학교 장애학생지원센터장</p>' +
    '</div>' +
    '<div class="letter-actions">' +
    '<div class="letter-actions-row">' +
    '<button class="btn btn-primary" onclick="copyLetter()" style="flex:1;">📋 복사</button>' +
    '<button class="btn btn-secondary" onclick="printLetter()" style="flex:1;">🖨️ 인쇄</button>' +
    '<button class="btn btn-secondary" onclick="downloadLetter()" style="flex:1;">📥 다운로드</button>' +
    '</div>' +
    '<div class="letter-actions-row">' +
    '<button class="btn btn-secondary" onclick="sendOfficialLetter()" style="flex:1;background:rgba(17,100,177,0.1);color:var(--primary);border:1px solid rgba(17,100,177,0.3);">📨 담당 교수님께 공문 보내기</button>' +
    '</div>' +
    '</div>';
}

function copyLetter() {
  const letterEl = document.querySelector('.letter-preview');
  if (letterEl) {
    const text = letterEl.innerText;
    navigator.clipboard.writeText(text).then(function () {
      showToast('레터링이 클립보드에 복사되었습니다.');
    });
  }
}

function printLetter() {
  const letterEl = document.querySelector('.letter-preview');
  if (letterEl) {
    const w = window.open('', '_blank');
    w.document.write(
      '<html><head><title>학습지원 협조 요청</title>' +
        '<style>body{font-family:-apple-system,sans-serif;padding:40px;line-height:2;font-size:14px;}' +
        'h4{text-align:center;font-size:18px;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:24px;}' +
        'strong{font-weight:600;}</style></head><body>' +
        letterEl.innerHTML +
        '</body></html>',
    );
    w.document.close();
    w.print();
  }
}

function downloadLetter() {
  const letterEl = document.querySelector('.letter-preview');
  if (letterEl) {
    const text = letterEl.innerText;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download =
      '학습지원_협조요청_' +
      document.getElementById('letterStudentSelect').selectedOptions[0]
        .text +
      '.txt';
    a.click();
    URL.revokeObjectURL(url);
  }
}

// ===== Email Integration (이메일 연동) =====
var linkedEmail = null; // 연동된 이메일 주소
var emailVerifyPending = null; // 인증 대기 중인 이메일

function updateEmailLinkBar() {
  var bar = document.getElementById('emailLinkBar');
  var valueEl = document.getElementById('emailLinkValue');
  var btnIcon = document.getElementById('emailActionIcon');
  var btn = document.getElementById('emailActionBtn');
  if (!bar || !valueEl || !btnIcon || !btn) return;
  if (linkedEmail) {
    valueEl.textContent = linkedEmail;
    btnIcon.textContent = '✕';
    btn.classList.add('linked');
    btn.title = '이메일 연동 해제';
  } else {
    valueEl.textContent = '연동된 이메일 없음';
    btnIcon.textContent = '+';
    btn.classList.remove('linked');
    btn.title = '이메일 추가';
  }
  // DB 사용량 표시: 이메일 바가 보이고 토큰이 있으면 indicator 렌더
  if (adminToken && bar.style.display !== 'none') {
    renderDbUsageIndicator(bar);
  }
}

function handleEmailAction() {
  if (linkedEmail) {
    // 연동 해제 확인
    if (confirm('이메일 연동을 해제하겠습니까?\n\n연동 해제 시 레터링 발송 기능을 사용할 수 없습니다.')) {
      unlinkEmail();
    }
  } else {
    // 인증 팝업 열기
    openEmailVerify();
  }
}

function openEmailVerify() {
  var overlay = document.getElementById('emailVerifyOverlay');
  var input = document.getElementById('emailVerifyInput');
  var step1 = document.getElementById('emailStep1');
  var step2 = document.getElementById('emailStep2');
  if (!overlay) return;
  emailVerifyPending = null;
  input.value = '';
  step1.style.display = 'block';
  step2.style.display = 'none';
  overlay.style.display = 'flex';
  setTimeout(function() { input.focus(); }, 100);
}

function closeEmailVerify() {
  var overlay = document.getElementById('emailVerifyOverlay');
  if (overlay) overlay.style.display = 'none';
  emailVerifyPending = null;
}

async function sendEmailVerifyCode() {
  var input = document.getElementById('emailVerifyInput');
  var sendBtn = document.getElementById('emailSendCodeBtn');
  var email = (input.value || '').trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast('올바른 이메일 주소를 입력해주세요.', 'error');
    input.focus();
    return;
  }
  sendBtn.disabled = true;
  sendBtn.textContent = '발송 중...';
  try {
    var resp = await fetch(API_BASE + '/api/admin/email/send-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + adminToken
      },
      body: JSON.stringify({ email: email })
    });
    var result = await resp.json();
    if (!resp.ok) throw new Error(result.error || '발송 실패');
    emailVerifyPending = email;
    document.getElementById('emailStep1').style.display = 'none';
    var step2 = document.getElementById('emailStep2');
    step2.style.display = 'block';
    document.getElementById('emailCodeMsg').textContent = email + '로 인증코드가 발송되었습니다.';
    var codeInput = document.getElementById('emailCodeInput');
    codeInput.value = '';
    setTimeout(function() { codeInput.focus(); }, 100);
    showToast('인증코드가 발송되었습니다.');
  } catch (e) {
    showToast(e.message || '인증코드 발송에 실패했습니다.', 'error');
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = '인증코드 발송';
  }
}

async function verifyEmailCode() {
  var codeInput = document.getElementById('emailCodeInput');
  var verifyBtn = document.getElementById('emailVerifyBtn');
  var code = (codeInput.value || '').trim();
  if (!code || code.length !== 6) {
    showToast('6자리 인증코드를 입력해주세요.', 'error');
    codeInput.focus();
    return;
  }
  if (!emailVerifyPending) {
    showToast('이메일 인증 세션이 만료되었습니다.', 'error');
    closeEmailVerify();
    return;
  }
  verifyBtn.disabled = true;
  verifyBtn.textContent = '확인 중...';
  try {
    var resp = await fetch(API_BASE + '/api/admin/email/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + adminToken
      },
      body: JSON.stringify({ email: emailVerifyPending, code: code })
    });
    var result = await resp.json();
    if (!resp.ok) throw new Error(result.error || '인증 실패');
    linkedEmail = emailVerifyPending;
    emailVerifyPending = null;
    closeEmailVerify();
    updateEmailLinkBar();
    showToast('이메일 인증이 완료되었습니다!');
  } catch (e) {
    showToast(e.message || '인증에 실패했습니다.', 'error');
    codeInput.value = '';
    codeInput.focus();
  } finally {
    verifyBtn.disabled = false;
    verifyBtn.textContent = '인증 확인';
  }
}

async function unlinkEmail() {
  try {
    var resp = await fetch(API_BASE + '/api/admin/email', {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    if (!resp.ok) {
      var result = await resp.json();
      throw new Error(result.error || '해제 실패');
    }
    linkedEmail = null;
    updateEmailLinkBar();
    showToast('이메일 연동이 해제되었습니다.');
  } catch (e) {
    showToast(e.message || '이메일 연동 해제에 실패했습니다.', 'error');
  }
}

async function loadLinkedEmail() {
  if (!adminToken) return;
  try {
    var resp = await fetch(API_BASE + '/api/admin/email', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    if (resp.ok) {
      var result = await resp.json();
      linkedEmail = result.email || null;
    }
  } catch (e) {
    // 조용히 실패
  }
  updateEmailLinkBar();
}

// ===== Enrollment File Management (우선수강신청서) =====
var enrollmentData = []; // [{fileName, uploadedAt, id, rows: [{name, studentId, courseName, instructorId, instructorName, instructorEmail, instructorPhone}]}]
var pendingExcelData = null; // temporary parsed data before mapping confirmation
var pendingFileName = '';
var columnMapping = {
  B: 'studentName',
  C: 'studentId',
  D: 'courseName',
  E: 'instructorId',
  F: 'instructorName',
  G: 'instructorEmail',
  H: 'instructorPhone'
};
var mappingLabels = {
  studentName: '학생 성명',
  studentId: '학생 학번',
  courseName: '교과목명',
  instructorId: '교강사 교번',
  instructorName: '교강사명',
  instructorEmail: '교강사 이메일',
  instructorPhone: '교강사 휴대폰 번호',
  skip: '(사용 안 함)'
};

// Drag & drop setup
document.addEventListener('DOMContentLoaded', function() {
  var dropZone = document.getElementById('enrollmentDropZone');
  if (!dropZone) return;
  dropZone.addEventListener('dragover', function(e) {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  dropZone.addEventListener('dragleave', function() {
    dropZone.classList.remove('dragover');
  });
  dropZone.addEventListener('drop', function(e) {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    var files = e.dataTransfer.files;
    if (files.length > 0) processEnrollmentFile(files[0]);
  });
});

function handleEnrollmentFileSelect(event) {
  var file = event.target.files[0];
  if (file) processEnrollmentFile(file);
  event.target.value = '';
}

function processEnrollmentFile(file) {
  if (!file.name.match(/\.(xlsx|xls)$/i)) {
    showToast('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.');
    return;
  }
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var data = new Uint8Array(e.target.result);
      var workbook = XLSX.read(data, { type: 'array' });
      var firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      var jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 'A', defval: '' });
      if (jsonData.length < 2) {
        showToast('데이터가 부족합니다. 헤더 행과 데이터 행이 필요합니다.');
        return;
      }
      pendingExcelData = jsonData;
      pendingFileName = file.name;
      showColumnMappingPopup();
    } catch (err) {
      showToast('엑셀 파일 읽기 오류: ' + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

function showColumnMappingPopup() {
  // 엑셀 파일이 없으면 서버에 저장된 매핑 데이터로 팝업 열기
  if (!pendingExcelData || pendingExcelData.length === 0) {
    if (enrollmentData.length > 0 && enrollmentData[0].columnMapping) {
      try {
        var sm = typeof enrollmentData[0].columnMapping === 'string' ? JSON.parse(enrollmentData[0].columnMapping) : enrollmentData[0].columnMapping;
        Object.assign(columnMapping, sm);
        // 서버 매핑 키를 기반으로 가상 열 목록 생성하여 팝업 열기
        var cols = Object.keys(sm).filter(function(k) { return sm[k] !== 'skip'; });
        if (cols.length === 0) cols = Object.keys(sm);
        if (cols.length > 0) {
          var overlay = document.getElementById('mappingOverlay');
          document.getElementById('mappingPreview').innerHTML = '<p style="font-size:11px;color:var(--text-tertiary);padding:8px 0;">서버에 저장된 매핑을 기반으로 표시합니다.</p>';
          var fieldOptions = Object.entries(mappingLabels).map(function(entry) {
            return '<option value="' + entry[0] + '">' + entry[1] + '</option>';
          }).join('');
          var rowsHtml = '';
          cols.forEach(function(col) {
            var currentVal = columnMapping[col] || 'skip';
            var optionsHtml = fieldOptions.replace('value="' + currentVal + '"', 'value="' + currentVal + '" selected');
            rowsHtml += '<div class="mapping-row"><label>' + col + '열</label><select id="mapping_' + col + '">' + optionsHtml + '</select></div>';
          });
          document.getElementById('mappingRows').innerHTML = rowsHtml;
          overlay.classList.add('show');
          return;
        }
      } catch(e) {}
    }
    showToast('매핑을 확인하려면 엑셀 파일을 업로드하세요.');
    return;
  }
  var overlay = document.getElementById('mappingOverlay');
  // 서버 저장 매핑 기본값 적용
  if (enrollmentData.length > 0 && enrollmentData[0].columnMapping) {
    try {
      var sm = typeof enrollmentData[0].columnMapping === 'string' ? JSON.parse(enrollmentData[0].columnMapping) : enrollmentData[0].columnMapping;
      for (var k in sm) { if (!columnMapping[k]) columnMapping[k] = sm[k]; }
    } catch(e) {}
  }
  // Build preview table
  var previewHtml = '<div style="overflow-x:auto;"><table class="mapping-preview-table"><tr>';
  var cols = Object.keys(pendingExcelData[0]);
  cols.forEach(function(c) { previewHtml += '<th>' + c + '</th>'; });
  previewHtml += '</tr>';
  for (var i = 0; i < Math.min(3, pendingExcelData.length); i++) {
    previewHtml += '<tr>';
    cols.forEach(function(c) {
      previewHtml += '<td>' + escapeHTML(String(pendingExcelData[i][c] || '')) + '</td>';
    });
    previewHtml += '</tr>';
  }
  previewHtml += '</table></div>';
  document.getElementById('mappingPreview').innerHTML = previewHtml;
  // Build mapping rows
  var fieldOptions = Object.entries(mappingLabels).map(function(entry) {
    return '<option value="' + entry[0] + '">' + entry[1] + '</option>';
  }).join('');
  var rowsHtml = '';
  cols.forEach(function(col) {
    var currentVal = columnMapping[col] || 'skip';
    var optionsHtml = fieldOptions.replace(
      'value="' + currentVal + '"',
      'value="' + currentVal + '" selected'
    );
    rowsHtml += '<div class="mapping-row">' +
      '<label>' + col + '열</label>' +
      '<select id="mapping_' + col + '">' + optionsHtml + '</select>' +
      '</div>';
  });
  document.getElementById('mappingRows').innerHTML = rowsHtml;
  overlay.classList.add('show');
}

// 엑셀 헤더 자동 감지
function autoDetectMapping() {
  if (!pendingExcelData || pendingExcelData.length === 0) return;
  var headerRow = pendingExcelData[0];
  var cols = Object.keys(headerRow);
  var keywordMap = {
    '성명': 'studentName', '이름': 'studentName', '학생명': 'studentName', '학생 성명': 'studentName',
    '학번': 'studentId', '학생학번': 'studentId', '학생 학번': 'studentId',
    '교과목': 'courseName', '과목명': 'courseName', '교과목명': 'courseName', '과목': 'courseName',
    '교번': 'instructorId', '교강사교번': 'instructorId', '교강사 교번': 'instructorId', '교원번호': 'instructorId',
    '교강사명': 'instructorName', '교수명': 'instructorName', '교강사': 'instructorName', '담당교수': 'instructorName',
    '이메일': 'instructorEmail', '교강사 이메일': 'instructorEmail', '교수 이메일': 'instructorEmail',
    '휴대폰': 'instructorPhone', '전화번호': 'instructorPhone', '휴대폰번호': 'instructorPhone', '교강사 휴대폰 번호': 'instructorPhone'
  };
  var assigned = {};
  cols.forEach(function(col) {
    var val = String(headerRow[col] || '').trim();
    for (var kw in keywordMap) {
      if (val === kw || val.indexOf(kw) !== -1) {
        var target = keywordMap[kw];
        if (!assigned[target]) {
          assigned[target] = col;
          var sel = document.getElementById('mapping_' + col);
          if (sel) sel.value = target;
          break;
        }
      }
    }
  });
  var count = Object.keys(assigned).length;
  showToast(count > 0 ? count + '개 열이 자동 매핑되었습니다.' : '헤더에서 매핑 가능한 항목을 찾지 못했습니다. 첫 번째 행이 헤더인지 확인해주세요.');
}

function closeMappingPopup() {
  document.getElementById('mappingOverlay').classList.remove('show');
}

function saveMappingAndUpload() {
  // Read mapping from popup
  var cols = Object.keys(pendingExcelData[0]);
  var newMapping = {};
  cols.forEach(function(col) {
    var sel = document.getElementById('mapping_' + col);
    if (sel && sel.value !== 'skip') {
      newMapping[col] = sel.value;
    }
  });
  columnMapping = newMapping;

  // Parse data rows using mapping (skip header row = row 0)
  var rows = [];
  for (var i = 1; i < pendingExcelData.length; i++) {
    var raw = pendingExcelData[i];
    var row = {};
    var hasData = false;
    for (var col in newMapping) {
      var val = String(raw[col] || '').trim();
      row[newMapping[col]] = val;
      if (val) hasData = true;
    }
    if (hasData) rows.push(row);
  }

  if (rows.length === 0) {
    showToast('유효한 데이터 행이 없습니다.');
    return;
  }

  closeMappingPopup();
  uploadEnrollmentToServer(pendingFileName, rows, newMapping);
}

async function uploadEnrollmentToServer(fileName, rows, mapping) {
  if (!adminToken) {
    showToast('관리자 로그인이 필요합니다.');
    return;
  }
  try {
    var payload = {
      fileName: fileName,
      columnMapping: mapping,
      rows: rows
    };
    var body = JSON.stringify(payload);

    var resp = await fetch(API_BASE + '/api/admin/enrollment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + adminToken
      },
      body: body
    });

    var result = await resp.json();
    if (!resp.ok) throw new Error(result.error || '업로드 실패');

    showToast('수강신청 명단이 업로드되었습니다. (' + rows.length + '건)');
    pendingExcelData = null;
    pendingFileName = '';
    await loadEnrollmentData();
    renderEnrollmentFiles();
    renderCurrentMapping();
    document.getElementById('btnColumnMapping').disabled = false;
  } catch (err) {
    showToast('업로드 오류: ' + err.message);
  }
}

async function loadEnrollmentData() {
  if (!adminToken) return;
  try {
    var resp = await fetch(API_BASE + '/api/admin/enrollment', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    var result = await resp.json();
    if (resp.ok && result.files) {
      enrollmentData = result.files;
      if (enrollmentData.length > 0) {
        document.getElementById('btnColumnMapping').disabled = false;
      }
    }
  } catch (err) { /* silent */ }
  renderEnrollmentFiles();
  renderCurrentMapping();
}

async function deleteEnrollmentFile(fileId) {
  if (!confirm('이 수강신청 명단을 삭제하시겠습니까?')) return;
  try {
    var resp = await fetch(API_BASE + '/api/admin/enrollment/' + fileId, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    if (!resp.ok) throw new Error('삭제 실패');
    showToast('명단이 삭제되었습니다.');
    await loadEnrollmentData();
    renderEnrollmentFiles();
  } catch (err) {
    showToast('삭제 오류: ' + err.message);
  }
}

function renderEnrollmentFiles() {
  var container = document.getElementById('enrollmentFileList');
  if (!container) return;
  if (enrollmentData.length === 0) {
    container.innerHTML = '<p style="font-size:12px;color:var(--text-tertiary);padding:8px 0;">업로드된 파일이 없습니다.</p>';
    return;
  }
  container.innerHTML = enrollmentData.map(function(f) {
    return '<div class="enrollment-file-card">' +
      '<div class="file-info">' +
      '<span style="font-size:18px;">📄</span>' +
      '<div>' +
      '<div class="file-name">' + escapeHTML(f.fileName) + '</div>' +
      '<div class="file-meta">' + f.rowCount + '건 · ' + new Date(f.uploadedAt).toLocaleDateString('ko-KR') + '</div>' +
      '</div></div>' +
      '<div class="file-actions">' +
      '<button onclick="viewEnrollmentFile(' + f.id + ')">상세</button>' +
      '<button class="btn-danger" onclick="deleteEnrollmentFile(' + f.id + ')">삭제</button>' +
      '</div></div>';
  }).join('');
}

function viewEnrollmentFile(fileId) {
  var file = enrollmentData.find(function(f) { return f.id === fileId; });
  if (!file || !file.rows) return;
  var allFields = ['studentName','studentId','courseName','instructorId','instructorName','instructorEmail','instructorPhone'];
  var fieldLabels = {studentName:'학생 성명',studentId:'학번',courseName:'교과목명',instructorId:'교강사 교번',instructorName:'교강사명',instructorEmail:'교강사 이메일',instructorPhone:'교강사 휴대폰 번호'};
  var usedFields = allFields.filter(function(f) {
    return file.rows.some(function(r) { return r[f] && String(r[f]).trim(); });
  });
  if (usedFields.length === 0) usedFields = allFields;
  var h = '<button class="btn btn-secondary" onclick="renderEnrollmentFiles();showAdminTab(\'settings\')" style="margin-bottom:12px;font-size:13px;">← 돌아가기</button>';
  h += '<h4 style="font-size:14px;margin-bottom:8px;">' + escapeHTML(file.fileName) + ' <span style="font-size:11px;color:var(--text-tertiary);">(' + file.rows.length + '건)</span></h4>';
  h += '<div class="enrollment-detail-wrap"><table class="mapping-preview-table">';
  h += '<tr>' + usedFields.map(function(f) { return '<th>' + (fieldLabels[f]||f) + '</th>'; }).join('') + '</tr>';
  file.rows.forEach(function(r) {
    h += '<tr>' + usedFields.map(function(f) { return '<td>' + escapeHTML(r[f] || '') + '</td>'; }).join('') + '</tr>';
  });
  h += '</table></div>';
  document.getElementById('enrollmentFileList').innerHTML = h;
}

function renderCurrentMapping() {
  var el = document.getElementById('currentMappingDisplay');
  if (!el) return;
  var cols = Object.keys(columnMapping);
  if (cols.length === 0) {
    el.innerHTML = '<p style="font-size:12px;color:var(--text-tertiary);">매핑이 설정되지 않았습니다.</p>';
    return;
  }
  var t = '<table class="mapping-display-table"><tr>';
  cols.forEach(function(c) { t += '<th>' + c + '열</th>'; });
  t += '</tr><tr>';
  cols.forEach(function(c) { t += '<td>' + (mappingLabels[columnMapping[c]] || columnMapping[c]) + '</td>'; });
  t += '</tr></table>';
  el.innerHTML = t;
}

// ===== Deadline Settings (설문 기한) =====
var deadlineSettings = { survey_deadline: null, temp_deadline: null };

// v5.0.2: 월별 기한 설정 이름 동적 변경
function getDeadlineSemesterLabel(testMonth) {
  var m = testMonth || (typeof getEffectiveDate === 'function' ? getEffectiveDate().getMonth() + 1 : new Date().getMonth() + 1);
  if (m === 1 || m === 7) return '만족도 조사 응답 기한 설정';
  return '개인별 교육지원계획 수요조사 응답 기한 설정';
}

function updateDeadlineSectionLabel(testMonth) {
  var label = getDeadlineSemesterLabel(testMonth);
  var el = document.querySelector('#deadlineSection .deadline-section-label');
  if (el) el.innerHTML = '<span>📅</span> ' + label;
}

async function loadDeadlineSettings() {
  if (!adminToken) return;
  try {
    var resp = await fetch(API_BASE + '/api/admin/settings', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    var result = await resp.json();
    if (resp.ok && result.settings) {
      deadlineSettings = result.settings;
      populateDeadlineUI();
    }
  } catch(e) { /* silent */ }
}

// Date field ID mapping: type -> { year, month, day }
var dlDateFieldMap = {
  start: { year: 'dlStartYear', month: 'dlStartMonth', day: 'dlStartDay' },
  end: { year: 'dlEndYear', month: 'dlEndMonth', day: 'dlEndDay' },
  tempStart: { year: 'dlTempStartYear', month: 'dlTempStartMonth', day: 'dlTempStartDay' },
  tempEnd: { year: 'dlTempEndYear', month: 'dlTempEndMonth', day: 'dlTempEndDay' }
};
// Legacy compatibility
var otpPrefixMap = { start: 'start', end: 'end', tempStart: 'tempStart', tempEnd: 'tempEnd' };

function dlDateAutoMove(el, nextId) {
  el.value = el.value.replace(/[^0-9]/g, '');
  if (el.value.length >= parseInt(el.maxLength)) {
    var next = document.getElementById(nextId);
    if (next) next.focus();
  }
  if (el.id.indexOf('Temp') !== -1) updateDeadlineInfo('temp');
  else updateDeadlineInfo('main');
}

// v4.2.2: 관리자 날짜 한 자리 → 두 자리 보정 (blur 시)
(function() {
  var dlDateIds = [
    'dlStartMonth','dlStartDay','dlEndMonth','dlEndDay',
    'dlTempStartMonth','dlTempStartDay','dlTempEndMonth','dlTempEndDay'
  ];
  document.addEventListener('focusout', function(e) {
    if (dlDateIds.indexOf(e.target.id) !== -1) {
      var v = e.target.value.replace(/[^0-9]/g, '');
      if (v.length === 1) e.target.value = '0' + v;
    }
  });
})();

function setDateFields(type, dateStr) {
  // dateStr = "YYYY-MM-DD", type = "start"/"end"/"tempStart"/"tempEnd"
  var fields = dlDateFieldMap[type]; if (!fields) return;
  var parts = dateStr.split('-');
  var yEl = document.getElementById(fields.year);
  var mEl = document.getElementById(fields.month);
  var dEl = document.getElementById(fields.day);
  if (yEl) yEl.value = parts[0] || '';
  if (mEl) mEl.value = parts[1] || '';
  if (dEl) dEl.value = parts[2] || '';
}

function getDateFromFields(type) {
  var fields = dlDateFieldMap[type]; if (!fields) return null;
  var yEl = document.getElementById(fields.year);
  var mEl = document.getElementById(fields.month);
  var dEl = document.getElementById(fields.day);
  var y = yEl ? yEl.value.trim() : '';
  var m = mEl ? mEl.value.trim() : '';
  var d = dEl ? dEl.value.trim() : '';
  if (y.length === 4 && m.length >= 1 && d.length >= 1) {
    return y + '-' + m.padStart(2, '0') + '-' + d.padStart(2, '0');
  }
  return null;
}

function populateDeadlineUI() {
  updateDeadlineSectionLabel(); // v5.0.2: 월별 이름 반영
  var sd = deadlineSettings.survey_deadline;
  if (sd && sd.start) setDateFields('start', sd.start);
  if (sd && sd.end) setDateFields('end', sd.end);
  var td = deadlineSettings.temp_deadline;
  if (td && td.start) setDateFields('tempStart', td.start);
  if (td && td.end) setDateFields('tempEnd', td.end);
  updateDeadlineInfo('main');
  updateDeadlineInfo('temp');
}

function getDeadlineDates(prefix) {
  var map = { Start: 'start', End: 'end', TempStart: 'tempStart', TempEnd: 'tempEnd' };
  return getDateFromFields(map[prefix]);
}

function updateDeadlineInfo(type) {
  if (type === 'main') {
    var start = getDeadlineDates('Start');
    var end = getDeadlineDates('End');
    var el = document.getElementById('dlMainInfo');
    if (!el) return;
    if (start && end) {
      var s = new Date(start);
      var e = new Date(end);
      if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) {
        el.textContent = '⚠️ 유효하지 않은 날짜 범위입니다.';
        el.className = 'deadline-info';
      } else {
        var days = Math.round((e - s) / 86400000) + 1;
        if (days === 1) {
          el.textContent = '📌 ' + formatDateKR(s) + ' 하루동안만 설문조사에 응답할 수 있습니다.';
        } else {
          el.textContent = '📌 ' + formatDateKR(s) + ' ~ ' + formatDateKR(e) + ' (' + days + '일간) 설문조사에 응답할 수 있습니다.';
        }
        el.className = 'deadline-info info-highlight';
      }
    } else {
      el.textContent = '기한을 설정하지 않으면 언제든 설문에 응답할 수 있습니다.';
      el.className = 'deadline-info';
    }
  } else {
    var start = getDeadlineDates('TempStart');
    var end = getDeadlineDates('TempEnd');
    var el = document.getElementById('dlTempInfo');
    if (!el) return;
    if (start && end) {
      var s = new Date(start);
      var e = new Date(end);
      if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) {
        el.textContent = '⚠️ 유효하지 않은 날짜 범위입니다.';
      } else {
        var days = Math.round((e - s) / 86400000) + 1;
        if (days === 1) {
          el.textContent = '⏳ ' + formatDateKR(s) + ' 하루동안만 설문조사에 응답할 수 있습니다.';
        } else {
          el.textContent = '⏳ ' + formatDateKR(s) + ' ~ ' + formatDateKR(e) + ' (' + days + '일간) 설문조사에 응답할 수 있습니다.';
        }
      }
    } else {
      el.textContent = '정식 기한 내 응답하지 못한 학생을 위해 한시적으로 열어주는 기간입니다.';
    }
  }
}

function formatDateKR(d) {
  return d.getFullYear() + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + String(d.getDate()).padStart(2,'0');
}

// v5.0.0: 전체 장애학생 수 저장/로드
async function saveTotalStudents() {
  if (!adminToken) { showToast('관리자 로그인이 필요합니다.'); return; }
  var val = parseInt(document.getElementById('totalStudentsInput').value);
  if (!val || val < 1) { showToast('유효한 학생 수를 입력하세요.'); return; }
  try {
    var resp = await fetch(API_BASE + '/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken },
      body: JSON.stringify({ settings: { total_students: val } })
    });
    if (resp.ok) {
      totalRegisteredStudents = val;
      updateAdminPanel();
      showToast('전체 장애학생 수가 저장되었습니다: ' + val + '명');
      var info = document.getElementById('totalStudentsInfo');
      if (info) info.textContent = '현재 설정: ' + val + '명 (응답률 계산에 반영됨)';
    } else {
      showToast('저장 실패');
    }
  } catch(e) { showToast('서버 연결 실패'); }
}

async function loadTotalStudents() {
  try {
    var resp = await fetch(API_BASE + '/api/admin/settings', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    if (resp.ok) {
      var data = await resp.json();
      if (data.settings && data.settings.total_students) {
        totalRegisteredStudents = parseInt(data.settings.total_students) || 0;
        var inp = document.getElementById('totalStudentsInput');
        if (inp) inp.value = totalRegisteredStudents;
        var info = document.getElementById('totalStudentsInfo');
        if (info && totalRegisteredStudents > 0) info.textContent = '현재 설정: ' + totalRegisteredStudents + '명 (응답률 계산에 반영됨)';
      }
    }
  } catch(e) { /* 무시 — 응답률은 '—'으로 표시됨 */ }
}

async function saveDeadlineSettings() {
  if (!adminToken) { showToast('관리자 로그인이 필요합니다.'); return; }
  var btn = document.getElementById('dlSaveBtn');
  if (btn) btn.disabled = true;

  var start = getDeadlineDates('Start');
  var end = getDeadlineDates('End');
  var tempStart = getDeadlineDates('TempStart');
  var tempEnd = getDeadlineDates('TempEnd');

  // Validate date ranges
  if (start && end) {
    var s = new Date(start), e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) {
      showToast('정식 기한의 날짜 범위가 올바르지 않습니다.');
      if (btn) btn.disabled = false;
      return;
    }
  }
  if (tempStart && tempEnd) {
    var s = new Date(tempStart), e = new Date(tempEnd);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) {
      showToast('임시 기한의 날짜 범위가 올바르지 않습니다.');
      if (btn) btn.disabled = false;
      return;
    }
  }

  var settings = {};
  if (start && end) {
    settings.survey_deadline = { start: start, end: end };
  } else {
    settings.survey_deadline = { start: null, end: null };
  }
  if (tempStart && tempEnd) {
    settings.temp_deadline = { start: tempStart, end: tempEnd };
  } else {
    settings.temp_deadline = { start: null, end: null };
  }

  try {
    var resp = await fetch(API_BASE + '/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken },
      body: JSON.stringify({ settings: settings })
    });
    var result = await resp.json();
    if (!resp.ok) throw new Error(result.error || '저장 실패');
    deadlineSettings = settings;
    showToast('기한 설정이 저장되었습니다.');
  } catch(err) {
    showToast('기한 저장 오류: ' + err.message);
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ===== Calendar Popup =====
var activeCalendar = null;
var calendarMonth = null;
var calendarYear = null;

function openCalendar(type) {
  document.querySelectorAll('.dl-calendar.show').forEach(function(c) { c.classList.remove('show'); });
  var idMap = { start: 'dlCalStart', end: 'dlCalEnd', tempStart: 'dlCalTempStart', tempEnd: 'dlCalTempEnd' };
  var cal = document.getElementById(idMap[type]);
  if (!cal) return;
  activeCalendar = { type: type, el: cal };
  var now = (typeof getEffectiveDate === 'function') ? getEffectiveDate() : new Date();
  calendarYear = now.getFullYear();
  calendarMonth = now.getMonth();
  renderCalendar();
  cal.classList.add('show');
  // v4.2.2: position:fixed 좌표 계산
  var wrapId = { start: 'dlStartWrap', end: 'dlEndWrap', tempStart: 'dlTempStartWrap', tempEnd: 'dlTempEndWrap' }[type];
  var wrapEl = document.getElementById(wrapId);
  if (wrapEl) {
    var wr = wrapEl.getBoundingClientRect();
    cal.style.left = wr.left + 'px';
    cal.style.top = (wr.bottom + 4) + 'px';
    var calH = cal.offsetHeight || 300;
    if (wr.bottom + 4 + calH > window.innerHeight) {
      cal.style.top = Math.max(8, wr.top - calH - 4) + 'px';
    }
    var calW = cal.offsetWidth || 260;
    if (parseFloat(cal.style.left) + calW > window.innerWidth) {
      cal.style.left = Math.max(4, window.innerWidth - calW - 8) + 'px';
    }
  }
}

// v4.2.2: 스크롤/리사이즈 시 달력 닫기
window.addEventListener('scroll', function() {
  document.querySelectorAll('.dl-calendar.show').forEach(function(c) { c.classList.remove('show'); });
}, true);
window.addEventListener('resize', function() {
  document.querySelectorAll('.dl-calendar.show').forEach(function(c) { c.classList.remove('show'); });
});

function renderCalendar() {
  if (!activeCalendar) return;
  var cal = activeCalendar.el;
  var today = (typeof getEffectiveDate === 'function') ? getEffectiveDate() : new Date();
  var firstDay = new Date(calendarYear, calendarMonth, 1);
  var lastDay = new Date(calendarYear, calendarMonth + 1, 0);
  var startDow = firstDay.getDay();
  var daysInMonth = lastDay.getDate();

  var h = '<div class="dl-calendar-header">';
  h += '<button onclick="event.stopPropagation();calPrev()">◀</button>';
  h += '<span>' + calendarYear + '년 ' + (calendarMonth + 1) + '월</span>';
  h += '<button onclick="event.stopPropagation();calNext()">▶</button>';
  h += '</div>';
  h += '<div class="dl-calendar-grid">';
  var dows = ['일','월','화','수','목','금','토'];
  dows.forEach(function(d) { h += '<div class="cal-dow">' + d + '</div>'; });

  var prevLast = new Date(calendarYear, calendarMonth, 0).getDate();
  for (var i = 0; i < startDow; i++) {
    var d = prevLast - startDow + i + 1;
    h += '<div class="cal-day other-month" onclick="event.stopPropagation();selectCalDay(' + calendarYear + ',' + (calendarMonth - 1) + ',' + d + ')">' + d + '</div>';
  }
  for (var d = 1; d <= daysInMonth; d++) {
    var cls = 'cal-day';
    if (d === today.getDate() && calendarMonth === today.getMonth() && calendarYear === today.getFullYear()) cls += ' today';
    h += '<div class="' + cls + '" onclick="event.stopPropagation();selectCalDay(' + calendarYear + ',' + calendarMonth + ',' + d + ')">' + d + '</div>';
  }
  var totalCells = startDow + daysInMonth;
  var remaining = (7 - (totalCells % 7)) % 7;
  for (var i = 1; i <= remaining; i++) {
    h += '<div class="cal-day other-month" onclick="event.stopPropagation();selectCalDay(' + calendarYear + ',' + (calendarMonth + 1) + ',' + i + ')">' + i + '</div>';
  }
  h += '</div>';
  cal.innerHTML = h;
}

function calPrev() { calendarMonth--; if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; } renderCalendar(); }
function calNext() { calendarMonth++; if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; } renderCalendar(); }

function selectCalDay(y, m, d) {
  var dt = new Date(y, m, d);
  if (!activeCalendar) return;
  var type = activeCalendar.type;
  var dateStr = String(dt.getFullYear()) + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
  setDateFields(type, dateStr);

  activeCalendar.el.classList.remove('show');
  activeCalendar = null;

  updateDeadlineInfo(type === 'start' || type === 'end' ? 'main' : 'temp');
}

// Close calendar on outside click
document.addEventListener('click', function(e) {
  if (!e.target.closest('.dl-calendar-wrap')) {
    document.querySelectorAll('.dl-calendar.show').forEach(function(c) { c.classList.remove('show'); });
    activeCalendar = null;
  }
});

// ===== Cross-reference enrollment with survey responses =====
function getEnrollmentByStudentId(studentId) {
  if (!studentId || enrollmentData.length === 0) return null;
  var cleanId = String(studentId).replace(/[^0-9]/g, '');
  for (var i = 0; i < enrollmentData.length; i++) {
    var file = enrollmentData[i];
    if (!file.rows) continue;
    for (var j = 0; j < file.rows.length; j++) {
      var row = file.rows[j];
      var rowId = String(row.studentId || '').replace(/[^0-9]/g, '');
      if (rowId === cleanId) return row;
    }
  }
  return null;
}

function getEnrollmentCoursesByStudentId(studentId) {
  if (!studentId || enrollmentData.length === 0) return [];
  var cleanId = String(studentId).replace(/[^0-9]/g, '');
  var courses = [];
  for (var i = 0; i < enrollmentData.length; i++) {
    var file = enrollmentData[i];
    if (!file.rows) continue;
    for (var j = 0; j < file.rows.length; j++) {
      var row = file.rows[j];
      var rowId = String(row.studentId || '').replace(/[^0-9]/g, '');
      if (rowId === cleanId) courses.push(row);
    }
  }
  return courses;
}

function crossReferenceResponse(r) {
  // Returns { matched: bool, mismatches: [{field, surveyVal, enrollVal}], enrollRecord: row|null }
  if (enrollmentData.length === 0) return null;
  var enrollRec = getEnrollmentByStudentId(r.studentId);
  if (!enrollRec) {
    // Try matching by name instead
    return { matched: false, mismatches: [{ field: 'studentId', surveyVal: r.studentId, enrollVal: '(명단에 없음)' }], enrollRecord: null, notFound: true };
  }
  var mismatches = [];
  // Check name
  if (enrollRec.studentName && r.name && enrollRec.studentName.trim() !== r.name.trim()) {
    mismatches.push({ field: 'name', label: '성명', surveyVal: r.name, enrollVal: enrollRec.studentName });
  }
  return { matched: mismatches.length === 0, mismatches: mismatches, enrollRecord: enrollRec, notFound: false };
}


// ===== iPad 멀티태스킹 패널 경계선 (v5.0.1) =====
