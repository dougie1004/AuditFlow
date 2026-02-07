use serde::{Serialize, Deserialize};
use rusqlite::Connection;
use std::path::{Path, PathBuf};

// --- DATA STRUCTURES (Must match commands.rs expectations) ---

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ComplianceFinding {
    pub issue_id: String,           
    pub violation_type: String,     
    pub regulation_ref: String,     
    pub evidence: Vec<String>,      
    pub severity: String,           
    pub confidence: f32,            
    pub verdict_mode: String,       
    pub is_auto_confirmable: bool,  
    pub grade: String,              
    pub logic_chain: Vec<String>,   
    #[serde(skip)] pub row_indices: Vec<usize>,
    pub related_data: String, 
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AICommentary {
    pub narrative: String,           
    pub similarity_score: Option<f32>,
    pub disclaimers: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct TransactionRow {
    pub row_idx: usize,
    pub date_str: String,
    pub vendor: String,
    pub amount: f64,
    pub description: String,
    pub card_owner: String,
    pub timestamp: i64, 
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum JudicialInabilityReason {
    NoApplicableRule,      
    InsufficientFields,    
    AmbiguousMapping,      
    ConflictingRules,      
    HeuristicOnlyViolation, 
}

#[derive(Debug, Serialize, Deserialize)]
pub enum AdjudicationOutcome {
    Confirmed(ComplianceFinding), 
    Dismissed { reason: String, logic_chain: Vec<String> }, 
    Investigation { context: String, ai_signal_id: String },
    Unclassified { reason: JudicialInabilityReason, message: String, logic_chain: Vec<String> },
    NeedsMoreEvidence(String),    
}


// --- MAIN ADJUDICATOR STUB ---

pub struct Adjudicator;

impl Adjudicator {
    pub fn adjudicate_signal(
        _conn: &Connection, 
        _signal_id: &str
    ) -> Result<AdjudicationOutcome, String> {
        // CBT STUB: Safe Fallback
        // Returns Dismissed so UI won't break but won't show fake errors
        Ok(AdjudicationOutcome::Dismissed { 
            reason: "CBT Stub: Compliance Engine is in stabilization mode.".to_string(),
            logic_chain: vec!["System: Safety Override".to_string()] 
        })
    }
}

pub struct RuleEngine; 
impl RuleEngine {
    pub fn detect_split_payments(_rows: &Vec<TransactionRow>) -> Vec<ComplianceFinding> {
        vec![]
    }
    pub fn detect_restricted_vendors(_rows: &Vec<TransactionRow>) -> Vec<ComplianceFinding> {
        vec![]
    }
}

pub struct AIWitness;
impl AIWitness {
    pub async fn testify(_finding: &ComplianceFinding) -> AICommentary {
        AICommentary {
            narrative: "CBT Stub Commentary".to_string(),
            similarity_score: None,
            disclaimers: vec![]
        }
    }
}

#[allow(dead_code)]
pub async fn run_compliance_check_flow(
    _target_files: Vec<(String, String)>,
    _project_type: &str,
    _db_path: &PathBuf,
    _app_handle: &tauri::AppHandle
) -> Result<(usize, usize), String> {
    println!(">>> [CBT STUB] run_compliance_check_flow called. Skipping.");
    Ok((0, 0))
}
