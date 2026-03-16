-- Migration 029: Seed lab marker demo data for all profiles
-- Fills gaps: ~80 lab markers x 3 profiles x 2 timepoints = ~480 measurements
-- Only inserts where marker has no existing demo data for that profile
-- Device: SYNLAB Vienna (00000000-0000-0000-0000-000000000014)

CREATE TEMP TABLE _demo_lab (
    slug TEXT,
    profile TEXT,
    ts TIMESTAMPTZ,
    val TEXT,
    unit TEXT,
    status TEXT,
    diet TEXT,
    sleep_hrs NUMERIC(4,1),
    sleep_q TEXT,
    exercise TEXT,
    stress INT
);

INSERT INTO _demo_lab (slug, profile, ts, val, unit, status, diet, sleep_hrs, sleep_q, exercise, stress) VALUES
-- ============================================================
-- LIPIDS / CARDIOVASCULAR
-- ============================================================

-- ldl_c (mmol/L)
('ldl_c','optimized','2025-12-15 09:30+01','3.0','mmol/L','green','carnivore',7.5,'good','moderate',2),
('ldl_c','optimized','2026-02-17 10:15+01','2.9','mmol/L','green','carnivore',8.0,'excellent','moderate',1),
('ldl_c','average','2025-12-16 10:00+01','3.7','mmol/L','orange','mixed',6.5,'fair','light',5),
('ldl_c','average','2026-02-18 09:45+01','3.8','mmol/L','orange','mixed',6.5,'fair','light',5),
('ldl_c','at_risk','2025-12-17 11:00+01','4.4','mmol/L','red','mixed',5.0,'poor',NULL,8),
('ldl_c','at_risk','2026-02-19 10:30+01','4.7','mmol/L','red','mixed',5.0,'poor',NULL,8),

-- hdl_c (mmol/L)
('hdl_c','optimized','2025-12-15 09:30+01','1.72','mmol/L','green','carnivore',7.5,'good','moderate',2),
('hdl_c','optimized','2026-02-17 10:15+01','1.80','mmol/L','green','carnivore',8.0,'excellent','moderate',1),
('hdl_c','average','2025-12-16 10:00+01','1.10','mmol/L','orange','mixed',6.5,'fair','light',5),
('hdl_c','average','2026-02-18 09:45+01','1.08','mmol/L','orange','mixed',6.5,'fair','light',5),
('hdl_c','at_risk','2025-12-17 11:00+01','0.85','mmol/L','red','mixed',5.0,'poor',NULL,8),
('hdl_c','at_risk','2026-02-19 10:30+01','0.78','mmol/L','red','mixed',5.0,'poor',NULL,8),

-- triglycerides (mmol/L)
('triglycerides','optimized','2025-12-15 09:30+01','0.62','mmol/L','green','carnivore',7.5,'good','moderate',2),
('triglycerides','optimized','2026-02-17 10:15+01','0.57','mmol/L','green','carnivore',8.0,'excellent','moderate',1),
('triglycerides','average','2025-12-16 10:00+01','1.65','mmol/L','orange','mixed',6.5,'fair','light',5),
('triglycerides','average','2026-02-18 09:45+01','1.70','mmol/L','orange','mixed',6.5,'fair','light',5),
('triglycerides','at_risk','2025-12-17 11:00+01','2.80','mmol/L','red','mixed',5.0,'poor',NULL,8),
('triglycerides','at_risk','2026-02-19 10:30+01','3.10','mmol/L','red','mixed',5.0,'poor',NULL,8),

-- apob (g/L)
('apob','optimized','2025-12-15 09:30+01','0.80','g/L','green','carnivore',7.5,'good','moderate',2),
('apob','optimized','2026-02-17 10:15+01','0.78','g/L','green','carnivore',8.0,'excellent','moderate',1),
('apob','average','2025-12-16 10:00+01','1.20','g/L','orange','mixed',6.5,'fair','light',5),
('apob','average','2026-02-18 09:45+01','1.22','g/L','orange','mixed',6.5,'fair','light',5),
('apob','at_risk','2025-12-17 11:00+01','1.55','g/L','red','mixed',5.0,'poor',NULL,8),
('apob','at_risk','2026-02-19 10:30+01','1.65','g/L','red','mixed',5.0,'poor',NULL,8),

-- lpa (nmol/L)
('lpa','optimized','2025-12-15 09:30+01','38','nmol/L','green','carnivore',7.5,'good','moderate',2),
('lpa','optimized','2026-02-17 10:15+01','36','nmol/L','green','carnivore',8.0,'excellent','moderate',1),
('lpa','average','2025-12-16 10:00+01','68','nmol/L','orange','mixed',6.5,'fair','light',5),
('lpa','average','2026-02-18 09:45+01','70','nmol/L','orange','mixed',6.5,'fair','light',5),
('lpa','at_risk','2025-12-17 11:00+01','95','nmol/L','red','mixed',5.0,'poor',NULL,8),
('lpa','at_risk','2026-02-19 10:30+01','110','nmol/L','red','mixed',5.0,'poor',NULL,8),

-- non_hdl_c (mmol/L)
('non_hdl_c','optimized','2025-12-15 09:30+01','2.40','mmol/L','green','carnivore',7.5,'good','moderate',2),
('non_hdl_c','optimized','2026-02-17 10:15+01','2.30','mmol/L','green','carnivore',8.0,'excellent','moderate',1),
('non_hdl_c','average','2025-12-16 10:00+01','3.80','mmol/L','orange','mixed',6.5,'fair','light',5),
('non_hdl_c','average','2026-02-18 09:45+01','3.85','mmol/L','orange','mixed',6.5,'fair','light',5),
('non_hdl_c','at_risk','2025-12-17 11:00+01','4.70','mmol/L','red','mixed',5.0,'poor',NULL,8),
('non_hdl_c','at_risk','2026-02-19 10:30+01','5.00','mmol/L','red','mixed',5.0,'poor',NULL,8),

-- ============================================================
-- METABOLIC
-- ============================================================

-- insulin (mU/L same as µIU/mL)
('insulin','optimized','2025-12-15 09:30+01','2.8','µIU/mL','green','carnivore',7.5,'good','moderate',2),
('insulin','optimized','2026-02-17 10:15+01','2.5','µIU/mL','green','carnivore',8.0,'excellent','moderate',1),
('insulin','average','2025-12-16 10:00+01','10.0','µIU/mL','orange','mixed',6.5,'fair','light',5),
('insulin','average','2026-02-18 09:45+01','10.5','µIU/mL','orange','mixed',6.5,'fair','light',5),
('insulin','at_risk','2025-12-17 11:00+01','20.0','µIU/mL','red','mixed',5.0,'poor',NULL,8),
('insulin','at_risk','2026-02-19 10:30+01','23.0','µIU/mL','red','mixed',5.0,'poor',NULL,8),

-- hba1c (%)
('hba1c','optimized','2025-12-15 09:30+01','4.8','%','green','carnivore',7.5,'good','moderate',2),
('hba1c','optimized','2026-02-17 10:15+01','4.7','%','green','carnivore',8.0,'excellent','moderate',1),
('hba1c','average','2025-12-16 10:00+01','5.6','%','orange','mixed',6.5,'fair','light',5),
('hba1c','average','2026-02-18 09:45+01','5.7','%','orange','mixed',6.5,'fair','light',5),
('hba1c','at_risk','2025-12-17 11:00+01','6.6','%','red','mixed',5.0,'poor',NULL,8),
('hba1c','at_risk','2026-02-19 10:30+01','6.9','%','red','mixed',5.0,'poor',NULL,8),

-- ============================================================
-- THYROID
-- ============================================================

-- tsh (mIU/L)
('tsh','optimized','2025-12-15 09:30+01','2.0','mIU/L','green','carnivore',7.5,'good','moderate',2),
('tsh','optimized','2026-02-17 10:15+01','1.8','mIU/L','green','carnivore',8.0,'excellent','moderate',1),
('tsh','average','2025-12-16 10:00+01','3.0','mIU/L','orange','mixed',6.5,'fair','light',5),
('tsh','average','2026-02-18 09:45+01','3.1','mIU/L','orange','mixed',6.5,'fair','light',5),
('tsh','at_risk','2025-12-17 11:00+01','4.0','mIU/L','red','mixed',5.0,'poor',NULL,8),
('tsh','at_risk','2026-02-19 10:30+01','4.5','mIU/L','red','mixed',5.0,'poor',NULL,8),

-- ft4 (pmol/L)
('ft4','optimized','2025-12-15 09:30+01','16.5','pmol/L','green','carnivore',7.5,'good','moderate',2),
('ft4','optimized','2026-02-17 10:15+01','17.0','pmol/L','green','carnivore',8.0,'excellent','moderate',1),
('ft4','average','2025-12-16 10:00+01','14.0','pmol/L','orange','mixed',6.5,'fair','light',5),
('ft4','average','2026-02-18 09:45+01','13.8','pmol/L','orange','mixed',6.5,'fair','light',5),
('ft4','at_risk','2025-12-17 11:00+01','12.0','pmol/L','red','mixed',5.0,'poor',NULL,8),
('ft4','at_risk','2026-02-19 10:30+01','11.5','pmol/L','red','mixed',5.0,'poor',NULL,8),

-- ft3 (pmol/L)
('ft3','optimized','2025-12-15 09:30+01','5.0','pmol/L','green','carnivore',7.5,'good','moderate',2),
('ft3','optimized','2026-02-17 10:15+01','5.2','pmol/L','green','carnivore',8.0,'excellent','moderate',1),
('ft3','average','2025-12-16 10:00+01','3.8','pmol/L','orange','mixed',6.5,'fair','light',5),
('ft3','average','2026-02-18 09:45+01','3.7','pmol/L','orange','mixed',6.5,'fair','light',5),
('ft3','at_risk','2025-12-17 11:00+01','3.2','pmol/L','red','mixed',5.0,'poor',NULL,8),
('ft3','at_risk','2026-02-19 10:30+01','3.0','pmol/L','red','mixed',5.0,'poor',NULL,8),

-- ============================================================
-- HORMONES (male profiles)
-- ============================================================

-- testosterone (nmol/L)
('testosterone','optimized','2025-12-15 09:30+01','21.0','nmol/L','green','carnivore',7.5,'good','moderate',2),
('testosterone','optimized','2026-02-17 10:15+01','22.5','nmol/L','green','carnivore',8.0,'excellent','moderate',1),
('testosterone','average','2025-12-16 10:00+01','14.0','nmol/L','orange','mixed',6.5,'fair','light',5),
('testosterone','average','2026-02-18 09:45+01','13.5','nmol/L','orange','mixed',6.5,'fair','light',5),
('testosterone','at_risk','2025-12-17 11:00+01','8.5','nmol/L','red','mixed',5.0,'poor',NULL,8),
('testosterone','at_risk','2026-02-19 10:30+01','7.8','nmol/L','red','mixed',5.0,'poor',NULL,8),

-- free_testosterone (pmol/L)
('free_testosterone','optimized','2025-12-15 09:30+01','420','pmol/L','green','carnivore',7.5,'good','moderate',2),
('free_testosterone','optimized','2026-02-17 10:15+01','440','pmol/L','green','carnivore',8.0,'excellent','moderate',1),
('free_testosterone','average','2025-12-16 10:00+01','250','pmol/L','orange','mixed',6.5,'fair','light',5),
('free_testosterone','average','2026-02-18 09:45+01','240','pmol/L','orange','mixed',6.5,'fair','light',5),
('free_testosterone','at_risk','2025-12-17 11:00+01','145','pmol/L','red','mixed',5.0,'poor',NULL,8),
('free_testosterone','at_risk','2026-02-19 10:30+01','130','pmol/L','red','mixed',5.0,'poor',NULL,8),

-- shbg (nmol/L)
('shbg','optimized','2025-12-15 09:30+01','32','nmol/L','green','carnivore',7.5,'good','moderate',2),
('shbg','optimized','2026-02-17 10:15+01','30','nmol/L','green','carnivore',8.0,'excellent','moderate',1),
('shbg','average','2025-12-16 10:00+01','42','nmol/L','orange','mixed',6.5,'fair','light',5),
('shbg','average','2026-02-18 09:45+01','44','nmol/L','orange','mixed',6.5,'fair','light',5),
('shbg','at_risk','2025-12-17 11:00+01','58','nmol/L','red','mixed',5.0,'poor',NULL,8),
('shbg','at_risk','2026-02-19 10:30+01','62','nmol/L','red','mixed',5.0,'poor',NULL,8),

-- estradiol (pmol/L)
('estradiol','optimized','2025-12-15 09:30+01','88','pmol/L','green','carnivore',7.5,'good','moderate',2),
('estradiol','optimized','2026-02-17 10:15+01','82','pmol/L','green','carnivore',8.0,'excellent','moderate',1),
('estradiol','average','2025-12-16 10:00+01','120','pmol/L','orange','mixed',6.5,'fair','light',5),
('estradiol','average','2026-02-18 09:45+01','125','pmol/L','orange','mixed',6.5,'fair','light',5),
('estradiol','at_risk','2025-12-17 11:00+01','155','pmol/L','red','mixed',5.0,'poor',NULL,8),
('estradiol','at_risk','2026-02-19 10:30+01','170','pmol/L','red','mixed',5.0,'poor',NULL,8),

-- dheas (µmol/L)
('dheas','optimized','2025-12-15 09:30+01','5.2','µmol/L','green','carnivore',7.5,'good','moderate',2),
('dheas','optimized','2026-02-17 10:15+01','5.5','µmol/L','green','carnivore',8.0,'excellent','moderate',1),
('dheas','average','2025-12-16 10:00+01','3.2','µmol/L','orange','mixed',6.5,'fair','light',5),
('dheas','average','2026-02-18 09:45+01','3.0','µmol/L','orange','mixed',6.5,'fair','light',5),
('dheas','at_risk','2025-12-17 11:00+01','2.0','µmol/L','red','mixed',5.0,'poor',NULL,8),
('dheas','at_risk','2026-02-19 10:30+01','1.8','µmol/L','red','mixed',5.0,'poor',NULL,8),

-- fsh (IU/L)
('fsh','optimized','2025-12-15 09:30+01','4.5','IU/L','green','carnivore',7.5,'good','moderate',2),
('fsh','optimized','2026-02-17 10:15+01','4.2','IU/L','green','carnivore',8.0,'excellent','moderate',1),
('fsh','average','2025-12-16 10:00+01','6.5','IU/L','orange','mixed',6.5,'fair','light',5),
('fsh','average','2026-02-18 09:45+01','6.8','IU/L','orange','mixed',6.5,'fair','light',5),
('fsh','at_risk','2025-12-17 11:00+01','10.0','IU/L','red','mixed',5.0,'poor',NULL,8),
('fsh','at_risk','2026-02-19 10:30+01','11.5','IU/L','red','mixed',5.0,'poor',NULL,8),

-- lh (IU/L)
('lh','optimized','2025-12-15 09:30+01','4.0','IU/L','green','carnivore',7.5,'good','moderate',2),
('lh','optimized','2026-02-17 10:15+01','3.8','IU/L','green','carnivore',8.0,'excellent','moderate',1),
('lh','average','2025-12-16 10:00+01','5.5','IU/L','orange','mixed',6.5,'fair','light',5),
('lh','average','2026-02-18 09:45+01','5.8','IU/L','orange','mixed',6.5,'fair','light',5),
('lh','at_risk','2025-12-17 11:00+01','7.5','IU/L','red','mixed',5.0,'poor',NULL,8),
('lh','at_risk','2026-02-19 10:30+01','8.5','IU/L','red','mixed',5.0,'poor',NULL,8),

-- prolactin (mIU/L)
('prolactin','optimized','2025-12-15 09:30+01','150','mIU/L','green','carnivore',7.5,'good','moderate',2),
('prolactin','optimized','2026-02-17 10:15+01','140','mIU/L','green','carnivore',8.0,'excellent','moderate',1),
('prolactin','average','2025-12-16 10:00+01','230','mIU/L','orange','mixed',6.5,'fair','light',5),
('prolactin','average','2026-02-18 09:45+01','240','mIU/L','orange','mixed',6.5,'fair','light',5),
('prolactin','at_risk','2025-12-17 11:00+01','310','mIU/L','red','mixed',5.0,'poor',NULL,8),
('prolactin','at_risk','2026-02-19 10:30+01','350','mIU/L','red','mixed',5.0,'poor',NULL,8),

-- progesterone (nmol/L)
('progesterone','optimized','2025-12-15 09:30+01','0.65','nmol/L','green','carnivore',7.5,'good','moderate',2),
('progesterone','optimized','2026-02-17 10:15+01','0.60','nmol/L','green','carnivore',8.0,'excellent','moderate',1),
('progesterone','average','2025-12-16 10:00+01','0.80','nmol/L','orange','mixed',6.5,'fair','light',5),
('progesterone','average','2026-02-18 09:45+01','0.85','nmol/L','orange','mixed',6.5,'fair','light',5),
('progesterone','at_risk','2025-12-17 11:00+01','1.10','nmol/L','red','mixed',5.0,'poor',NULL,8),
('progesterone','at_risk','2026-02-19 10:30+01','1.25','nmol/L','red','mixed',5.0,'poor',NULL,8),

-- free_androgen_index (ratio, unitless)
('free_androgen_index','optimized','2025-12-15 09:30+01','65','ratio','green','carnivore',7.5,'good','moderate',2),
('free_androgen_index','optimized','2026-02-17 10:15+01','70','ratio','green','carnivore',8.0,'excellent','moderate',1),
('free_androgen_index','average','2025-12-16 10:00+01','40','ratio','orange','mixed',6.5,'fair','light',5),
('free_androgen_index','average','2026-02-18 09:45+01','38','ratio','orange','mixed',6.5,'fair','light',5),
('free_androgen_index','at_risk','2025-12-17 11:00+01','20','ratio','red','mixed',5.0,'poor',NULL,8),
('free_androgen_index','at_risk','2026-02-19 10:30+01','18','ratio','red','mixed',5.0,'poor',NULL,8),

-- ============================================================
-- LIVER
-- ============================================================

-- alt (U/L)
('alt','optimized','2025-12-15 09:30+01','20','U/L','green','carnivore',7.5,'good','moderate',2),
('alt','optimized','2026-02-17 10:15+01','18','U/L','green','carnivore',8.0,'excellent','moderate',1),
('alt','average','2025-12-16 10:00+01','35','U/L','orange','mixed',6.5,'fair','light',5),
('alt','average','2026-02-18 09:45+01','36','U/L','orange','mixed',6.5,'fair','light',5),
('alt','at_risk','2025-12-17 11:00+01','52','U/L','red','mixed',5.0,'poor',NULL,8),
('alt','at_risk','2026-02-19 10:30+01','58','U/L','red','mixed',5.0,'poor',NULL,8),

-- ast (U/L)
('ast','optimized','2025-12-15 09:30+01','18','U/L','green','carnivore',7.5,'good','moderate',2),
('ast','optimized','2026-02-17 10:15+01','17','U/L','green','carnivore',8.0,'excellent','moderate',1),
('ast','average','2025-12-16 10:00+01','29','U/L','orange','mixed',6.5,'fair','light',5),
('ast','average','2026-02-18 09:45+01','30','U/L','orange','mixed',6.5,'fair','light',5),
('ast','at_risk','2025-12-17 11:00+01','40','U/L','red','mixed',5.0,'poor',NULL,8),
('ast','at_risk','2026-02-19 10:30+01','45','U/L','red','mixed',5.0,'poor',NULL,8),

-- ggt (U/L)
('ggt','optimized','2025-12-15 09:30+01','20','U/L','green','carnivore',7.5,'good','moderate',2),
('ggt','optimized','2026-02-17 10:15+01','18','U/L','green','carnivore',8.0,'excellent','moderate',1),
('ggt','average','2025-12-16 10:00+01','55','U/L','orange','mixed',6.5,'fair','light',5),
('ggt','average','2026-02-18 09:45+01','58','U/L','orange','mixed',6.5,'fair','light',5),
('ggt','at_risk','2025-12-17 11:00+01','95','U/L','red','mixed',5.0,'poor',NULL,8),
('ggt','at_risk','2026-02-19 10:30+01','105','U/L','red','mixed',5.0,'poor',NULL,8),

-- alp (U/L)
('alp','optimized','2025-12-15 09:30+01','60','U/L','green','carnivore',7.5,'good','moderate',2),
('alp','optimized','2026-02-17 10:15+01','58','U/L','green','carnivore',8.0,'excellent','moderate',1),
('alp','average','2025-12-16 10:00+01','85','U/L','orange','mixed',6.5,'fair','light',5),
('alp','average','2026-02-18 09:45+01','88','U/L','orange','mixed',6.5,'fair','light',5),
('alp','at_risk','2025-12-17 11:00+01','120','U/L','red','mixed',5.0,'poor',NULL,8),
('alp','at_risk','2026-02-19 10:30+01','130','U/L','red','mixed',5.0,'poor',NULL,8),

-- ldh (U/L)
('ldh','optimized','2025-12-15 09:30+01','160','U/L','green','carnivore',7.5,'good','moderate',2),
('ldh','optimized','2026-02-17 10:15+01','155','U/L','green','carnivore',8.0,'excellent','moderate',1),
('ldh','average','2025-12-16 10:00+01','200','U/L','orange','mixed',6.5,'fair','light',5),
('ldh','average','2026-02-18 09:45+01','205','U/L','orange','mixed',6.5,'fair','light',5),
('ldh','at_risk','2025-12-17 11:00+01','245','U/L','red','mixed',5.0,'poor',NULL,8),
('ldh','at_risk','2026-02-19 10:30+01','260','U/L','red','mixed',5.0,'poor',NULL,8),

-- bilirubin_total (µmol/L)
('bilirubin_total','optimized','2025-12-15 09:30+01','12','µmol/L','green','carnivore',7.5,'good','moderate',2),
('bilirubin_total','optimized','2026-02-17 10:15+01','11','µmol/L','green','carnivore',8.0,'excellent','moderate',1),
('bilirubin_total','average','2025-12-16 10:00+01','14','µmol/L','orange','mixed',6.5,'fair','light',5),
('bilirubin_total','average','2026-02-18 09:45+01','15','µmol/L','orange','mixed',6.5,'fair','light',5),
('bilirubin_total','at_risk','2025-12-17 11:00+01','18','µmol/L','red','mixed',5.0,'poor',NULL,8),
('bilirubin_total','at_risk','2026-02-19 10:30+01','21','µmol/L','red','mixed',5.0,'poor',NULL,8),

-- bilirubin_direct (µmol/L)
('bilirubin_direct','optimized','2025-12-15 09:30+01','2.0','µmol/L','green','carnivore',7.5,'good','moderate',2),
('bilirubin_direct','optimized','2026-02-17 10:15+01','1.8','µmol/L','green','carnivore',8.0,'excellent','moderate',1),
('bilirubin_direct','average','2025-12-16 10:00+01','3.0','µmol/L','orange','mixed',6.5,'fair','light',5),
('bilirubin_direct','average','2026-02-18 09:45+01','3.2','µmol/L','orange','mixed',6.5,'fair','light',5),
('bilirubin_direct','at_risk','2025-12-17 11:00+01','4.5','µmol/L','red','mixed',5.0,'poor',NULL,8),
('bilirubin_direct','at_risk','2026-02-19 10:30+01','5.5','µmol/L','red','mixed',5.0,'poor',NULL,8),

-- ============================================================
-- KIDNEY
-- ============================================================

-- creatinine (µmol/L)
('creatinine','optimized','2025-12-15 09:30+01','82','µmol/L','green','carnivore',7.5,'good','moderate',2),
('creatinine','optimized','2026-02-17 10:15+01','80','µmol/L','green','carnivore',8.0,'excellent','moderate',1),
('creatinine','average','2025-12-16 10:00+01','92','µmol/L','orange','mixed',6.5,'fair','light',5),
('creatinine','average','2026-02-18 09:45+01','94','µmol/L','orange','mixed',6.5,'fair','light',5),
('creatinine','at_risk','2025-12-17 11:00+01','108','µmol/L','red','mixed',5.0,'poor',NULL,8),
('creatinine','at_risk','2026-02-19 10:30+01','115','µmol/L','red','mixed',5.0,'poor',NULL,8),

-- egfr (mL/min)
('egfr','optimized','2025-12-15 09:30+01','102','mL/min','green','carnivore',7.5,'good','moderate',2),
('egfr','optimized','2026-02-17 10:15+01','105','mL/min','green','carnivore',8.0,'excellent','moderate',1),
('egfr','average','2025-12-16 10:00+01','82','mL/min','orange','mixed',6.5,'fair','light',5),
('egfr','average','2026-02-18 09:45+01','80','mL/min','orange','mixed',6.5,'fair','light',5),
('egfr','at_risk','2025-12-17 11:00+01','58','mL/min','red','mixed',5.0,'poor',NULL,8),
('egfr','at_risk','2026-02-19 10:30+01','54','mL/min','red','mixed',5.0,'poor',NULL,8),

-- cystatin_c (mg/L)
('cystatin_c','optimized','2025-12-15 09:30+01','0.68','mg/L','green','carnivore',7.5,'good','moderate',2),
('cystatin_c','optimized','2026-02-17 10:15+01','0.65','mg/L','green','carnivore',8.0,'excellent','moderate',1),
('cystatin_c','average','2025-12-16 10:00+01','0.88','mg/L','orange','mixed',6.5,'fair','light',5),
('cystatin_c','average','2026-02-18 09:45+01','0.90','mg/L','orange','mixed',6.5,'fair','light',5),
('cystatin_c','at_risk','2025-12-17 11:00+01','1.10','mg/L','red','mixed',5.0,'poor',NULL,8),
('cystatin_c','at_risk','2026-02-19 10:30+01','1.20','mg/L','red','mixed',5.0,'poor',NULL,8),

-- ============================================================
-- PROTEINS / IRON
-- ============================================================

-- albumin (g/L)
('albumin','optimized','2025-12-15 09:30+01','45','g/L','green','carnivore',7.5,'good','moderate',2),
('albumin','optimized','2026-02-17 10:15+01','46','g/L','green','carnivore',8.0,'excellent','moderate',1),
('albumin','average','2025-12-16 10:00+01','40','g/L','orange','mixed',6.5,'fair','light',5),
('albumin','average','2026-02-18 09:45+01','39','g/L','orange','mixed',6.5,'fair','light',5),
('albumin','at_risk','2025-12-17 11:00+01','35','g/L','red','mixed',5.0,'poor',NULL,8),
('albumin','at_risk','2026-02-19 10:30+01','33','g/L','red','mixed',5.0,'poor',NULL,8),

-- total_protein (g/L)
('total_protein','optimized','2025-12-15 09:30+01','72','g/L','green','carnivore',7.5,'good','moderate',2),
('total_protein','optimized','2026-02-17 10:15+01','73','g/L','green','carnivore',8.0,'excellent','moderate',1),
('total_protein','average','2025-12-16 10:00+01','68','g/L','orange','mixed',6.5,'fair','light',5),
('total_protein','average','2026-02-18 09:45+01','67','g/L','orange','mixed',6.5,'fair','light',5),
('total_protein','at_risk','2025-12-17 11:00+01','62','g/L','red','mixed',5.0,'poor',NULL,8),
('total_protein','at_risk','2026-02-19 10:30+01','60','g/L','red','mixed',5.0,'poor',NULL,8),

-- iron (µmol/L)
('iron','optimized','2025-12-15 09:30+01','22','µmol/L','green','carnivore',7.5,'good','moderate',2),
('iron','optimized','2026-02-17 10:15+01','23','µmol/L','green','carnivore',8.0,'excellent','moderate',1),
('iron','average','2025-12-16 10:00+01','15','µmol/L','orange','mixed',6.5,'fair','light',5),
('iron','average','2026-02-18 09:45+01','14.5','µmol/L','orange','mixed',6.5,'fair','light',5),
('iron','at_risk','2025-12-17 11:00+01','10','µmol/L','red','mixed',5.0,'poor',NULL,8),
('iron','at_risk','2026-02-19 10:30+01','9.0','µmol/L','red','mixed',5.0,'poor',NULL,8),

-- ferritin (µg/L)
('ferritin','optimized','2025-12-15 09:30+01','100','µg/L','green','carnivore',7.5,'good','moderate',2),
('ferritin','optimized','2026-02-17 10:15+01','95','µg/L','green','carnivore',8.0,'excellent','moderate',1),
('ferritin','average','2025-12-16 10:00+01','200','µg/L','orange','mixed',6.5,'fair','light',5),
('ferritin','average','2026-02-18 09:45+01','210','µg/L','orange','mixed',6.5,'fair','light',5),
('ferritin','at_risk','2025-12-17 11:00+01','380','µg/L','red','mixed',5.0,'poor',NULL,8),
('ferritin','at_risk','2026-02-19 10:30+01','410','µg/L','red','mixed',5.0,'poor',NULL,8),

-- transferrin (g/L)
('transferrin','optimized','2025-12-15 09:30+01','2.55','g/L','green','carnivore',7.5,'good','moderate',2),
('transferrin','optimized','2026-02-17 10:15+01','2.50','g/L','green','carnivore',8.0,'excellent','moderate',1),
('transferrin','average','2025-12-16 10:00+01','2.85','g/L','orange','mixed',6.5,'fair','light',5),
('transferrin','average','2026-02-18 09:45+01','2.90','g/L','orange','mixed',6.5,'fair','light',5),
('transferrin','at_risk','2025-12-17 11:00+01','3.30','g/L','red','mixed',5.0,'poor',NULL,8),
('transferrin','at_risk','2026-02-19 10:30+01','3.50','g/L','red','mixed',5.0,'poor',NULL,8),

-- transferrin_sat (%)
('transferrin_sat','optimized','2025-12-15 09:30+01','35','%','green','carnivore',7.5,'good','moderate',2),
('transferrin_sat','optimized','2026-02-17 10:15+01','37','%','green','carnivore',8.0,'excellent','moderate',1),
('transferrin_sat','average','2025-12-16 10:00+01','28','%','orange','mixed',6.5,'fair','light',5),
('transferrin_sat','average','2026-02-18 09:45+01','27','%','orange','mixed',6.5,'fair','light',5),
('transferrin_sat','at_risk','2025-12-17 11:00+01','18','%','red','mixed',5.0,'poor',NULL,8),
('transferrin_sat','at_risk','2026-02-19 10:30+01','16','%','red','mixed',5.0,'poor',NULL,8),

-- ============================================================
-- VITAMINS / MICRONUTRIENTS
-- ============================================================

-- vitamin_d (nmol/L)
('vitamin_d','optimized','2025-12-15 09:30+01','115','nmol/L','green','carnivore',7.5,'good','moderate',2),
('vitamin_d','optimized','2026-02-17 10:15+01','120','nmol/L','green','carnivore',8.0,'excellent','moderate',1),
('vitamin_d','average','2025-12-16 10:00+01','60','nmol/L','orange','mixed',6.5,'fair','light',5),
('vitamin_d','average','2026-02-18 09:45+01','58','nmol/L','orange','mixed',6.5,'fair','light',5),
('vitamin_d','at_risk','2025-12-17 11:00+01','35','nmol/L','red','mixed',5.0,'poor',NULL,8),
('vitamin_d','at_risk','2026-02-19 10:30+01','32','nmol/L','red','mixed',5.0,'poor',NULL,8),

-- vitamin_b12 (pmol/L)
('vitamin_b12','optimized','2025-12-15 09:30+01','480','pmol/L','green','carnivore',7.5,'good','moderate',2),
('vitamin_b12','optimized','2026-02-17 10:15+01','500','pmol/L','green','carnivore',8.0,'excellent','moderate',1),
('vitamin_b12','average','2025-12-16 10:00+01','300','pmol/L','orange','mixed',6.5,'fair','light',5),
('vitamin_b12','average','2026-02-18 09:45+01','290','pmol/L','orange','mixed',6.5,'fair','light',5),
('vitamin_b12','at_risk','2025-12-17 11:00+01','190','pmol/L','red','mixed',5.0,'poor',NULL,8),
('vitamin_b12','at_risk','2026-02-19 10:30+01','175','pmol/L','red','mixed',5.0,'poor',NULL,8),

-- folate (µg/L)
('folate','optimized','2025-12-15 09:30+01','28','µg/L','green','carnivore',7.5,'good','moderate',2),
('folate','optimized','2026-02-17 10:15+01','30','µg/L','green','carnivore',8.0,'excellent','moderate',1),
('folate','average','2025-12-16 10:00+01','14','µg/L','orange','mixed',6.5,'fair','light',5),
('folate','average','2026-02-18 09:45+01','13','µg/L','orange','mixed',6.5,'fair','light',5),
('folate','at_risk','2025-12-17 11:00+01','6.0','µg/L','red','mixed',5.0,'poor',NULL,8),
('folate','at_risk','2026-02-19 10:30+01','5.0','µg/L','red','mixed',5.0,'poor',NULL,8),

-- vitamin_b6 (nmol/L)
('vitamin_b6','optimized','2025-12-15 09:30+01','60','nmol/L','green','carnivore',7.5,'good','moderate',2),
('vitamin_b6','optimized','2026-02-17 10:15+01','65','nmol/L','green','carnivore',8.0,'excellent','moderate',1),
('vitamin_b6','average','2025-12-16 10:00+01','32','nmol/L','orange','mixed',6.5,'fair','light',5),
('vitamin_b6','average','2026-02-18 09:45+01','30','nmol/L','orange','mixed',6.5,'fair','light',5),
('vitamin_b6','at_risk','2025-12-17 11:00+01','16','nmol/L','red','mixed',5.0,'poor',NULL,8),
('vitamin_b6','at_risk','2026-02-19 10:30+01','14','nmol/L','red','mixed',5.0,'poor',NULL,8),

-- vitamin_a (µmol/L)
('vitamin_a','optimized','2025-12-15 09:30+01','2.10','µmol/L','green','carnivore',7.5,'good','moderate',2),
('vitamin_a','optimized','2026-02-17 10:15+01','2.20','µmol/L','green','carnivore',8.0,'excellent','moderate',1),
('vitamin_a','average','2025-12-16 10:00+01','1.40','µmol/L','orange','mixed',6.5,'fair','light',5),
('vitamin_a','average','2026-02-18 09:45+01','1.35','µmol/L','orange','mixed',6.5,'fair','light',5),
('vitamin_a','at_risk','2025-12-17 11:00+01','0.95','µmol/L','red','mixed',5.0,'poor',NULL,8),
('vitamin_a','at_risk','2026-02-19 10:30+01','0.88','µmol/L','red','mixed',5.0,'poor',NULL,8),

-- vitamin_e (µmol/L)
('vitamin_e','optimized','2025-12-15 09:30+01','30','µmol/L','green','carnivore',7.5,'good','moderate',2),
('vitamin_e','optimized','2026-02-17 10:15+01','32','µmol/L','green','carnivore',8.0,'excellent','moderate',1),
('vitamin_e','average','2025-12-16 10:00+01','18','µmol/L','orange','mixed',6.5,'fair','light',5),
('vitamin_e','average','2026-02-18 09:45+01','17','µmol/L','orange','mixed',6.5,'fair','light',5),
('vitamin_e','at_risk','2025-12-17 11:00+01','11','µmol/L','red','mixed',5.0,'poor',NULL,8),
('vitamin_e','at_risk','2026-02-19 10:30+01','10','µmol/L','red','mixed',5.0,'poor',NULL,8),

-- calcium (mmol/L)
('calcium','optimized','2025-12-15 09:30+01','2.38','mmol/L','green','carnivore',7.5,'good','moderate',2),
('calcium','optimized','2026-02-17 10:15+01','2.40','mmol/L','green','carnivore',8.0,'excellent','moderate',1),
('calcium','average','2025-12-16 10:00+01','2.28','mmol/L','orange','mixed',6.5,'fair','light',5),
('calcium','average','2026-02-18 09:45+01','2.26','mmol/L','orange','mixed',6.5,'fair','light',5),
('calcium','at_risk','2025-12-17 11:00+01','2.12','mmol/L','red','mixed',5.0,'poor',NULL,8),
('calcium','at_risk','2026-02-19 10:30+01','2.08','mmol/L','red','mixed',5.0,'poor',NULL,8),

-- magnesium (mmol/L)
('magnesium','optimized','2025-12-15 09:30+01','0.90','mmol/L','green','carnivore',7.5,'good','moderate',2),
('magnesium','optimized','2026-02-17 10:15+01','0.92','mmol/L','green','carnivore',8.0,'excellent','moderate',1),
('magnesium','average','2025-12-16 10:00+01','0.80','mmol/L','orange','mixed',6.5,'fair','light',5),
('magnesium','average','2026-02-18 09:45+01','0.78','mmol/L','orange','mixed',6.5,'fair','light',5),
('magnesium','at_risk','2025-12-17 11:00+01','0.68','mmol/L','red','mixed',5.0,'poor',NULL,8),
('magnesium','at_risk','2026-02-19 10:30+01','0.65','mmol/L','red','mixed',5.0,'poor',NULL,8),

-- potassium (mmol/L)
('potassium','optimized','2025-12-15 09:30+01','4.3','mmol/L','green','carnivore',7.5,'good','moderate',2),
('potassium','optimized','2026-02-17 10:15+01','4.4','mmol/L','green','carnivore',8.0,'excellent','moderate',1),
('potassium','average','2025-12-16 10:00+01','4.0','mmol/L','orange','mixed',6.5,'fair','light',5),
('potassium','average','2026-02-18 09:45+01','3.9','mmol/L','orange','mixed',6.5,'fair','light',5),
('potassium','at_risk','2025-12-17 11:00+01','3.5','mmol/L','red','mixed',5.0,'poor',NULL,8),
('potassium','at_risk','2026-02-19 10:30+01','3.3','mmol/L','red','mixed',5.0,'poor',NULL,8),

-- sodium (mmol/L)
('sodium','optimized','2025-12-15 09:30+01','140','mmol/L','green','carnivore',7.5,'good','moderate',2),
('sodium','optimized','2026-02-17 10:15+01','141','mmol/L','green','carnivore',8.0,'excellent','moderate',1),
('sodium','average','2025-12-16 10:00+01','139','mmol/L','orange','mixed',6.5,'fair','light',5),
('sodium','average','2026-02-18 09:45+01','138','mmol/L','orange','mixed',6.5,'fair','light',5),
('sodium','at_risk','2025-12-17 11:00+01','136','mmol/L','red','mixed',5.0,'poor',NULL,8),
('sodium','at_risk','2026-02-19 10:30+01','135','mmol/L','red','mixed',5.0,'poor',NULL,8),

-- zinc (µmol/L)
('zinc','optimized','2025-12-15 09:30+01','17.5','µmol/L','green','carnivore',7.5,'good','moderate',2),
('zinc','optimized','2026-02-17 10:15+01','18.0','µmol/L','green','carnivore',8.0,'excellent','moderate',1),
('zinc','average','2025-12-16 10:00+01','13.0','µmol/L','orange','mixed',6.5,'fair','light',5),
('zinc','average','2026-02-18 09:45+01','12.5','µmol/L','orange','mixed',6.5,'fair','light',5),
('zinc','at_risk','2025-12-17 11:00+01','9.5','µmol/L','red','mixed',5.0,'poor',NULL,8),
('zinc','at_risk','2026-02-19 10:30+01','8.8','µmol/L','red','mixed',5.0,'poor',NULL,8),

-- selenium (µg/L)
('selenium','optimized','2025-12-15 09:30+01','115','µg/L','green','carnivore',7.5,'good','moderate',2),
('selenium','optimized','2026-02-17 10:15+01','120','µg/L','green','carnivore',8.0,'excellent','moderate',1),
('selenium','average','2025-12-16 10:00+01','80','µg/L','orange','mixed',6.5,'fair','light',5),
('selenium','average','2026-02-18 09:45+01','78','µg/L','orange','mixed',6.5,'fair','light',5),
('selenium','at_risk','2025-12-17 11:00+01','58','µg/L','red','mixed',5.0,'poor',NULL,8),
('selenium','at_risk','2026-02-19 10:30+01','54','µg/L','red','mixed',5.0,'poor',NULL,8),

-- phosphate (mmol/L)
('phosphate','optimized','2025-12-15 09:30+01','1.10','mmol/L','green','carnivore',7.5,'good','moderate',2),
('phosphate','optimized','2026-02-17 10:15+01','1.12','mmol/L','green','carnivore',8.0,'excellent','moderate',1),
('phosphate','average','2025-12-16 10:00+01','1.00','mmol/L','orange','mixed',6.5,'fair','light',5),
('phosphate','average','2026-02-18 09:45+01','0.98','mmol/L','orange','mixed',6.5,'fair','light',5),
('phosphate','at_risk','2025-12-17 11:00+01','0.80','mmol/L','red','mixed',5.0,'poor',NULL,8),
('phosphate','at_risk','2026-02-19 10:30+01','0.75','mmol/L','red','mixed',5.0,'poor',NULL,8),

-- homocysteine (µmol/L)
('homocysteine','optimized','2025-12-15 09:30+01','7.5','µmol/L','green','carnivore',7.5,'good','moderate',2),
('homocysteine','optimized','2026-02-17 10:15+01','7.0','µmol/L','green','carnivore',8.0,'excellent','moderate',1),
('homocysteine','average','2025-12-16 10:00+01','11.5','µmol/L','orange','mixed',6.5,'fair','light',5),
('homocysteine','average','2026-02-18 09:45+01','12.0','µmol/L','orange','mixed',6.5,'fair','light',5),
('homocysteine','at_risk','2025-12-17 11:00+01','16.0','µmol/L','red','mixed',5.0,'poor',NULL,8),
('homocysteine','at_risk','2026-02-19 10:30+01','18.0','µmol/L','red','mixed',5.0,'poor',NULL,8),

-- ============================================================
-- OMEGA-3
-- ============================================================

-- omega3_index (%)
('omega3_index','optimized','2025-12-15 09:30+01','11.0','%','green','carnivore',7.5,'good','moderate',2),
('omega3_index','optimized','2026-02-17 10:15+01','11.5','%','green','carnivore',8.0,'excellent','moderate',1),
('omega3_index','average','2025-12-16 10:00+01','6.0','%','orange','mixed',6.5,'fair','light',5),
('omega3_index','average','2026-02-18 09:45+01','5.8','%','orange','mixed',6.5,'fair','light',5),
('omega3_index','at_risk','2025-12-17 11:00+01','3.5','%','red','mixed',5.0,'poor',NULL,8),
('omega3_index','at_risk','2026-02-19 10:30+01','3.2','%','red','mixed',5.0,'poor',NULL,8),

-- ============================================================
-- BLOOD COUNT
-- ============================================================

-- wbc (Gpt/L)
('wbc','optimized','2025-12-15 09:30+01','6.2','Gpt/L','green','carnivore',7.5,'good','moderate',2),
('wbc','optimized','2026-02-17 10:15+01','6.0','Gpt/L','green','carnivore',8.0,'excellent','moderate',1),
('wbc','average','2025-12-16 10:00+01','7.0','Gpt/L','orange','mixed',6.5,'fair','light',5),
('wbc','average','2026-02-18 09:45+01','7.2','Gpt/L','orange','mixed',6.5,'fair','light',5),
('wbc','at_risk','2025-12-17 11:00+01','9.5','Gpt/L','red','mixed',5.0,'poor',NULL,8),
('wbc','at_risk','2026-02-19 10:30+01','10.5','Gpt/L','red','mixed',5.0,'poor',NULL,8),

-- rbc (Tpt/L)
('rbc','optimized','2025-12-15 09:30+01','5.05','Tpt/L','green','carnivore',7.5,'good','moderate',2),
('rbc','optimized','2026-02-17 10:15+01','5.10','Tpt/L','green','carnivore',8.0,'excellent','moderate',1),
('rbc','average','2025-12-16 10:00+01','4.75','Tpt/L','orange','mixed',6.5,'fair','light',5),
('rbc','average','2026-02-18 09:45+01','4.70','Tpt/L','orange','mixed',6.5,'fair','light',5),
('rbc','at_risk','2025-12-17 11:00+01','4.25','Tpt/L','red','mixed',5.0,'poor',NULL,8),
('rbc','at_risk','2026-02-19 10:30+01','4.15','Tpt/L','red','mixed',5.0,'poor',NULL,8),

-- platelets (Gpt/L)
('platelets','optimized','2025-12-15 09:30+01','240','Gpt/L','green','carnivore',7.5,'good','moderate',2),
('platelets','optimized','2026-02-17 10:15+01','235','Gpt/L','green','carnivore',8.0,'excellent','moderate',1),
('platelets','average','2025-12-16 10:00+01','270','Gpt/L','orange','mixed',6.5,'fair','light',5),
('platelets','average','2026-02-18 09:45+01','280','Gpt/L','orange','mixed',6.5,'fair','light',5),
('platelets','at_risk','2025-12-17 11:00+01','340','Gpt/L','red','mixed',5.0,'poor',NULL,8),
('platelets','at_risk','2026-02-19 10:30+01','370','Gpt/L','red','mixed',5.0,'poor',NULL,8),

-- neutrophils_pct (%)
('neutrophils_pct','optimized','2025-12-15 09:30+01','55','%','green','carnivore',7.5,'good','moderate',2),
('neutrophils_pct','optimized','2026-02-17 10:15+01','53','%','green','carnivore',8.0,'excellent','moderate',1),
('neutrophils_pct','average','2025-12-16 10:00+01','60','%','orange','mixed',6.5,'fair','light',5),
('neutrophils_pct','average','2026-02-18 09:45+01','62','%','orange','mixed',6.5,'fair','light',5),
('neutrophils_pct','at_risk','2025-12-17 11:00+01','68','%','red','mixed',5.0,'poor',NULL,8),
('neutrophils_pct','at_risk','2026-02-19 10:30+01','72','%','red','mixed',5.0,'poor',NULL,8),

-- neutrophils_abs (Gpt/L)
('neutrophils_abs','optimized','2025-12-15 09:30+01','3.8','Gpt/L','green','carnivore',7.5,'good','moderate',2),
('neutrophils_abs','optimized','2026-02-17 10:15+01','3.6','Gpt/L','green','carnivore',8.0,'excellent','moderate',1),
('neutrophils_abs','average','2025-12-16 10:00+01','4.5','Gpt/L','orange','mixed',6.5,'fair','light',5),
('neutrophils_abs','average','2026-02-18 09:45+01','4.7','Gpt/L','orange','mixed',6.5,'fair','light',5),
('neutrophils_abs','at_risk','2025-12-17 11:00+01','6.5','Gpt/L','red','mixed',5.0,'poor',NULL,8),
('neutrophils_abs','at_risk','2026-02-19 10:30+01','7.2','Gpt/L','red','mixed',5.0,'poor',NULL,8),

-- lymphocytes_pct (%)
('lymphocytes_pct','optimized','2025-12-15 09:30+01','33','%','green','carnivore',7.5,'good','moderate',2),
('lymphocytes_pct','optimized','2026-02-17 10:15+01','35','%','green','carnivore',8.0,'excellent','moderate',1),
('lymphocytes_pct','average','2025-12-16 10:00+01','26','%','orange','mixed',6.5,'fair','light',5),
('lymphocytes_pct','average','2026-02-18 09:45+01','25','%','orange','mixed',6.5,'fair','light',5),
('lymphocytes_pct','at_risk','2025-12-17 11:00+01','18','%','red','mixed',5.0,'poor',NULL,8),
('lymphocytes_pct','at_risk','2026-02-19 10:30+01','16','%','red','mixed',5.0,'poor',NULL,8),

-- lymphocytes_abs (Gpt/L)
('lymphocytes_abs','optimized','2025-12-15 09:30+01','2.0','Gpt/L','green','carnivore',7.5,'good','moderate',2),
('lymphocytes_abs','optimized','2026-02-17 10:15+01','2.1','Gpt/L','green','carnivore',8.0,'excellent','moderate',1),
('lymphocytes_abs','average','2025-12-16 10:00+01','1.8','Gpt/L','orange','mixed',6.5,'fair','light',5),
('lymphocytes_abs','average','2026-02-18 09:45+01','1.7','Gpt/L','orange','mixed',6.5,'fair','light',5),
('lymphocytes_abs','at_risk','2025-12-17 11:00+01','1.2','Gpt/L','red','mixed',5.0,'poor',NULL,8),
('lymphocytes_abs','at_risk','2026-02-19 10:30+01','1.0','Gpt/L','red','mixed',5.0,'poor',NULL,8),

-- monocytes_pct (%)
('monocytes_pct','optimized','2025-12-15 09:30+01','6','%','green','carnivore',7.5,'good','moderate',2),
('monocytes_pct','optimized','2026-02-17 10:15+01','5','%','green','carnivore',8.0,'excellent','moderate',1),
('monocytes_pct','average','2025-12-16 10:00+01','7','%','orange','mixed',6.5,'fair','light',5),
('monocytes_pct','average','2026-02-18 09:45+01','7','%','orange','mixed',6.5,'fair','light',5),
('monocytes_pct','at_risk','2025-12-17 11:00+01','9','%','red','mixed',5.0,'poor',NULL,8),
('monocytes_pct','at_risk','2026-02-19 10:30+01','10','%','red','mixed',5.0,'poor',NULL,8),

-- monocytes_abs (Gpt/L)
('monocytes_abs','optimized','2025-12-15 09:30+01','0.45','Gpt/L','green','carnivore',7.5,'good','moderate',2),
('monocytes_abs','optimized','2026-02-17 10:15+01','0.40','Gpt/L','green','carnivore',8.0,'excellent','moderate',1),
('monocytes_abs','average','2025-12-16 10:00+01','0.55','Gpt/L','orange','mixed',6.5,'fair','light',5),
('monocytes_abs','average','2026-02-18 09:45+01','0.58','Gpt/L','orange','mixed',6.5,'fair','light',5),
('monocytes_abs','at_risk','2025-12-17 11:00+01','0.75','Gpt/L','red','mixed',5.0,'poor',NULL,8),
('monocytes_abs','at_risk','2026-02-19 10:30+01','0.85','Gpt/L','red','mixed',5.0,'poor',NULL,8),

-- eosinophils_pct (%)
('eosinophils_pct','optimized','2025-12-15 09:30+01','2.5','%','green','carnivore',7.5,'good','moderate',2),
('eosinophils_pct','optimized','2026-02-17 10:15+01','2.0','%','green','carnivore',8.0,'excellent','moderate',1),
('eosinophils_pct','average','2025-12-16 10:00+01','3.5','%','orange','mixed',6.5,'fair','light',5),
('eosinophils_pct','average','2026-02-18 09:45+01','4.0','%','orange','mixed',6.5,'fair','light',5),
('eosinophils_pct','at_risk','2025-12-17 11:00+01','5.5','%','red','mixed',5.0,'poor',NULL,8),
('eosinophils_pct','at_risk','2026-02-19 10:30+01','6.5','%','red','mixed',5.0,'poor',NULL,8),

-- eosinophils_abs (Gpt/L)
('eosinophils_abs','optimized','2025-12-15 09:30+01','0.15','Gpt/L','green','carnivore',7.5,'good','moderate',2),
('eosinophils_abs','optimized','2026-02-17 10:15+01','0.12','Gpt/L','green','carnivore',8.0,'excellent','moderate',1),
('eosinophils_abs','average','2025-12-16 10:00+01','0.25','Gpt/L','orange','mixed',6.5,'fair','light',5),
('eosinophils_abs','average','2026-02-18 09:45+01','0.28','Gpt/L','orange','mixed',6.5,'fair','light',5),
('eosinophils_abs','at_risk','2025-12-17 11:00+01','0.40','Gpt/L','red','mixed',5.0,'poor',NULL,8),
('eosinophils_abs','at_risk','2026-02-19 10:30+01','0.48','Gpt/L','red','mixed',5.0,'poor',NULL,8),

-- basophils_pct (%)
('basophils_pct','optimized','2025-12-15 09:30+01','0.5','%','green','carnivore',7.5,'good','moderate',2),
('basophils_pct','optimized','2026-02-17 10:15+01','0.4','%','green','carnivore',8.0,'excellent','moderate',1),
('basophils_pct','average','2025-12-16 10:00+01','0.5','%','green','mixed',6.5,'fair','light',5),
('basophils_pct','average','2026-02-18 09:45+01','0.6','%','green','mixed',6.5,'fair','light',5),
('basophils_pct','at_risk','2025-12-17 11:00+01','1.0','%','orange','mixed',5.0,'poor',NULL,8),
('basophils_pct','at_risk','2026-02-19 10:30+01','1.2','%','orange','mixed',5.0,'poor',NULL,8),

-- basophils_abs (Gpt/L)
('basophils_abs','optimized','2025-12-15 09:30+01','0.03','Gpt/L','green','carnivore',7.5,'good','moderate',2),
('basophils_abs','optimized','2026-02-17 10:15+01','0.02','Gpt/L','green','carnivore',8.0,'excellent','moderate',1),
('basophils_abs','average','2025-12-16 10:00+01','0.04','Gpt/L','green','mixed',6.5,'fair','light',5),
('basophils_abs','average','2026-02-18 09:45+01','0.05','Gpt/L','green','mixed',6.5,'fair','light',5),
('basophils_abs','at_risk','2025-12-17 11:00+01','0.08','Gpt/L','orange','mixed',5.0,'poor',NULL,8),
('basophils_abs','at_risk','2026-02-19 10:30+01','0.10','Gpt/L','orange','mixed',5.0,'poor',NULL,8),

-- ============================================================
-- INFLAMMATION
-- ============================================================

-- hs_crp (mg/L)
('hs_crp','optimized','2025-12-15 09:30+01','0.45','mg/L','green','carnivore',7.5,'good','moderate',2),
('hs_crp','optimized','2026-02-17 10:15+01','0.38','mg/L','green','carnivore',8.0,'excellent','moderate',1),
('hs_crp','average','2025-12-16 10:00+01','2.0','mg/L','orange','mixed',6.5,'fair','light',5),
('hs_crp','average','2026-02-18 09:45+01','2.2','mg/L','orange','mixed',6.5,'fair','light',5),
('hs_crp','at_risk','2025-12-17 11:00+01','4.5','mg/L','red','mixed',5.0,'poor',NULL,8),
('hs_crp','at_risk','2026-02-19 10:30+01','5.2','mg/L','red','mixed',5.0,'poor',NULL,8)
;

-- ============================================================
-- INSERT into measurements (only for markers without existing demo data)
-- ============================================================
INSERT INTO measurements (
    id, user_id, marker_id, device_id, timestamp,
    value_canonical, unit_canonical, status, protocol_tag,
    diet_protocol, sleep_hours, sleep_quality, exercise_activity, stress_level,
    is_demo, demo_profile, is_deleted, created_at
)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    mk.id,
    '00000000-0000-0000-0000-000000000014'::uuid,
    d.ts,
    d.val,
    d.unit,
    d.status,
    'standard',
    d.diet,
    d.sleep_hrs,
    d.sleep_q,
    d.exercise,
    d.stress,
    true,
    d.profile,
    false,
    now()
FROM _demo_lab d
JOIN markers mk ON mk.marker_slug = d.slug
WHERE NOT EXISTS (
    SELECT 1 FROM measurements m2
    WHERE m2.marker_id = mk.id
    AND m2.demo_profile = d.profile
    AND m2.is_demo = true
    AND m2.is_deleted = false
);

DROP TABLE _demo_lab;
