-- ============================================================
--  SEED DATA  (master data: skills, jobs, job_skills, demo user)
-- ============================================================

-- ---------- SKILLS ----------
INSERT INTO skills (skill_name, category) VALUES
('Python','Programming'), ('Java','Programming'), ('C++','Programming'),
('C','Programming'), ('JavaScript','Programming'), ('TypeScript','Programming'),
('Go','Programming'), ('C#','Programming'),
('HTML','Web'), ('CSS','Web'), ('React','Web'), ('Node.js','Web'),
('Express','Web'), ('Django','Web'), ('Flask','Web'), ('Spring Boot','Web'),
('REST API','Web'), ('Bootstrap','Web'),
('SQL','Database'), ('MySQL','Database'), ('PostgreSQL','Database'),
('MongoDB','Database'), ('Oracle','Database'), ('Redis','Database'),
('PL/SQL','Database'), ('Normalization','Database'), ('DBMS','Database'),
('Machine Learning','AI/ML'), ('Deep Learning','AI/ML'), ('NLP','AI/ML'),
('TensorFlow','AI/ML'), ('PyTorch','AI/ML'), ('Scikit-learn','AI/ML'),
('OpenCV','AI/ML'),
('Pandas','Data'), ('NumPy','Data'), ('Power BI','Data'), ('Tableau','Data'),
('Excel','Data'), ('Data Structures','Aptitude'), ('Algorithms','Aptitude'),
('OOP','Aptitude'), ('Problem Solving','Aptitude'),
('Git','Cloud/DevOps'), ('GitHub','Cloud/DevOps'), ('Docker','Cloud/DevOps'),
('Kubernetes','Cloud/DevOps'), ('AWS','Cloud/DevOps'), ('Azure','Cloud/DevOps'),
('Linux','Cloud/DevOps'), ('Jenkins','Cloud/DevOps'), ('CI/CD','Cloud/DevOps'),
('Communication','Soft Skill'), ('Teamwork','Soft Skill'),
('Leadership','Soft Skill'), ('Time Management','Soft Skill');

-- ---------- JOBS ----------
INSERT INTO jobs (company, job_title, location, min_experience, salary_lpa, description) VALUES
('TCS Digital','Software Engineer','Chennai',0,7.0,'Full-stack development with Java and SQL for enterprise clients.'),
('Infosys','Systems Engineer','Bengaluru',0,6.5,'Application development using Python/Django and relational databases.'),
('Amazon','SDE-1','Hyderabad',0,18.0,'Build scalable backend services with strong DSA and AWS exposure.'),
('Microsoft','Software Engineer','Hyderabad',0,20.0,'Develop cloud-native services; strong in DS/Algo and one OOP language.'),
('Zoho','Member Technical Staff','Chennai',0,8.5,'Product engineering across Java, JavaScript and MySQL.'),
('Freshworks','Software Engineer','Chennai',0,10.0,'Build SaaS features with Node.js/React and REST APIs.'),
('Flipkart','Data Analyst','Bengaluru',0,12.0,'Analyse business data using SQL, Python, Pandas and Power BI.'),
('Swiggy','ML Engineer','Bengaluru',0,16.0,'Build recommendation and forecasting models with Python and TensorFlow.'),
('Accenture','Associate Software Engineer','Mumbai',0,4.5,'Support and maintain applications; SQL and communication skills required.'),
('Cognizant','Programmer Analyst','Coimbatore',0,4.2,'Database driven application support with PL/SQL and Java.'),
('Deloitte','Analyst - Data','Gurugram',0,9.0,'ETL and reporting using SQL, Excel and Tableau.'),
('Goldman Sachs','Analyst - Engineering','Bengaluru',0,22.0,'Low-latency systems using C++/Java and strong problem solving.'),
('Google','Software Engineer','Bengaluru',0,32.0,'Design large scale systems; excellent DS/Algo and system design.'),
('Wipro','Project Engineer','Pune',0,3.6,'Web application development with HTML, CSS, JavaScript and MySQL.'),
('Persistent Systems','Full Stack Developer','Pune',0,8.0,'MERN stack development with MongoDB and REST APIs.');

-- ---------- JOB <-> SKILL mapping (weights show importance) ----------
-- TCS Digital
INSERT INTO job_skills (job_id, skill_id, weight) VALUES
((SELECT job_id FROM jobs WHERE company='TCS Digital'), (SELECT skill_id FROM skills WHERE skill_name='Java'),1),
((SELECT job_id FROM jobs WHERE company='TCS Digital'), (SELECT skill_id FROM skills WHERE skill_name='SQL'),1),
((SELECT job_id FROM jobs WHERE company='TCS Digital'), (SELECT skill_id FROM skills WHERE skill_name='HTML'),0.6),
((SELECT job_id FROM jobs WHERE company='TCS Digital'), (SELECT skill_id FROM skills WHERE skill_name='CSS'),0.6),
((SELECT job_id FROM jobs WHERE company='TCS Digital'), (SELECT skill_id FROM skills WHERE skill_name='Git'),0.5),
((SELECT job_id FROM jobs WHERE company='TCS Digital'), (SELECT skill_id FROM skills WHERE skill_name='Communication'),0.7),
-- Infosys
((SELECT job_id FROM jobs WHERE company='Infosys'), (SELECT skill_id FROM skills WHERE skill_name='Python'),1),
((SELECT job_id FROM jobs WHERE company='Infosys'), (SELECT skill_id FROM skills WHERE skill_name='Django'),0.9),
((SELECT job_id FROM jobs WHERE company='Infosys'), (SELECT skill_id FROM skills WHERE skill_name='SQL'),1),
((SELECT job_id FROM jobs WHERE company='Infosys'), (SELECT skill_id FROM skills WHERE skill_name='OOP'),0.7),
-- Amazon
((SELECT job_id FROM jobs WHERE company='Amazon'), (SELECT skill_id FROM skills WHERE skill_name='Data Structures'),1),
((SELECT job_id FROM jobs WHERE company='Amazon'), (SELECT skill_id FROM skills WHERE skill_name='Algorithms'),1),
((SELECT job_id FROM jobs WHERE company='Amazon'), (SELECT skill_id FROM skills WHERE skill_name='Java'),0.8),
((SELECT job_id FROM jobs WHERE company='Amazon'), (SELECT skill_id FROM skills WHERE skill_name='AWS'),0.9),
((SELECT job_id FROM jobs WHERE company='Amazon'), (SELECT skill_id FROM skills WHERE skill_name='Problem Solving'),0.8),
-- Microsoft
((SELECT job_id FROM jobs WHERE company='Microsoft'), (SELECT skill_id FROM skills WHERE skill_name='C++'),1),
((SELECT job_id FROM jobs WHERE company='Microsoft'), (SELECT skill_id FROM skills WHERE skill_name='Data Structures'),1),
((SELECT job_id FROM jobs WHERE company='Microsoft'), (SELECT skill_id FROM skills WHERE skill_name='Algorithms'),1),
((SELECT job_id FROM jobs WHERE company='Microsoft'), (SELECT skill_id FROM skills WHERE skill_name='Azure'),0.7),
-- Zoho
((SELECT job_id FROM jobs WHERE company='Zoho'), (SELECT skill_id FROM skills WHERE skill_name='Java'),0.8),
((SELECT job_id FROM jobs WHERE company='Zoho'), (SELECT skill_id FROM skills WHERE skill_name='JavaScript'),1),
((SELECT job_id FROM jobs WHERE company='Zoho'), (SELECT skill_id FROM skills WHERE skill_name='MySQL'),1),
((SELECT job_id FROM jobs WHERE company='Zoho'), (SELECT skill_id FROM skills WHERE skill_name='Problem Solving'),0.7),
-- Freshworks
((SELECT job_id FROM jobs WHERE company='Freshworks'), (SELECT skill_id FROM skills WHERE skill_name='Node.js'),1),
((SELECT job_id FROM jobs WHERE company='Freshworks'), (SELECT skill_id FROM skills WHERE skill_name='React'),1),
((SELECT job_id FROM jobs WHERE company='Freshworks'), (SELECT skill_id FROM skills WHERE skill_name='REST API'),0.9),
((SELECT job_id FROM jobs WHERE company='Freshworks'), (SELECT skill_id FROM skills WHERE skill_name='MongoDB'),0.6),
-- Flipkart
((SELECT job_id FROM jobs WHERE company='Flipkart'), (SELECT skill_id FROM skills WHERE skill_name='SQL'),1),
((SELECT job_id FROM jobs WHERE company='Flipkart'), (SELECT skill_id FROM skills WHERE skill_name='Python'),0.9),
((SELECT job_id FROM jobs WHERE company='Flipkart'), (SELECT skill_id FROM skills WHERE skill_name='Pandas'),0.9),
((SELECT job_id FROM jobs WHERE company='Flipkart'), (SELECT skill_id FROM skills WHERE skill_name='Power BI'),0.8),
-- Swiggy
((SELECT job_id FROM jobs WHERE company='Swiggy'), (SELECT skill_id FROM skills WHERE skill_name='Machine Learning'),1),
((SELECT job_id FROM jobs WHERE company='Swiggy'), (SELECT skill_id FROM skills WHERE skill_name='TensorFlow'),0.9),
((SELECT job_id FROM jobs WHERE company='Swiggy'), (SELECT skill_id FROM skills WHERE skill_name='Python'),1),
((SELECT job_id FROM jobs WHERE company='Swiggy'), (SELECT skill_id FROM skills WHERE skill_name='NLP'),0.7),
-- Accenture
((SELECT job_id FROM jobs WHERE company='Accenture'), (SELECT skill_id FROM skills WHERE skill_name='SQL'),0.9),
((SELECT job_id FROM jobs WHERE company='Accenture'), (SELECT skill_id FROM skills WHERE skill_name='Communication'),1),
((SELECT job_id FROM jobs WHERE company='Accenture'), (SELECT skill_id FROM skills WHERE skill_name='Teamwork'),0.8),
-- Cognizant
((SELECT job_id FROM jobs WHERE company='Cognizant'), (SELECT skill_id FROM skills WHERE skill_name='PL/SQL'),1),
((SELECT job_id FROM jobs WHERE company='Cognizant'), (SELECT skill_id FROM skills WHERE skill_name='Java'),0.8),
((SELECT job_id FROM jobs WHERE company='Cognizant'), (SELECT skill_id FROM skills WHERE skill_name='Oracle'),0.8),
-- Deloitte
((SELECT job_id FROM jobs WHERE company='Deloitte'), (SELECT skill_id FROM skills WHERE skill_name='SQL'),1),
((SELECT job_id FROM jobs WHERE company='Deloitte'), (SELECT skill_id FROM skills WHERE skill_name='Excel'),0.8),
((SELECT job_id FROM jobs WHERE company='Deloitte'), (SELECT skill_id FROM skills WHERE skill_name='Tableau'),0.8),
-- Goldman Sachs
((SELECT job_id FROM jobs WHERE company='Goldman Sachs'), (SELECT skill_id FROM skills WHERE skill_name='C++'),1),
((SELECT job_id FROM jobs WHERE company='Goldman Sachs'), (SELECT skill_id FROM skills WHERE skill_name='Algorithms'),1),
((SELECT job_id FROM jobs WHERE company='Goldman Sachs'), (SELECT skill_id FROM skills WHERE skill_name='Problem Solving'),1),
-- Google
((SELECT job_id FROM jobs WHERE company='Google'), (SELECT skill_id FROM skills WHERE skill_name='Data Structures'),1),
((SELECT job_id FROM jobs WHERE company='Google'), (SELECT skill_id FROM skills WHERE skill_name='Algorithms'),1),
((SELECT job_id FROM jobs WHERE company='Google'), (SELECT skill_id FROM skills WHERE skill_name='Python'),0.8),
((SELECT job_id FROM jobs WHERE company='Google'), (SELECT skill_id FROM skills WHERE skill_name='Linux'),0.6),
-- Wipro
((SELECT job_id FROM jobs WHERE company='Wipro'), (SELECT skill_id FROM skills WHERE skill_name='HTML'),1),
((SELECT job_id FROM jobs WHERE company='Wipro'), (SELECT skill_id FROM skills WHERE skill_name='CSS'),1),
((SELECT job_id FROM jobs WHERE company='Wipro'), (SELECT skill_id FROM skills WHERE skill_name='JavaScript'),0.9),
((SELECT job_id FROM jobs WHERE company='Wipro'), (SELECT skill_id FROM skills WHERE skill_name='MySQL'),0.9),
-- Persistent
((SELECT job_id FROM jobs WHERE company='Persistent Systems'), (SELECT skill_id FROM skills WHERE skill_name='React'),1),
((SELECT job_id FROM jobs WHERE company='Persistent Systems'), (SELECT skill_id FROM skills WHERE skill_name='Node.js'),1),
((SELECT job_id FROM jobs WHERE company='Persistent Systems'), (SELECT skill_id FROM skills WHERE skill_name='MongoDB'),0.9),
((SELECT job_id FROM jobs WHERE company='Persistent Systems'), (SELECT skill_id FROM skills WHERE skill_name='Express'),0.8);

-- ---------- DEMO USER ----------
-- password for the demo account is: demo1234
-- (sha256 of "demo1234" is computed by the server; this row is created in code)
