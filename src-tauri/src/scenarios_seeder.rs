use rusqlite::{params, Connection, Transaction};
use serde_json::json;

pub fn seed_master_scenarios(conn: &mut Connection) -> Result<(), String> {
    // 1. Delete old system master records
    let _ = conn.execute("DELETE FROM custom_scenarios WHERE origin_audit_type = '시스템 마스터'", []);

    let mut scenarios: Vec<(String, &str, &str, &str, &str)> = Vec::new();

    // --- Procurement (PR) 10 ---
    scenarios.push(("PR-01".to_string(), "Procurement", "Bid-rigging Suspicion", "High", "Identifying vendors with the same IP address or similar proposal patterns."));
    scenarios.push(("PR-02".to_string(), "Procurement", "Split PO for Approval Override", "Medium", "Splitting a single contract into smaller POs to bypass approval limits."));
    scenarios.push(("PR-03".to_string(), "Procurement", "Market Price Gap", "High", "Purchasing at prices significantly higher than market benchmarks."));
    scenarios.push(("PR-04".to_string(), "Procurement", "Conflict of Interest", "High", "Vendor registered by employee's relative or friend."));
    scenarios.push(("PR-05".to_string(), "Procurement", "Sole Source Overreliance", "Medium", "Excessive reliance on a single vendor without competitive bidding."));
    scenarios.push(("PR-06".to_string(), "Procurement", "Zombie Vendor Payments", "High", "Payments to inactive or non-existent vendors."));
    scenarios.push(("PR-07".to_string(), "Procurement", "Kickback Signal", "High", "Specially requested vendors with sudden volume spikes."));
    scenarios.push(("PR-08".to_string(), "Procurement", "Contract Variation Abuse", "Medium", "Initial low bid followed by frequent price increases."));
    scenarios.push(("PR-09".to_string(), "Procurement", "Unauthorized Vendor", "High", "Buying from vendors not in the Approved Vendor List (AVL)."));
    scenarios.push(("PR-10".to_string(), "Procurement", "Advance Payment Non-performance", "High", "Project stuck at 0% after advance payment."));

    // --- Sales/AR (SA) 10 ---
    scenarios.push(("SA-01".to_string(), "Sales/AR", "Channel Stuffing", "High", "Sales concentration in the last 3 days of the quarter."));
    scenarios.push(("SA-02".to_string(), "Sales/AR", "Unusual Returns", "High", "Massive returns immediately after quarter-end."));
    scenarios.push(("SA-03".to_string(), "Sales/AR", "Credit Limit Override", "High", "Sales to customers exceeding credit limits."));
    scenarios.push(("SA-04".to_string(), "Sales/AR", "AR Aging Manipulation", "High", "Refreshing old debts to avoid bad debt provisions."));
    scenarios.push(("SA-05".to_string(), "Sales/AR", "Unauthorized Discounts", "Medium", "Manual rebates applied without proper workflow."));
    scenarios.push(("SA-06".to_string(), "Sales/AR", "Circular Trading", "High", "A-B-C-A trade flows without economic substance."));
    scenarios.push(("SA-07".to_string(), "Sales/AR", "Revenue Cut-off Error", "Medium", "Recognizing revenue before delivery or acceptance."));
    scenarios.push(("SA-08".to_string(), "Sales/AR", "Duplicate Sales Recognition", "High", "Same SKU sold multiple times to different customers."));
    scenarios.push(("SA-09".to_string(), "Sales/AR", "Customer Master Fraud", "High", "Sales spikes after customer master data changes."));
    scenarios.push(("SA-10".to_string(), "Sales/AR", "Rebate Overcalculation", "Medium", "Rebate ratios significantly higher than company average."));

    // --- Inventory (IN) 10 ---
    scenarios.push(("IN-01".to_string(), "Inventory", "Shrinkage Peak", "High", "Inventory loss rate exceeding 2.5% in specific centers."));
    scenarios.push(("IN-02".to_string(), "Inventory", "Phantom Inventory", "High", "Inventory recorded in system but non-existent physically."));
    scenarios.push(("IN-03".to_string(), "Inventory", "Obsolete Stock Concealment", "Medium", "Failure to write down slow-moving or obsolete stock."));
    scenarios.push(("IN-04".to_string(), "Inventory", "Inventory Cycle Abuse", "Medium", "Manipulating counts during cycle counts."));
    scenarios.push(("IN-05".to_string(), "Inventory", "Unauthorized Scrapping", "High", "Writing off usable items as scrap for personal gain."));
    scenarios.push(("IN-06".to_string(), "Inventory", "Valuation Skew", "Medium", "Incorrect FIFO/Weighted average calculations to boost assets."));
    scenarios.push(("IN-07".to_string(), "Inventory", "Loading Dock Weakness", "High", "Discrepancies in gate pass and physical exit."));
    scenarios.push(("IN-08".to_string(), "Inventory", "Inter-company Transfer Loop", "Medium", "Inventory moving between branches without sales."));
    scenarios.push(("IN-09".to_string(), "Inventory", "Sample Asset Leakage", "Medium", "Excessive sampling without return or tracking."));
    scenarios.push(("IN-10".to_string(), "Inventory", "BOM Discrepancy", "High", "Material usage not matching Production BOM output."));

    // --- HR/Payroll (HR) 10 ---
    scenarios.push(("HR-01".to_string(), "HR/Payroll", "Ghost Employee", "High", "Payments to terminated or non-existent staff."));
    scenarios.push(("HR-02".to_string(), "HR/Payroll", "Overtime Fraud", "Medium", "Badge logs not matching overtime claims."));
    scenarios.push(("HR-03".to_string(), "HR/Payroll", "Benefit Scoping", "Low", "Non-eligible staff receiving specialized allowances."));
    scenarios.push(("HR-04".to_string(), "HR/Payroll", "Severance Manipulation", "High", "Backdated joining dates to boost severance pay."));
    scenarios.push(("HR-05".to_string(), "HR/Payroll", "Ghost Training", "Medium", "Training expenses without attendee lists or certificates."));
    scenarios.push(("HR-06".to_string(), "HR/Payroll", "Duplicate Benefit Payout", "Low", "Receiving the same performance award twice."));
    scenarios.push(("HR-07".to_string(), "HR/Payroll", "Unauthorized Pay Raise", "High", "System salary update without HRBP approval record."));
    scenarios.push(("HR-08".to_string(), "HR/Payroll", "Expat Housing Abuse", "Medium", "Rent exceeding regional limits for executives."));
    scenarios.push(("HR-09".to_string(), "HR/Payroll", "Family Hiring Proxy", "High", "Hiring employee relatives for fake roles."));
    scenarios.push(("HR-10".to_string(), "HR/Payroll", "Dossier Access Abuse", "High", "Unauthorized access to sensitive personal dossiers."));

    // --- Finance/Accounting (FA) 10 ---
    scenarios.push(("FA-01".to_string(), "Finance/Accounting", "Inter-office Suspense", "High", "Suspense accounts not cleared for > 90 days."));
    scenarios.push(("FA-02".to_string(), "Finance/Accounting", "Manual Journal Abuse", "High", "Postings at 11 PM or by unauthorized users."));
    scenarios.push(("FA-03".to_string(), "Finance/Accounting", "FX Gain Shifting", "Medium", "Manipulating FX rates for inter-company settlements."));
    scenarios.push(("FA-04".to_string(), "Finance/Accounting", "Expense Under-accrual", "High", "Delaying expense recognition to boost profit."));
    scenarios.push(("FA-05".to_string(), "Finance/Accounting", "Tax Refund Leakage", "Medium", "VAT refund notifications not matched in books."));
    scenarios.push(("FA-06".to_string(), "Finance/Accounting", "Asset Capitalization Bias", "Medium", "Postponing depreciation or over-capitalizing minor repairs."));
    scenarios.push(("FA-07".to_string(), "Finance/Accounting", "Dividend Compliance", "High", "Dividends paid without requisite board approval."));
    scenarios.push(("FA-08".to_string(), "Finance/Accounting", "Restricted Cash Leak", "High", "Using restricted deposit for general operations."));
    scenarios.push(("FA-09".to_string(), "Finance/Accounting", "Related Party Omission", "High", "Inter-company transactions missing from disclosure."));
    scenarios.push(("FA-10".to_string(), "Finance/Accounting", "Audit Trail Deletion", "High", "System logs deleted for key financial tables."));

    // --- Expense/Travel (EX) 10 ---
    scenarios.push(("EX-01".to_string(), "Expense/Travel", "Spilling Receipt", "High", "Multiple receipts from same merchant in 10 mins."));
    scenarios.push(("EX-02".to_string(), "Expense/Travel", "Weekend/Night Usage", "Medium", "Corporate card usage after 11 PM or on Sundays."));
    scenarios.push(("EX-03".to_string(), "Expense/Travel", "Remote Area Travel", "High", "Usage in cities without business travel plans."));
    scenarios.push(("EX-04".to_string(), "EX Sector", "Luxury Item Purchase", "High", "Purchasing luxury goods or jewelry on corporate card."));
    scenarios.push(("EX-05".to_string(), "EX Sector", "Duplicate Airfare", "Medium", "Claiming same flight via card and reimbursement."));
    scenarios.push(("EX-06".to_string(), "EX Sector", "Mileage Personal Gain", "Low", "Transferring corporate travel miles to personal account."));
    scenarios.push(("EX-07".to_string(), "EX Sector", "No-show Refund Fraud", "High", "Personal receipt of refund from cancelled corporate travel."));
    scenarios.push(("EX-08".to_string(), "EX Sector", "Hidden Entertainment", "Medium", "Booking entertainment as 'Training/Education'."));
    scenarios.push(("EX-09".to_string(), "EX Sector", "Commuter Fuel Abuse", "Low", "Fuel claims during non-work hours for personal cars."));
    scenarios.push(("EX-10".to_string(), "EX Sector", "Subscription Shadow IT", "Medium", "Recurring SaaS payments without IT approval."));

    // --- Production/Quality (PQ) 10 ---
    scenarios.push(("PQ-01".to_string(), "Production/Quality", "Yield Manipulation", "High", "Over-reporting yield to mask production waste."));
    scenarios.push(("PQ-02".to_string(), "Production/Quality", "Defect Concealment", "High", "Shipping known defective items to meet quotas."));
    scenarios.push(("PQ-03".to_string(), "Production/Quality", "Maintenance Log Fraud", "Medium", "Maintenance logged without technician badge entry."));
    scenarios.push(("PQ-04".to_string(), "Production/Quality", "Energy Usage Spike", "Medium", "Sudden energy jump without production increase."));
    scenarios.push(("PQ-05".to_string(), "Production/Quality", "Non-spec Material Use", "High", "Using cheaper raw materials than specified in BOM."));
    scenarios.push(("PQ-06".to_string(), "Production/Quality", "Safety Incident Omission", "High", "Insurance claims found without internal incident report."));
    scenarios.push(("PQ-07".to_string(), "Production/Quality", "QA Stamp Override", "High", "Direct DB update of QA results bypassing lab system."));
    scenarios.push(("PQ-08".to_string(), "Production/Quality", "Excessive Down-time", "Medium", "Reporting downtime to hide unauthorized production."));
    scenarios.push(("PQ-09".to_string(), "Production/Quality", "Subcontractor Over-usage", "Medium", "Outsourcing work that could be done in-house."));
    scenarios.push(("PQ-10".to_string(), "Production/Quality", "Storage Condition Breach", "Medium", "Temperature logs showing multiple threshold breaches."));

    // --- IT/Security (IT) 10 ---
    scenarios.push(("IT-01".to_string(), "IT/Security", "Access Privilege Escalation", "High", "Temporary admin rights granted and not revoked."));
    scenarios.push(("IT-02".to_string(), "IT/Security", "Shadow IT Usage", "High", "Unapproved SaaS apps storing PII / company data."));
    scenarios.push(("IT-03".to_string(), "IT/Security", "Data Exfiltration Signal", "High", "Large downloads by resignation-intent employees."));
    scenarios.push(("IT-04".to_string(), "IT/Security", "Ghost Access", "High", "Active accounts for terminated employees."));
    scenarios.push(("IT-05".to_string(), "IT/Security", "VPN Access Anomaly", "High", "VPN logins from restricted/high-risk countries."));
    scenarios.push(("IT-06".to_string(), "IT/Security", "Backup Non-compliance", "Medium", "Failure to perform restore tests for > 180 days."));
    scenarios.push(("IT-07".to_string(), "IT/Security", "System Log Inactivity", "High", "No security logs generated for critical DB for 24h."));
    scenarios.push(("IT-08".to_string(), "IT/Security", "Unpatched Vulnerability", "Medium", "Critical-rated vulnerabilities open for > 90 days."));
    scenarios.push(("IT-09".to_string(), "IT/Security", "Shared Account Usage", "Medium", "Mass logins to one shared account from many IPs."));
    scenarios.push(("IT-10".to_string(), "IT/Security", "Dev/Ops SoD Violation", "High", "Developer committing code and deploying to Prod."));

    // --- Compliance/Legal (CL) 10 ---
    scenarios.push(("CL-01".to_string(), "Compliance/Legal", "FCPA - Success Fee", "High", "Large fees paid to agents in high-risk regions."));
    scenarios.push(("CL-02".to_string(), "Compliance/Legal", "GDPR PII Leak", "High", "Unencrypted PII discovered in open shared drives."));
    scenarios.push(("CL-03".to_string(), "Compliance/Legal", "AML - Round-tripping", "High", "Funds looping A-B-A without business reasons."));
    scenarios.push(("CL-04".to_string(), "Compliance/Legal", "Sanctions Hit", "High", "Matching vendor name against OFAC/UN lists."));
    scenarios.push(("CL-05".to_string(), "Compliance/Legal", "Whistleblower Retaliation", "High", "Negative performance review post-report."));
    scenarios.push(("CL-06".to_string(), "Compliance/Legal", "Export Control Breach", "High", "Shipping restricted tech to non-approved nations."));
    scenarios.push(("CL-07".to_string(), "Compliance/Legal", "Antitrust Meeting", "High", "Recurrent T&E with direct competitors."));
    scenarios.push(("CL-08".to_string(), "Compliance/Legal", "Insider Trading Signal", "High", "Exec trades immediately prior to profit warning."));
    scenarios.push(("CL-09".to_string(), "Compliance/Legal", "SOX Control Failure", "High", "Key control not performed for 12 consecutive months."));
    scenarios.push(("CL-10".to_string(), "Compliance/Legal", "Permit Expiry", "Medium", "Operating business without valid license/permit."));

    // ---深化 Corporate Card (CC) 10 ---
    scenarios.push(("CC-01".to_string(), "Corp Card", "Merchant Category Fraud", "High", "Payments at restricted MCC (Nightclub, Jewelry)."));
    scenarios.push(("CC-02".to_string(), "Corp Card", "Personal Grocery Expense", "Medium", "Bulk grocery orders at discount marts."));
    scenarios.push(("CC-03".to_string(), "Corp Card", "Cash Withdrawal", "High", "ATM withdrawals from corporate credit cards."));
    scenarios.push(("CC-04".to_string(), "Corp Card", "Insurance/Tax Mix", "Low", "Paying personal tax/fine on company card."));
    scenarios.push(("CC-05".to_string(), "Corp Card", "Third-party Delivery", "Medium", "High-volume delivery to non-office address."));
    scenarios.push(("CC-06".to_string(), "Corp Card", "Recurring Unvouched", "High", "Subscriptions without digital receipt upload."));
    scenarios.push(("CC-07".to_string(), "Corp Card", "Flight Class Violation", "Medium", "Booking First Class when only Economy is allowed."));
    scenarios.push(("CC-08".to_string(), "Corp Card", "Hotel Spoilage", "Medium", "Mini-bar/Spa expenses included in room bill."));
    scenarios.push(("CC-09".to_string(), "Corp Card", "Gift Card Laundering", "High", "Purchasing rechargeable gift cards at CVS."));
    scenarios.push(("CC-10".to_string(), "Corp Card", "Ghost Merchant", "High", "Usage at dormant or non-existent business license."));

    // --- Anti-Bribery / FCPA / UK Bribery Act (AB) ---
    scenarios.push(("AB-01".to_string(), "Anti-Bribery", "Facilitation Payment", "High", "Frequent small payments to 'Expediting Service' or 'Customs Broker'."));
    scenarios.push(("AB-02".to_string(), "Anti-Bribery", "Shadow Hiring", "High", "Hiring relatives of government officials (PEP) as consultants."));
    scenarios.push(("AB-03".to_string(), "Anti-Bribery", "Charitable Conduit", "High", "Donations to charities personally linked to decision makers."));
    scenarios.push(("AB-04".to_string(), "Anti-Bribery", "Excessive Hospitality", "Medium", "Entertainment expenses > $500/person for government clients."));
    scenarios.push(("AB-05".to_string(), "Anti-Bribery", "Per Diem Abuse", "Medium", "Cash per diem paid to officials during site visits > policy limits."));
    scenarios.push(("AB-06".to_string(), "Anti-Bribery", "Third-Party High Commission", "High", "Sales agent commission > 15% without clear deliverables."));
    scenarios.push(("AB-07".to_string(), "Anti-Bribery", "Political Contribution Masking", "High", "Sponsorships that appear to be political funding."));
    scenarios.push(("AB-08".to_string(), "Anti-Bribery", "Off-book Account", "High", "Use of 'Petty Cash' to pay for sensitive permits/licenses."));
    scenarios.push(("AB-09".to_string(), "Anti-Bribery", "Success Fee Anomaly", "High", "Lump sum payment immediately after contract award."));
    scenarios.push(("AB-10".to_string(), "Anti-Bribery", "Training Trip Junket", "High", "Covering travel for officials to non-business tourist destinations."));

    // --- Anti-Money Laundering (AML) ---
    scenarios.push(("AML-01".to_string(), "AML", "Structuring (Smurfing)", "High", "Multiple cash deposits just under reporting threshold ($10k)."));
    scenarios.push(("AML-02".to_string(), "AML", "Trade-Based Laundering", "High", "Over-invoicing or under-invoicing goods to move value across borders."));
    scenarios.push(("AML-03".to_string(), "AML", "Shell Company Invoice", "High", "Payments to vendors with PO Box address and no web presence."));
    scenarios.push(("AML-04".to_string(), "AML", "Flow-Through Account", "High", "Funds received and immediately transferred out (Pass-through)."));
    scenarios.push(("AML-05".to_string(), "AML", "Early Repayment Anomaly", "Medium", "Loan accumulation followed by sudden lump-sum repayment from unknown source."));
    scenarios.push(("AML-06".to_string(), "AML", "Third-Party Payer", "High", "Receiving payments from entity unrelated to the invoice/contract."));
    scenarios.push(("AML-07".to_string(), "AML", "Jurisdiction High Risk", "High", "Transactions involving FATF blacklisted countries."));
    scenarios.push(("AML-08".to_string(), "AML", "Integration Signal", "High", "Purchase of luxury assets (Real Estate/Art) with unclear funds."));
    scenarios.push(("AML-09".to_string(), "AML", "Layering Pattern", "High", "Complex web of transfers between subsidiaries without logic."));
    scenarios.push(("AML-10".to_string(), "AML", "Dark Web Interaction", "High", "Wallet addresses linked to known darknet markets."));

    // --- Advanced Revenue / Accounting (RV) ---
    scenarios.push(("RV-01".to_string(), "Revenue/Accounting", "Bill and Hold Scheme", "High", "Invoicing for goods not yet shipped to meet target."));
    scenarios.push(("RV-02".to_string(), "Revenue/Accounting", "Side Letter Agreement", "High", "Hidden terms allowing return of goods (Right of Return) ignoring rev-rec rules."));
    scenarios.push(("RV-03".to_string(), "Revenue/Accounting", "Round Tripping", "High", "Selling to a funded partner who sells back (inflating revenue)."));
    scenarios.push(("RV-04".to_string(), "Revenue/Accounting", "Percentage of Completion Abuse", "Medium", "Aggressive milestone completion claiming to accelerate revenue."));
    scenarios.push(("RV-05".to_string(), "Revenue/Accounting", "Cookie Jar Reserves", "High", "Over-accruing expenses in good years to smooth future earnings."));
    scenarios.push(("RV-06".to_string(), "Revenue/Accounting", "Consignment as Sales", "Medium", "Booking revenue for goods sent to distributors on consignment."));
    scenarios.push(("RV-07".to_string(), "Revenue/Accounting", "Premature Recognition", "High", "Booking revenue before acceptance criteria met (e.g., Installation)."));
    scenarios.push(("RV-08".to_string(), "Revenue/Accounting", "Gross vs Net Presentation", "Medium", "Reporting agent revenue as gross principal revenue."));
    scenarios.push(("RV-09".to_string(), "Revenue/Accounting", "Barter Transaction", "Medium", "Non-monetary exchange recorded at inflated fair value."));
    scenarios.push(("RV-10".to_string(), "Revenue/Accounting", "Related Party Pricing", "High", "Transfer pricing deviations not at arm's length."));

    // --- Supply Chain & Collusion (PC) ---
    scenarios.push(("PC-01".to_string(), "Supply Chain", "Bid Rotation Pattern", "High", "Winning vendors rotating in a predictable sequence (A->B->A)."));
    scenarios.push(("PC-02".to_string(), "Supply Chain", "Phantom Bids", "High", "Losing bids physically created by the winning vendor (Check metadata)."));
    scenarios.push(("PC-03".to_string(), "Supply Chain", "Change Order Abuse", "High", "Low bid win followed by immediate 'unforeseen' cost increase orders."));
    scenarios.push(("PC-04".to_string(), "Supply Chain", "Exclusive Distributor Mockery", "Medium", "Sole source justification letter copied from previous year."));
    scenarios.push(("PC-05".to_string(), "Supply Chain", "Inventory Parking", "High", "Suppliers holding conflicting inventory records to hide obsolescence."));
    scenarios.push(("PC-06".to_string(), "Supply Chain", "Product Substitution", "High", "Delivering lower grade specs than contracted/invoiced."));
    scenarios.push(("PC-07".to_string(), "Supply Chain", "Kickback - Consultant", "High", "Consulting fees paid to entity linked to procurement officer."));
    scenarios.push(("PC-08".to_string(), "Supply Chain", "Emergency Purchase Loop", "Medium", "Routine items purchased as 'Emergency' to bypass bidding."));

    // --- Tech & Cyber (ITX) ---
    scenarios.push(("ITX-01".to_string(), "IT Security", "Rootkit Signal", "High", "System binaries modified timestamp mismatch."));
    scenarios.push(("ITX-02".to_string(), "IT Security", "Unauthorized Port Forwarding", "High", "Internal host behaving as proxy."));
    scenarios.push(("ITX-03".to_string(), "IT Security", "API Key Leakage", "High", "Hardcoded secrets found in public repo commits."));
    scenarios.push(("ITX-04".to_string(), "IT Security", "Log Wiping", "High", "Security event logs cleared (EventID 1102)."));
    scenarios.push(("ITX-05".to_string(), "IT Security", "Ransomware Precursor", "High", "PsExec / CobaltStike beacon communication detected."));

    // --- ESG & Sustainability (ES) ---
    scenarios.push(("ES-01".to_string(), "ESG", "Greenwashing - Carbon", "High", "Carbon offset certificates reused or invalid key."));
    scenarios.push(("ES-02".to_string(), "ESG", "Conflict Minerals", "High", "Supply chain trace missing for 3TG (Tin, Tantalum, Tungsten, Gold)."));
    scenarios.push(("ES-03".to_string(), "ESG", "Child Labor Indicator", "High", "Factory audit age verification records missing."));
    scenarios.push(("ES-04".to_string(), "ESG", "Toxic Waste Dumping", "High", "Disposal volume mismatch vs production mass balance."));
    scenarios.push(("ES-05".to_string(), "ESG", "Diversity Quota Fraud", "Medium", "Categorizing contractors as full-time to meet diversity stats."));
    scenarios.push(("ES-06".to_string(), "ESG", "Safety Accident Cover-up", "High", "Medical expenses paid via petty cash to hide 'Lost Time Injury'."));

    // --- Financial Integrity Master Class (FI) ---
    scenarios.push(("FF-01".to_string(), "Financial Integrity", "Rapid Money Cycling (Ping-pong)", "Critical", "Detecting funds exiting the corporate account and returning via related parties within 24 hours."));
    scenarios.push(("FF-02".to_string(), "Financial Integrity", "Lapping & Ledger Delay", "High", "Identifying 2+ day delays between bank inflow and ledger booking to cover previous fund gaps."));
    scenarios.push(("FF-03".to_string(), "Financial Integrity", "Registered Vendor Mismatch", "Critical", "Booked as 'Corporate Vendor' but actual bank recipient is an individual personal account."));
    scenarios.push(("FF-04".to_string(), "Financial Integrity", "Structured Threshold Monitor", "High", "Detecting multiple transactions of $9,900 just below the $10,000 reporting threshold."));
    scenarios.push(("FF-05".to_string(), "Financial Integrity", "Inactive Project Account Drain", "High", "Large unexplained transfers from project accounts that have been inactive for > 12 months."));

    let tx = conn.transaction().map_err(|e| e.to_string())?;
    for (id, cat, name, risk, desc) in scenarios {
        let rules = match cat {
            "Procurement" => json!({
                "logic": "Check for vendor IP matches, split PO patterns (multiple sums close to threshold), and market price deviations.",
                "keywords": ["bid", "tender", "rigging", "vendor", "IP", "contract"],
                "threshold": 5000000
            }).to_string(),
            "Expense/Travel" | "EX Sector" => json!({
                "logic": "Detect weekend usage, late night transactions (22:00-05:00), and duplicate merchant receipts within 30 minutes.",
                "keywords": ["card", "receipt", "meal", "entertainment", "night", "weekend"],
                "threshold": 100000
            }).to_string(),
            _ => json!({
                "logic": format!("Analyze data for {} risks specifically focusing on {} patterns.", cat, name),
                "keywords": name.to_lowercase().split_whitespace().collect::<Vec<_>>()
            }).to_string()
        };

        let prompt_template = format!(
            "Analyze the provided audit data for '{}' ({}). Look for patterns matching: {}. If found, extract details as JSON.",
            name, cat, desc
        );

        let _ = tx.execute(
            "INSERT OR IGNORE INTO custom_scenarios (id, category, name, risk_level, description, rules, ai_prompt_template, origin_audit_type, is_ai_generated) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![id, cat, name, risk, desc, rules, prompt_template, "시스템 마스터", 0]
        );
    }
    tx.commit().map_err(|e| e.to_string())?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    #[test]
    fn test_master_scenarios_integrity() {
        let mut conn = Connection::open_in_memory().unwrap();
        conn.execute(
            "CREATE TABLE custom_scenarios (
                id TEXT PRIMARY KEY, 
                category TEXT NOT NULL, 
                name TEXT NOT NULL, 
                risk_level TEXT NOT NULL, 
                description TEXT NOT NULL, 
                rules TEXT,
                ai_prompt_template TEXT,
                origin_audit_type TEXT, 
                is_ai_generated INTEGER DEFAULT 0
            )", 
            []
        ).unwrap();

        seed_master_scenarios(&mut conn).unwrap();
        
        let count: i64 = conn.query_row("SELECT COUNT(*) FROM custom_scenarios", [], |r| r.get(0)).unwrap();
        println!(">>> [TEST] Seeded {} scenarios", count);
        
        assert!(count >= 170, "Expected at least 170 master scenarios, found {}", count);
        
        // Check for specific scenario presence
        let name: String = conn.query_row("SELECT name FROM custom_scenarios WHERE id = 'PR-01'", [], |r| r.get(0)).unwrap();
        assert_eq!(name, "Bid-rigging Suspicion");

        // Check for rules content
        let rules: String = conn.query_row("SELECT rules FROM custom_scenarios WHERE id = 'EX-02'", [], |r| r.get(0)).unwrap();
        assert!(rules.contains("late night"), "EX-02 rules should contain late night detection logic");
    }
}
