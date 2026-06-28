-- =========================================================================
-- [PR-09] Vendor Master (Approved Vendor List - AVL) Schema Definition
-- Compatible with SQLite3 (Tauri Backend) & PostgreSQL (Supabase / Production)
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. SQLite DDL Specification (AuditFlow Backend Engine)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vendor_master (
    vendor_id TEXT PRIMARY KEY,                             -- Unique vendor identifier code (e.g., 'VEN_001')
    vendor_name TEXT NOT NULL,                             -- Official legal corporate or trade name
    business_registration_no TEXT NOT NULL,                 -- Business registration number (tax validation)
    approval_status TEXT NOT NULL CHECK(
        approval_status IN ('Approved', 'Pending', 'Rejected')
    ),                                                      -- Approval workflow state
    approved_date TEXT,                                     -- Date approved (ISO8601 string: YYYY-MM-DD HH:MM:SS)
    approved_by TEXT,                                       -- ID of the approving auditor/manager
    risk_level TEXT NOT NULL CHECK(
        risk_level IN ('Low', 'Medium', 'High')
    ),                                                      -- Assessed credit or transaction risk grade
    related_party_flag INTEGER NOT NULL CHECK(
        related_party_flag IN (0, 1)
    ) DEFAULT 0,                                            -- Conflict of interest flag (0: False, 1: True)
    restricted_vendor_flag INTEGER NOT NULL CHECK(
        restricted_vendor_flag IN (0, 1)
    ) DEFAULT 0,                                            -- Blacklisted/suspicious merchant indicator (0: False, 1: True)
    active_flag INTEGER NOT NULL CHECK(
        active_flag IN (0, 1)
    ) DEFAULT 1,                                            -- Active trade status (0: Inactive, 1: Active)
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,              -- Date created in master records
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP               -- Date updated in master records
);

-- Indexing for optimized scan-time vendor lookup matching GL entity_id
CREATE INDEX IF NOT EXISTS idx_vendor_master_status_active 
ON vendor_master(vendor_id, approval_status, active_flag);


-- -------------------------------------------------------------------------
-- 2. PostgreSQL DDL Specification (Production/Cloud Environment)
-- -------------------------------------------------------------------------
/*
CREATE TABLE IF NOT EXISTS public.vendor_master (
    vendor_id VARCHAR(50) PRIMARY KEY,
    vendor_name VARCHAR(100) NOT NULL,
    business_registration_no VARCHAR(20) NOT NULL,
    approval_status VARCHAR(20) NOT NULL DEFAULT 'Pending' 
        CONSTRAINT chk_vendor_approval CHECK (approval_status IN ('Approved', 'Pending', 'Rejected')),
    approved_date TIMESTAMP WITH TIME ZONE,
    approved_by VARCHAR(50),
    risk_level VARCHAR(10) NOT NULL DEFAULT 'Medium' 
        CONSTRAINT chk_vendor_risk CHECK (risk_level IN ('Low', 'Medium', 'High')),
    related_party_flag BOOLEAN NOT NULL DEFAULT FALSE,
    restricted_vendor_flag BOOLEAN NOT NULL DEFAULT FALSE,
    active_flag BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_postgres_vendor_lookup 
ON public.vendor_master (vendor_id) 
WHERE (active_flag = TRUE AND approval_status = 'Approved');
*/
