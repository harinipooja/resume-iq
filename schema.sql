-- ============================================================
--  AI-Based Resume Analyzer & Personalized Job Recommendation
--  DBMS LAYER  (SQLite / SQL)
--  Normal form: 3NF (no partial / transitive dependencies)
-- ============================================================

PRAGMA foreign_keys = ON;

-- ---------- Drop old objects (safe re-run) ----------
DROP VIEW  IF EXISTS v_job_skill_list;
DROP VIEW  IF EXISTS v_user_dashboard;
DROP VIEW  IF EXISTS v_analysis_report;

DROP TRIGGER IF EXISTS trg_application_touch;
DROP TRIGGER IF EXISTS trg_recommendation_limit;

DROP TABLE IF EXISTS recommendations;
DROP TABLE IF EXISTS applications;
DROP TABLE IF EXISTS analyses;
DROP TABLE IF EXISTS resume_skills;
DROP TABLE IF EXISTS resumes;
DROP TABLE IF EXISTS job_skills;
DROP TABLE IF EXISTS jobs;
DROP TABLE IF EXISTS skills;
DROP TABLE IF EXISTS users;

-- ============================================================
-- 1. users  (candidate / student account)
-- ============================================================
CREATE TABLE users (
    user_id       INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name     TEXT    NOT NULL,
    email         TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    target_role   TEXT    DEFAULT 'Software Engineer',
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    CONSTRAINT chk_users_email CHECK (email LIKE '%_@_%.__%')
);

-- ============================================================
-- 2. skills  (master / lookup table  ->  removes redundancy)
-- ============================================================
CREATE TABLE skills (
    skill_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    skill_name TEXT    NOT NULL UNIQUE,
    category   TEXT    NOT NULL,
    CONSTRAINT chk_skill_category CHECK (category IN
        ('Programming','Web','Database','AI/ML','Data','Cloud/DevOps','Aptitude','Soft Skill'))
);

-- ============================================================
-- 3. jobs  (job postings)
-- ============================================================
CREATE TABLE jobs (
    job_id         INTEGER PRIMARY KEY AUTOINCREMENT,
    company        TEXT NOT NULL,
    job_title      TEXT NOT NULL,
    location       TEXT NOT NULL,
    min_experience INTEGER NOT NULL DEFAULT 0,
    salary_lpa     REAL,
    description    TEXT,
    posted_on      TEXT NOT NULL DEFAULT (date('now')),
    CONSTRAINT chk_jobs_exp   CHECK (min_experience >= 0),
    CONSTRAINT chk_jobs_sal   CHECK (salary_lpa IS NULL OR salary_lpa > 0)
);

-- ============================================================
-- 4. job_skills  (M:N bridge  jobs <-> skills)
--    composite PRIMARY KEY  =  entity integrity on the pair
-- ============================================================
CREATE TABLE job_skills (
    job_id   INTEGER NOT NULL,
    skill_id INTEGER NOT NULL,
    weight   REAL    NOT NULL DEFAULT 1.0,
    PRIMARY KEY (job_id, skill_id),
    FOREIGN KEY (job_id)   REFERENCES jobs(job_id)     ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(skill_id) ON DELETE CASCADE,
    CONSTRAINT chk_js_weight CHECK (weight > 0 AND weight <= 1)
);

-- ============================================================
-- 5. resumes  (a user may upload many resumes -> 1:M)
-- ============================================================
CREATE TABLE resumes (
    resume_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    file_name   TEXT,
    raw_text    TEXT    NOT NULL,
    word_count  INTEGER NOT NULL DEFAULT 0,
    uploaded_at TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ============================================================
-- 6. resume_skills  (M:N bridge  resumes <-> skills)
--    produced by the NLP/extraction step
-- ============================================================
CREATE TABLE resume_skills (
    resume_id   INTEGER NOT NULL,
    skill_id    INTEGER NOT NULL,
    hits        INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (resume_id, skill_id),
    FOREIGN KEY (resume_id) REFERENCES resumes(resume_id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id)  REFERENCES skills(skill_id)   ON DELETE CASCADE,
    CONSTRAINT chk_rs_hits CHECK (hits > 0)
);

-- ============================================================
-- 7. analyses  (ATS / score report for one resume)
-- ============================================================
CREATE TABLE analyses (
    analysis_id      INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id        INTEGER NOT NULL,
    ats_score        REAL NOT NULL,
    skill_score      REAL NOT NULL,
    experience_score REAL NOT NULL,
    overall_score    REAL NOT NULL,
    matched_skills   INTEGER NOT NULL DEFAULT 0,
    analyzed_at      TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (resume_id) REFERENCES resumes(resume_id) ON DELETE CASCADE,
    CONSTRAINT chk_an_range CHECK (
        ats_score        BETWEEN 0 AND 100 AND
        skill_score      BETWEEN 0 AND 100 AND
        experience_score BETWEEN 0 AND 100 AND
        overall_score    BETWEEN 0 AND 100)
);

-- ============================================================
-- 8. recommendations  (output of the recommendation engine)
-- ============================================================
CREATE TABLE recommendations (
    rec_id        INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL,
    job_id        INTEGER NOT NULL,
    analysis_id   INTEGER,
    match_percent REAL NOT NULL,
    rank_no       INTEGER NOT NULL,
    generated_at  TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (analysis_id, job_id),
    FOREIGN KEY (user_id)     REFERENCES users(user_id)       ON DELETE CASCADE,
    FOREIGN KEY (job_id)      REFERENCES jobs(job_id)         ON DELETE CASCADE,
    FOREIGN KEY (analysis_id) REFERENCES analyses(analysis_id) ON DELETE CASCADE,
    CONSTRAINT chk_rec_match CHECK (match_percent BETWEEN 0 AND 100)
);

-- ============================================================
-- 9. applications  (candidate applies to a job)
--    UNIQUE(user_id, job_id) => a candidate cannot apply twice
-- ============================================================
CREATE TABLE applications (
    app_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    job_id     INTEGER NOT NULL,
    status     TEXT NOT NULL DEFAULT 'Applied',
    applied_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (user_id, job_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (job_id)  REFERENCES jobs(job_id)   ON DELETE CASCADE,
    CONSTRAINT chk_app_status CHECK (status IN
        ('Applied','Shortlisted','Interview','Selected','Rejected'))
);

-- ============================================================
--  INDEXES  (speed up the JOINs used by the engine)
-- ============================================================
CREATE INDEX idx_resumes_user        ON resumes(user_id);
CREATE INDEX idx_resume_skills_skill ON resume_skills(skill_id);
CREATE INDEX idx_job_skills_skill    ON job_skills(skill_id);
CREATE INDEX idx_jobs_title          ON jobs(job_title);
CREATE INDEX idx_recs_user_rank      ON recommendations(user_id, rank_no);
CREATE INDEX idx_apps_user           ON applications(user_id);

-- ============================================================
--  VIEWS  (stored queries -> abstraction + security)
-- ============================================================

-- Job + its required skills as one readable row
CREATE VIEW v_job_skill_list AS
SELECT j.job_id,
       j.company,
       j.job_title,
       j.location,
       j.salary_lpa,
       COUNT(js.skill_id)                            AS skill_count,
       GROUP_CONCAT(s.skill_name, ', ')              AS required_skills
FROM jobs j
LEFT JOIN job_skills js ON js.job_id = j.job_id
LEFT JOIN skills     s  ON s.skill_id = js.skill_id
GROUP BY j.job_id;

-- Per-user summary used by the dashboard cards
CREATE VIEW v_user_dashboard AS
SELECT u.user_id,
       u.full_name,
       u.email,
       (SELECT COUNT(*) FROM resumes r WHERE r.user_id = u.user_id)        AS total_resumes,
       (SELECT COUNT(*) FROM applications a WHERE a.user_id = u.user_id)   AS total_applications,
       COALESCE((SELECT MAX(an.overall_score)
                   FROM analyses an
                   JOIN resumes r2 ON r2.resume_id = an.resume_id
                  WHERE r2.user_id = u.user_id), 0)                        AS best_score
FROM users u;

-- Latest analysis joined with the resume + owner
CREATE VIEW v_analysis_report AS
SELECT an.analysis_id,
       an.resume_id,
       r.user_id,
       r.file_name,
       an.ats_score,
       an.skill_score,
       an.experience_score,
       an.overall_score,
       an.matched_skills,
       an.analyzed_at
FROM analyses an
JOIN resumes r ON r.resume_id = an.resume_id;

-- ============================================================
--  TRIGGERS
-- ============================================================

-- keep updated_at in sync automatically (audit column)
CREATE TRIGGER trg_application_touch
AFTER UPDATE OF status ON applications
FOR EACH ROW
BEGIN
    UPDATE applications
       SET updated_at = datetime('now')
     WHERE app_id = OLD.app_id;
END;
