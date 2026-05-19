// ============================================================
//  charts.js — SA Students at Risk Dashboard
//  All Chart.js chart rendering functions
// ============================================================

// Track instances so we can destroy before re-render
const chartInstances = {};

function destroyChart(id) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
    delete chartInstances[id];
  }
}

// ---- Chart defaults ----
Chart.defaults.color = '#b89fd4';
Chart.defaults.font.family = "'Segoe UI', system-ui, -apple-system, sans-serif";
Chart.defaults.font.size = 11;

const GRID_COLOR  = 'rgba(180,100,255,0.1)';
const TICK_COLOR  = '#7a5f9a';

// ============================================================
//  1. RISK BAR CHART (horizontal, top institutions by risk)
// ============================================================
function renderRiskBarChart(filterType = 'all') {
  destroyChart('riskBarChart');

  let data = INSTITUTIONS.filter(i => i.type !== 'Distance');
  if (filterType !== 'all') {
    data = data.filter(i => i.type === filterType);
  }
  data = data.sort((a, b) => b.risk - a.risk).slice(0, 14);

  const ctx = document.getElementById('riskBarChart');
  if (!ctx) return;

  chartInstances['riskBarChart'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.short),
      datasets: [{
        label: 'Risk score',
        data: data.map(d => d.risk),
        backgroundColor: data.map(d => riskColor(d.risk) + 'cc'),
        borderColor: data.map(d => riskColor(d.risk)),
        borderWidth: 1,
        borderRadius: 4,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` Risk score: ${ctx.raw} — ${riskLabel(ctx.raw)}`,
          }
        }
      },
      scales: {
        x: {
          grid: { color: GRID_COLOR },
          ticks: { color: TICK_COLOR, stepSize: 20 },
          max: 100,
          border: { display: false },
        },
        y: {
          grid: { display: false },
          ticks: { color: '#9aa3b8', font: { size: 11 } },
          border: { display: false },
        }
      }
    }
  });
}

// ============================================================
//  2. RISK DONUT CHART
// ============================================================
function renderRiskDonutChart() {
  destroyChart('riskDonutChart');

  const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  INSTITUTIONS.forEach(i => { counts[riskLabel(i.risk)]++; });

  const ctx = document.getElementById('riskDonutChart');
  if (!ctx) return;

  chartInstances['riskDonutChart'] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(counts),
      datasets: [{
        data: Object.values(counts),
        backgroundColor: ['#E24B4Acc','#EF9F27cc','#888780cc','#639922cc'],
        borderColor: ['#E24B4A','#EF9F27','#888780','#639922'],
        borderWidth: 1,
        hoverOffset: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.raw} institution${ctx.raw !== 1 ? 's' : ''}`
          }
        }
      },
      cutout: '62%',
    }
  });
}

// ============================================================
//  3. SCATTER — Dropout vs NSFAS
// ============================================================
function renderScatterChart() {
  destroyChart('scatterChart');

  const typeColors = { Traditional: '#4f8ef7', Technology: '#e040fb', Comprehensive: '#ff6b9d', Distance: '#7c4dff' };
  const types = ['Traditional', 'Technology', 'Comprehensive', 'Distance'];

  const datasets = types.map(t => ({
    label: t,
    data: INSTITUTIONS.filter(d => d.type === t).map(d => ({
      x: d.nsfas, y: d.dropout, r: Math.max(5, d.enrolled / 9000), label: d.short
    })),
    backgroundColor: typeColors[t] + '66',
    borderColor: typeColors[t],
    borderWidth: 1,
  }));

  const ctx = document.getElementById('scatterChart');
  if (!ctx) return;

  chartInstances['scatterChart'] = new Chart(ctx, {
    type: 'bubble',
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.raw.label}: ${ctx.raw.y}% dropout · ${ctx.raw.x}% NSFAS`
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'NSFAS dependency (%)', color: TICK_COLOR, font: { size: 11 } },
          grid: { color: GRID_COLOR },
          ticks: { color: TICK_COLOR },
          border: { display: false },
        },
        y: {
          title: { display: true, text: 'Dropout rate (%)', color: TICK_COLOR, font: { size: 11 } },
          grid: { color: GRID_COLOR },
          ticks: { color: TICK_COLOR },
          border: { display: false },
        }
      }
    }
  });
}

// ============================================================
//  4. PROVINCE BAR CHART
// ============================================================
function renderProvinceChart() {
  destroyChart('provinceChart');

  const data = provinceAverages();
  const ctx = document.getElementById('provinceChart');
  if (!ctx) return;

  chartInstances['provinceChart'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.province),
      datasets: [{
        label: 'Avg dropout rate',
        data: data.map(d => d.avg),
        backgroundColor: data.map(d =>
          d.avg >= 50 ? '#E24B4Acc' : d.avg >= 40 ? '#EF9F27cc' : '#378ADDcc'
        ),
        borderColor: data.map(d =>
          d.avg >= 50 ? '#E24B4A' : d.avg >= 40 ? '#EF9F27' : '#378ADD'
        ),
        borderWidth: 1,
        borderRadius: 4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: TICK_COLOR, maxRotation: 35, font: { size: 10 } },
          border: { display: false },
        },
        y: {
          grid: { color: GRID_COLOR },
          ticks: { color: TICK_COLOR, callback: v => v + '%' },
          border: { display: false },
        }
      }
    }
  });
}

// ============================================================
//  5. QUINTILE DONUT
// ============================================================
function renderQuintileDonut() {
  destroyChart('quintileDonut');

  const totals = [0, 0, 0, 0, 0];
  INSTITUTIONS.forEach(inst => {
    const sum = inst.q.reduce((a, b) => a + b, 0);
    inst.q.forEach((v, i) => totals[i] += (v / sum) * inst.enrolled);
  });
  const grand = totals.reduce((a, b) => a + b, 0);
  const pcts = totals.map(v => Math.round(v / grand * 100));

  const ctx = document.getElementById('quintileDonut');
  if (!ctx) return;

  chartInstances['quintileDonut'] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Q_LABELS,
      datasets: [{
        data: pcts,
        backgroundColor: Q_COLORS.map(c => c + 'cc'),
        borderColor: Q_COLORS,
        borderWidth: 1,
        hoverOffset: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.raw}%`
          }
        }
      },
      cutout: '60%',
    }
  });
}

// ============================================================
//  6. QUINTILE DROPOUT BAR
// ============================================================
function renderQuintileDropoutBar() {
  destroyChart('quintileDropoutBar');

  const ctx = document.getElementById('quintileDropoutBar');
  if (!ctx) return;

  // DHET-aligned dropout rates by school quintile of origin
  const dropByQ = [62, 56, 44, 30, 18];

  chartInstances['quintileDropoutBar'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Q1 (poorest)', 'Q2', 'Q3', 'Q4', 'Q5 (affluent)'],
      datasets: [{
        label: 'Dropout rate %',
        data: dropByQ,
        backgroundColor: Q_COLORS.map(c => c + 'cc'),
        borderColor: Q_COLORS,
        borderWidth: 1,
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: TICK_COLOR },
          border: { display: false },
        },
        y: {
          grid: { color: GRID_COLOR },
          ticks: { color: TICK_COLOR, callback: v => v + '%' },
          max: 80,
          border: { display: false },
        }
      }
    }
  });
}

// ============================================================
//  7. QUINTILE STACKED BAR (top 15 by Q1+Q2)
// ============================================================
function renderQuintileStackBar() {
  destroyChart('quintileStackBar');

  const sorted = [...INSTITUTIONS]
    .sort((a, b) => (b.q[0] + b.q[1]) - (a.q[0] + a.q[1]))
    .slice(0, 15);

  const ctx = document.getElementById('quintileStackBar');
  if (!ctx) return;

  const datasets = Q_LABELS.map((label, i) => ({
    label,
    data: sorted.map(inst => inst.q[i]),
    backgroundColor: Q_COLORS[i] + 'cc',
    borderColor: Q_COLORS[i],
    borderWidth: 0,
  }));

  chartInstances['quintileStackBar'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sorted.map(d => d.short),
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          stacked: true,
          grid: { display: false },
          ticks: { color: '#9aa3b8', font: { size: 11 } },
          border: { display: false },
        },
        y: {
          stacked: true,
          grid: { color: GRID_COLOR },
          ticks: { color: TICK_COLOR, callback: v => v + '%' },
          max: 100,
          border: { display: false },
        }
      }
    }
  });
}

// ============================================================
//  8. INTERVENTION URGENCY MATRIX (bubble)
// ============================================================
function renderMatrixChart() {
  destroyChart('matrixChart');

  const data = INSTITUTIONS
    .filter(i => i.type !== 'Distance')
    .sort((a, b) => b.risk - a.risk)
    .slice(0, 16);

  const ctx = document.getElementById('matrixChart');
  if (!ctx) return;

  chartInstances['matrixChart'] = new Chart(ctx, {
    type: 'bubble',
    data: {
      datasets: [{
        label: 'Institutions',
        data: data.map(d => ({
          x: d.q[0] + d.q[1],
          y: d.dropout,
          r: Math.max(6, d.risk / 7),
          label: d.short,
          risk: d.risk,
        })),
        backgroundColor: data.map(d => riskColor(d.risk) + '77'),
        borderColor: data.map(d => riskColor(d.risk)),
        borderWidth: 1,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.raw.label}: ${ctx.raw.y}% dropout · ${ctx.raw.x}% Q1+Q2 · Risk: ${ctx.raw.risk}`
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Q1+Q2 student intake (%)', color: TICK_COLOR, font: { size: 11 } },
          grid: { color: GRID_COLOR },
          ticks: { color: TICK_COLOR },
          border: { display: false },
        },
        y: {
          title: { display: true, text: 'Dropout rate (%)', color: TICK_COLOR, font: { size: 11 } },
          grid: { color: GRID_COLOR },
          ticks: { color: TICK_COLOR },
          border: { display: false },
        }
      }
    }
  });
}

// ============================================================
//  9. INTERVENTION TYPE HORIZONTAL BAR
// ============================================================
function renderInterventionTypeChart() {
  destroyChart('interventionTypeChart');

  const ctx = document.getElementById('interventionTypeChart');
  if (!ctx) return;

  const labels = [
    'Financial aid (NSFAS)',
    'Academic support',
    'Mental health / PSS',
    'Digital access',
    'Career guidance',
    'First-year retention',
    'Equity monitoring',
  ];
  const values = [22, 18, 16, 14, 12, 20, 8]; // institutions needing each intervention
  const colors = ['#E24B4A','#EF9F27','#378ADD','#888780','#639922','#E24B4A','#639922'];

  chartInstances['interventionTypeChart'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Institutions affected',
        data: values,
        backgroundColor: colors.map(c => c + 'cc'),
        borderColor: colors,
        borderWidth: 1,
        borderRadius: 4,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { color: GRID_COLOR },
          ticks: { color: TICK_COLOR },
          border: { display: false },
        },
        y: {
          grid: { display: false },
          ticks: { color: '#9aa3b8', font: { size: 11 } },
          border: { display: false },
        }
      }
    }
  });
}
