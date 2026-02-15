const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.env.APPDATA, 'AuditFlow', 'audit_data_v4.db');
const db = new sqlite3.Database(dbPath);

function getTop10Report(years) {
    return new Promise((resolve, reject) => {
        const yearFilter = years.length === 1 ? `fiscal_year = ${years[0]}` : `fiscal_year IN (${years.join(',')})`;

        // Final Query: Average scores across requested years, join with entity_event to get a sample account_name
        const query = `
            SELECT 
                ayp.account_code,
                (SELECT account_name FROM entity_event WHERE account_code = ayp.account_code LIMIT 1) as account_name,
                AVG(avg_structural_score) as structural_score,
                AVG(avg_cv) as CV,
                AVG(avg_cr1) as CR1,
                AVG(avg_hhi) as HHI,
                (
                    SELECT (last_s - first_s) / NULLIF(CAST(last_y - first_y AS REAL), 0)
                    FROM (
                        SELECT 
                            MIN(fiscal_year) as first_y, 
                            MAX(fiscal_year) as last_y,
                            (SELECT avg_structural_score FROM account_year_profile WHERE account_code = ayp.account_code AND fiscal_year = MIN(ay.fiscal_year)) as first_s,
                            (SELECT avg_structural_score FROM account_year_profile WHERE account_code = ayp.account_code AND fiscal_year = MAX(ay.fiscal_year)) as last_s
                        FROM account_year_profile ay 
                        WHERE ay.account_code = ayp.account_code
                    )
                ) as trend_score
            FROM account_year_profile ayp
            WHERE ${yearFilter}
            GROUP BY ayp.account_code
            ORDER BY structural_score DESC
            LIMIT 10
        `;

        db.all(query, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

async function runReports() {
    try {
        console.log("\n>>> [REPORT] Structural Top 10 - 2007 Only");
        const report2007 = await getTop10Report([2007]);
        if (report2007.length === 0) console.log("No data available for 2007.");
        else console.table(report2007);

        console.log("\n>>> [REPORT] Structural Top 10 - 2008 Only");
        const report2008 = await getTop10Report([2008]);
        if (report2008.length === 0) console.log("No data available for 2008.");
        else console.table(report2008);

        console.log("\n>>> [REPORT] Structural Top 10 - Combined 2007+2008");
        const reportCombined = await getTop10Report([2007, 2008]);
        if (reportCombined.length === 0) console.log("No data available for combined period.");
        else console.table(reportCombined);

    } catch (e) {
        console.error("Report generation failed:", e.message);
    } finally {
        db.close();
    }
}

runReports();
