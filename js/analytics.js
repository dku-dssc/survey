// ===== Panel divider, official letter compose, statistics panel, charts, export =====
// 원본 index.html에서 분리됨 (v5.0.1)

var panelDividerState = {
  isDragging: false,
  startX: 0,
  startLeft: 0,
  leftPanelRatio: 0,  // 0 = default, 1 = full
  adminPushedAway: false,
  activeLeftPanel: null  // 'emailComposePanel' | 'analyticsPanel'
};

function getActiveLeftPanel() {
  if (panelDividerState.activeLeftPanel) {
    return document.getElementById(panelDividerState.activeLeftPanel);
  }
  // fallback: 현재 표시중인 왼쪽 패널 찾기
  var email = document.getElementById('emailComposePanel');
  if (email && email.style.display === 'flex') return email;
  var analytics = document.getElementById('analyticsPanel');
  if (analytics && analytics.style.display === 'flex') return analytics;
  return null;
}

function initPanelDivider() {
  var divider = document.getElementById('panelDivider');
  if (!divider) return;

  divider.addEventListener('mousedown', function(e) {
    e.preventDefault();
    panelDividerState.isDragging = true;
    panelDividerState.startX = e.clientX;
    divider.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', function(e) {
    if (!panelDividerState.isDragging) return;
    var leftPanel = getActiveLeftPanel();
    var admin = document.getElementById('adminPanel');
    if (!leftPanel || !admin) return;

    var vw = window.innerWidth;
    var adminW = 480;
    var maxLeftW = vw - 20; // leave 20px for edge handle
    var minLeftW = 300;
    var defaultLeftW = vw - adminW;

    // Calculate new left panel width based on mouse X
    var newLeftW = Math.min(maxLeftW, Math.max(minLeftW, e.clientX));

    leftPanel.style.width = newLeftW + 'px';
    leftPanel.style.transition = 'none';

    // Position divider — 패널 오른쪽 가장자리에 딱 붙임
    var divider = document.getElementById('panelDivider');
    divider.style.left = (newLeftW - 10) + 'px';

    // Calculate how far admin panel should be pushed
    var adminLeft = newLeftW;
    var adminVisibleW = vw - adminLeft;
    var pushRatio = Math.max(0, 1 - (adminVisibleW / adminW));

    // Admin panel blur and push
    if (pushRatio > 0) {
      admin.style.right = -(pushRatio * adminW) + 'px';
      admin.style.filter = 'blur(' + (pushRatio * 8) + 'px)';
      admin.style.opacity = Math.max(0.3, 1 - pushRatio * 0.7);
      admin.style.transition = 'none';
    } else {
      admin.style.right = '0';
      admin.style.filter = 'none';
      admin.style.opacity = '1';
      admin.style.transition = 'none';
    }

    // Check if admin panel center has been crossed
    var adminCenter = vw - adminW / 2;
    if (newLeftW >= adminCenter) {
      panelDividerState.leftPanelRatio = (newLeftW - defaultLeftW) / (maxLeftW - defaultLeftW);
    }
  });

  document.addEventListener('mouseup', function(e) {
    if (!panelDividerState.isDragging) return;
    panelDividerState.isDragging = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    var divider = document.getElementById('panelDivider');
    divider.classList.remove('dragging');

    var leftPanel = getActiveLeftPanel();
    var admin = document.getElementById('adminPanel');
    if (!leftPanel || !admin) return;

    var vw = window.innerWidth;
    var adminW = 480;
    var adminCenter = vw - adminW / 2;
    var currentLeftW = parseInt(leftPanel.style.width) || (vw - adminW);

    // If dragged past admin center → push admin away completely
    if (currentLeftW >= adminCenter) {
      pushAdminAway();
    } else {
      // Snap back to default
      restorePanelLayout();
    }
  });
}

function pushAdminAway() {
  var leftPanel = getActiveLeftPanel();
  var admin = document.getElementById('adminPanel');
  var divider = document.getElementById('panelDivider');
  var edgeHandle = document.getElementById('panelEdgeHandle');
  if (!leftPanel || !admin) return;

  panelDividerState.adminPushedAway = true;

  // Animate left panel to full width
  leftPanel.style.transition = 'width 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)';
  leftPanel.style.width = '100vw';

  // Animate admin panel out
  admin.style.transition = 'right 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.45s ease, opacity 0.45s ease';
  admin.style.right = '-500px';
  admin.style.filter = 'blur(12px)';
  admin.style.opacity = '0';

  // Hide divider, show edge handle
  if (divider) divider.classList.remove('active');
  if (edgeHandle) {
    setTimeout(function() {
      edgeHandle.classList.add('visible');
    }, 350);
  }
}

function restorePanelFromEdge() {
  restorePanelLayout();
}

function restorePanelLayout() {
  var leftPanel = getActiveLeftPanel();
  var admin = document.getElementById('adminPanel');
  var divider = document.getElementById('panelDivider');
  var edgeHandle = document.getElementById('panelEdgeHandle');
  if (!leftPanel || !admin) return;

  panelDividerState.adminPushedAway = false;

  var vw = window.innerWidth;
  var adminW = 480;
  var defaultLeftW = vw - adminW;

  leftPanel.style.transition = 'width 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)';
  leftPanel.style.width = defaultLeftW + 'px';

  admin.style.transition = 'right 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.45s ease, opacity 0.45s ease';
  admin.style.right = '0';
  admin.style.filter = 'none';
  admin.style.opacity = '1';

  // Reposition divider — 패널 오른쪽에 딱 붙임
  if (divider) {
    divider.style.left = (defaultLeftW - 10) + 'px';
    divider.classList.add('active');
  }

  if (edgeHandle) edgeHandle.classList.remove('visible');
}

function toggleComposeFullscreen() {
  if (panelDividerState.adminPushedAway) {
    restorePanelLayout();
  } else {
    pushAdminAway();
  }
}

// Show divider when a left panel is opened (email compose or analytics)
function showPanelDivider(panelId) {
  var divider = document.getElementById('panelDivider');
  if (!divider) return;
  panelDividerState.activeLeftPanel = panelId || 'emailComposePanel';
  var vw = window.innerWidth;
  var adminW = 480;
  var leftW = vw - adminW;
  divider.style.left = (leftW - 10) + 'px';
  divider.classList.add('active');
  panelDividerState.adminPushedAway = false;
}

function hidePanelDivider() {
  var divider = document.getElementById('panelDivider');
  var edgeHandle = document.getElementById('panelEdgeHandle');
  if (divider) divider.classList.remove('active');
  if (edgeHandle) edgeHandle.classList.remove('visible');
  panelDividerState.adminPushedAway = false;
  panelDividerState.activeLeftPanel = null;
  // Restore admin panel — 인라인 스타일 제거하여 CSS 클래스에 위임
  var admin = document.getElementById('adminPanel');
  if (admin) {
    admin.style.right = '';
    admin.style.filter = '';
    admin.style.opacity = '';
    admin.style.transition = '';
  }
}

// ===== Send Official Letter =====
// ===== 공문 발송 이메일 작성 =====
var composePdfBase64 = null;
var composePdfFilename = '';
var composeStudentName = '';

function sendOfficialLetter() {
  // 이메일 연동 확인
  if (!linkedEmail) {
    showToast('먼저 이메일 연동을 완료해주세요.', 'error');
    return;
  }

  // 현재 선택된 학생 확인
  var idx = document.getElementById('letterStudentSelect').value;
  if (idx === '') {
    showToast('학생을 먼저 선택해주세요.', 'error');
    return;
  }

  var r = responses[idx];
  composeStudentName = r.name || '○○○';

  // 교수 이메일 찾기 (수강신청 데이터에서)
  var professorEmail = '';
  var courses = getEnrollmentCoursesByStudentId(r.studentId);
  if (courses.length > 0) {
    professorEmail = courses[0].instructorEmail || '';
  }

  // 필드 설정
  document.getElementById('composeFrom').value = linkedEmail;
  document.getElementById('composeTo').value = professorEmail;
  document.getElementById('composeSubject').value =
    '[단국대학교 장애학생지원센터] 장애학생 학습지원 협조 요청 - ' + composeStudentName;

  // 레터링 HTML 본문을 편집기에 삽입
  var letterEl = document.querySelector('.letter-preview');
  var editor = document.getElementById('composeEditor');
  if (letterEl) {
    editor.innerHTML = letterEl.innerHTML;
  }

  // 첨부파일 초기화
  composePdfBase64 = null;
  document.getElementById('composeAttachName').textContent = '레터링 PDF 생성 중...';
  document.getElementById('composeAttachSize').textContent = '';
  document.getElementById('composeAttachStatus').textContent = '';
  document.getElementById('composeSendBtn').disabled = true;

  // v5.0.2: 다른 사이드 패널이 열려있으면 먼저 닫기 (멀티패널 통합)
  if (document.getElementById('analyticsPanel').style.display === 'flex') {
    closeAnalyticsPanel();
  }
  // 왼쪽 패널 + 오버레이 표시
  document.getElementById('emailComposeOverlay').style.display = 'block';
  document.getElementById('emailComposePanel').style.display = 'flex';
  // iPad 멀티태스킹 경계선 표시 (v5.0.1)
  showPanelDivider('emailComposePanel');
  initPanelDivider();

  // PDF 생성 (html2pdf.js 사용)
  generateLetterPdf();
}

async function generateLetterPdf() {
  try {
    // PDF용 클론 생성 (편집기 내용 기반, 스타일 보정)
    var editorContent = document.getElementById('composeEditor').innerHTML;
    var pdfContainer = document.createElement('div');
    pdfContainer.style.cssText = 'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;padding:40px;line-height:2;font-size:14px;color:#1d1d1f;background:#fff;width:595px;';
    pdfContainer.innerHTML = editorContent;
    // 색상 강제 적용 (다크모드 대응)
    pdfContainer.querySelectorAll('*').forEach(function(el) {
      if (!el.style.color) el.style.color = '#1d1d1f';
    });

    document.body.appendChild(pdfContainer);

    var opt = {
      margin: [15, 15, 15, 15],
      filename: '학습지원_협조요청_' + composeStudentName + '.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    composePdfFilename = opt.filename;

    var pdfBlob = await html2pdf().set(opt).from(pdfContainer).outputPdf('blob');
    document.body.removeChild(pdfContainer);

    // Blob → base64 변환
    var reader = new FileReader();
    reader.onload = function() {
      composePdfBase64 = reader.result.split(',')[1];
      var sizeKB = Math.round(pdfBlob.size / 1024);
      var sizeStr = sizeKB > 1024 ? (sizeKB / 1024).toFixed(1) + ' MB' : sizeKB + ' KB';
      document.getElementById('composeAttachName').textContent = composePdfFilename;
      document.getElementById('composeAttachSize').textContent = sizeStr;
      document.getElementById('composeAttachStatus').textContent = '✓ 준비 완료';
      document.getElementById('composeSendBtn').disabled = false;
    };
    reader.readAsDataURL(pdfBlob);

  } catch (e) {
    console.error('PDF generation error:', e);
    document.getElementById('composeAttachName').textContent = 'PDF 생성 실패 (첨부 없이 발송 가능)';
    document.getElementById('composeAttachStatus').textContent = '';
    document.getElementById('composeSendBtn').disabled = false;
  }
}

// ===== v5.0.1: 통계 분석 패널 =====
function openAnalyticsPanel() {
  // v5.0.2: 다른 사이드 패널이 열려있으면 먼저 닫기 (멀티패널 통합)
  if (document.getElementById('emailComposePanel').style.display === 'flex') {
    closeEmailCompose();
  }
  document.getElementById('analyticsOverlay').style.display = 'block';
  document.getElementById('analyticsPanel').style.display = 'flex';
  // iPad 멀티태스킹 경계선 표시
  showPanelDivider('analyticsPanel');
  initPanelDivider();
  switchAnalyticsTab('chart');
}
function closeAnalyticsPanel() {
  document.getElementById('analyticsOverlay').style.display = 'none';
  document.getElementById('analyticsPanel').style.display = 'none';
  hidePanelDivider();
  // 패널 크기 초기화
  var panel = document.getElementById('analyticsPanel');
  if (panel) {
    panel.style.width = '';
    panel.style.transition = '';
  }
}

function switchAnalyticsTab(tab) {
  ['chart','stats','cross'].forEach(function(t) {
    var sec = document.getElementById('analytics' + t.charAt(0).toUpperCase() + t.slice(1) + 'Section');
    var btn = document.getElementById('anaTab' + t.charAt(0).toUpperCase() + t.slice(1));
    if (sec) sec.style.display = (t === tab) ? 'block' : 'none';
    if (btn) btn.classList.toggle('active', t === tab);
  });
  if (tab === 'stats') renderBasicStats();
}

// 응답 데이터에서 변수 값 추출
function getFieldValues(resp, varName) {
  if (!resp) return [];
  // 복호화된 응답은 루트 레벨에 영문 키로 저장됨 (resp.data 아님)
  var d = resp;
  switch(varName) {
    case 'grade': return [d.grade || '미입력'];
    case 'gender': return [d.gender || '미입력'];
    case 'college': {
      var dept = d.department || '';
      // 학과에서 대학명 추출 (괄호 앞)
      var m = dept.match(/^(.+대학)/);
      return [m ? m[1] : (dept || '미입력')];
    }
    case 'disability_type': {
      var dt = d.disabilityType;
      return dt ? [dt] : ['미입력'];
    }
    case 'disability_degree': return [d.disabilityLevel || '미입력'];
    case 'contact_pref': {
      var cp = d.contactPref;
      if (Array.isArray(cp)) return cp;
      return cp ? [cp] : ['미입력'];
    }
    case 'support_common': {
      var sc = d.commonSupport;
      if (Array.isArray(sc)) return sc;
      return sc ? [sc] : [];
    }
    case 'support_theory': {
      var st = d.theorySupport;
      if (Array.isArray(st)) return st;
      return st ? [st] : [];
    }
    case 'support_practice': {
      var sp = d.labSupport;
      if (Array.isArray(sp)) return sp;
      return sp ? [sp] : [];
    }
    case 'support_field': {
      var sf = d.fieldSupport;
      if (Array.isArray(sf)) return sf;
      return sf ? [sf] : [];
    }
    case 'support_eval': {
      var se = d.evalSupport;
      if (Array.isArray(se)) return se;
      return se ? [se] : [];
    }
    case 'satisfaction_overall': {
      var so = d.satisfactionOverall;
      return so ? [so + '점'] : ['미입력'];
    }
    default: return ['미입력'];
  }
}

// 빈도 집계
function tally(varName) {
  var counts = {};
  responses.forEach(function(r) {
    var vals = getFieldValues(r, varName);
    vals.forEach(function(v) {
      counts[v] = (counts[v] || 0) + 1;
    });
  });
  return counts;
}

// ---- 차트 렌더링 (순수 Canvas) ----
var chartColors = ['#4facfe','#1164b1','#00f2fe','#43e97b','#fa709a','#fee140','#a18cd1','#fbc2eb','#f6d365','#fda085','#84fab0','#8fd3f4','#d4fc79','#96e6a1','#fccb90'];

function renderAnalyticsChart() {
  var varName = document.getElementById('chartVariable').value;
  var chartType = document.getElementById('chartType').value;
  var canvas = document.getElementById('analyticsCanvas');
  if (!varName || !canvas) return;
  var ctx = canvas.getContext('2d');
  var counts = tally(varName);
  var labels = Object.keys(counts);
  var values = labels.map(function(l) { return counts[l]; });
  var max = Math.max.apply(null, values) || 1;
  var total = values.reduce(function(a,b) { return a+b; }, 0) || 1;

  // HiDPI
  var dpr = window.devicePixelRatio || 1;
  var w = canvas.parentElement.clientWidth - 40;
  var h = 350;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.scale(dpr, dpr);
  ctx.clearRect(0,0,w,h);

  var isDark = document.body.classList.contains('dark-mode');
  var textColor = isDark ? '#ccc' : '#333';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';

  if (chartType === 'bar') {
    var barPad = 40, chartLeft = 60, chartBottom = h - 40, chartTop = 20;
    var barW = Math.min(50, (w - chartLeft - 20) / labels.length - 8);
    // Y축
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
    ctx.fillStyle = textColor;
    ctx.textAlign = 'right';
    for (var i = 0; i <= 5; i++) {
      var yVal = Math.round(max * i / 5);
      var yPos = chartBottom - (chartBottom - chartTop) * (i / 5);
      ctx.beginPath(); ctx.moveTo(chartLeft, yPos); ctx.lineTo(w - 10, yPos); ctx.stroke();
      ctx.fillText(yVal, chartLeft - 8, yPos + 4);
    }
    // 막대
    labels.forEach(function(label, idx) {
      var x = chartLeft + idx * ((w - chartLeft - 20) / labels.length) + ((w - chartLeft - 20) / labels.length - barW) / 2;
      var barH = (values[idx] / max) * (chartBottom - chartTop);
      var color = chartColors[idx % chartColors.length];
      ctx.fillStyle = color;
      ctx.beginPath();
      var r = Math.min(4, barW / 4);
      ctx.moveTo(x, chartBottom);
      ctx.lineTo(x, chartBottom - barH + r);
      ctx.quadraticCurveTo(x, chartBottom - barH, x + r, chartBottom - barH);
      ctx.lineTo(x + barW - r, chartBottom - barH);
      ctx.quadraticCurveTo(x + barW, chartBottom - barH, x + barW, chartBottom - barH + r);
      ctx.lineTo(x + barW, chartBottom);
      ctx.fill();
      // 값 라벨
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.fillText(values[idx], x + barW / 2, chartBottom - barH - 6);
      // X축 라벨 (회전)
      ctx.save();
      ctx.translate(x + barW / 2, chartBottom + 8);
      ctx.rotate(labels.length > 6 ? -Math.PI/6 : 0);
      ctx.textAlign = labels.length > 6 ? 'right' : 'center';
      ctx.fillText(label.length > 8 ? label.slice(0,7) + '…' : label, 0, 10);
      ctx.restore();
    });
  } else if (chartType === 'pie') {
    var cx = w / 2, cy = h / 2 - 10, radius = Math.min(cx, cy) - 40;
    var startAngle = -Math.PI / 2;
    labels.forEach(function(label, idx) {
      var sliceAngle = (values[idx] / total) * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = chartColors[idx % chartColors.length];
      ctx.fill();
      // 라벨
      var midAngle = startAngle + sliceAngle / 2;
      var lx = cx + Math.cos(midAngle) * (radius * 0.65);
      var ly = cy + Math.sin(midAngle) * (radius * 0.65);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.font = 'bold 11px -apple-system, sans-serif';
      var pct = Math.round(values[idx] / total * 100);
      if (pct >= 5) ctx.fillText(pct + '%', lx, ly + 4);
      ctx.font = '12px -apple-system, sans-serif';
      startAngle += sliceAngle;
    });
    // 범례
    ctx.textAlign = 'left';
    var legendY = 10;
    labels.forEach(function(label, idx) {
      ctx.fillStyle = chartColors[idx % chartColors.length];
      ctx.fillRect(10, legendY, 10, 10);
      ctx.fillStyle = textColor;
      ctx.fillText(label + ' (' + values[idx] + ')', 24, legendY + 9);
      legendY += 16;
    });
  } else if (chartType === 'line') {
    var chartLeft2 = 60, chartBottom2 = h - 40, chartTop2 = 20;
    var stepX = labels.length > 1 ? (w - chartLeft2 - 20) / (labels.length - 1) : 0;
    // 그리드
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
    ctx.fillStyle = textColor;
    ctx.textAlign = 'right';
    for (var i2 = 0; i2 <= 5; i2++) {
      var yVal2 = Math.round(max * i2 / 5);
      var yPos2 = chartBottom2 - (chartBottom2 - chartTop2) * (i2 / 5);
      ctx.beginPath(); ctx.moveTo(chartLeft2, yPos2); ctx.lineTo(w - 10, yPos2); ctx.stroke();
      ctx.fillText(yVal2, chartLeft2 - 8, yPos2 + 4);
    }
    // 선
    ctx.strokeStyle = '#4facfe';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    labels.forEach(function(label, idx) {
      var x = chartLeft2 + idx * stepX;
      var y = chartBottom2 - (values[idx] / max) * (chartBottom2 - chartTop2);
      if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    // 점 + 라벨
    labels.forEach(function(label, idx) {
      var x = chartLeft2 + idx * stepX;
      var y = chartBottom2 - (values[idx] / max) * (chartBottom2 - chartTop2);
      ctx.fillStyle = '#4facfe';
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.fillText(values[idx], x, y - 10);
      ctx.save();
      ctx.translate(x, chartBottom2 + 8);
      ctx.rotate(labels.length > 6 ? -Math.PI/6 : 0);
      ctx.textAlign = labels.length > 6 ? 'right' : 'center';
      ctx.fillText(label.length > 8 ? label.slice(0,7) + '…' : label, 0, 10);
      ctx.restore();
    });
    ctx.lineWidth = 1;
  }
}

function exportChartAsImage() {
  var canvas = document.getElementById('analyticsCanvas');
  if (!canvas) return;
  var link = document.createElement('a');
  link.download = 'chart_' + new Date().toISOString().slice(0,10) + '.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// ---- 기본 통계 ----
function renderBasicStats() {
  var container = document.getElementById('analyticsStatsContent');
  if (!container) return;
  var variables = [
    {key:'grade', label:'학년'},
    {key:'gender', label:'성별'},
    {key:'disability_type', label:'장애 유형'},
    {key:'disability_degree', label:'장애 정도'},
    {key:'college', label:'대학'}
  ];
  var html = '';
  variables.forEach(function(v) {
    var counts = tally(v.key);
    var labels = Object.keys(counts);
    var values = labels.map(function(l) { return counts[l]; });
    var total = values.reduce(function(a,b) { return a+b; }, 0) || 1;
    var maxVal = Math.max.apply(null, values);
    var maxLabels = labels.filter(function(l,i) { return values[i] === maxVal; });
    // 최빈값
    html += '<div style="margin-bottom:16px;">';
    html += '<div style="font-weight:600;font-size:13px;color:var(--text-primary);margin-bottom:8px;">' + v.label + '</div>';
    html += '<div class="analytics-table-wrap"><table class="analytics-table" data-stat-var="' + v.key + '">';
    html += '<thead><tr><th>' + v.label + '</th><th>응답 수</th><th>비율(%)</th></tr></thead><tbody>';
    labels.forEach(function(l, i) {
      html += '<tr><td>' + l + '</td><td>' + values[i] + '</td><td>' + Math.round(values[i]/total*100) + '%</td></tr>';
    });
    html += '</tbody></table></div>';
    html += '<div style="font-size:11px;color:var(--text-tertiary);margin-top:4px;">최다: <strong>' + maxLabels.join(', ') + '</strong> (' + maxVal + '건)</div>';
    html += '</div>';
  });

  // ── 만족도 통계 (v5.0.2) ──
  var satScores = [];
  responses.forEach(function(r) {
    var val = parseInt(r.satisfactionOverall);
    if (val >= 1 && val <= 5) satScores.push(val);
  });
  if (satScores.length > 0) {
    var satSum = satScores.reduce(function(a,b){return a+b;},0);
    var satAvg = (satSum / satScores.length).toFixed(2);
    var satCounts = {1:0, 2:0, 3:0, 4:0, 5:0};
    satScores.forEach(function(s){ satCounts[s]++; });
    var satLabels = ['1점(매우불만족)', '2점(불만족)', '3점(보통)', '4점(만족)', '5점(매우만족)'];
    // 가중 점수 계산 (4점=만족, 5점=매우만족 → 만족 이상 비율)
    var satisfiedCount = satCounts[4] + satCounts[5];
    var satisfiedPct = Math.round(satisfiedCount / satScores.length * 100);

    html += '<div style="margin-bottom:16px;border-top:1px solid var(--border-color);padding-top:16px;">';
    html += '<div style="font-weight:700;font-size:14px;color:var(--primary);margin-bottom:8px;">📊 만족도 조사 결과</div>';
    html += '<div style="display:flex;gap:16px;margin-bottom:10px;flex-wrap:wrap;">';
    html += '<div style="background:var(--glass-bg);padding:10px 16px;border-radius:10px;text-align:center;"><div style="font-size:11px;color:var(--text-tertiary);">평균 점수</div><div style="font-size:22px;font-weight:700;color:var(--primary);">' + satAvg + '<span style="font-size:13px;font-weight:400;">점</span></div></div>';
    html += '<div style="background:var(--glass-bg);padding:10px 16px;border-radius:10px;text-align:center;"><div style="font-size:11px;color:var(--text-tertiary);">만족 이상</div><div style="font-size:22px;font-weight:700;color:#22c55e;">' + satisfiedPct + '<span style="font-size:13px;font-weight:400;">%</span></div></div>';
    html += '<div style="background:var(--glass-bg);padding:10px 16px;border-radius:10px;text-align:center;"><div style="font-size:11px;color:var(--text-tertiary);">응답자 수</div><div style="font-size:22px;font-weight:700;">' + satScores.length + '<span style="font-size:13px;font-weight:400;">명</span></div></div>';
    html += '</div>';
    html += '<div class="analytics-table-wrap"><table class="analytics-table">';
    html += '<thead><tr><th>점수</th><th>응답 수</th><th>비율(%)</th></tr></thead><tbody>';
    for (var si = 1; si <= 5; si++) {
      html += '<tr><td>' + satLabels[si-1] + '</td><td>' + satCounts[si] + '</td><td>' + Math.round(satCounts[si]/satScores.length*100) + '%</td></tr>';
    }
    html += '</tbody></table></div>';
    html += '</div>';
  }

  container.innerHTML = html;
}

// ---- 교차 분석: 중복 변수 방지 ----
function onCrossVarChange(changedId) {
  var rowSel = document.getElementById('crossRow');
  var colSel = document.getElementById('crossCol');
  var otherId = (changedId === 'crossRow') ? 'crossCol' : 'crossRow';
  var otherSel = document.getElementById(otherId);

  // 같은 변수를 양쪽에서 선택한 경우 → 반대쪽 초기화
  if (rowSel.value && colSel.value && rowSel.value === colSel.value) {
    otherSel.value = '';
    showToast('동일한 변수는 행과 열에 동시에 선택할 수 없습니다.');
  }

  // 이미 선택된 변수를 반대쪽에서 비활성화
  [rowSel, colSel].forEach(function(sel) {
    var oppositeVal = (sel === rowSel) ? colSel.value : rowSel.value;
    Array.from(sel.options).forEach(function(opt) {
      if (opt.value && opt.value === oppositeVal) {
        opt.disabled = true;
      } else {
        opt.disabled = false;
      }
    });
  });

  renderCrossTab();
}

// ---- 교차 분석 ----
function renderCrossTab() {
  var rowVar = document.getElementById('crossRow').value;
  var colVar = document.getElementById('crossCol').value;
  var container = document.getElementById('crossTabResult');
  if (!rowVar || !colVar || !container) { if (container) container.innerHTML = '<p style="color:var(--text-tertiary);font-size:13px;">행과 열 변수를 모두 선택하세요.</p>'; return; }
  if (rowVar === colVar) { container.innerHTML = '<p style="color:var(--text-tertiary);font-size:13px;">행과 열에 서로 다른 변수를 선택하세요.</p>'; return; }

  // 고유 값 수집
  var rowSet = {}, colSet = {};
  responses.forEach(function(r) {
    getFieldValues(r, rowVar).forEach(function(rv) { rowSet[rv] = true; });
    getFieldValues(r, colVar).forEach(function(cv) { colSet[cv] = true; });
  });
  var rowLabels = Object.keys(rowSet).sort();
  var colLabels = Object.keys(colSet).sort();

  // 교차표 생성
  var matrix = {};
  rowLabels.forEach(function(rl) {
    matrix[rl] = {};
    colLabels.forEach(function(cl) { matrix[rl][cl] = 0; });
  });
  responses.forEach(function(r) {
    var rvs = getFieldValues(r, rowVar);
    var cvs = getFieldValues(r, colVar);
    rvs.forEach(function(rv) {
      cvs.forEach(function(cv) {
        if (matrix[rv] && matrix[rv][cv] !== undefined) matrix[rv][cv]++;
      });
    });
  });

  var html = '<table class="analytics-table" id="crossTabTable">';
  html += '<thead><tr><th></th>';
  colLabels.forEach(function(cl) { html += '<th>' + cl + '</th>'; });
  html += '<th>합계</th></tr></thead><tbody>';
  rowLabels.forEach(function(rl) {
    html += '<tr><td style="font-weight:600;">' + rl + '</td>';
    var rowSum = 0;
    colLabels.forEach(function(cl) {
      var val = matrix[rl][cl];
      rowSum += val;
      html += '<td>' + val + '</td>';
    });
    html += '<td style="font-weight:600;">' + rowSum + '</td></tr>';
  });
  // 열 합계
  html += '<tr><td style="font-weight:600;">합계</td>';
  var grandTotal = 0;
  colLabels.forEach(function(cl) {
    var colSum = 0;
    rowLabels.forEach(function(rl) { colSum += matrix[rl][cl]; });
    grandTotal += colSum;
    html += '<td style="font-weight:600;">' + colSum + '</td>';
  });
  html += '<td style="font-weight:700;color:var(--primary);">' + grandTotal + '</td></tr>';
  html += '</tbody></table>';
  container.innerHTML = html;
}

// ---- 내보내기 함수들 ----
function tableToText(tableEl) {
  if (!tableEl) return '';
  var rows = tableEl.querySelectorAll('tr');
  var lines = [];
  rows.forEach(function(row) {
    var cells = [];
    row.querySelectorAll('th,td').forEach(function(cell) { cells.push(cell.textContent.trim()); });
    lines.push(cells.join('\t'));
  });
  return lines.join('\n');
}

function copyStatsTable() {
  var tables = document.querySelectorAll('#analyticsStatsContent .analytics-table');
  var text = '';
  tables.forEach(function(t) {
    text += tableToText(t) + '\n\n';
  });
  navigator.clipboard.writeText(text).then(function() { showToast('표가 클립보드에 복사되었습니다.'); });
}

function copyCrossTable() {
  var t = document.getElementById('crossTabTable');
  if (!t) return;
  navigator.clipboard.writeText(tableToText(t)).then(function() { showToast('교차표가 클립보드에 복사되었습니다.'); });
}

function tableToCsv(tableEl) {
  if (!tableEl) return '';
  var rows = tableEl.querySelectorAll('tr');
  var lines = [];
  rows.forEach(function(row) {
    var cells = [];
    row.querySelectorAll('th,td').forEach(function(cell) {
      var val = cell.textContent.trim().replace(/"/g, '""');
      cells.push('"' + val + '"');
    });
    lines.push(cells.join(','));
  });
  return '﻿' + lines.join('\n'); // BOM for Korean
}

function downloadFile(content, filename, mimeType) {
  var blob = new Blob([content], { type: mimeType });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportStatsCSV() {
  var tables = document.querySelectorAll('#analyticsStatsContent .analytics-table');
  var csv = '';
  tables.forEach(function(t, i) {
    if (i > 0) csv += '\n\n';
    var varName = t.getAttribute('data-stat-var') || ('통계' + (i+1));
    csv += varName + '\n';
    csv += tableToCsv(t);
  });
  downloadFile(csv, '통계분석_' + new Date().toISOString().slice(0,10) + '.csv', 'text/csv;charset=utf-8');
  showToast('CSV 파일이 저장되었습니다.');
}

function exportCrossCSV() {
  var t = document.getElementById('crossTabTable');
  if (!t) return;
  downloadFile(tableToCsv(t), '교차분석_' + new Date().toISOString().slice(0,10) + '.csv', 'text/csv;charset=utf-8');
  showToast('CSV 파일이 저장되었습니다.');
}

function generateExportHTML(title, tablesHtml) {
  return '<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>' + title + '</title>' +
    '<style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:40px;max-width:900px;margin:0 auto;}' +
    'h1{font-size:20px;border-bottom:2px solid #333;padding-bottom:8px;}' +
    'h2{font-size:16px;margin-top:24px;color:#1164b1;}' +
    'table{width:100%;border-collapse:collapse;margin:12px 0 24px;}' +
    'th,td{border:1px solid #ddd;padding:8px 12px;text-align:center;font-size:13px;}' +
    'th{background:#f0f4f8;font-weight:600;}' +
    '.info{font-size:12px;color:#888;margin-top:4px;}' +
    '@media print{body{padding:20px;}}</style></head><body>' +
    '<h1>' + title + '</h1>' +
    '<p class="info">생성일: ' + new Date().toLocaleString('ko-KR') + ' | 총 응답: ' + responses.length + '건</p>' +
    tablesHtml + '</body></html>';
}

function exportStatsHTML() {
  var variables = [
    {key:'grade', label:'학년'},
    {key:'gender', label:'성별'},
    {key:'disability_type', label:'장애 유형'},
    {key:'disability_degree', label:'장애 정도'},
    {key:'college', label:'대학'}
  ];
  var tablesHtml = '';
  variables.forEach(function(v) {
    var counts = tally(v.key);
    var labels = Object.keys(counts);
    var values = labels.map(function(l) { return counts[l]; });
    var total = values.reduce(function(a,b) { return a+b; }, 0) || 1;
    tablesHtml += '<h2>' + v.label + '</h2>';
    tablesHtml += '<table><thead><tr><th>' + v.label + '</th><th>응답 수</th><th>비율</th></tr></thead><tbody>';
    labels.forEach(function(l, i) {
      tablesHtml += '<tr><td>' + l + '</td><td>' + values[i] + '</td><td>' + Math.round(values[i]/total*100) + '%</td></tr>';
    });
    tablesHtml += '</tbody></table>';
  });
  downloadFile(generateExportHTML('설문조사 통계 분석 결과', tablesHtml), '통계분석_' + new Date().toISOString().slice(0,10) + '.html', 'text/html;charset=utf-8');
  showToast('HTML 문서가 저장되었습니다. 한글2022에서 열어 편집할 수 있습니다.');
}

function exportCrossHTML() {
  var t = document.getElementById('crossTabTable');
  if (!t) return;
  var rowLabel = document.getElementById('crossRow').selectedOptions[0].text;
  var colLabel = document.getElementById('crossCol').selectedOptions[0].text;
  var tableHtml = '<h2>' + rowLabel + ' × ' + colLabel + ' 교차 분석</h2>' + t.outerHTML;
  downloadFile(generateExportHTML('교차 분석 결과', tableHtml), '교차분석_' + new Date().toISOString().slice(0,10) + '.html', 'text/html;charset=utf-8');
  showToast('HTML 문서가 저장되었습니다. 한글2022에서 열어 편집할 수 있습니다.');
}

function closeEmailCompose() {
  document.getElementById('emailComposeOverlay').style.display = 'none';
  document.getElementById('emailComposePanel').style.display = 'none';
  // iPad 멀티태스킹 경계선 숨기기 (v4.2.0)
  hidePanelDivider();
  // 이메일 패널 width 초기화
  var compose = document.getElementById('emailComposePanel');
  if (compose) { compose.style.width = ''; compose.style.transition = ''; }
  composePdfBase64 = null;
  composePdfFilename = '';
  composeStudentName = '';
}

async function submitOfficialLetter() {
  var toEmail = document.getElementById('composeTo').value.trim();
  var subject = document.getElementById('composeSubject').value.trim();
  var editorContent = document.getElementById('composeEditor').innerHTML;

  if (!toEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
    showToast('올바른 수신 이메일 주소를 입력해주세요.', 'error');
    document.getElementById('composeTo').focus();
    return;
  }
  if (!subject) {
    showToast('제목을 입력해주세요.', 'error');
    document.getElementById('composeSubject').focus();
    return;
  }

  // 최종 확인
  if (!confirm('다음 내용으로 공문을 발송합니다.\n\n받는 사람: ' + toEmail + '\n제목: ' + subject + '\n첨부: ' + (composePdfFilename || '없음') + '\n\n발송하시겠습니까?')) {
    return;
  }

  var sendBtn = document.getElementById('composeSendBtn');
  sendBtn.disabled = true;
  sendBtn.textContent = '발송 중...';

  // 본문이 편집되었으면 PDF 재생성
  await generateLetterPdf();

  // 이메일 본문 HTML 구성 (편집기 내용 반영)
  var emailHtml = '<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:0 auto;padding:24px;">'
    + '<div style="line-height:2;font-size:14px;color:#1d1d1f;">'
    + editorContent
    + '</div>'
    + '<hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0;">'
    + '<p style="color:#86868b;font-size:11px;text-align:center;">본 메일은 단국대학교 장애학생지원센터에서 발송되었습니다.</p>'
    + '</div>';

  try {
    var resp = await fetch(API_BASE + '/api/admin/email/send-letter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + adminToken
      },
      body: JSON.stringify({
        to: toEmail,
        subject: subject,
        html: emailHtml,
        pdfBase64: composePdfBase64 || undefined,
        pdfFilename: composePdfFilename || undefined,
        studentName: composeStudentName
      })
    });
    var result = await resp.json();
    if (!resp.ok) throw new Error(result.error || '발송 실패');

    closeEmailCompose();
    showToast('공문이 성공적으로 발송되었습니다! (' + toEmail + ')');
  } catch (e) {
    showToast(e.message || '공문 발송에 실패했습니다.', 'error');
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = '📨 발송하기';
  }
}

// ===== Toast =====
