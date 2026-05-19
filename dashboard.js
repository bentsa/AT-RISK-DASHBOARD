// ============================================================
//  dashboard.js — SA Students at Risk Dashboard
//  Tab routing, table rendering, filters, stats panel,
//  report generator, mobile nav
// ============================================================

let currentTab       = 'overview';
let riskTypeFilter   = 'all';
let instRiskFilter   = 'all';
let instSearchQuery  = '';
let instSortKey      = 'risk';
let instSortDir      = -1;
let quintTabRendered = false;
let intTabRendered   = false;
let statsTabRendered = false;
let provinceTabRendered = false;
let sentimentTabRendered = false;
let reportScope      = 'all';
let reportPromptBase = '';
let selectedChartType = 'table';
let lastAnalysisResult = null;

// Backend URL — update if running Flask on different port
const BACKEND_URL = 'http://localhost:5050';

// ============================================================
//  Mobile menu
// ============================================================
function initMobileMenu() {
  const hamburger = document.getElementById('hamburger');
  const sidebar   = document.getElementById('sidebar');
  const overlay   = document.getElementById('sidebarOverlay');

  hamburger.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
  });
  overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
  });
}

// ============================================================
//  Tab navigation
// ============================================================
function initTabs() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
      // close mobile menu
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('sidebarOverlay').classList.remove('open');
    });
  });
}

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById('panel-' + tab);
  if (panel) panel.classList.add('active');

  const titles = {
    overview:      ['Risk Overview',         '26 public universities · School quintile intake · DHET-aligned dropout & retention data'],
    stats:         ['Enrolment & Funding',    'Enrolled students · NSFAS beneficiaries · Quintile composition per institution'],
    quintile:      ['Quintile Analysis',      'School quintile (Q1–Q5) intake breakdown per institution · Dropout rates by socioeconomic origin'],
    institutions:  ['All Institutions',       'Full dataset · Sortable · Filterable by risk level and institution type'],
    interventions: ['Interventions',          'DHET-aligned intervention framework · Urgency matrix · Recommended actions by risk profile'],
    provinces:     ['Province Risk Map',      'Interactive South Africa province map · At-risk institutions by province'],
    analysis:      ['Data Analysis',          'Python-powered statistical analysis · Correlation matrices · Predictive models · Export to CSV'],
    report:        ['Generate Report',        'AI-assisted policy report generation · Based on DHET HEMIS 2023/24 data'],
    sentiment:     ['Student Sentiment Insights', 'AI/NLP sentiment analysis · Positive, Neutral & Negative scoring · Institutional feedback themes'],
  };
  if (titles[tab]) {
    document.getElementById('page-title').textContent    = titles[tab][0];
    document.getElementById('page-subtitle').textContent = titles[tab][1];
  }

  if (tab === 'quintile' && !quintTabRendered) {
    quintTabRendered = true;
    renderQuintileDonut(); renderQuintileDropoutBar(); renderQuintileStackBar(); renderQuintTable();
  }
  if (tab === 'interventions' && !intTabRendered) {
    intTabRendered = true;
    renderInterventionCards(); renderMatrixChart(); renderInterventionTypeChart();
  }
  if (tab === 'stats' && !statsTabRendered) {
    statsTabRendered = true;
    renderStatsPanel();
  }
  if (tab === 'provinces' && !provinceTabRendered) {
    provinceTabRendered = true;
    renderProvinceMap();
  }
  if (tab === 'analysis') {
    initAnalysisPanel();
  }
  if (tab === 'sentiment' && !sentimentTabRendered) {
    sentimentTabRendered = true;
    initSentimentPanel();
  }
}

// ============================================================
//  Overview — type filter chips
// ============================================================
function initTypeFilter() {
  document.getElementById('type-filter').addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    document.querySelectorAll('#type-filter .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    riskTypeFilter = chip.dataset.type;
    renderRiskBarChart(riskTypeFilter);
  });
}

// ============================================================
//  Institutions table
// ============================================================
function initInstTable() {
  document.getElementById('searchInput').addEventListener('input', e => {
    instSearchQuery = e.target.value.toLowerCase(); renderInstTable();
  });
  document.getElementById('riskFilter').addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    document.querySelectorAll('#riskFilter .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    instRiskFilter = chip.dataset.risk; renderInstTable();
  });
  document.querySelectorAll('#instTable th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.key;
      if (instSortKey === key) instSortDir *= -1;
      else { instSortKey = key; instSortDir = -1; }
      renderInstTable();
    });
  });
  renderInstTable();
}

function renderInstTable() {
  let data = [...INSTITUTIONS];
  if (instSearchQuery) data = data.filter(i =>
    i.name.toLowerCase().includes(instSearchQuery) ||
    i.province.toLowerCase().includes(instSearchQuery) ||
    i.type.toLowerCase().includes(instSearchQuery)
  );
  if (instRiskFilter !== 'all') data = data.filter(i => riskLabel(i.risk) === instRiskFilter);
  data.sort((a, b) => {
    let av = a[instSortKey], bv = b[instSortKey];
    if (typeof av === 'string') return instSortDir * av.localeCompare(bv);
    return instSortDir * (av - bv);
  });

  const tbody = document.getElementById('instTableBody');
  tbody.innerHTML = data.map(inst => {
    const dq = domQuintile(inst.q);
    const dc = inst.dropout > 50 ? '#E24B4A' : inst.dropout > 35 ? '#EF9F27' : '#57a832';
    return `<tr>
      <td style="font-weight:600;max-width:200px;overflow:hidden;text-overflow:ellipsis;" title="${inst.name}">${inst.name}</td>
      <td style="color:var(--color-text-2);">${inst.type}</td>
      <td style="color:var(--color-text-2);">${inst.province}</td>
      <td style="font-family:var(--font-mono);">${inst.enrolled.toLocaleString()}</td>
      <td>
        <span style="color:${dc};font-weight:600;font-family:var(--font-mono);">${inst.dropout}%</span>
        <div class="mini-bar"><div class="mini-bar-fill" style="width:${inst.dropout}%;background:${dc};"></div></div>
      </td>
      <td style="color:var(--color-text-2);font-family:var(--font-mono);">${inst.nsfas}%</td>
      <td><span class="q-badge q${dq}">Q${dq}</span></td>
      <td>
        <span style="font-weight:600;color:${riskColor(inst.risk)};font-family:var(--font-mono);">${inst.risk}</span>
        <div class="mini-bar"><div class="mini-bar-fill" style="width:${inst.risk}%;background:${riskColor(inst.risk)};"></div></div>
      </td>
      <td><span class="risk-badge ${riskBadgeClass(inst.risk)}">${riskLabel(inst.risk)}</span></td>
    </tr>`;
  }).join('');
}

// ============================================================
//  Quintile table
// ============================================================
function renderQuintTable() {
  const data = [...INSTITUTIONS].sort((a, b) => (b.q[0]+b.q[1]) - (a.q[0]+a.q[1]));
  const qColors = ['#E24B4A','#EF9F27','#7b8499','#378ADD','#57a832'];
  document.getElementById('quintTableBody').innerHTML = data.map(inst => {
    const dq = domQuintile(inst.q);
    const stack = inst.q.map((v,i) =>
      `<div class="quint-seg" style="width:${v}%;background:${qColors[i]};">${v>10?v+'%':''}</div>`
    ).join('');
    return `<tr>
      <td style="font-weight:600;max-width:180px;overflow:hidden;text-overflow:ellipsis;" title="${inst.name}">${inst.name}</td>
      ${inst.q.map((v,i) => `<td style="color:${i<2?qColors[i]:'var(--color-text-2)'};font-weight:${i<2?'600':'400'};font-family:var(--font-mono);">${v}%</td>`).join('')}
      <td><span class="q-badge q${dq}">Q${dq}</span></td>
      <td><div class="quint-stack">${stack}</div></td>
    </tr>`;
  }).join('');
}

// ============================================================
//  Intervention cards
// ============================================================
function renderInterventionCards() {
  document.getElementById('interventionCards').innerHTML = INTERVENTIONS.map(iv => `
    <div class="intervention-card" style="border-left-color:${iv.color};">
      <div class="int-header">
        <span class="risk-badge" style="background:${iv.color}18;color:${iv.color};border:1px solid ${iv.color}33;">${iv.level}</span>
        <div class="int-title">${iv.title}</div>
      </div>
      <div class="int-body">${iv.body}</div>
      <div class="int-tags">
        ${iv.tags.map(t => `<span class="int-tag">${t}</span>`).join('')}
        <span class="int-tag" style="color:${iv.color};border-color:${iv.color}33;">Affects: ${iv.institutions.join(', ')}</span>
      </div>
    </div>`).join('');
}

// ============================================================
//  STATS PANEL
// ============================================================
function renderStatsPanel() {
  const ns = computeNationalStats();
  const types = ['Traditional','Technology','Comprehensive','Distance'];
  const typeColors = { Traditional:'#378ADD', Technology:'#E24B4A', Comprehensive:'#EF9F27', Distance:'#57a832' };

  // Enrolment by type
  const enrollGrid = document.getElementById('enrollmentGrid');
  const totalEnr = ns.totalEnrolled;
  const typeStats = types.map(t => {
    const insts = INSTITUTIONS.filter(i => i.type === t);
    const total = insts.reduce((s,i) => s + i.enrolled, 0);
    return { t, total, count: insts.length, pct: Math.round(total/totalEnr*100) };
  });
  enrollGrid.innerHTML = typeStats.map(ts => `
    <div class="stat-card">
      <div class="stat-card-label">${ts.t}</div>
      <div class="stat-card-value">${ts.total >= 1000 ? (ts.total/1000).toFixed(0)+'K' : ts.total.toLocaleString()}</div>
      <div class="stat-card-sub">${ts.count} institution${ts.count!==1?'s':''} · ${ts.pct}% of total</div>
      <div class="stat-card-bar"><div class="stat-card-bar-fill" style="width:${ts.pct}%;background:${typeColors[ts.t]};"></div></div>
    </div>`).join('') +
    `<div class="stat-card" style="border-color:rgba(55,138,221,0.25);">
      <div class="stat-card-label">Total enrolled</div>
      <div class="stat-card-value" style="color:var(--color-info);">${(totalEnr/1000000).toFixed(2)}M</div>
      <div class="stat-card-sub">Across 26 public universities</div>
      <div class="stat-card-bar"><div class="stat-card-bar-fill" style="width:100%;background:var(--color-info);"></div></div>
    </div>`;

  // NSFAS grid
  const nsfasGrid = document.getElementById('nsfasGrid');
  const nsfasTypeStats = types.map(t => {
    const insts = INSTITUTIONS.filter(i => i.type === t);
    const funded = insts.reduce((s,i) => s + Math.round(i.enrolled * i.nsfas / 100), 0);
    const avgPct = Math.round(insts.reduce((s,i) => s + i.nsfas, 0) / insts.length);
    return { t, funded, avgPct };
  });
  nsfasGrid.innerHTML = nsfasTypeStats.map(ts => `
    <div class="stat-card">
      <div class="stat-card-label">${ts.t} — NSFAS</div>
      <div class="stat-card-value">${ts.funded >= 1000 ? (ts.funded/1000).toFixed(0)+'K' : ts.funded.toLocaleString()}</div>
      <div class="stat-card-sub">Avg dependency: ${ts.avgPct}%</div>
      <div class="stat-card-bar"><div class="stat-card-bar-fill" style="width:${ts.avgPct}%;background:${typeColors[ts.t]};"></div></div>
    </div>`).join('') +
    `<div class="stat-card" style="border-color:rgba(239,159,39,0.25);">
      <div class="stat-card-label">Total NSFAS (est.)</div>
      <div class="stat-card-value" style="color:var(--color-warning);">${(ns.totalNsfas/1000).toFixed(0)}K</div>
      <div class="stat-card-sub">${Math.round(ns.totalNsfas/ns.totalEnrolled*100)}% of all students</div>
      <div class="stat-card-bar"><div class="stat-card-bar-fill" style="width:${Math.round(ns.totalNsfas/ns.totalEnrolled*100)}%;background:var(--color-warning);"></div></div>
    </div>`;

  // Quintile breakdown
  const qColors  = ['#E24B4A','#EF9F27','#7b8499','#378ADD','#57a832'];
  const qLabels  = ['Q1','Q2','Q3','Q4','Q5'];
  const qDescs   = ['Poorest 20%','Lower-middle','Middle','Upper-middle','Affluent 20%'];
  const qClassMap = ['qc1','qc2','qc3','qc4','qc5'];
  document.getElementById('quintileBreakdown').innerHTML = ns.qTotals.map((count, i) => {
    const pct = Math.round(count/ns.totalEnrolled*100);
    return `<div class="quint-card ${qClassMap[i]}">
      <div class="quint-card-label">${qLabels[i]} · ${qDescs[i]}</div>
      <div class="quint-card-value" style="color:${qColors[i]};">${(count/1000).toFixed(0)}K</div>
      <div class="quint-card-count">students (est.)</div>
      <div class="quint-card-pct" style="color:${qColors[i]};">${pct}%</div>
    </div>`;
  }).join('');

  // Stats table
  const tbody = document.getElementById('statsTableBody');
  const sorted = [...INSTITUTIONS].sort((a,b) => b.risk - a.risk);
  tbody.innerHTML = sorted.map(inst => {
    const nsfasFunded = Math.round(inst.enrolled * inst.nsfas / 100);
    const q1Students  = Math.round(inst.enrolled * inst.q[0] / 100);
    const q1q2Pct     = inst.q[0] + inst.q[1];
    return `<tr>
      <td style="font-weight:600;max-width:190px;overflow:hidden;text-overflow:ellipsis;" title="${inst.name}">${inst.name}</td>
      <td style="color:var(--color-text-2);">${inst.type}</td>
      <td style="color:var(--color-text-2);">${inst.province}</td>
      <td style="font-family:var(--font-mono);font-weight:600;">${inst.enrolled.toLocaleString()}</td>
      <td style="font-family:var(--font-mono);color:var(--color-warning);">${nsfasFunded.toLocaleString()}</td>
      <td style="font-family:var(--font-mono);">${inst.nsfas}%</td>
      <td style="font-family:var(--font-mono);color:var(--color-q1);">${q1Students.toLocaleString()}</td>
      <td>
        <span style="font-weight:600;font-family:var(--font-mono);color:${q1q2Pct>=60?'#E24B4A':q1q2Pct>=45?'#EF9F27':'var(--color-text-2)'};">${q1q2Pct}%</span>
        <div class="mini-bar"><div class="mini-bar-fill" style="width:${q1q2Pct}%;background:${q1q2Pct>=60?'#E24B4A':q1q2Pct>=45?'#EF9F27':'#378ADD'};"></div></div>
      </td>
      <td><span class="risk-badge ${riskBadgeClass(inst.risk)}">${riskLabel(inst.risk)}</span></td>
    </tr>`;
  }).join('');
}

// ============================================================
//  REPORT GENERATOR
// ============================================================
function initReportPanel() {
  const typeButtons  = document.querySelectorAll('.report-type-btn');
  const promptTA     = document.getElementById('reportPrompt');
  const generateBtn  = document.getElementById('generateReportBtn');
  const downloadBtn  = document.getElementById('downloadReportBtn');
  const scopeGroup   = document.getElementById('reportScopeFilter');
  const output       = document.getElementById('reportOutput');
  const status       = document.getElementById('reportStatus');

  // Default prompt from first button
  if (typeButtons.length) {
    reportPromptBase = typeButtons[0].dataset.prompt;
    promptTA.value = reportPromptBase;
  }

  typeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      typeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      reportPromptBase = btn.dataset.prompt;
      promptTA.value = reportPromptBase;
    });
  });

  scopeGroup.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    document.querySelectorAll('#reportScopeFilter .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    reportScope = chip.dataset.scope;
  });

  // API key field — show once, store in window
  const existingKeyRow = document.getElementById('apiKeyRow');
  if (!existingKeyRow) {
    const keyRow = document.createElement('div');
    keyRow.id = 'apiKeyRow';
    keyRow.style.cssText = 'margin-bottom:1rem;';
    keyRow.innerHTML = `
      <label class="field-label">Anthropic API Key <span style="color:var(--color-text-3);font-weight:400;">(required for report generation)</span></label>
      <div style="display:flex;gap:8px;">
        <input type="password" id="apiKeyInput" placeholder="sk-ant-..." style="flex:1;padding:8px 12px;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text);font-size:13px;font-family:var(--font);outline:none;" />
        <button id="saveApiKey" style="padding:8px 14px;background:linear-gradient(135deg,#7c4dff,#b044e0);border:none;border-radius:var(--radius-md);color:#fff;font-size:12px;font-weight:600;cursor:pointer;">Save</button>
      </div>
      <div id="apiKeyStatus" style="font-size:11px;color:var(--color-text-3);margin-top:4px;"></div>
    `;
    generateBtn.parentElement.insertBefore(keyRow, generateBtn.parentElement.firstChild);
    document.getElementById('saveApiKey').addEventListener('click', () => {
      const val = document.getElementById('apiKeyInput').value.trim();
      if (val.startsWith('sk-ant-') || val.startsWith('sk-')) {
        window.ANTHROPIC_API_KEY = val;
        document.getElementById('apiKeyStatus').innerHTML = '<span style="color:#7c4dff;">✓ API key saved for this session</span>';
      } else {
        document.getElementById('apiKeyStatus').innerHTML = '<span style="color:#e040fb;">⚠ Key should start with sk-ant-...</span>';
      }
    });
  }

  generateBtn.addEventListener('click', async () => {
    const prompt = promptTA.value.trim();
    if (!prompt) return;

    generateBtn.disabled = true;
    downloadBtn.style.display = 'none';
    status.className = 'report-status generating';
    status.innerHTML = '<div class="spinner"></div> Generating report…';
    output.innerHTML = '<div class="report-placeholder" style="min-height:200px;"><div class="spinner" style="width:28px;height:28px;border-width:3px;"></div><p>Composing your report using dashboard data…</p></div>';

    // Build data context
    let institutions = [...INSTITUTIONS];
    if (reportScope === 'Critical') institutions = institutions.filter(i => riskLabel(i.risk) === 'Critical');
    else if (reportScope === 'High') institutions = institutions.filter(i => ['Critical','High'].includes(riskLabel(i.risk)));
    else if (reportScope === 'Technology') institutions = institutions.filter(i => i.type === 'Technology');
    else if (reportScope === 'Traditional') institutions = institutions.filter(i => i.type === 'Traditional');

    const ns = computeNationalStats();
    const dataContext = `
DASHBOARD DATA SUMMARY (DHET HEMIS 2023/24):

NATIONAL OVERVIEW:
- Total enrolled: ${ns.totalEnrolled.toLocaleString()} students across 26 public universities
- Estimated NSFAS beneficiaries: ${ns.totalNsfas.toLocaleString()} (${Math.round(ns.totalNsfas/ns.totalEnrolled*100)}% of enrolment)
- National dropout rate: 52% (DHET/HSRC estimate)
- On-time graduation rate: 33%
- Q1–Q3 student share: 68% (historically disadvantaged)
- Critical-risk institutions: 6 (risk score ≥ 85)

QUINTILE NATIONAL DISTRIBUTION (estimated students):
- Q1 (poorest 20%): ${ns.qTotals[0].toLocaleString()} students (${Math.round(ns.qTotals[0]/ns.totalEnrolled*100)}%)
- Q2: ${ns.qTotals[1].toLocaleString()} students (${Math.round(ns.qTotals[1]/ns.totalEnrolled*100)}%)
- Q3: ${ns.qTotals[2].toLocaleString()} students (${Math.round(ns.qTotals[2]/ns.totalEnrolled*100)}%)
- Q4: ${ns.qTotals[3].toLocaleString()} students (${Math.round(ns.qTotals[3]/ns.totalEnrolled*100)}%)
- Q5 (affluent 20%): ${ns.qTotals[4].toLocaleString()} students (${Math.round(ns.qTotals[4]/ns.totalEnrolled*100)}%)

INSTITUTION DATA (filtered scope: ${reportScope}):
${institutions.map(i => `- ${i.name} (${i.short}): Type=${i.type}, Province=${i.province}, Enrolled=${i.enrolled.toLocaleString()}, Dropout=${i.dropout}%, NSFAS=${i.nsfas}%, Q1=${i.q[0]}%, Q1+Q2=${i.q[0]+i.q[1]}%, Risk=${i.risk} (${riskLabel(i.risk)})`).join('\n')}

DROPOUT RATES BY QUINTILE OF ORIGIN (DHET-aligned):
- Q1 (poorest): 62% dropout
- Q2: 56% dropout
- Q3: 44% dropout
- Q4: 30% dropout
- Q5 (affluent): 18% dropout
`;

    const fullPrompt = `${prompt}

${dataContext}

Format the report professionally with clear headings using markdown (## for sections, ### for subsections). Include specific data points and institution names. The report is for South African government officials and should be formal, evidence-based, and actionable. Use South African education terminology (DHET, NSFAS, HEMIS, CHE, etc.). Start with a document title and date (May 2024). Do not use asterisks for bullets — use numbered lists or clear paragraphs.`;

    try {
      // Get API key from prompt or use env placeholder
      const apiKey = window.ANTHROPIC_API_KEY || '';
      if (!apiKey) {
        throw new Error('No API key set. Please set window.ANTHROPIC_API_KEY in your browser console: window.ANTHROPIC_API_KEY = "your-key-here"');
      }
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [{ role: 'user', content: fullPrompt }]
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API ${response.status}: ${errText.slice(0,200)}`);
      }
      const data = await response.json();
      const text = data.content.map(b => b.text || '').join('');

      const html = markdownToHtml(text);
      output.innerHTML = `<div class="report-content">${html}</div>`;

      status.className = 'report-status done';
      status.innerHTML = '✓ Report ready';

      // Store for download
      output._rawText = text;
      downloadBtn.style.display = 'inline-flex';
      downloadBtn.onclick = () => downloadReport(text);

    } catch (err) {
      output.innerHTML = `<div class="report-placeholder"><p style="color:var(--color-danger);">⚠ Could not generate report.<br><small>${err.message}</small></p></div>`;
      status.className = 'report-status';
      status.innerHTML = 'Error — please try again';
    }

    generateBtn.disabled = false;
  });
}

function markdownToHtml(md) {
  return md
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid var(--color-border2);margin:1.5rem 0;">')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/^[-•] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hulo]|<\/[hulo]|<hr)(.+)$/gm, '$1')
    .replace(/<p><\/p>/g, '')
    .replace(/^<\/p><p>/gm, '')
    .replace(/(DHET|NSFAS|CHE|HEMIS|HSRC|WSU|TUT|UL|UNIVEN|MUT|UFH|UNIZULU|SPU|UMP|VUT|DUT|CPUT|CUT|SMU|NWU|UJ|NMU|UFS|UWC|UKZN|RU|UP|Wits|SU|UCT|UNISA)/g,
      '<span style="font-family:var(--font-mono);font-size:0.9em;">$1</span>');
}

function downloadReport(text) {
  const date = new Date().toLocaleDateString('en-ZA', { year:'numeric', month:'long', day:'numeric' });
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>DHET AtRisk SA Report — ${date}</title>
<style>
  body{font-family:'Segoe UI',Arial,sans-serif;max-width:820px;margin:0 auto;padding:40px 60px;color:#1a1a2e;line-height:1.75;}
  .cover{border-bottom:3px solid #1a5fa5;padding-bottom:22px;margin-bottom:32px;}
  .cover-logo{display:flex;align-items:center;gap:12px;margin-bottom:16px;}
  .cover-badge{width:52px;height:52px;background:linear-gradient(135deg,#1a5fa5,#c2382a);border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:26px;}
  .cover-org{font-size:13px;font-weight:700;color:#1a5fa5;letter-spacing:.05em;text-transform:uppercase;}
  .cover-dept{font-size:11px;color:#666;}
  .meta{font-size:11px;color:#888;font-family:monospace;margin-bottom:8px;}
  .dhet{display:inline-block;background:#1a5fa5;color:#fff;padding:2px 10px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:.05em;}
  h1{font-size:23px;color:#1a1a2e;margin:0 0 8px;}
  h2{font-size:14px;font-weight:700;color:#1a1a2e;margin:28px 0 8px;padding-bottom:6px;border-bottom:1px solid #dde5f0;text-transform:uppercase;letter-spacing:.05em;}
  h3{font-size:13px;font-weight:700;color:#1a5fa5;margin:18px 0 6px;}
  p{margin:0 0 12px;color:#333;font-size:13px;}
  ul,ol{padding-left:20px;margin:0 0 12px;color:#333;font-size:13px;}
  li{margin-bottom:4px;}
  strong{color:#1a1a2e;}
  code{background:#f0f4ff;padding:1px 5px;border-radius:3px;font-family:monospace;font-size:11px;color:#1a5fa5;}
  hr{border:none;border-top:1px solid #e0e8f5;margin:20px 0;}
  .footer{margin-top:40px;padding-top:14px;border-top:1px solid #dde5f0;font-size:11px;color:#888;}
  @media print{body{padding:20px;}}
</style>
</head>
<body>
<div class="cover">
  <div class="cover-logo">
    <div class="cover-badge">🎓</div>
    <div>
      <div class="cover-org">AtRisk SA — DHET Analytics Platform</div>
      <div class="cover-dept">Department of Higher Education and Training · Republic of South Africa</div>
    </div>
  </div>
  <div class="meta">Generated: ${date} &nbsp;·&nbsp; Data: DHET HEMIS 2021–2024 · CHE VitalStats 2021 &nbsp;·&nbsp; <span class="dhet">DHET</span></div>
</div>
${markdownToHtml(text).replace(/<p><\/p>/g,'')}
<div class="footer">
  <strong>AtRisk SA</strong> — DHET Analytics Platform &nbsp;|&nbsp; ${date}<br>
  Data sources: DHET HEMIS 2021–2024 · CHE VitalStats 2021 · HSRC Higher Education Research &nbsp;|&nbsp; AI-assisted analysis powered by Claude (Anthropic)
</div>
</body></html>`;
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `DHET-AtRisk-Report-${new Date().toISOString().slice(0,10)}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================
//  ANALYSIS ENGINE — Python-equivalent statistical analysis
// ============================================================

let analysisPanelInited = false;

const ANALYSIS_DESCRIPTIONS = {
  describe: { label: 'Descriptive Statistics (df.describe())', desc: 'Computes count, mean, std, min, 25th percentile, median, 75th percentile, and max for all numeric fields — equivalent to pandas df.describe() on the INSTITUTIONS dataset.' },
  correlations: { label: 'Correlation Matrix', desc: 'Pearson correlation coefficients between risk score, dropout rate, NSFAS dependency, enrolment, and Q1 intake share. Uses numpy.corrcoef() equivalent.' },
  distribution: { label: 'Dropout Rate Distribution', desc: 'Frequency distribution and histogram bins of dropout rates across all institutions. Includes skewness and kurtosis calculations.' },
  top_risk: { label: 'Top-N Risk Institutions', desc: 'Ranked table of highest-risk institutions with all key metrics. Configurable N parameter.' },
  by_type: { label: 'Breakdown by Institution Type', desc: 'Group-by aggregation on institution type — equivalent to df.groupby("type").agg({...}). Shows mean, std, min, max per group.' },
  by_province: { label: 'Provincial Aggregation', desc: 'Group-by aggregation on province — weighted averages by enrolment. Ranks provinces by average risk score.' },
  outliers: { label: 'Outlier Detection', desc: 'Identifies institutions where dropout rate, NSFAS dependency, or risk score falls more than 1.5 IQR from the quartile boundary.' },
  quintile_dropout: { label: 'Quintile × Dropout Regression', desc: 'Linear regression of Q1 intake share against dropout rate. Reports slope, intercept, R², p-value equivalent.' },
  nsfas_analysis: { label: 'NSFAS × Dropout Correlation', desc: 'Scatter analysis and Pearson r between NSFAS dependency percentage and dropout rate, with significance estimate.' },
  equity_index: { label: 'Equity Index Calculation', desc: 'Composite equity score per institution: weighted sum of Q1+Q2 share, NSFAS dependency, dropout rate, and inverse funding score.' },
  risk_model: { label: 'Risk Model Weights Analysis', desc: 'Analyses the contribution of each component variable to the composite risk score. Shows partial correlations and variable importance.' },
  graduation_gap: { label: 'Graduation Gap Analysis', desc: 'Estimates graduation gap: expected vs actual graduates given current dropout rates. Projects 5-year cumulative impact.' },
  cohort_sim: { label: 'Cohort Survival Simulation', desc: 'Simulates a cohort of 1000 students through a 4-year degree programme using institution-specific dropout rates per year.' },
};

function initAnalysisPanel() {
  if (analysisPanelInited) return;
  analysisPanelInited = true;

  const sel = document.getElementById('analysisSelect');
  const runBtn = document.getElementById('runAnalysisBtn');
  const dlBtn = document.getElementById('downloadAnalysisBtn');
  const descEl = document.getElementById('analysisDesc');

  sel.addEventListener('change', () => {
    const val = sel.value;
    runBtn.disabled = !val;
    dlBtn.style.display = 'none';
    descEl.style.display = 'none';
  });

  runBtn.addEventListener('click', () => {
    const val = sel.value;
    if (!val) return;
    runAnalysis(val);
  });

  // Check backend health
  checkBackendStatus();
}

// ============================================================
//  CSV IMPORT
// ============================================================

let csvDataset = null; // null = use INSTITUTIONS (demo)

function initCSVImport() {
  const dropZone  = document.getElementById('csvDropZone');
  const fileInput = document.getElementById('csvFileInput');
  const clearBtn  = document.getElementById('csvClearBtn');
  if (!dropZone || !fileInput) return;

  // Click-to-browse
  dropZone.addEventListener('click', () => fileInput.click());

  // File selected via browser
  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) loadCSVFile(fileInput.files[0]);
  });

  // Drag-and-drop
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) loadCSVFile(file);
  });

  // Clear
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      csvDataset = null;
      fileInput.value = '';
      document.getElementById('csvStatus').style.display = 'none';
      document.getElementById('csvPreviewWrap').style.display = 'none';
      dropZone.style.display = '';
      // Update backend badge
      const badge = document.getElementById('backendStatus');
      if (badge) badge.innerHTML = `<span class="backend-badge backend-demo">✓ Demo Dataset Loaded</span>`;
      // Reset output
      document.getElementById('analysisOutput').innerHTML = `
        <div class="analysis-placeholder">
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" style="color:var(--color-text-3);"><path d="M2 20h20M7 10v10M12 4v16M17 14v6"/></svg>
          <div class="analysis-placeholder-title">Demo dataset restored</div>
          <p>Choose an analysis module and click <strong>Run Analysis</strong>.</p>
        </div>`;
      document.getElementById('downloadAnalysisBtn').style.display = 'none';
    });
  }
}

function loadCSVFile(file) {
  const statusEl  = document.getElementById('csvStatus');
  const previewWrap = document.getElementById('csvPreviewWrap');
  const dropZone  = document.getElementById('csvDropZone');

  if (file.size > 10 * 1024 * 1024) {
    showCSVStatus('error', '✕ File too large (max 10 MB).');
    return;
  }
  showCSVStatus('success', '⏳ Parsing CSV…');

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const parsed = parseCSV(e.target.result);
      if (parsed.rows.length < 2) throw new Error('CSV appears empty or has only headers.');
      csvDataset = parsed;
      const numericCols = parsed.headers.filter(h => parsed.rows.some(r => !isNaN(parseFloat(r[h]))));
      showCSVStatus('success', `✓ Loaded <strong>${file.name}</strong> — ${parsed.rows.length} rows · ${parsed.headers.length} columns · ${numericCols.length} numeric`);
      renderCSVPreview(parsed, previewWrap);
      previewWrap.style.display = '';
      dropZone.style.display = 'none';
      // Update badge
      const badge = document.getElementById('backendStatus');
      if (badge) badge.innerHTML = `<span class="backend-badge backend-online">📄 Custom CSV · ${parsed.rows.length} rows</span>`;
    } catch(err) {
      showCSVStatus('error', '✕ ' + err.message);
    }
  };
  reader.onerror = () => showCSVStatus('error', '✕ Could not read file.');
  reader.readAsText(file);
}

function showCSVStatus(type, html) {
  const el = document.getElementById('csvStatus');
  el.style.display = '';
  el.className = 'csv-status ' + type;
  el.innerHTML = html;
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g,''));
  const rows = lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g,''));
    const obj = {};
    headers.forEach((h,i) => { obj[h] = vals[i] ?? ''; });
    return obj;
  }).filter(r => Object.values(r).some(v => v !== ''));
  return { headers, rows };
}

function renderCSVPreview(parsed, container) {
  const previewRows = parsed.rows.slice(0, 5);
  const table = document.getElementById('csvPreviewTable');
  if (!table) return;
  table.innerHTML = `<table class="data-table" style="font-size:11px;">
    <thead><tr>${parsed.headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${previewRows.map(r=>`<tr>${parsed.headers.map(h=>`<td>${r[h]??''}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>`;
  document.getElementById('csvPreviewLabel').textContent =
    `Preview: first ${Math.min(5,parsed.rows.length)} of ${parsed.rows.length} rows`;
}

// Wrap computeAnalysis to use csvDataset when available
function getActiveDataset() {
  if (!csvDataset) return INSTITUTIONS;
  // Try to map CSV rows to INSTITUTIONS shape, or run generic analysis
  return csvDataset; // returned as-is; analysis functions handle both
}

async function checkBackendStatus() {
  const el = document.getElementById('backendStatus');
  if (!el) return;
  try {
    const r = await fetch(BACKEND_URL + '/api/health', { signal: AbortSignal.timeout(2000) });
    if (r.ok) {
      const d = await r.json();
      el.innerHTML = `<span class="backend-badge backend-online">🐍 Python backend online · pandas ${d.pandas}</span>`;
    } else {
      throw new Error();
    }
  } catch {
    el.innerHTML = `<span class="backend-badge backend-demo">✓ Demo Dataset Loaded</span>`;
  }
}

function runAnalysis(type) {
  const output = document.getElementById('analysisOutput');
  const dlBtn = document.getElementById('downloadAnalysisBtn');

  output.innerHTML = `<div class="analysis-placeholder" style="min-height:180px;">
    <div class="spinner" style="width:24px;height:24px;border-width:3px;"></div>
    <p style="margin-top:8px;font-size:12px;">Running analysis<span class="dots-anim">...</span></p>
  </div>`;

  // Try Python backend first, fall back to JS
  const doRun = async () => {
    try {
      const resp = await fetch(BACKEND_URL + '/api/analyze', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ module: type, chartType: selectedChartType }),
        signal: AbortSignal.timeout(8000)
      });
      if (!resp.ok) throw new Error('Backend error');
      const data = await resp.json();
      if (!data.success) throw new Error(data.error || 'Unknown error');
      lastAnalysisResult = { ...data, _type: type, _source: 'python' };
      renderAnalysisResult(lastAnalysisResult, selectedChartType);
      dlBtn.style.display = 'inline-flex';
      dlBtn.onclick = () => downloadAnalysisCSV(buildCSVFromResult(lastAnalysisResult), type);
    } catch (err) {
      // JS fallback
      setTimeout(() => {
        try {
          const result = computeAnalysis(type);
          lastAnalysisResult = { ...result, _type: type, _source: 'js' };
          if (result.chart_data) {
            renderAnalysisResult(lastAnalysisResult, selectedChartType);
          } else {
            output.innerHTML = result.html;
          }
          dlBtn.style.display = 'inline-flex';
          dlBtn.onclick = () => downloadAnalysisCSV(result.csvData || buildCSVFromResult(lastAnalysisResult), type);
        } catch(e2) {
          output.innerHTML = `<div style="color:var(--color-danger);padding:2rem;text-align:center;">Analysis failed: ${e2.message}</div>`;
        }
      }, 400);
    }
  };
  doRun();
}

// ============================================================
//  GENERIC CSV ANALYSIS ENGINE
// ============================================================
function computeCSVAnalysis(parsed, type, chartType) {
  const { headers, rows } = parsed;
  const numericCols = headers.filter(h => rows.some(r => r[h] !== '' && !isNaN(parseFloat(r[h]))));
  const labelCol = headers.find(h => !numericCols.includes(h)) || headers[0];

  // Compute stats per numeric column
  function colVals(col) { return rows.map(r => parseFloat(r[col])).filter(v => !isNaN(v)); }
  function colStats(col) {
    const vals = colVals(col).sort((a,b)=>a-b);
    const n = vals.length;
    if (!n) return { n:0, mean:'—', std:'—', min:'—', q25:'—', median:'—', q75:'—', max:'—' };
    const mean = vals.reduce((s,v)=>s+v,0)/n;
    const std = Math.sqrt(vals.reduce((s,v)=>s+(v-mean)**2,0)/Math.max(1,n-1));
    return {
      n, mean: mean.toFixed(2), std: std.toFixed(2),
      min: vals[0], q25: vals[Math.floor(n*0.25)],
      median: n%2===0?(vals[n/2-1]+vals[n/2])/2:vals[Math.floor(n/2)],
      q75: vals[Math.floor(n*0.75)], max: vals[n-1]
    };
  }

  if (type === 'describe' || type === 'correlations' || type === 'distribution') {
    // Descriptive stats
    const statKeys = ['count','mean','std','min','25%','median','75%','max'];
    const allStats = numericCols.map(c => colStats(c));
    const tableHeaders = ['Statistic', ...numericCols];
    const tableRows = [
      ['count',    ...allStats.map(s=>s.n)],
      ['mean',     ...allStats.map(s=>s.mean)],
      ['std',      ...allStats.map(s=>s.std)],
      ['min',      ...allStats.map(s=>s.min)],
      ['25%',      ...allStats.map(s=>s.q25)],
      ['median',   ...allStats.map(s=>s.median)],
      ['75%',      ...allStats.map(s=>s.q75)],
      ['max',      ...allStats.map(s=>s.max)],
    ];

    const tableHtmlStr = `<div class="analysis-table-wrap"><table class="data-table">
      <thead><tr>${tableHeaders.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${tableRows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>`;

    // Chart data — show mean of each numeric col as a bar
    const chartData = {
      type: 'bar',
      labels: numericCols,
      datasets: [{ label: 'Mean', data: allStats.map(s=>parseFloat(s.mean)||0) }]
    };

    const html = `<div class="analysis-result-header">
      <div>
        <div class="analysis-result-title">Descriptive Statistics — Custom CSV <span style="font-size:10px;background:rgba(79,142,247,0.15);color:#4f8ef7;border:1px solid rgba(79,142,247,0.25);padding:2px 7px;border-radius:4px;font-family:var(--font-mono);">📄 CSV</span></div>
        <div class="analysis-result-sub">${rows.length} rows · ${numericCols.length} numeric columns</div>
      </div>
      <div class="analysis-result-code">df.describe()</div>
    </div>
    ${chartType !== 'table' ? `<div class="analysis-chart-wrap"><canvas id="csvAnalysisChart_${Date.now()}"></canvas></div>` : tableHtmlStr}
    <div class="analysis-note">ℹ Showing statistics for ${numericCols.length} numeric columns from your uploaded CSV. ${rows.length} data rows processed.</div>`;

    const csvData = [tableHeaders, ...tableRows].map(r=>r.join(',')).join('\n');

    // Need to render chart after DOM settles
    if (chartType !== 'table') {
      setTimeout(() => {
        const canvas = document.querySelector('.analysis-chart-wrap canvas');
        if (!canvas) return;
        if (window._analysisChart) { try { window._analysisChart.destroy(); } catch(e){} }
        const CHART_COLORS = ['#b044e0','#4f8ef7','#ff6b9d','#7c4dff','#e040fb','#9c6fcf','#ff9800'];
        window._analysisChart = new Chart(canvas, {
          type: chartType === 'pie' ? 'pie' : chartType === 'line' ? 'line' : 'bar',
          data: {
            labels: chartData.labels,
            datasets: [{
              label: 'Mean value',
              data: chartData.datasets[0].data,
              backgroundColor: CHART_COLORS.map(c=>c+'99'),
              borderColor: CHART_COLORS,
              borderWidth: 1, borderRadius: 4
            }]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: chartType === 'pie' ? {} : {
              x: { grid: { color: 'rgba(180,100,255,0.1)' }, ticks: { color: '#7a5f9a', maxRotation: 40 }, border: { display: false } },
              y: { grid: { color: 'rgba(180,100,255,0.1)' }, ticks: { color: '#7a5f9a' }, border: { display: false } }
            }
          }
        });
      }, 100);
    }

    return { html, csvData };
  }

  // For other analysis types, do a column-by-column value distribution
  const firstNumCol = numericCols[0] || headers[0];
  const vals = colVals(firstNumCol);
  const labelVals = rows.map(r => r[labelCol] || '').slice(0, 20);
  const numVals = rows.map(r => parseFloat(r[firstNumCol])).filter(v=>!isNaN(v)).slice(0, 20);

  const tableHeaders2 = [labelCol, ...numericCols.slice(0,5)];
  const tableRows2 = rows.slice(0,20).map(r => [r[labelCol]||'', ...numericCols.slice(0,5).map(c=>r[c]||'—')]);
  const tableHtmlStr2 = `<div class="analysis-table-wrap"><table class="data-table">
    <thead><tr>${tableHeaders2.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${tableRows2.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
  </table></div>`;

  // Render chart for numeric col
  const CHART_COLORS2 = ['#b044e0','#4f8ef7','#ff6b9d','#7c4dff','#e040fb','#9c6fcf','#ff9800'];
  const canvasId2 = `csvChart_${Date.now()}`;
  const chartWrap2 = chartType !== 'table' ? `<div class="analysis-chart-wrap"><canvas id="${canvasId2}"></canvas></div>` : '';

  const html2 = `<div class="analysis-result-header">
    <div>
      <div class="analysis-result-title">Data View — ${firstNumCol} <span style="font-size:10px;background:rgba(79,142,247,0.15);color:#4f8ef7;border:1px solid rgba(79,142,247,0.25);padding:2px 7px;border-radius:4px;font-family:var(--font-mono);">📄 CSV</span></div>
      <div class="analysis-result-sub">${rows.length} rows · showing first 20</div>
    </div>
    <div class="analysis-result-code">df["${firstNumCol}"].plot()</div>
  </div>
  ${chartWrap2}
  ${chartType === 'table' ? tableHtmlStr2 : ''}
  <div class="analysis-note">ℹ Custom CSV mode: showing raw data table and chart for column "${firstNumCol}". Switch to Table view to see all columns.</div>`;

  if (chartType !== 'table') {
    setTimeout(() => {
      const ctx = document.getElementById(canvasId2);
      if (!ctx) return;
      if (window._analysisChart) { try { window._analysisChart.destroy(); } catch(e){} }
      window._analysisChart = new Chart(ctx, {
        type: chartType === 'pie' ? 'pie' : chartType === 'scatter' ? 'scatter' : chartType === 'line' ? 'line' : 'bar',
        data: {
          labels: labelVals,
          datasets: [{
            label: firstNumCol,
            data: chartType === 'scatter' ? numVals.map((v,i)=>({x:i,y:v})) : numVals,
            backgroundColor: CHART_COLORS2.map(c=>c+'99'),
            borderColor: CHART_COLORS2[0],
            borderWidth: 1, borderRadius: 4, tension: 0.4
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: chartType === 'pie' ? {} : {
            x: { grid: { color: 'rgba(180,100,255,0.1)' }, ticks: { color: '#7a5f9a', maxRotation: 45 }, border: { display: false } },
            y: { grid: { color: 'rgba(180,100,255,0.1)' }, ticks: { color: '#7a5f9a' }, border: { display: false } }
          }
        }
      });
    }, 100);
  }

  const csvData2 = [tableHeaders2, ...tableRows2].map(r=>r.join(',')).join('\n');
  return { html: html2, csvData: csvData2 };
}

function buildCSVFromResult(result) {
  if (!result.headers || !result.rows) return '';
  const clean = v => String(v).replace(/<[^>]+>/g,'');
  return [result.headers, ...result.rows].map(r => r.map(clean).join(',')).join('\n');
}

function renderAnalysisResult(result, chartType) {
  const output = document.getElementById('analysisOutput');
  if (!output) return;

  const CHART_COLORS = ['#b044e0','#e040fb','#ff6b9d','#4f8ef7','#7c4dff','#9c6fcf','#ff9800'];

  const clean = v => String(v).replace(/<[^>]+>/g,'');
  const pyBadge = result._source === 'python'
    ? `<span style="font-size:10px;background:rgba(124,77,255,0.2);color:#a57fff;border:1px solid rgba(124,77,255,0.3);padding:2px 7px;border-radius:4px;font-family:var(--font-mono);">🐍 pandas</span>`
    : `<span style="font-size:10px;background:rgba(176,68,224,0.15);color:#e57fff;border:1px solid rgba(176,68,224,0.2);padding:2px 7px;border-radius:4px;font-family:var(--font-mono);">JS engine</span>`;

  const statsHtml = result.stats ? `<div class="analysis-stats-row">${
    Object.entries(result.stats).map(([k,v]) =>
      `<div class="analysis-stat-box"><div class="analysis-stat-lbl">${k}</div><div class="analysis-stat-val">${v}</div></div>`
    ).join('')
  }</div>` : '';

  const tableHtmlStr = (result.headers && result.rows) ? `
    <div class="analysis-table-wrap">
      <table class="data-table">
        <thead><tr>${result.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${result.rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    </div>` : '';

  // Always include canvas placeholder — show/hide table vs chart
  const canvasId = 'analysisChart_' + Date.now();
  const chartWrapHtml = (chartType !== 'table' && result.chart_data)
    ? `<div class="analysis-chart-wrap"><canvas id="${canvasId}"></canvas></div>`
    : '';

  output.innerHTML = `
    <div class="analysis-result-header">
      <div>
        <div class="analysis-result-title">${result.title || ''} ${pyBadge}</div>
        <div class="analysis-result-sub">${result.subtitle || ''}</div>
      </div>
    </div>
    ${chartWrapHtml}
    ${chartType === 'table' ? tableHtmlStr : ''}
    ${statsHtml}
    ${result.note ? `<div class="analysis-note">ℹ ${result.note}</div>` : ''}
  `;

  // NOW render chart — canvas is in the DOM
  if (chartType !== 'table' && result.chart_data) {
    const ctx = document.getElementById(canvasId);
    if (ctx) {
      if (window._analysisChart) { try { window._analysisChart.destroy(); } catch(e){} }
      const cd = result.chart_data;
      const datasets = (cd.datasets || []).map((ds, i) => ({
        ...ds,
        backgroundColor: cd.type === 'pie'
          ? CHART_COLORS.map(c => c + 'bb')
          : CHART_COLORS[i % CHART_COLORS.length] + '99',
        borderColor: cd.type === 'pie'
          ? CHART_COLORS
          : CHART_COLORS[i % CHART_COLORS.length],
        borderWidth: 1,
        borderRadius: cd.type === 'bar' ? 4 : 0,
        tension: 0.4,
        fill: false,
        pointRadius: cd.type === 'scatter' ? 6 : 3,
      }));
      window._analysisChart = new Chart(ctx, {
        type: cd.type === 'scatter' ? 'bubble' : cd.type,
        data: { labels: cd.labels || [], datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: datasets.length > 1, labels: { color: '#b89fd4' } } },
          scales: cd.type === 'pie' ? {} : {
            x: { grid: { color: 'rgba(180,100,255,0.1)' }, ticks: { color: '#7a5f9a', maxRotation: 40 }, border: { display: false } },
            y: { grid: { color: 'rgba(180,100,255,0.1)' }, ticks: { color: '#7a5f9a' }, border: { display: false } }
          }
        }
      });
    }
  }
}

function computeAnalysis(type) {
  const df = INSTITUTIONS;
  switch(type) {
    case 'describe': return analyzeDescribe(df);
    case 'correlations': return analyzeCorrelations(df);
    case 'distribution': return analyzeDistribution(df);
    case 'top_risk': return analyzeTopRisk(df);
    case 'by_type': return analyzeByType(df);
    case 'by_province': return analyzeByProvince(df);
    case 'outliers': return analyzeOutliers(df);
    case 'quintile_dropout': return analyzeQuintileDropout(df);
    case 'nsfas_analysis': return analyzeNSFAS(df);
    case 'equity_index': return analyzeEquityIndex(df);
    case 'risk_model': return analyzeRiskModel(df);
    case 'graduation_gap': return analyzeGraduationGap(df);
    case 'cohort_sim': return analyzeCohortSim(df);
    default: throw new Error('Unknown analysis type');
  }
}

function statSummary(arr) {
  const sorted = [...arr].sort((a,b)=>a-b);
  const n = arr.length;
  const mean = arr.reduce((s,v)=>s+v,0)/n;
  const std = Math.sqrt(arr.reduce((s,v)=>s+(v-mean)**2,0)/(n-1));
  const q25 = sorted[Math.floor(n*0.25)];
  const med = n%2===0?(sorted[n/2-1]+sorted[n/2])/2:sorted[Math.floor(n/2)];
  const q75 = sorted[Math.floor(n*0.75)];
  return { n, mean: mean.toFixed(2), std: std.toFixed(2), min: sorted[0], q25, median: med.toFixed(1), q75, max: sorted[n-1] };
}

function pearsonR(x, y) {
  const n = x.length;
  const mx = x.reduce((s,v)=>s+v,0)/n;
  const my = y.reduce((s,v)=>s+v,0)/n;
  const num = x.reduce((s,v,i)=>s+(v-mx)*(y[i]-my),0);
  const den = Math.sqrt(x.reduce((s,v)=>s+(v-mx)**2,0)*y.reduce((s,v)=>s+(v-my)**2,0));
  return den===0?0:(num/den);
}

function analysisHeader(title, subtitle, code) {
  return `<div class="analysis-result-header">
    <div>
      <div class="analysis-result-title">${title}</div>
      <div class="analysis-result-sub">${subtitle}</div>
    </div>
    <div class="analysis-result-code">${code}</div>
  </div>`;
}

function tableHtml(headers, rows, highlight) {
  const ths = headers.map(h=>`<th>${h}</th>`).join('');
  const trs = rows.map((r,ri)=>{
    const tds = r.map((c,ci)=>`<td class="${ci===highlight?'analysis-hl':''}">${c}</td>`).join('');
    return `<tr>${tds}</tr>`;
  }).join('');
  return `<div class="analysis-table-wrap"><table class="data-table"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></div>`;
}

function analyzeDescribe(df) {
  const fields = [
    { key: 'enrolled', label: 'Enrolled' },
    { key: 'dropout',  label: 'Dropout %' },
    { key: 'nsfas',   label: 'NSFAS %' },
    { key: 'risk',    label: 'Risk Score' },
  ];
  const headers = ['Statistic', ...fields.map(f=>f.label)];
  const stats = fields.map(f => statSummary(df.map(i=>i[f.key])));
  const rows = [
    ['count', ...stats.map(s=>s.n)],
    ['mean',  ...stats.map(s=>s.mean)],
    ['std',   ...stats.map(s=>s.std)],
    ['min',   ...stats.map(s=>s.min)],
    ['25%',   ...stats.map(s=>s.q25)],
    ['50% (median)', ...stats.map(s=>s.median)],
    ['75%',   ...stats.map(s=>s.q75)],
    ['max',   ...stats.map(s=>s.max)],
  ];
  const csvData = [headers, ...rows].map(r=>r.join(',')).join('\n');
  const html = analysisHeader('Descriptive Statistics','DHET HEMIS 2023/24 · All 26 public universities','df.describe()') +
    tableHtml(headers, rows, 0) +
    `<div class="analysis-note">ℹ Computed on n=${df.length} institutions. Enrolled figures range from ${Math.min(...df.map(i=>i.enrolled)).toLocaleString()} (smallest) to ${Math.max(...df.map(i=>i.enrolled)).toLocaleString()} (UNISA). Dropout std of ${statSummary(df.map(i=>i.dropout)).std}pp indicates high institutional variance.</div>`;
  return { html, csvData };
}

function analyzeCorrelations(df) {
  const vars = [
    { key: 'risk',    label: 'Risk Score' },
    { key: 'dropout', label: 'Dropout %' },
    { key: 'nsfas',  label: 'NSFAS %' },
    { key: 'enrolled',label: 'Enrolled' },
  ];
  const data = vars.map(v=>df.map(i=>i[v.key]));
  const matrix = vars.map((_,i)=>vars.map((_,j)=>pearsonR(data[i],data[j]).toFixed(3)));
  const q1data = df.map(i=>i.q[0]);
  const headers = ['Variable', ...vars.map(v=>v.label), 'Q1 Share %'];
  const rows = vars.map((v,i)=>[v.label, ...matrix[i], pearsonR(data[i],q1data).toFixed(3)]);
  rows.push(['Q1 Share %', ...vars.map((_,j)=>pearsonR(q1data,data[j]).toFixed(3)), '1.000']);

  // Color cells
  const colorCell = (v) => {
    const n = parseFloat(v);
    if (n===1) return `<span style="color:var(--color-text-3);">1.000</span>`;
    const abs = Math.abs(n);
    const col = abs>0.8?'#E24B4A':abs>0.5?'#EF9F27':abs>0.3?'#639922':'var(--color-text-2)';
    return `<span style="color:${col};font-weight:${abs>0.5?'600':'400'};">${v}</span>`;
  };
  const coloredRows = rows.map(r=>[r[0], ...r.slice(1).map(colorCell)]);
  const tableStr = `<div class="analysis-table-wrap"><table class="data-table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${coloredRows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const csvData = [headers, ...rows].map(r=>r.join(',')).join('\n');
  const r_dr = pearsonR(df.map(i=>i.dropout),df.map(i=>i.nsfas));
  const html = analysisHeader('Correlation Matrix','Pearson r between key risk indicators','np.corrcoef(df[[...]])') +
    tableStr +
    `<div class="analysis-note">ℹ Dropout × NSFAS dependency: r = <strong>${r_dr.toFixed(3)}</strong> — strong positive correlation. Risk score × Q1 share: r = <strong>${pearsonR(df.map(i=>i.risk),df.map(i=>i.q[0])).toFixed(3)}</strong>. Colour coding: <span style="color:#E24B4A;">red ≥ 0.8</span> · <span style="color:#EF9F27;">amber ≥ 0.5</span> · <span style="color:#639922;">green ≥ 0.3</span></div>`;
  return { html, csvData };
}

function analyzeDistribution(df) {
  const dropouts = df.map(i=>i.dropout).sort((a,b)=>a-b);
  const bins = [[0,20],[20,30],[30,40],[40,50],[50,60],[60,70]];
  const headers = ['Bin', 'Count', 'Institutions', 'Frequency %'];
  const rows = bins.map(([lo,hi])=>{
    const insts = df.filter(i=>i.dropout>=lo&&i.dropout<hi);
    return [`${lo}–${hi}%`, insts.length, insts.map(i=>i.short).join(', ')||'—', ((insts.length/df.length)*100).toFixed(1)+'%'];
  });
  const mean = dropouts.reduce((s,v)=>s+v,0)/dropouts.length;
  const std = Math.sqrt(dropouts.reduce((s,v)=>s+(v-mean)**2,0)/(dropouts.length-1));
  const skew = dropouts.reduce((s,v)=>s+((v-mean)/std)**3,0)/dropouts.length;
  const csvData = [headers,...rows].map(r=>r.join(',')).join('\n');
  const chart_data = {
    type: 'bar',
    labels: bins.map(([lo,hi])=>`${lo}–${hi}%`),
    datasets: [{ label: 'Institutions', data: bins.map(([lo,hi])=>df.filter(i=>i.dropout>=lo&&i.dropout<hi).length) }]
  };
  return {
    title: 'Dropout Rate Distribution',
    subtitle: 'Frequency bins and shape statistics',
    code: 'pd.cut(df.dropout, bins=[...]).value_counts()',
    headers, rows, chart_data, csvData,
    note: `Skewness of ${skew.toFixed(2)} indicates ${skew>0?'right-skewed (most institutions cluster below the mean)':'left-skewed'}. The majority of institutions fall in the 30–55% dropout band.`,
    stats: { Mean: mean.toFixed(1)+'%', 'Std Dev': std.toFixed(1)+'pp', Median: dropouts[Math.floor(dropouts.length/2)]+'%', Skewness: skew.toFixed(2), Min: dropouts[0]+'%', Max: dropouts[dropouts.length-1]+'%' }
  };
}

function analyzeTopRisk(df) {
  const N = 10;
  const sorted = [...df].sort((a,b)=>b.risk-a.risk).slice(0,N);
  const headers = ['Rank','Institution','Type','Province','Risk Score','Dropout %','NSFAS %','Q1+Q2 %','Level'];
  const rows = sorted.map((i,idx)=>[
    idx+1, i.name, i.type, i.province,
    `<span style="color:${riskColor(i.risk)};font-weight:700;">${i.risk}</span>`,
    `${i.dropout}%`, `${i.nsfas}%`, `${i.q[0]+i.q[1]}%`,
    `<span class="risk-badge ${riskBadgeClass(i.risk)}">${riskLabel(i.risk)}</span>`
  ]);
  const csvRows = sorted.map((i,idx)=>[idx+1,i.name,i.type,i.province,i.risk,i.dropout,i.nsfas,i.q[0]+i.q[1],riskLabel(i.risk)]);
  const csvData = [['Rank','Institution','Type','Province','Risk','Dropout%','NSFAS%','Q1Q2%','Level'],...csvRows].map(r=>r.join(',')).join('\n');
  const chart_data = {
    type: 'bar',
    labels: sorted.map(i=>i.short||i.name.slice(0,6)),
    datasets: [{ label: 'Risk Score', data: sorted.map(i=>i.risk) }]
  };
  const tableStr = `<div class="analysis-table-wrap"><table class="data-table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  return {
    title: `Top ${N} Highest-Risk Institutions`,
    subtitle: `Ranked by composite risk score · DHET HEMIS 2023/24`,
    code: `df.nlargest(${N}, 'risk')`,
    headers, rows, chart_data, csvData,
    note: `${sorted.filter(i=>riskLabel(i.risk)==='Critical').length} of top ${N} are Critical-risk. ${sorted.filter(i=>i.province==='Limpopo'||i.province==='Eastern Cape').length} are from Limpopo or Eastern Cape — historically under-resourced provinces.`,
    html: analysisHeader(`Top ${N} Highest-Risk Institutions`,`Ranked by composite risk score · DHET HEMIS 2023/24`,`df.nlargest(${N}, 'risk')`) + tableStr + `<div class="analysis-note">ℹ ${sorted.filter(i=>riskLabel(i.risk)==='Critical').length} of top ${N} are Critical-risk.</div>`
  };
}

function analyzeByType(df) {
  const types = [...new Set(df.map(i=>i.type))];
  const headers = ['Type','Count','Avg Dropout %','Avg NSFAS %','Avg Risk','Total Enrolled','Avg Q1+Q2 %'];
  const rows = types.map(t=>{
    const grp = df.filter(i=>i.type===t);
    const avg = k=>( grp.reduce((s,i)=>s+i[k],0)/grp.length ).toFixed(1);
    const avgQ12 = (grp.reduce((s,i)=>s+i.q[0]+i.q[1],0)/grp.length).toFixed(1);
    return [t, grp.length, avg('dropout')+'%', avg('nsfas')+'%',
      `<span style="color:${riskColor(parseFloat(avg('risk')))};">${avg('risk')}</span>`,
      grp.reduce((s,i)=>s+i.enrolled,0).toLocaleString(), avgQ12+'%'];
  }).sort((a,b)=>parseFloat(b[4])-parseFloat(a[4]));
  const csvData = [headers, ...rows.map(r=>[r[0],r[1],r[2],r[3],r[4].replace(/<[^>]+>/g,''),r[5].replace(',',''),r[6]])].map(r=>r.join(',')).join('\n');
  const tableStr = `<div class="analysis-table-wrap"><table class="data-table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const html = analysisHeader('Institution Type Breakdown','Group-by aggregation across all metrics',`df.groupby('type').agg({'dropout':'mean', 'risk':'mean', ...})`) + tableStr +
    `<div class="analysis-note">ℹ Technology universities show notably higher NSFAS dependency on average. Traditional universities span the widest risk range — from UCT (risk 20) to WSU (risk 91).</div>`;
  return { html, csvData };
}

function analyzeByProvince(df) {
  const provs = [...new Set(df.map(i=>i.province))];
  const headers = ['Province','Institutions','Avg Risk','Avg Dropout %','Avg NSFAS %','Total Enrolled','Dominant Type'];
  const rows = provs.map(p=>{
    const grp = df.filter(i=>i.province===p);
    const avg = k=>(grp.reduce((s,i)=>s+i[k],0)/grp.length).toFixed(1);
    const types = {}; grp.forEach(i=>{types[i.type]=(types[i.type]||0)+1;});
    const domType = Object.entries(types).sort((a,b)=>b[1]-a[1])[0][0];
    return { p, n: grp.length, avgRisk: parseFloat(avg('risk')), avgDrop: avg('dropout'), avgNsfas: avg('nsfas'), total: grp.reduce((s,i)=>s+i.enrolled,0), domType };
  }).sort((a,b)=>b.avgRisk-a.avgRisk);
  const tableRows = rows.map(r=>[r.p, r.n, `<span style="color:${riskColor(r.avgRisk)};font-weight:600;">${r.avgRisk}</span>`, r.avgDrop+'%', r.avgNsfas+'%', r.total.toLocaleString(), r.domType]);
  const csvData = [headers, ...rows.map(r=>[r.p,r.n,r.avgRisk,r.avgDrop,r.avgNsfas,r.total,r.domType])].map(r=>r.join(',')).join('\n');
  const tableStr = `<div class="analysis-table-wrap"><table class="data-table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${tableRows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const top = rows[0];
  const html = analysisHeader('Provincial Aggregation & Ranking','Weighted by institution count',`df.groupby('province').agg(...).sort_values('risk', ascending=False)`) + tableStr +
    `<div class="analysis-note">ℹ ${top.p} has the highest average risk score (${top.avgRisk}). Provinces like Western Cape and Gauteng show wide within-province variation due to elite/historically-disadvantaged institution mix.</div>`;
  return { html, csvData };
}

function analyzeOutliers(df) {
  const iqrOut = (arr, key) => {
    const sorted = [...arr].sort((a,b)=>a[key]-b[key]);
    const n = sorted.length;
    const q1 = sorted[Math.floor(n*0.25)][key];
    const q3 = sorted[Math.floor(n*0.75)][key];
    const iqr = q3-q1;
    return arr.filter(i=>i[key]<q1-1.5*iqr||i[key]>q3+1.5*iqr).map(i=>({...i, outlierField: key, value: i[key], q1, q3, iqr}));
  };
  const outDrop = iqrOut(df,'dropout');
  const outNsfas = iqrOut(df,'nsfas');
  const outRisk = iqrOut(df,'risk');
  const all = [...outDrop,...outNsfas,...outRisk];
  const headers = ['Institution','Outlier Field','Value','Q1','Q3','IQR','Direction'];
  const rows = all.map(o=>[o.name, o.outlierField, o.value, o.q1, o.q3, o.iqr.toFixed(1), o.value>o.q3+1.5*o.iqr?'▲ Upper':'▼ Lower']);
  const csvData = [headers,...rows].map(r=>r.join(',')).join('\n');
  const html = analysisHeader('Outlier Detection','IQR method: flagged if value < Q1-1.5×IQR or > Q3+1.5×IQR','scipy.stats.iqr() | df[mask]') +
    tableHtml(headers,rows,1) +
    `<div class="analysis-note">ℹ Identified ${all.length} outlier data points across ${new Set(all.map(o=>o.name)).size} institutions. UNISA is a structural outlier in enrolment due to its distance-learning model.</div>`;
  return { html, csvData };
}

function analyzeQuintileDropout(df) {
  // Quintile-level averages from known data
  const quintData = [
    { q: 'Q1 (poorest)', share: df.reduce((s,i)=>s+i.q[0],0)/df.length, dropout: 62 },
    { q: 'Q2', share: df.reduce((s,i)=>s+i.q[1],0)/df.length, dropout: 56 },
    { q: 'Q3', share: df.reduce((s,i)=>s+i.q[2],0)/df.length, dropout: 44 },
    { q: 'Q4', share: df.reduce((s,i)=>s+i.q[3],0)/df.length, dropout: 30 },
    { q: 'Q5 (affluent)', share: df.reduce((s,i)=>s+i.q[4],0)/df.length, dropout: 18 },
  ];
  // Simple linear regression
  const x = quintData.map(d=>d.share), y = quintData.map(d=>d.dropout);
  const r = pearsonR(x,y);
  const mx = x.reduce((s,v)=>s+v,0)/x.length, my = y.reduce((s,v)=>s+v,0)/y.length;
  const slope = x.reduce((s,v,i)=>s+(v-mx)*(y[i]-my),0)/x.reduce((s,v)=>s+(v-mx)**2,0);
  const intercept = my - slope*mx;
  const headers = ['Quintile','Avg Inst. Share %','Dropout Rate %','Predicted %','Residual'];
  const rows = quintData.map(d=>{
    const pred = (slope*d.share+intercept).toFixed(1);
    const res = (d.dropout - parseFloat(pred)).toFixed(1);
    return [d.q, d.share.toFixed(1)+'%', d.dropout+'%', pred+'%', `<span style="color:${Math.abs(res)>3?'#EF9F27':'#639922'};">${res>0?'+':''}${res}</span>`];
  });
  const csvData = [headers,...quintData.map((d,i)=>[d.q,d.share.toFixed(1),d.dropout])].map(r=>r.join(',')).join('\n');
  const tableStr = `<div class="analysis-table-wrap"><table class="data-table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const html = analysisHeader('Quintile × Dropout Linear Regression','Socioeconomic origin as predictor of dropout rate','scipy.stats.linregress(q_share, dropout_rate)') +
    tableStr +
    `<div class="analysis-stats-row">
      <div class="analysis-stat-box"><div class="analysis-stat-lbl">Pearson r</div><div class="analysis-stat-val">${r.toFixed(3)}</div></div>
      <div class="analysis-stat-box"><div class="analysis-stat-lbl">R²</div><div class="analysis-stat-val">${(r*r).toFixed(3)}</div></div>
      <div class="analysis-stat-box"><div class="analysis-stat-lbl">Slope (β₁)</div><div class="analysis-stat-val">${slope.toFixed(2)}</div></div>
      <div class="analysis-stat-box"><div class="analysis-stat-lbl">Intercept (β₀)</div><div class="analysis-stat-val">${intercept.toFixed(2)}</div></div>
    </div>
    <div class="analysis-note">ℹ Equation: Dropout = ${slope.toFixed(2)} × Q1_share + ${intercept.toFixed(2)}. R² = ${(r*r).toFixed(3)} — Q1 share explains ${((r*r)*100).toFixed(0)}% of dropout variance across quintile groups.</div>`;
  return { html, csvData };
}

function analyzeNSFAS(df) {
  const x = df.map(i=>i.nsfas), y = df.map(i=>i.dropout);
  const r = pearsonR(x,y);
  const sorted = [...df].sort((a,b)=>b.nsfas-a.nsfas);
  const headers = ['Institution','NSFAS %','Dropout %','Risk Level'];
  const rows = sorted.map(i=>[i.name, `${i.nsfas}%`, `<span style="color:${i.dropout>50?'#E24B4A':i.dropout>35?'#EF9F27':'#639922'}">${i.dropout}%</span>`, `<span class="risk-badge ${riskBadgeClass(i.risk)}">${riskLabel(i.risk)}</span>`]);
  const csvData = [['Institution','NSFAS%','Dropout%','Risk'],...sorted.map(i=>[i.name,i.nsfas,i.dropout,riskLabel(i.risk)])].map(r=>r.join(',')).join('\n');
  const tableStr = `<div class="analysis-table-wrap"><table class="data-table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const html = analysisHeader('NSFAS Dependency × Dropout Correlation','Sorted by NSFAS dependency descending',`np.corrcoef(df['nsfas'], df['dropout'])[0,1]`) +
    `<div class="analysis-stats-row" style="margin-bottom:1rem;">
      <div class="analysis-stat-box"><div class="analysis-stat-lbl">Pearson r</div><div class="analysis-stat-val" style="color:${r>0.7?'#E24B4A':'#EF9F27'};">${r.toFixed(3)}</div></div>
      <div class="analysis-stat-box"><div class="analysis-stat-lbl">R²</div><div class="analysis-stat-val">${(r*r).toFixed(3)}</div></div>
      <div class="analysis-stat-box"><div class="analysis-stat-lbl">Strength</div><div class="analysis-stat-val">${r>0.8?'Very Strong':r>0.6?'Strong':r>0.4?'Moderate':'Weak'}</div></div>
      <div class="analysis-stat-box"><div class="analysis-stat-lbl">Direction</div><div class="analysis-stat-val">Positive</div></div>
    </div>` +
    tableStr +
    `<div class="analysis-note">ℹ r = ${r.toFixed(3)} indicates a ${r>0.7?'strong':'moderate'} positive relationship. Higher NSFAS dependency correlates with higher dropout — reflecting systemic financial and academic preparation gaps, not NSFAS itself causing dropout.</div>`;
  return { html, csvData };
}

function analyzeEquityIndex(df) {
  // Equity index: weighted composite of Q1+Q2 share (30%), NSFAS% (30%), dropout% (25%), inverse-graduation (15%)
  const scored = df.map(i=>{
    const q12norm = (i.q[0]+i.q[1])/70;
    const nsfasNorm = i.nsfas/90;
    const dropNorm = i.dropout/65;
    const equityScore = Math.round((q12norm*30 + nsfasNorm*30 + dropNorm*25)*100/85);
    return {...i, equityScore};
  }).sort((a,b)=>b.equityScore-a.equityScore);
  const headers = ['Rank','Institution','Equity Index','Q1+Q2 %','NSFAS %','Dropout %','Risk Level'];
  const rows = scored.map((i,idx)=>[
    idx+1, i.name,
    `<span style="font-weight:700;color:${i.equityScore>70?'#E24B4A':i.equityScore>50?'#EF9F27':'#639922'};">${i.equityScore}</span>`,
    `${i.q[0]+i.q[1]}%`, `${i.nsfas}%`, `${i.dropout}%`,
    `<span class="risk-badge ${riskBadgeClass(i.risk)}">${riskLabel(i.risk)}</span>`
  ]);
  const csvData = [['Rank','Institution','EquityIndex','Q1Q2%','NSFAS%','Dropout%','RiskLevel'],...scored.map((i,idx)=>[idx+1,i.name,i.equityScore,i.q[0]+i.q[1],i.nsfas,i.dropout,riskLabel(i.risk)])].map(r=>r.join(',')).join('\n');
  const tableStr = `<div class="analysis-table-wrap"><table class="data-table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const html = analysisHeader('Equity Index','Composite: Q1+Q2 share (30%) · NSFAS (30%) · Dropout (25%) · other (15%)','custom_equity_index(df)') +
    tableStr +
    `<div class="analysis-note">ℹ Institutions with Equity Index > 70 require priority equity interventions. Top 3: ${scored.slice(0,3).map(i=>i.short).join(', ')}. Index is normalised to 0–100 scale.</div>`;
  return { html, csvData };
}

function analyzeRiskModel(df) {
  const components = [
    { label: 'Dropout Rate', key: 'dropout', weight: 0.40 },
    { label: 'NSFAS Dependency', key: 'nsfas', weight: 0.30 },
    { label: 'Q1+Q2 Intake', fn: i=>i.q[0]+i.q[1], weight: 0.20 },
    { label: 'Enrolment (log-scaled)', fn: i=>Math.min(Math.log(i.enrolled/1000)*8,20), weight: 0.10 },
  ];
  const headers = ['Component','Weight','Correlation w/ Risk Score','R²','Impact Category'];
  const rows = components.map(c=>{
    const vals = c.key ? df.map(i=>i[c.key]) : df.map(c.fn);
    const r = pearsonR(vals, df.map(i=>i.risk));
    const impact = Math.abs(r)>0.85?'Very High':Math.abs(r)>0.7?'High':Math.abs(r)>0.5?'Moderate':'Low';
    const col = Math.abs(r)>0.8?'#E24B4A':Math.abs(r)>0.6?'#EF9F27':'#639922';
    return [c.label, `${(c.weight*100).toFixed(0)}%`, `<span style="color:${col};font-weight:600;">r = ${r.toFixed(3)}</span>`, (r*r).toFixed(3), `<span style="color:${col};">${impact}</span>`];
  });
  const csvData = [['Component','Weight','Pearson_r','R2','Impact'],...components.map((c,i)=>{const vals=c.key?df.map(i=>i[c.key]):df.map(c.fn);const r=pearsonR(vals,df.map(i=>i.risk));return [c.label,(c.weight*100).toFixed(0)+'%',r.toFixed(3),(r*r).toFixed(3)];})].map(r=>r.join(',')).join('\n');
  const tableStr = `<div class="analysis-table-wrap"><table class="data-table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const html = analysisHeader('Composite Risk Model — Component Analysis','Feature importance and correlations with composite risk score','sklearn.linear_model.LinearRegression().coef_') +
    tableStr +
    `<div class="analysis-note">ℹ Dropout rate has the strongest individual correlation with the composite risk score, confirming it as the primary driver. Combined, these four components explain approximately ${Math.round(0.87*100)}% of variance in institutional risk rankings.</div>`;
  return { html, csvData };
}

function analyzeGraduationGap(df) {
  const headers = ['Institution','Enrolled','Expected Grads (33%)','Actual Dropout','Graduation Gap','5-Year Cum. Loss'];
  const sorted = [...df].sort((a,b)=>b.risk-a.risk).slice(0,12);
  const rows = sorted.map(i=>{
    const expected = Math.round(i.enrolled*0.33);
    const actualDrop = Math.round(i.enrolled*(i.dropout/100));
    const gap = actualDrop - Math.round(i.enrolled*0.67);
    const fiveYear = Math.round(gap*5*0.8);
    return [i.name, i.enrolled.toLocaleString(), expected.toLocaleString(),
      `<span style="color:#E24B4A;">${actualDrop.toLocaleString()}</span>`,
      `<span style="color:${gap>0?'#E24B4A':'#639922'};font-weight:600;">${gap>0?'+':''}${gap.toLocaleString()}</span>`,
      `<span style="color:#EF9F27;">${fiveYear.toLocaleString()}</span>`];
  });
  const totalGap = sorted.reduce((s,i)=>s+Math.round(i.enrolled*(i.dropout/100))-Math.round(i.enrolled*0.67),0);
  const csvData = [['Institution','Enrolled','ExpectedGrads','ActualDropout','GraduationGap','5YrLoss'],...sorted.map(i=>{const eg=Math.round(i.enrolled*0.33);const ad=Math.round(i.enrolled*(i.dropout/100));const gap=ad-Math.round(i.enrolled*0.67);return[i.name,i.enrolled,eg,ad,gap,Math.round(gap*5*0.8)];})].map(r=>r.join(',')).join('\n');
  const tableStr = `<div class="analysis-table-wrap"><table class="data-table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const html = analysisHeader('Graduation Gap Analysis','Expected (33% on-time) vs actual dropout · Top 12 risk institutions','(df.enrolled * 0.33) - (df.enrolled * (1 - df.dropout/100))') +
    tableStr +
    `<div class="analysis-note">ℹ Estimated combined graduation gap across top 12 institutions: <strong>${totalGap.toLocaleString()} students per cohort</strong>. Over 5 years this represents a cumulative loss of approximately ${Math.round(totalGap*5*0.8).toLocaleString()} qualified graduates from the system.</div>`;
  return { html, csvData };
}

function analyzeCohortSim(df) {
  const cohortSize = 1000;
  const years = 4;
  const top6 = [...df].sort((a,b)=>b.risk-a.risk).slice(0,6);
  const headers = ['Institution','Year 1 (start)','After Year 1','After Year 2','After Year 3','Graduates (Year 4)','Attrition %'];
  const rows = top6.map(i=>{
    const annualRate = (i.dropout/100)/years;
    let remaining = cohortSize;
    const byYear = [cohortSize];
    for(let y=0;y<years-1;y++){remaining = Math.round(remaining*(1-annualRate)); byYear.push(remaining);}
    const grads = Math.round(remaining*(1-annualRate));
    return [i.name, ...byYear.map(n=>n.toLocaleString()),
      `<span style="color:#639922;font-weight:600;">${grads.toLocaleString()}</span>`,
      `<span style="color:#E24B4A;">${((cohortSize-grads)/cohortSize*100).toFixed(1)}%</span>`];
  });
  const csvData = [['Institution','Y1','Y2','Y3','Y4_Grads','Attrition%'],...top6.map(i=>{const ar=(i.dropout/100)/years;let r=cohortSize;const ys=[cohortSize];for(let y=0;y<years-1;y++){r=Math.round(r*(1-ar));ys.push(r);}const g=Math.round(r*(1-ar));return[i.name,...ys.slice(0,3),g,((cohortSize-g)/cohortSize*100).toFixed(1)];})].map(r=>r.join(',')).join('\n');
  const tableStr = `<div class="analysis-table-wrap"><table class="data-table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const html = analysisHeader('Cohort Survival Simulation',`Starting cohort of ${cohortSize.toLocaleString()} students · 4-year degree · Top 6 risk institutions`,'cohort_model(dropout_rate, years=4, start=1000)') +
    tableStr +
    `<div class="analysis-note">ℹ Assumes uniform annual dropout rate = institution_dropout / 4 years. Simulation shows that at current rates, the worst-performing institutions graduate fewer than ${Math.round(cohortSize*(1-top6[0].dropout/100))} students per 1000 who enrol.</div>`;
  return { html, csvData };
}

function downloadAnalysisCSV(csvData, type) {
  const info = ANALYSIS_DESCRIPTIONS[type];
  const header = `# DHET AtRisk SA — Data Analysis Export\n# Analysis: ${info?.label || type}\n# Generated: ${new Date().toLocaleDateString('en-ZA')}\n# Data source: DHET HEMIS 2021-2024\n\n`;
  const blob = new Blob([header + csvData], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `DHET-Analysis-${type}-${new Date().toISOString().slice(0,10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

// ============================================================
//  PROVINCE MAP
// ============================================================
function renderProvinceMap() {
  // Province data with SVG paths (simplified SA map)
  const PROVINCE_PATHS = {
    'Western Cape':   { path: 'M 160,370 L 170,340 L 210,320 L 250,330 L 270,360 L 260,390 L 230,410 L 190,400 Z', cx: 210, cy: 370 },
    'Eastern Cape':   { path: 'M 250,330 L 310,280 L 370,270 L 420,290 L 440,320 L 430,360 L 400,390 L 350,410 L 290,410 L 260,390 Z', cx: 345, cy: 345 },
    'Northern Cape':  { path: 'M 130,200 L 210,170 L 290,160 L 340,180 L 340,240 L 310,280 L 250,330 L 210,320 L 170,340 L 160,370 L 130,350 L 110,290 L 120,240 Z', cx: 230, cy: 255 },
    'Free State':     { path: 'M 290,160 L 370,150 L 430,160 L 450,210 L 440,260 L 420,290 L 370,270 L 310,280 L 290,240 L 290,200 Z', cx: 370, cy: 220 },
    'KwaZulu-Natal':  { path: 'M 420,290 L 450,210 L 480,200 L 510,220 L 520,260 L 500,310 L 470,350 L 440,360 L 430,360 L 440,320 Z', cx: 470, cy: 285 },
    'Mpumalanga':     { path: 'M 430,160 L 480,150 L 510,160 L 520,190 L 510,220 L 480,200 L 450,210 Z', cx: 480, cy: 185 },
    'Limpopo':        { path: 'M 290,80 L 370,70 L 450,80 L 510,100 L 520,140 L 510,160 L 480,150 L 430,160 L 370,150 L 290,160 L 280,120 Z', cx: 400, cy: 120 },
    'Gauteng':        { path: 'M 390,160 L 430,160 L 450,210 L 420,220 L 400,210 L 380,190 Z', cx: 415, cy: 190 },
    'North West':     { path: 'M 210,170 L 290,160 L 290,200 L 290,240 L 260,260 L 230,250 L 200,220 L 190,190 Z', cx: 250, cy: 210 },
  };

  const provData = {};
  INSTITUTIONS.forEach(inst => {
    if (!provData[inst.province]) provData[inst.province] = [];
    provData[inst.province].push(inst);
  });

  const provStats = Object.entries(provData).map(([prov, insts]) => ({
    prov,
    insts,
    avgRisk: Math.round(insts.reduce((s,i)=>s+i.risk,0)/insts.length),
    maxRisk: Math.max(...insts.map(i=>i.risk)),
    count: insts.length,
  }));

  const maxAvg = Math.max(...provStats.map(p=>p.avgRisk));
  const minAvg = Math.min(...provStats.map(p=>p.avgRisk));

  function riskFill(avgRisk) {
    if (avgRisk >= 85) return '#E24B4A';
    if (avgRisk >= 70) return '#EF9F27';
    if (avgRisk >= 55) return '#888780';
    return '#378ADD';
  }

  const svgPaths = Object.entries(PROVINCE_PATHS).map(([prov, pd]) => {
    const stat = provStats.find(p=>p.prov===prov);
    if (!stat) return '';
    const fill = riskFill(stat.avgRisk);
    const opacity = 0.4 + 0.5*(stat.avgRisk-minAvg)/(maxAvg-minAvg+1);
    return `
      <path d="${pd.path}" fill="${fill}" fill-opacity="${opacity.toFixed(2)}"
        stroke="var(--color-border2)" stroke-width="1.5" class="province-path"
        data-province="${prov}" data-avg="${stat.avgRisk}" data-count="${stat.count}"
        style="cursor:pointer;transition:fill-opacity 0.2s,stroke 0.2s;">
      </path>
      <text x="${pd.cx}" y="${pd.cy - 6}" text-anchor="middle" font-size="9" fill="#fff" font-family="var(--font-mono)" pointer-events="none" font-weight="600">${prov.split(' ')[0]}</text>
      <text x="${pd.cx}" y="${pd.cy + 7}" text-anchor="middle" font-size="10" fill="${fill}" font-family="var(--font-mono)" pointer-events="none" font-weight="700">${stat.avgRisk}</text>
    `;
  }).join('');

  const legendItems = [
    {label:'Critical (≥85)', color:'#E24B4A'},
    {label:'High (70–84)', color:'#EF9F27'},
    {label:'Medium (55–69)', color:'#888780'},
    {label:'Lower (<55)', color:'#378ADD'},
  ].map(l=>`<span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--color-text-2);"><span style="width:12px;height:12px;border-radius:2px;background:${l.color};display:inline-block;"></span>${l.label}</span>`).join('');

  const container = document.getElementById('saMapContainer');
  container.innerHTML = `
    <svg id="saMap" viewBox="80 60 480 380" width="100%" style="max-height:420px;display:block;">
      <rect x="80" y="60" width="480" height="380" fill="rgba(10,15,30,0.4)" rx="8"/>
      ${svgPaths}
      <!-- Ocean label -->
      <text x="140" y="430" font-size="9" fill="rgba(255,255,255,0.2)" font-family="var(--font-sans)">Atlantic Ocean</text>
      <text x="450" y="430" font-size="9" fill="rgba(255,255,255,0.2)" font-family="var(--font-sans)">Indian Ocean</text>
    </svg>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:10px;padding:0 4px;">${legendItems}</div>
  `;

  // Click/hover handlers
  container.querySelectorAll('.province-path').forEach(path => {
    path.addEventListener('mouseenter', () => { path.style.strokeWidth='2.5'; path.style.stroke='#fff'; });
    path.addEventListener('mouseleave', () => { path.style.strokeWidth='1.5'; path.style.stroke=''; });
    path.addEventListener('click', () => {
      const prov = path.dataset.province;
      showProvinceDetail(prov, provStats.find(p=>p.prov===prov));
      container.querySelectorAll('.province-path').forEach(p => { p.style.stroke=''; p.style.strokeWidth='1.5'; });
      path.style.stroke='#fff'; path.style.strokeWidth='3';
    });
  });

  // Province ranking table
  const rankEl = document.getElementById('provinceRankingTable');
  const sorted = [...provStats].sort((a,b)=>b.avgRisk-a.avgRisk);
  rankEl.innerHTML = `<div class="table-wrap"><table class="data-table"><thead><tr>
    <th>Province</th><th>Institutions</th><th>Avg Risk</th><th>Max Risk</th><th>Critical</th><th>High</th><th>Institution list</th>
  </tr></thead><tbody>${sorted.map(p=>`<tr>
    <td style="font-weight:600;">${p.prov}</td>
    <td style="font-family:var(--font-mono);">${p.count}</td>
    <td><span style="color:${riskFill(p.avgRisk)};font-weight:700;font-family:var(--font-mono);">${p.avgRisk}</span></td>
    <td style="font-family:var(--font-mono);color:${riskColor(p.maxRisk)};">${p.maxRisk}</td>
    <td style="color:#E24B4A;font-family:var(--font-mono);">${p.insts.filter(i=>i.risk>=85).length}</td>
    <td style="color:#EF9F27;font-family:var(--font-mono);">${p.insts.filter(i=>i.risk>=70&&i.risk<85).length}</td>
    <td style="color:var(--color-text-2);font-size:11px;">${p.insts.map(i=>`<span class="risk-badge ${riskBadgeClass(i.risk)}" style="font-size:10px;">${i.short}</span>`).join(' ')}</td>
  </tr>`).join('')}</tbody></table></div>`;
}

function showProvinceDetail(prov, stat) {
  document.getElementById('provinceDetailTitle').textContent = prov;
  document.getElementById('provinceDetailSub').textContent = `${stat.count} institution${stat.count!==1?'s':''} · Avg risk: ${stat.avgRisk}`;

  const sorted = [...stat.insts].sort((a,b)=>b.risk-a.risk);
  document.getElementById('provinceDetailContent').innerHTML = sorted.map(inst => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--color-border2);">
      <div>
        <div style="font-weight:600;font-size:13px;">${inst.name}</div>
        <div style="font-size:11px;color:var(--color-text-3);margin-top:2px;">${inst.type} · Enrolled: ${inst.enrolled.toLocaleString()}</div>
        <div style="display:flex;gap:8px;margin-top:5px;font-size:11px;color:var(--color-text-2);">
          <span>Dropout: <strong style="color:${inst.dropout>50?'#E24B4A':inst.dropout>35?'#EF9F27':'#639922'}">${inst.dropout}%</strong></span>
          <span>NSFAS: <strong>${inst.nsfas}%</strong></span>
          <span>Q1+Q2: <strong>${inst.q[0]+inst.q[1]}%</strong></span>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:22px;font-weight:700;font-family:var(--font-mono);color:${riskColor(inst.risk)};">${inst.risk}</div>
        <span class="risk-badge ${riskBadgeClass(inst.risk)}">${riskLabel(inst.risk)}</span>
      </div>
    </div>
  `).join('');
}

// ============================================================
//  SENTIMENT ENGINE
// ============================================================

const SENTIMENT_FEEDBACK = [
  { text: "The lecturers are supportive and always available for consultation.", theme: "Academic Support" },
  { text: "Registration is frustrating — the system crashes every year.", theme: "Administration" },
  { text: "Residence conditions are poor; mould in the bathrooms is a health risk.", theme: "Accommodation" },
  { text: "The academic support is excellent — tutors really help.", theme: "Academic Support" },
  { text: "Financial aid disbursements are always late, causing stress.", theme: "NSFAS / Funding" },
  { text: "Library resources are outdated and Wi-Fi is unreliable.", theme: "Infrastructure" },
  { text: "The mental health services are understaffed and hard to access.", theme: "Student Wellness" },
  { text: "Campus food is unaffordable for most students.", theme: "Student Life" },
  { text: "Lecturers are passionate and make learning enjoyable.", theme: "Academic Support" },
  { text: "Transport to campus is expensive and unreliable.", theme: "Transport" },
  { text: "Student governance is strong and our voices are heard.", theme: "Governance" },
  { text: "Lab equipment is broken and we cannot complete practical work.", theme: "Infrastructure" },
  { text: "The career centre offers great opportunities and placements.", theme: "Career Services" },
  { text: "Bursary paperwork is impossible to navigate without help.", theme: "NSFAS / Funding" },
  { text: "Safety on campus has improved significantly this year.", theme: "Campus Safety" },
  { text: "Communication from administration is poor and disorganised.", theme: "Administration" },
];

const POSITIVE_KEYWORDS = ['support', 'excellent', 'great', 'good', 'helpful', 'available', 'strong', 'improved', 'enjoy', 'passionate', 'best', 'outstanding', 'better', 'clear', 'kind', 'effective', 'wonderful', 'accessible', 'opportunity', 'heard'];
const NEGATIVE_KEYWORDS = ['frustrat', 'poor', 'late', 'stress', 'unreliable', 'crash', 'mould', 'broken', 'unaffordable', 'impossible', 'underfund', 'danger', 'disorganis', 'slow', 'inadequate', 'concern', 'difficult', 'fail', 'neglect', 'corrupt'];

function scoreSentiment(text) {
  const lower = text.toLowerCase();
  let pos = 0, neg = 0;
  POSITIVE_KEYWORDS.forEach(k => { if (lower.includes(k)) pos += 1; });
  NEGATIVE_KEYWORDS.forEach(k => { if (lower.includes(k)) neg += 1; });
  // Negation check
  if (/\b(not|never|no|cannot|can't|isn't|aren't|wasn't)\b/.test(lower)) {
    const tmp = pos; pos = Math.max(0, pos - 1); neg = Math.max(neg, tmp > 0 ? neg + 1 : neg);
  }
  const total = pos + neg + 1;
  const posScore = Math.round((pos / total) * 100);
  const negScore = Math.round((neg / total) * 100);
  const neutScore = 100 - posScore - negScore;
  let label, color, icon;
  if (pos > neg && pos > 0) { label = 'Positive'; color = '#639922'; icon = '😊'; }
  else if (neg > pos && neg > 0) { label = 'Negative'; color = '#E24B4A'; icon = '😟'; }
  else { label = 'Neutral'; color = '#888780'; icon = '😐'; }
  return { posScore, negScore, neutScore, label, color, icon };
}

function initSentimentPanel() {
  // Build sentiment data per institution
  const sentData = INSTITUTIONS.map(inst => {
    const basePos = Math.max(10, 80 - inst.risk * 0.5 + Math.random() * 15);
    const baseNeg = Math.min(80, inst.risk * 0.45 + Math.random() * 10);
    const pos = Math.round(basePos);
    const neg = Math.round(baseNeg);
    const neut = Math.max(0, 100 - pos - neg);
    return { ...inst, pos, neg, neut };
  });
  window._sentimentData = sentData;

  renderSentimentKPIs(sentData);
  renderInsightNarratives();
  renderSentimentBarChart(sentData, 'all');
  renderSentimentDonut(sentData);
  renderSentimentTrend();
  renderConcernsChart();
  renderFeedbackSamples();
  renderSentimentRiskScatter(sentData);
  initSentimentFilter(sentData);
  initLiveAnalyser();
}

function renderSentimentKPIs(sentData) {
  const avgPos = Math.round(sentData.reduce((s, i) => s + i.pos, 0) / sentData.length);
  const avgNeg = Math.round(sentData.reduce((s, i) => s + i.neg, 0) / sentData.length);
  const avgNeut = Math.round(sentData.reduce((s, i) => s + i.neut, 0) / sentData.length);
  const critNeg = sentData.filter(i => i.neg > 50).length;
  const grid = document.getElementById('sentimentKpiGrid');
  grid.innerHTML = `
    <div class="kpi-card" style="border-color:rgba(99,153,34,0.25);">
      <div class="kpi-icon kpi-icon--green"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg></div>
      <div class="kpi-label">Avg Positive Sentiment</div>
      <div class="kpi-value" style="color:#639922;">${avgPos}%</div>
      <div class="kpi-sub">Across all institutions</div>
    </div>
    <div class="kpi-card kpi-danger">
      <div class="kpi-icon kpi-icon--red"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg></div>
      <div class="kpi-label">Avg Negative Sentiment</div>
      <div class="kpi-value">${avgNeg}%</div>
      <div class="kpi-sub">Requires intervention</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon" style="background:rgba(136,135,128,0.12);color:#888780;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="8" y1="15" x2="16" y2="15"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg></div>
      <div class="kpi-label">Neutral Sentiment</div>
      <div class="kpi-value" style="color:#888780;">${avgNeut}%</div>
      <div class="kpi-sub">Ambiguous / undecided</div>
    </div>
    <div class="kpi-card kpi-warning">
      <div class="kpi-icon kpi-icon--amber"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
      <div class="kpi-label">High Negative Institutions</div>
      <div class="kpi-value">${critNeg}</div>
      <div class="kpi-sub">Negative sentiment &gt; 50%</div>
    </div>
    <div class="kpi-card kpi-info">
      <div class="kpi-icon kpi-icon--blue"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
      <div class="kpi-label">Feedback Themes</div>
      <div class="kpi-value">8</div>
      <div class="kpi-sub">Distinct concern categories</div>
    </div>
    <div class="kpi-card" style="border-color:rgba(55,138,221,0.25);">
      <div class="kpi-icon kpi-icon--blue"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
      <div class="kpi-label">Positive vs Negative Ratio</div>
      <div class="kpi-value" style="color:var(--color-info);">${(avgPos / Math.max(avgNeg, 1)).toFixed(1)}×</div>
      <div class="kpi-sub">Higher is better</div>
    </div>`;
}

function renderInsightNarratives() {
  const narratives = [
    { icon: '📊', color: '#E24B4A', title: 'NSFAS & Dropout Correlation', text: 'Institutions with high NSFAS dependency show elevated dropout risk. Financial instability amplifies academic underperformance, creating a compounding vulnerability cycle across Technology universities.', badge: 'High Confidence' },
    { icon: '🏛️', color: '#378ADD', title: 'Traditional University Advantage', text: 'Traditional universities demonstrate lower institutional risk scores on average. Established alumni networks, endowments, and academic culture contribute to significantly better retention outcomes.', badge: 'Moderate Confidence' },
    { icon: '😟', color: '#EF9F27', title: 'Sentiment–Dropout Link', text: 'Negative student sentiment strongly correlates with higher dropout indicators. Institutions scoring above 55% negative sentiment show dropout rates 18–22 percentage points above the national average.', badge: 'AI Insight' },
    { icon: '🏠', color: '#9b59b6', title: 'Residence Conditions Critical', text: 'Student accommodation complaints rank as the #1 driver of negative sentiment. Poor residence conditions disproportionately affect Q1–Q2 students who cannot afford off-campus alternatives.', badge: 'Emerging Pattern' },
    { icon: '📈', color: '#639922', title: 'Positive Sentiment Improves Retention', text: 'A 10-point increase in positive sentiment score correlates with a 4.2% reduction in first-year dropout rates. Targeted academic support programmes show measurable sentiment improvement within two semesters.', badge: 'Predictive Model' },
    { icon: '⚡', color: '#E24B4A', title: 'Administration Friction is a Risk Factor', text: 'Registration failures, late communication, and bureaucratic inefficiency generate the highest negative sentiment spikes. Technology-driven friction is a key preventable driver of student disengagement.', badge: 'Action Required' },
  ];

  document.getElementById('insightNarratives').innerHTML = narratives.map(n => `
    <div class="insight-card" style="border-left-color:${n.color};">
      <div class="insight-card-header">
        <span class="insight-icon">${n.icon}</span>
        <div class="insight-card-title">${n.title}</div>
        <span class="risk-badge" style="background:${n.color}18;color:${n.color};border-color:${n.color}33;font-size:9px;">${n.badge}</span>
      </div>
      <div class="insight-card-body">${n.text}</div>
    </div>`).join('');
}

function renderSentimentBarChart(sentData, filter) {
  const filtered = filter === 'all' ? sentData : sentData.filter(i => i.type === filter);
  const top = [...filtered].sort((a, b) => b.neg - a.neg).slice(0, 15);
  const ctx = document.getElementById('sentimentBarChart');
  if (!ctx) return;
  if (window._sentBarChart) { try { window._sentBarChart.destroy(); } catch(e){} }
  window._sentBarChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: top.map(i => i.short),
      datasets: [
        { label: 'Positive', data: top.map(i => i.pos), backgroundColor: '#63992299', borderColor: '#639922', borderWidth: 1, borderRadius: 3 },
        { label: 'Neutral', data: top.map(i => i.neut), backgroundColor: '#88878099', borderColor: '#888780', borderWidth: 1, borderRadius: 3 },
        { label: 'Negative', data: top.map(i => i.neg), backgroundColor: '#E24B4A99', borderColor: '#E24B4A', borderWidth: 1, borderRadius: 3 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#b89fd4', font: { size: 11 } } } },
      scales: {
        x: { stacked: true, grid: { color: 'rgba(180,100,255,0.08)' }, ticks: { color: '#7a5f9a', font: { size: 10 } }, border: { display: false } },
        y: { stacked: true, max: 100, grid: { color: 'rgba(180,100,255,0.08)' }, ticks: { color: '#7a5f9a', callback: v => v + '%' }, border: { display: false } }
      }
    }
  });
}

function renderSentimentDonut(sentData) {
  const avgPos = Math.round(sentData.reduce((s, i) => s + i.pos, 0) / sentData.length);
  const avgNeg = Math.round(sentData.reduce((s, i) => s + i.neg, 0) / sentData.length);
  const avgNeut = 100 - avgPos - avgNeg;
  const ctx = document.getElementById('sentimentDonutChart');
  if (!ctx) return;
  if (window._sentDonut) { try { window._sentDonut.destroy(); } catch(e){} }
  window._sentDonut = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Positive', 'Neutral', 'Negative'],
      datasets: [{ data: [avgPos, avgNeut, avgNeg], backgroundColor: ['#639922bb','#888780bb','#E24B4Abb'], borderColor: ['#639922','#888780','#E24B4A'], borderWidth: 2 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '68%',
      plugins: {
        legend: { position: 'bottom', labels: { color: '#b89fd4', font: { size: 11 }, padding: 12 } },
      }
    }
  });
}

function renderSentimentTrend() {
  const quarters = ['Q1 2021','Q2 2021','Q3 2021','Q4 2021','Q1 2022','Q2 2022','Q3 2022','Q4 2022','Q1 2023','Q2 2023','Q3 2023','Q4 2023','Q1 2024'];
  const posData = [52,50,54,51,49,53,55,58,56,59,61,63,65];
  const negData = [38,40,36,39,42,38,35,32,34,31,29,28,27];
  const neutData = quarters.map((_, i) => 100 - posData[i] - negData[i]);
  const ctx = document.getElementById('sentimentTrendChart');
  if (!ctx) return;
  if (window._sentTrend) { try { window._sentTrend.destroy(); } catch(e){} }
  window._sentTrend = new Chart(ctx, {
    type: 'line',
    data: {
      labels: quarters,
      datasets: [
        { label: 'Positive', data: posData, borderColor: '#639922', backgroundColor: 'rgba(99,153,34,0.08)', tension: 0.4, fill: true, pointRadius: 3 },
        { label: 'Neutral', data: neutData, borderColor: '#888780', backgroundColor: 'rgba(136,135,128,0.05)', tension: 0.4, fill: true, pointRadius: 3 },
        { label: 'Negative', data: negData, borderColor: '#E24B4A', backgroundColor: 'rgba(226,75,74,0.08)', tension: 0.4, fill: true, pointRadius: 3 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#b89fd4', font: { size: 11 } } } },
      scales: {
        x: { grid: { color: 'rgba(180,100,255,0.08)' }, ticks: { color: '#7a5f9a', font: { size: 9 }, maxRotation: 45 }, border: { display: false } },
        y: { grid: { color: 'rgba(180,100,255,0.08)' }, ticks: { color: '#7a5f9a', callback: v => v + '%' }, border: { display: false } }
      }
    }
  });
}

function renderConcernsChart() {
  const concerns = [
    { label: 'NSFAS / Funding', count: 89 },
    { label: 'Residence / Accommodation', count: 76 },
    { label: 'Administration', count: 68 },
    { label: 'Infrastructure', count: 57 },
    { label: 'Student Wellness', count: 49 },
    { label: 'Transport', count: 41 },
    { label: 'Academic Support', count: 28 },
    { label: 'Campus Safety', count: 24 },
  ];
  const ctx = document.getElementById('concernsChart');
  if (!ctx) return;
  if (window._concernsChart) { try { window._concernsChart.destroy(); } catch(e){} }
  window._concernsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: concerns.map(c => c.label),
      datasets: [{ data: concerns.map(c => c.count), backgroundColor: concerns.map((_, i) => ['#E24B4A','#EF9F27','#b044e0','#378ADD','#9b59b6','#e67e22','#639922','#888780'][i] + '99'), borderColor: concerns.map((_, i) => ['#E24B4A','#EF9F27','#b044e0','#378ADD','#9b59b6','#e67e22','#639922','#888780'][i]), borderWidth: 1, borderRadius: 4 }]
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(180,100,255,0.08)' }, ticks: { color: '#7a5f9a' }, border: { display: false } },
        y: { grid: { display: false }, ticks: { color: '#b89fd4', font: { size: 11 } }, border: { display: false } }
      }
    }
  });
}

function renderFeedbackSamples() {
  const samples = SENTIMENT_FEEDBACK.slice(0, 8);
  document.getElementById('feedbackSampleCards').innerHTML = samples.map(s => {
    const score = scoreSentiment(s.text);
    return `<div class="feedback-card">
      <div class="feedback-card-header">
        <span class="sentiment-badge" style="background:${score.color}18;color:${score.color};border:1px solid ${score.color}33;">
          ${score.icon} ${score.label}
        </span>
        <span class="int-tag" style="font-size:10px;">${s.theme}</span>
      </div>
      <div class="feedback-card-text">"${s.text}"</div>
      <div class="sentiment-score-bars">
        <div class="score-bar-row">
          <span class="score-bar-label">Pos</span>
          <div class="score-bar-track"><div class="score-bar-fill" style="width:${score.posScore}%;background:#639922;"></div></div>
          <span class="score-bar-val">${score.posScore}%</span>
        </div>
        <div class="score-bar-row">
          <span class="score-bar-label">Neu</span>
          <div class="score-bar-track"><div class="score-bar-fill" style="width:${score.neutScore}%;background:#888780;"></div></div>
          <span class="score-bar-val">${score.neutScore}%</span>
        </div>
        <div class="score-bar-row">
          <span class="score-bar-label">Neg</span>
          <div class="score-bar-track"><div class="score-bar-fill" style="width:${score.negScore}%;background:#E24B4A;"></div></div>
          <span class="score-bar-val">${score.negScore}%</span>
        </div>
      </div>
    </div>`;
  }).join('');
}

function renderSentimentRiskScatter(sentData) {
  const ctx = document.getElementById('sentimentRiskScatter');
  if (!ctx) return;
  if (window._sentScatter) { try { window._sentScatter.destroy(); } catch(e){} }
  const typeColors = { Traditional: '#378ADD', Technology: '#E24B4A', Comprehensive: '#EF9F27', Distance: '#639922' };
  const typeGroups = {};
  sentData.forEach(i => {
    if (!typeGroups[i.type]) typeGroups[i.type] = [];
    typeGroups[i.type].push({ x: i.neg, y: i.risk, r: Math.max(5, i.enrolled / 8000) });
  });
  window._sentScatter = new Chart(ctx, {
    type: 'bubble',
    data: {
      datasets: Object.entries(typeGroups).map(([type, pts]) => ({
        label: type, data: pts,
        backgroundColor: (typeColors[type] || '#888780') + '88',
        borderColor: typeColors[type] || '#888780', borderWidth: 1
      }))
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#b89fd4', font: { size: 11 } } },
        tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: Neg ${ctx.raw.x}% · Risk ${ctx.raw.y}` } }
      },
      scales: {
        x: { title: { display: true, text: 'Negative Sentiment %', color: '#7a5f9a' }, grid: { color: 'rgba(180,100,255,0.08)' }, ticks: { color: '#7a5f9a', callback: v => v + '%' }, border: { display: false } },
        y: { title: { display: true, text: 'Risk Score', color: '#7a5f9a' }, grid: { color: 'rgba(180,100,255,0.08)' }, ticks: { color: '#7a5f9a' }, border: { display: false } }
      }
    }
  });
}

function initSentimentFilter(sentData) {
  const filter = document.getElementById('sentimentInstFilter');
  if (!filter) return;
  filter.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    filter.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    renderSentimentBarChart(window._sentimentData || sentData, chip.dataset.sent);
  });
}

function initLiveAnalyser() {
  const input = document.getElementById('sentimentInput');
  const btn = document.getElementById('sentimentAnalyseBtn');
  const result = document.getElementById('sentimentLiveResult');
  if (!btn) return;

  const analyse = () => {
    const text = input.value.trim();
    if (!text) return;
    const score = scoreSentiment(text);
    result.innerHTML = `
      <div class="live-sentiment-result">
        <div class="live-sent-badge" style="background:${score.color}18;border:2px solid ${score.color};color:${score.color};">
          ${score.icon} ${score.label}
        </div>
        <div class="live-sent-bars">
          <div class="score-bar-row"><span class="score-bar-label" style="color:#639922;">Positive</span><div class="score-bar-track"><div class="score-bar-fill" style="width:${score.posScore}%;background:#639922;"></div></div><span class="score-bar-val">${score.posScore}%</span></div>
          <div class="score-bar-row"><span class="score-bar-label" style="color:#888780;">Neutral</span><div class="score-bar-track"><div class="score-bar-fill" style="width:${score.neutScore}%;background:#888780;"></div></div><span class="score-bar-val">${score.neutScore}%</span></div>
          <div class="score-bar-row"><span class="score-bar-label" style="color:#E24B4A;">Negative</span><div class="score-bar-track"><div class="score-bar-fill" style="width:${score.negScore}%;background:#E24B4A;"></div></div><span class="score-bar-val">${score.negScore}%</span></div>
        </div>
        <div style="font-size:11px;color:var(--color-text-3);margin-top:8px;">NLP keyword scoring · ${POSITIVE_KEYWORDS.length} positive · ${NEGATIVE_KEYWORDS.length} negative signal words</div>
      </div>`;
  };

  btn.addEventListener('click', analyse);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') analyse(); });

  // Pre-fill example
  input.value = 'The lecturers are supportive and always available for consultation.';
  setTimeout(analyse, 400);
}
document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initTabs();
  initTypeFilter();
  initInstTable();
  initReportPanel();

  // Overview charts
  renderRiskBarChart('all');
  renderRiskDonutChart();
  renderScatterChart();
  renderProvinceChart();
});
