// ============================================================
//  data.js — SA Students at Risk Dashboard
//  Source: DHET HEMIS, CHE VitalStats 2021, HSRC, CHE 2023
// ============================================================

const INSTITUTIONS = [
  { name: "Walter Sisulu University",          short: "WSU",     type: "Comprehensive", province: "Eastern Cape",    enrolled: 27000,  dropout: 58, nsfas: 82, q: [38,28,18,10,6],  risk: 91 },
  { name: "University of Venda",               short: "UNIVEN",  type: "Traditional",   province: "Limpopo",         enrolled: 16000,  dropout: 55, nsfas: 87, q: [42,28,16,8,6],   risk: 90 },
  { name: "University of Limpopo",             short: "UL",      type: "Traditional",   province: "Limpopo",         enrolled: 18000,  dropout: 54, nsfas: 85, q: [40,30,16,9,5],   risk: 89 },
  { name: "Mangosuthu University of Tech",     short: "MUT",     type: "Technology",    province: "KwaZulu-Natal",   enrolled: 13000,  dropout: 56, nsfas: 84, q: [36,30,18,10,6],  risk: 88 },
  { name: "University of Fort Hare",           short: "UFH",     type: "Traditional",   province: "Eastern Cape",    enrolled: 13000,  dropout: 53, nsfas: 83, q: [38,29,18,9,6],   risk: 87 },
  { name: "University of Zululand",            short: "UNIZULU", type: "Traditional",   province: "KwaZulu-Natal",   enrolled: 16000,  dropout: 52, nsfas: 82, q: [36,28,19,10,7],  risk: 85 },
  { name: "Sol Plaatje University",            short: "SPU",     type: "Traditional",   province: "Northern Cape",   enrolled: 4000,   dropout: 50, nsfas: 80, q: [34,28,20,11,7],  risk: 83 },
  { name: "University of Mpumalanga",          short: "UMP",     type: "Traditional",   province: "Mpumalanga",      enrolled: 6500,   dropout: 48, nsfas: 79, q: [35,27,20,11,7],  risk: 82 },
  { name: "Tshwane University of Technology",  short: "TUT",     type: "Technology",    province: "Gauteng",         enrolled: 60000,  dropout: 52, nsfas: 76, q: [30,28,22,12,8],  risk: 82 },
  { name: "Vaal University of Technology",     short: "VUT",     type: "Technology",    province: "Gauteng",         enrolled: 18000,  dropout: 51, nsfas: 78, q: [32,26,22,12,8],  risk: 81 },
  { name: "Durban University of Technology",   short: "DUT",     type: "Technology",    province: "KwaZulu-Natal",   enrolled: 28000,  dropout: 49, nsfas: 72, q: [29,27,22,13,9],  risk: 77 },
  { name: "Cape Peninsula Univ of Technology", short: "CPUT",    type: "Technology",    province: "Western Cape",    enrolled: 35000,  dropout: 48, nsfas: 70, q: [28,26,22,14,10], risk: 76 },
  { name: "Central University of Technology",  short: "CUT",     type: "Technology",    province: "Free State",      enrolled: 14000,  dropout: 50, nsfas: 75, q: [30,26,22,14,8],  risk: 79 },
  { name: "Sefako Makgatho Health Sci Univ",   short: "SMU",     type: "Traditional",   province: "Gauteng",         enrolled: 5000,   dropout: 40, nsfas: 72, q: [30,26,22,14,8],  risk: 72 },
  { name: "UNISA",                             short: "UNISA",   type: "Distance",      province: "Gauteng",         enrolled: 300000, dropout: 46, nsfas: 55, q: [18,22,25,20,15], risk: 78 },
  { name: "North-West University",             short: "NWU",     type: "Traditional",   province: "North West",      enrolled: 65000,  dropout: 38, nsfas: 60, q: [24,26,24,16,10], risk: 64 },
  { name: "University of Johannesburg",        short: "UJ",      type: "Comprehensive", province: "Gauteng",         enrolled: 52000,  dropout: 40, nsfas: 62, q: [24,26,24,16,10], risk: 66 },
  { name: "Nelson Mandela University",         short: "NMU",     type: "Comprehensive", province: "Eastern Cape",    enrolled: 27000,  dropout: 42, nsfas: 63, q: [26,26,22,16,10], risk: 67 },
  { name: "University of the Free State",      short: "UFS",     type: "Traditional",   province: "Free State",      enrolled: 38000,  dropout: 38, nsfas: 58, q: [22,24,26,18,10], risk: 61 },
  { name: "University of the Western Cape",    short: "UWC",     type: "Traditional",   province: "Western Cape",    enrolled: 22000,  dropout: 36, nsfas: 62, q: [22,26,26,16,10], risk: 60 },
  { name: "University of KwaZulu-Natal",       short: "UKZN",    type: "Traditional",   province: "KwaZulu-Natal",   enrolled: 47000,  dropout: 34, nsfas: 54, q: [20,24,26,18,12], risk: 56 },
  { name: "Rhodes University",                 short: "RU",      type: "Traditional",   province: "Eastern Cape",    enrolled: 8500,   dropout: 24, nsfas: 40, q: [12,18,24,24,22], risk: 42 },
  { name: "University of Pretoria",            short: "UP",      type: "Traditional",   province: "Gauteng",         enrolled: 55000,  dropout: 22, nsfas: 35, q: [10,16,24,26,24], risk: 36 },
  { name: "Wits University",                   short: "Wits",    type: "Traditional",   province: "Gauteng",         enrolled: 40000,  dropout: 20, nsfas: 30, q: [8,14,24,28,26],  risk: 32 },
  { name: "Stellenbosch University",           short: "SU",      type: "Traditional",   province: "Western Cape",    enrolled: 32000,  dropout: 16, nsfas: 22, q: [5,10,20,30,35],  risk: 24 },
  { name: "University of Cape Town",           short: "UCT",     type: "Traditional",   province: "Western Cape",    enrolled: 29000,  dropout: 14, nsfas: 20, q: [4,8,18,30,40],   risk: 20 },
];

const Q_COLORS  = ['#e040fb','#ff6b9d','#9c6fcf','#4f8ef7','#7c4dff'];
const Q_LABELS  = ['Q1 — Poorest 20%','Q2','Q3 — Middle','Q4','Q5 — Affluent 20%'];
const Q_CLASSES = ['q1','q2','q3','q4','q5'];

function riskColor(score) {
  if (score >= 85) return '#e040fb';
  if (score >= 70) return '#ff6b9d';
  if (score >= 50) return '#9c6fcf';
  return '#7c4dff';
}
function riskLabel(score) {
  if (score >= 85) return 'Critical';
  if (score >= 70) return 'High';
  if (score >= 50) return 'Medium';
  return 'Low';
}
function riskBadgeClass(score) {
  if (score >= 85) return 'badge-critical';
  if (score >= 70) return 'badge-high';
  if (score >= 50) return 'badge-medium';
  return 'badge-low';
}
function domQuintile(q) {
  return q.indexOf(Math.max(...q)) + 1;
}

function provinceAverages() {
  const map = {};
  INSTITUTIONS.forEach(inst => {
    if (!map[inst.province]) map[inst.province] = { total: 0, count: 0 };
    map[inst.province].total += inst.dropout;
    map[inst.province].count++;
  });
  return Object.entries(map)
    .map(([province, d]) => ({ province, avg: Math.round(d.total / d.count) }))
    .sort((a, b) => b.avg - a.avg);
}

function computeNationalStats() {
  const totalEnrolled = INSTITUTIONS.reduce((s, i) => s + i.enrolled, 0);
  const totalNsfas    = INSTITUTIONS.reduce((s, i) => s + Math.round(i.enrolled * i.nsfas / 100), 0);
  const qTotals = [0,0,0,0,0];
  INSTITUTIONS.forEach(inst => {
    inst.q.forEach((pct, idx) => { qTotals[idx] += Math.round(inst.enrolled * pct / 100); });
  });
  const q1q2Pct = Math.round((qTotals[0] + qTotals[1]) / totalEnrolled * 100);
  return { totalEnrolled, totalNsfas, qTotals, q1q2Pct };
}

const INTERVENTIONS = [
  {
    level: 'Critical', color: '#E24B4A',
    title: 'Emergency financial support — Q1/Q2-dominant institutions',
    body: 'Walter Sisulu, UL, UNIVEN, UNIZULU and MUT have over 65% Q1–Q2 students with NSFAS dependency exceeding 82%. Priority actions: emergency bursary top-ups, accelerated NSFAS processing, campus food security programmes, and transport subsidies. DHET data shows unfunded students drop out at 2.8% higher rates than funded peers.',
    tags: ['NSFAS fast-track','Emergency bursaries','Food security','Transport subsidy','Accommodation support'],
    institutions: ['WSU','UNIVEN','UL','MUT','UFH'],
  },
  {
    level: 'Critical', color: '#E24B4A',
    title: 'First-year retention programmes — all critical-risk institutions',
    body: 'DHET data shows 25% of students dropout at the end of first year. Compulsory Extended Curriculum Programmes (ECPs), peer mentoring, and Supplemental Instruction must be deployed at TUT, WSU, UL, UNIVEN and MUT. Academic development centres must be capacitated urgently with dedicated first-year experience (FYE) coordinators.',
    tags: ['Extended Curriculum','Peer mentoring','Supplemental Instruction','FYE coordinators','Academic writing support'],
    institutions: ['TUT','WSU','UL','UNIVEN','MUT'],
  },
  {
    level: 'High', color: '#EF9F27',
    title: 'Digital access and infrastructure — Q1/Q2 connectivity gap',
    body: 'Q1–Q2 students lack devices, data, and stable connectivity — especially at distance and peri-urban campuses (UNISA, TUT, VUT, CUT). Laptop bursary schemes, extended computer lab hours, and zero-rated learning platforms are critical. DHET 2023/24 annual report flags infrastructure rollout as critically slow.',
    tags: ['Device bursaries','Zero-rated platforms','Extended lab hours','Load-shedding contingency','Campus Wi-Fi'],
    institutions: ['UNISA','TUT','VUT','CUT'],
  },
  {
    level: 'High', color: '#EF9F27',
    title: 'Psychosocial and mental health services — all high-risk campuses',
    body: 'DHET 2023/24 highlights student mental health and trauma counselling as under-resourced. Q1–Q3 students face food insecurity, overcrowded housing, and GBV. Campuses must increase counselling staff ratios to at least 1:500 and integrate psychosocial support into academic advising.',
    tags: ['Counselling staff','GBV support','Food banks','Student wellness','Crisis intervention'],
    institutions: ['WSU','UL','UNIVEN','DUT','CUT'],
  },
  {
    level: 'Medium', color: '#888780',
    title: 'Academic guidance and career advising — Q2/Q3 medium-risk students',
    body: 'Q3 students (middle quintile) often lack bridging support and career guidance. Institutions like NWU, UJ, NMU and UFS should deploy structured academic advising from first semester, with course selection guidance and employer engagement for work-integrated learning placements.',
    tags: ['Academic advising','Course selection','Work-integrated learning','Career fairs','Industry partnerships'],
    institutions: ['NWU','UJ','NMU','UFS','UWC'],
  },
  {
    level: 'Low', color: '#639922',
    title: 'Equity monitoring at elite institutions — Q4/Q5-dominant campuses',
    body: 'UCT, Stellenbosch, and Wits have low dropout rates but high Q4/Q5 dominance. These institutions must actively track Q1–Q2 students (often NSFAS-funded) who face academic and cultural transition challenges. Evidence-based peer mentorship pairing Q1 students with senior students significantly improves retention.',
    tags: ['Equity monitoring','Peer mentorship','Transition programmes','NSFAS student tracking','Diversity support'],
    institutions: ['UCT','SU','Wits','UP','RU'],
  },
];
