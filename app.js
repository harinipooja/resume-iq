/* ==================== ResumeIQ front-end ==================== */
let USER = null;

const $  = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const api = async (method, url, body) => {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

/* ---------------- AUTH ---------------- */
$$('.tabs-mini button').forEach(b => b.onclick = () => {
  $$('.tabs-mini button').forEach(x => x.classList.remove('on'));
  b.classList.add('on');
  $('#loginForm').classList.toggle('hidden', b.dataset.authtab !== 'login');
  $('#registerForm').classList.toggle('hidden', b.dataset.authtab !== 'register');
  $('#authMsg').textContent = '';
});

$('#loginForm').onsubmit = async (e) => {
  e.preventDefault();
  try {
    const { user } = await api('POST', '/api/login', {
      email: $('#loginEmail').value, password: $('#loginPass').value
    });
    startSession(user);
  } catch (err) { authErr(err.message); }
};

$('#registerForm').onsubmit = async (e) => {
  e.preventDefault();
  try {
    const { user } = await api('POST', '/api/register', {
      full_name: $('#regName').value,
      email: $('#regEmail').value,
      password: $('#regPass').value,
      target_role: $('#regRole').value
    });
    startSession(user);
  } catch (err) { authErr(err.message); }
};

function authErr(m) { $('#authMsg').textContent = m; $('#authMsg').classList.add('err'); }

function startSession(user) {
  USER = user;
  localStorage.setItem('resumeiq_user', JSON.stringify(user));
  $('#authScreen').classList.add('hidden');
  $('#app').classList.remove('hidden');
  $('#whoName').textContent = user.full_name;
  $('#whoMail').textContent = user.email;
  show('dashboard');
}

$('#logoutBtn').onclick = () => {
  localStorage.removeItem('resumeiq_user');
  location.reload();
};

/* ---------------- NAVIGATION ---------------- */
function show(view) {
  $$('.view').forEach(v => v.classList.add('hidden'));
  $('#view-' + view).classList.remove('hidden');
  $$('.nav').forEach(n => n.classList.toggle('on', n.dataset.view === view));
  if (view === 'dashboard')   loadDashboard();
  if (view === 'recommend')   loadRecommendations();
  if (view === 'applications') loadApplications();
  if (view === 'database')    loadSchema();
}
$$('.nav').forEach(n => n.onclick = () => show(n.dataset.view));

/* ---------------- DASHBOARD ---------------- */
async function loadDashboard() {
  const d = await api('GET', `/api/dashboard?user_id=${USER.user_id}`);
  const s = d.summary;
  $('#statCards').innerHTML = [
    ['Total Resumes', s.total_resumes],
    ['Applications', s.total_applications],
    ['Best Score', Math.round(s.best_score) + '%'],
    ['Target Role', USER.target_role || '—']
  ].map(([k, v]) => `<div class="card"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('');

  const la = d.latest_analysis;
  $('#latestAnalysis').innerHTML = la
    ? `<div class="cards">
         <div class="card"><div class="k">File</div><div class="v" style="font-size:14px">${la.file_name}</div></div>
         <div class="card"><div class="k">Overall</div><div class="v">${Math.round(la.overall_score)}%</div></div>
         <div class="card"><div class="k">ATS</div><div class="v">${Math.round(la.ats_score)}%</div></div>
         <div class="card"><div class="k">Skill</div><div class="v">${Math.round(la.skill_score)}%</div></div>
         <div class="card"><div class="k">Experience</div><div class="v">${Math.round(la.experience_score)}%</div></div>
         <div class="card"><div class="k">Skills Found</div><div class="v">${la.matched_skills}</div></div>
       </div>`
    : 'No resume analysed yet. Go to <b>Analyze Resume</b>.';

  const c = d.table_counts;
  $('#tableCounts').innerHTML = Object.entries(c)
    .map(([k, v]) => `<div class="card"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('');
}

/* ---------------- ANALYZE ---------------- */
const SAMPLE = `HARINI G
Email: harini.g@college.edu | Phone: +91 98765 43210
LinkedIn: linkedin.com/in/harinig | GitHub: github.com/harinig

SUMMARY
Final year B.Tech Information Technology student with a strong interest in full-stack
development, databases and applied machine learning. Built 4 academic projects and
completed 1 internship.

EDUCATION
B.Tech Information Technology, Anna University, CGPA 8.7/10

EXPERIENCE
Software Development Intern, TechNova Solutions (Jun 2025 - Aug 2025)
- Developed REST API modules using Node.js and Express, reduced response time by 30 percent.
- Designed normalized MySQL schemas and wrote complex JOIN queries and PL/SQL procedures.
- Implemented automated unit tests using Python, improved code coverage to 85 percent.

PROJECTS
1. AI Resume Analyzer and Job Recommendation System (Python, Flask, MySQL)
   - Designed a 3NF relational schema with 9 tables and 2 bridge tables.
   - Used NLP to extract 25+ technical skills from resumes and computed ATS scores.
   - Implemented a weighted SQL JOIN based matching engine recommending top 8 jobs.
2. Library Management System (Java, MySQL, JDBC)
   - Built CRUD operations, fine calculation triggers and normalized the schema to 3NF.
3. Student Performance Dashboard (HTML, CSS, JavaScript, Power BI)
   - Visualized attendance and marks for 200 students using interactive charts.

SKILLS
Programming: Python, Java, C++, JavaScript
Web: HTML, CSS, React, Node.js, Express, REST API, Bootstrap
Database: SQL, MySQL, PostgreSQL, MongoDB, PL/SQL, Normalization, DBMS
AI/ML: Machine Learning, NLP, Pandas, NumPy, Scikit-learn
Cloud/DevOps: Git, GitHub, Docker, Linux, AWS
Soft Skills: Communication, Teamwork, Problem Solving, Leadership

ACHIEVEMENTS
- Solved 350+ Data Structures and Algorithms problems on LeetCode.
- Won 2nd prize in a 24-hour national level hackathon among 120 teams.

CERTIFICATIONS
- Oracle Database SQL Certified Associate
- AWS Cloud Practitioner Essentials`;

$('#fileInput').onchange = (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => { $('#resumeText').value = r.result; };
  r.readAsText(f);
};
$('#sampleBtn').onclick = () => { $('#resumeText').value = SAMPLE; $('#fileInput').value = ''; };
$('#clearBtn').onclick  = () => { $('#resumeText').value = ''; $('#fileInput').value = ''; };

$('#analyzeBtn').onclick = async () => {
  const text = $('#resumeText').value.trim();
  const msg = $('#analyzeMsg');
  msg.classList.remove('err');
  if (text.length < 40) { msg.textContent = 'Please paste at least 40 characters.'; msg.classList.add('err'); return; }
  msg.textContent = 'Analysing...';
  try {
    const fileName = $('#fileInput').files[0]?.name || 'pasted-resume.txt';
    const r = await api('POST', '/api/analyze', {
      user_id: USER.user_id, file_name: fileName, raw_text: text
    });
    msg.textContent = `Done · resume #${r.resume_id} saved (${r.word_count} words)`;
    renderAnalysis(r);
  } catch (err) { msg.textContent = err.message; msg.classList.add('err'); }
};

function renderAnalysis(r) {
  $('#analyzeResult').classList.remove('hidden');
  const s = r.scores;
  $('#scoreRings').innerHTML = [
    ['Overall', s.overall], ['ATS', s.ats], ['Skill', s.skill], ['Experience', s.experience]
  ].map(([l, v]) => ring(l, v)).join('');

  $('#skillCount').textContent = r.detected_skills.length + ' found';
  $('#detectedSkills').innerHTML = r.detected_skills.length
    ? r.detected_skills.map(x => `<span class="chip">${x.skill_name} <em style="color:#93a0cc">${x.hits}</em></span>`).join('')
    : '<span class="muted">No known skills detected.</span>';

  $('#analyzeRecs').innerHTML = r.recommendations.map(recCard).join('');
}

function ring(label, value) {
  const R = 34, C = 2 * Math.PI * R;
  const col = value >= 75 ? '#37d5b0' : value >= 50 ? '#6c8cff' : '#ffb020';
  return `<div class="ring">
    <svg width="80" height="80">
      <circle cx="40" cy="40" r="${R}" stroke="#1b2447" stroke-width="8" fill="none"/>
      <circle cx="40" cy="40" r="${R}" stroke="${col}" stroke-width="8" fill="none"
        stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - value / 100)}"/>
    </svg>
    <div class="val" style="color:${col}">${Math.round(value)}%</div>
    <div class="lbl">${label}</div>
  </div>`;
}

function recCard(r) {
  const miss = (r.missing_skills || []).slice(0, 5);
  return `<div class="rec">
    <div class="rank">${r.rank}</div>
    <div class="info">
      <div class="ttl">${r.job_title} · ${r.company}</div>
      <div class="meta">${r.location} · ₹${r.salary_lpa ?? '—'} LPA · ${r.matched_skills}/${r.total_skills} skills matched</div>
      <div class="bar"><span style="width:${r.match_percent}%"></span></div>
      ${miss.length ? `<div class="chips" style="margin-top:9px">${miss.map(m => `<span class="chip miss">missing: ${m}</span>`).join('')}</div>` : ''}
    </div>
    <div class="match">${r.match_percent}%</div>
    <button class="btn small" onclick="applyJob(${r.job_id})">Apply</button>
  </div>`;
}

async function applyJob(jobId) {
  try {
    await api('POST', '/api/apply', { user_id: USER.user_id, job_id: jobId });
    alert('Application submitted successfully.');
  } catch (err) { alert(err.message); }
}
window.applyJob = applyJob;

/* ---------------- RECOMMENDATIONS ---------------- */
async function loadRecommendations() {
  const { recommendations } = await api('GET', `/api/recommendations?user_id=${USER.user_id}`);
  $('#recList').innerHTML = recommendations.length
    ? recommendations.map(r => recCard({
        rank: r.rank_no, job_id: r.job_id, job_title: r.job_title, company: r.company,
        location: r.location, salary_lpa: r.salary_lpa, match_percent: r.match_percent,
        total_skills: r.total_skills, matched_skills: Math.round(r.match_percent * r.total_skills / 100),
        missing_skills: []
      })).join('')
    : '<span class="muted">No recommendations yet — analyze a resume first.</span>';
}

/* ---------------- APPLICATIONS ---------------- */
async function loadApplications() {
  const { applications } = await api('GET', `/api/applications?user_id=${USER.user_id}`);
  const tb = $('#appTable tbody');
  tb.innerHTML = applications.length
    ? applications.map((a, i) => `<tr>
        <td>${i + 1}</td><td>${a.company}</td><td>${a.job_title}</td><td>${a.location}</td>
        <td><span class="badge ${a.status}">${a.status}</span></td>
        <td>${a.applied_at}</td><td>${a.updated_at}</td></tr>`).join('')
    : `<tr><td colspan="7" class="muted">No applications yet.</td></tr>`;
}

/* ---------------- DATABASE ---------------- */
let schemaLoaded = false;
async function loadSchema() {
  if (schemaLoaded) return;
  schemaLoaded = true;
  const { tables, views, indexes, foreignKeys } = await api('GET', '/api/schema');
  $('#schemaBox').innerHTML = tables.map(t => {
    const cols = t.columns.map(c =>
      `<li><b>${c.name}</b> <em>${c.type || 'TEXT'}</em>${c.pk ? ' PK' : ''}${c.notnull ? ' NOT NULL' : ''}</li>`
    ).join('');
    const fks = foreignKeys[t.name] || [];
    return `<div class="tbl">
      <h4>${t.name} <span>${t.rows} rows</span></h4>
      <ul>${cols}</ul>
      ${fks.length ? `<div class="fk">FK → ${fks.map(f => `${f.column} → ${f.references}`).join(', ')}</div>` : ''}
    </div>`;
  }).join('') +
  `<div class="tbl"><h4>Views &amp; Indexes <span>${views.length} views</span></h4>
     <ul>${views.map(v => `<li><b>${v.name}</b></li>`).join('')}
     ${indexes.map(i => `<li><em>${i.name} on ${i.tbl_name}</em></li>`).join('')}</ul>
   </div>`;
}

$('#runSql').onclick = runSql;
$$('.q').forEach(b => b.onclick = () => { $('#sqlBox').value = b.dataset.sql; runSql(); });

async function runSql() {
  const msg = $('#sqlMsg'); msg.classList.remove('err');
  try {
    const r = await api('POST', '/api/sql', { sql: $('#sqlBox').value });
    msg.textContent = `${r.row_count} row(s) · ${r.time_ms} ms`;
    $('#sqlResult').innerHTML = r.rows.length
      ? `<table class="data"><thead><tr>${r.columns.map(c => `<th>${c}</th>`).join('')}</tr></thead>
         <tbody>${r.rows.map(row => `<tr>${r.columns.map(c =>
             `<td>${row[c] === null ? '<span class="muted">NULL</span>' : row[c]}</td>`).join('')}</tr>`).join('')}</tbody></table>`
      : '<p class="muted">Query returned no rows.</p>';
  } catch (err) {
    msg.textContent = 'Failed'; msg.classList.add('err');
    $('#sqlResult').innerHTML = `<pre class="err">${err.message}</pre>`;
  }
}

/* ---------------- BOOT ---------------- */
const saved = localStorage.getItem('resumeiq_user');
if (saved) startSession(JSON.parse(saved));
