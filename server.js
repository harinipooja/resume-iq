/**
 * AI-Based Resume Analyzer & Personalized Job Recommendation System
 * Backend: Node.js (built-in http) + node:sqlite  -> ZERO npm dependencies
 * Run:  node server.js
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'resume_analyzer.db');

/* ------------------------------------------------------------------ */
/*  DATABASE INITIALISATION                                            */
/* ------------------------------------------------------------------ */
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DB_FILE);
db.exec('PRAGMA foreign_keys = ON;');

const isFresh = !db.prepare(
  "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
).get();

if (isFresh) {
  db.exec(fs.readFileSync(path.join(ROOT, 'db', 'schema.sql'), 'utf8'));
  db.exec(fs.readFileSync(path.join(ROOT, 'db', 'seed.sql'), 'utf8'));
  // demo account  ->  demo@student.com / demo1234
  db.prepare(
    'INSERT INTO users (full_name, email, password_hash, target_role) VALUES (?,?,?,?)'
  ).run('Demo Student', 'demo@student.com', hash('demo1234'), 'Software Engineer');
  console.log('[*] Database created and seeded.');
}

function hash(pw) {
  return crypto.createHash('sha256').update(String(pw)).digest('hex');
}

/* ------------------------------------------------------------------ */
/*  NLP / ANALYSIS ENGINE                                              */
/* ------------------------------------------------------------------ */
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function countHits(text, term) {
  const re = new RegExp('(?<![a-z0-9+#.])' + esc(term) + '(?![a-z0-9+#])', 'gi');
  return (text.match(re) || []).length;
}

function extractSkills(rawText) {
  const found = [];
  for (const s of db.prepare('SELECT skill_id, skill_name FROM skills').all()) {
    const hits = countHits(rawText, s.skill_name.toLowerCase());
    if (hits > 0) found.push({ skill_id: s.skill_id, skill_name: s.skill_name, hits });
  }
  return found;
}

function atsScore(text) {
  const t = text.toLowerCase();
  let score = 0;
  if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(text)) score += 10;              // contact email
  if (/(\+?\d[\d\s-]{8,}\d)/.test(text)) score += 10;                 // phone
  const sections = ['education', 'experience', 'project', 'skill',
                    'achievement', 'certification', 'summary', 'objective'];
  score += Math.min(25, sections.filter(s => t.includes(s)).length * 5);
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words >= 200 && words <= 1200) score += 15;
  else if (words >= 100) score += 8;
  const verbs = ['developed', 'designed', 'implemented', 'built', 'created', 'led',
                 'managed', 'optimized', 'automated', 'deployed', 'analyzed',
                 'analysed', 'improved'];
  score += Math.min(15, verbs.filter(v => t.includes(v)).length * 3);
  const numbers = (text.match(/\b\d+(\.\d+)?\s*(%|percent|users|records|hours|x)\b/gi) || []).length;
  score += Math.min(15, numbers * 5);
  score += Math.min(10, ['github', 'linkedin', 'leetcode', 'portfolio']
                        .filter(k => t.includes(k)).length * 4);
  return Math.round(Math.min(100, score));
}

function experienceScore(text, matchedCount) {
  const t = text.toLowerCase();
  let score = 0;
  const years = t.match(/(\d+(\.\d+)?)\s*\+?\s*(years?|yrs?)/);
  if (years) score += Math.min(50, parseFloat(years[1]) * 20);
  score += Math.min(30, (t.match(/intern/g) || []).length * 15);
  score += Math.min(30, (t.match(/project/g) || []).length * 8);
  if (matchedCount >= 10) score += 10;
  return Math.round(Math.min(100, score));
}

/* ------------------------------------------------------------------ */
/*  CORE: analyse a resume and generate recommendations                */
/* ------------------------------------------------------------------ */
function analyzeResume(userId, fileName, rawText) {
  const words = rawText.trim().split(/\s+/).filter(Boolean).length;

  const insResume = db.prepare(
    'INSERT INTO resumes (user_id, file_name, raw_text, word_count) VALUES (?,?,?,?)'
  ).run(userId, fileName || 'pasted-resume.txt', rawText, words);
  const resumeId = Number(insResume.lastInsertRowid);

  const found = extractSkills(rawText);
  const insRs = db.prepare(
    'INSERT INTO resume_skills (resume_id, skill_id, hits) VALUES (?,?,?)'
  );
  for (const f of found) insRs.run(resumeId, f.skill_id, f.hits);

  const ats  = atsScore(rawText);
  const exp  = experienceScore(rawText, found.length);
  const skl  = Math.round(Math.min(100, (found.length / 12) * 100));
  const over = Math.round(0.40 * ats + 0.35 * skl + 0.25 * exp);

  const insAn = db.prepare(`INSERT INTO analyses
      (resume_id, ats_score, skill_score, experience_score, overall_score, matched_skills)
      VALUES (?,?,?,?,?,?)`).run(resumeId, ats, skl, exp, over, found.length);
  const analysisId = Number(insAn.lastInsertRowid);

  /* ---------- SQL-based recommendation engine (JOIN + weighted SUM) ---------- */
  const ranked = db.prepare(`
    SELECT j.job_id,
           j.company,
           j.job_title,
           j.location,
           j.salary_lpa,
           j.min_experience,
           COUNT(js.skill_id) AS total_skills,
           SUM(CASE WHEN rs.skill_id IS NOT NULL THEN 1 ELSE 0 END) AS matched_skills,
           ROUND(SUM(CASE WHEN rs.skill_id IS NOT NULL THEN js.weight ELSE 0 END)
                 * 100.0 / SUM(js.weight), 1) AS match_percent
      FROM jobs j
      JOIN job_skills js ON js.job_id = j.job_id
      LEFT JOIN resume_skills rs
             ON rs.skill_id = js.skill_id AND rs.resume_id = ?
     GROUP BY j.job_id
     ORDER BY match_percent DESC, total_skills DESC
     LIMIT 8
  `).all(resumeId);

  db.prepare('DELETE FROM recommendations WHERE user_id = ?').run(userId);
  const insRec = db.prepare(`INSERT INTO recommendations
      (user_id, job_id, analysis_id, match_percent, rank_no) VALUES (?,?,?,?,?)`);
  const missingStmt = db.prepare(`
    SELECT s.skill_name
      FROM job_skills js
      JOIN skills s ON s.skill_id = js.skill_id
     WHERE js.job_id = ?
       AND js.skill_id NOT IN (SELECT skill_id FROM resume_skills WHERE resume_id = ?)
     ORDER BY js.weight DESC`);

  const recommendations = ranked.map((r, i) => {
    insRec.run(userId, r.job_id, analysisId, r.match_percent, i + 1);
    return {
      rank: i + 1,
      ...r,
      missing_skills: missingStmt.all(r.job_id, resumeId).map(x => x.skill_name)
    };
  });

  return {
    resume_id: resumeId,
    analysis_id: analysisId,
    word_count: words,
    scores: { ats, skill: skl, experience: exp, overall: over },
    detected_skills: found,
    recommendations
  };
}

/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */
function send(res, code, data, type = 'application/json') {
  const body = type === 'application/json' ? JSON.stringify(data) : data;
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', c => {
      raw += c;
      if (raw.length > 1e6) reject(new Error('Payload too large'));
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json'
};

/* ------------------------------------------------------------------ */
/*  ROUTES                                                             */
/* ------------------------------------------------------------------ */
const routes = {

  'POST /api/register': async (req, res, body) => {
    const { full_name, email, password, target_role } = body;
    if (!full_name || !email || !password)
      return send(res, 400, { error: 'full_name, email and password are required' });
    if (String(password).length < 6)
      return send(res, 400, { error: 'Password must be at least 6 characters' });
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email))
      return send(res, 409, { error: 'That email is already registered' });
    const r = db.prepare(
      'INSERT INTO users (full_name, email, password_hash, target_role) VALUES (?,?,?,?)'
    ).run(full_name, email, hash(password), target_role || 'Software Engineer');
    const user = db.prepare(
      'SELECT user_id, full_name, email, target_role FROM users WHERE user_id = ?'
    ).get(Number(r.lastInsertRowid));
    send(res, 201, { user });
  },

  'POST /api/login': async (req, res, body) => {
    const user = db.prepare(
      'SELECT user_id, full_name, email, target_role FROM users WHERE email = ? AND password_hash = ?'
    ).get(body.email || '', hash(body.password || ''));
    if (!user) return send(res, 401, { error: 'Invalid email or password' });
    send(res, 200, { user });
  },

  'POST /api/analyze': async (req, res, body) => {
    const { user_id, file_name, raw_text } = body;
    if (!user_id) return send(res, 400, { error: 'Please log in first' });
    if (!raw_text || raw_text.trim().length < 40)
      return send(res, 400, { error: 'Resume text is too short (min 40 characters)' });
    send(res, 200, analyzeResume(Number(user_id), file_name, String(raw_text)));
  },

  'GET /api/jobs': async (req, res) =>
    send(res, 200, { jobs: db.prepare('SELECT * FROM v_job_skill_list ORDER BY company').all() }),

  'GET /api/skills': async (req, res) =>
    send(res, 200, {
      skills: db.prepare('SELECT * FROM skills ORDER BY category, skill_name').all()
    }),

  'GET /api/recommendations': async (req, res, body, url) => {
    const uid = Number(url.searchParams.get('user_id'));
    if (!uid) return send(res, 400, { error: 'user_id is required' });
    const rows = db.prepare(`
      SELECT r.rec_id, r.rank_no, r.match_percent, r.generated_at,
             j.job_id, j.company, j.job_title, j.location, j.salary_lpa,
             (SELECT COUNT(*) FROM job_skills js WHERE js.job_id = j.job_id) AS total_skills,
             (SELECT COUNT(*) FROM applications a
               WHERE a.user_id = r.user_id AND a.job_id = j.job_id)          AS already_applied
        FROM recommendations r
        JOIN jobs j ON j.job_id = r.job_id
       WHERE r.user_id = ?
       ORDER BY r.rank_no`).all(uid);
    send(res, 200, { recommendations: rows });
  },

  'POST /api/apply': async (req, res, body) => {
    const { user_id, job_id } = body;
    if (!user_id || !job_id) return send(res, 400, { error: 'user_id and job_id are required' });
    try {
      db.prepare('INSERT INTO applications (user_id, job_id) VALUES (?,?)')
        .run(Number(user_id), Number(job_id));
    } catch (e) {
      if (String(e.message).includes('UNIQUE'))
        return send(res, 409, { error: 'You have already applied to this job' });
      throw e;
    }
    send(res, 201, { ok: true });
  },

  'GET /api/applications': async (req, res, body, url) => {
    const uid = Number(url.searchParams.get('user_id'));
    if (!uid) return send(res, 400, { error: 'user_id is required' });
    send(res, 200, {
      applications: db.prepare(`
        SELECT a.app_id, a.status, a.applied_at, a.updated_at,
               j.company, j.job_title, j.location
          FROM applications a
          JOIN jobs j ON j.job_id = a.job_id
         WHERE a.user_id = ?
         ORDER BY a.applied_at DESC`).all(uid)
    });
  },

  'GET /api/dashboard': async (req, res, body, url) => {
    const uid = Number(url.searchParams.get('user_id'));
    if (!uid) return send(res, 400, { error: 'user_id is required' });
    const summary = db.prepare('SELECT * FROM v_user_dashboard WHERE user_id = ?').get(uid);
    const latest  = db.prepare(
      'SELECT * FROM v_analysis_report WHERE user_id = ? ORDER BY analysis_id DESC LIMIT 1'
    ).get(uid) || null;
    const counts = {
      users: db.prepare('SELECT COUNT(*) c FROM users').get().c,
      jobs: db.prepare('SELECT COUNT(*) c FROM jobs').get().c,
      skills: db.prepare('SELECT COUNT(*) c FROM skills').get().c,
      resumes: db.prepare('SELECT COUNT(*) c FROM resumes').get().c,
      applications: db.prepare('SELECT COUNT(*) c FROM applications').get().c,
      recommendations: db.prepare('SELECT COUNT(*) c FROM recommendations').get().c
    };
    send(res, 200, { summary, latest_analysis: latest, table_counts: counts });
  },

  /* ---- DBMS showcase: live schema metadata ---- */
  'GET /api/schema': async (req, res) => {
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    ).all().map(t => ({
      name: t.name,
      columns: db.prepare(`PRAGMA table_info(${t.name})`).all()
        .map(c => ({ name: c.name, type: c.type, pk: !!c.pk, notnull: !!c.notnull })),
      rows: db.prepare(`SELECT COUNT(*) c FROM ${t.name}`).get().c
    }));
    const views = db.prepare(
      "SELECT name, sql FROM sqlite_master WHERE type='view' ORDER BY name"
    ).all();
    const indexes = db.prepare(
      "SELECT name, tbl_name FROM sqlite_master WHERE type='index' AND sql IS NOT NULL ORDER BY tbl_name"
    ).all();
    const foreignKeys = {};
    for (const t of tables)
      foreignKeys[t.name] = db.prepare(`PRAGMA foreign_key_list(${t.name})`).all()
        .map(f => ({ column: f.from, references: `${f.table}.${f.to}` }));
    send(res, 200, { tables, views, indexes, foreignKeys });
  },

  /* ---- DBMS showcase: read-only SQL console ---- */
  'POST /api/sql': async (req, res, body) => {
    const sql = String(body.sql || '').trim().replace(/;+\s*$/, '');
    if (!sql) return send(res, 400, { error: 'Empty query' });
    if (!/^(select|with)\b/i.test(sql))
      return send(res, 403, { error: 'Only read-only SELECT / WITH queries are allowed' });
    if (sql.includes(';'))
      return send(res, 403, { error: 'Only one statement per execution is allowed' });
    try {
      const t0 = process.hrtime.bigint();
      const rows = db.prepare(sql).all();
      const ms = Number(process.hrtime.bigint() - t0) / 1e6;
      send(res, 200, {
        columns: rows.length ? Object.keys(rows[0]) : [],
        rows,
        row_count: rows.length,
        time_ms: Number(ms.toFixed(2))
      });
    } catch (e) {
      send(res, 400, { error: 'SQL error: ' + e.message });
    }
  }
};

/* ------------------------------------------------------------------ */
/*  SERVER                                                             */
/* ------------------------------------------------------------------ */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const key = `${req.method} ${url.pathname}`;

  try {
    if (routes[key]) return await routes[key](req, res, await readBody(req), url);

    if (url.pathname.startsWith('/api/'))
      return send(res, 404, { error: 'Unknown API endpoint: ' + key });

    // static files
    const rel = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\/+/, '');
    const file = path.join(PUBLIC_DIR, rel);
    if (!file.startsWith(PUBLIC_DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory())
      return send(res, 404, 'Not found', 'text/plain');
    send(res, 200, fs.readFileSync(file), MIME[path.extname(file)] || 'application/octet-stream');
  } catch (err) {
    console.error('[error]', err.message);
    send(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log('==========================================================');
  console.log('  Resume Analyzer & Job Recommendation System');
  console.log('  Server running  ->  http://localhost:' + PORT);
  console.log('  Database file   ->  data/resume_analyzer.db');
  console.log('  Demo login      ->  demo@student.com / demo1234');
  console.log('==========================================================');
});
