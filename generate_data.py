import pandas as pd
import random
from datetime import datetime, timedelta
import os
import json

# 설정: 데이터 생성 기간 (2년)
START_DATE = datetime(2024, 1, 1)
END_DATE = datetime(2025, 12, 31)
NUM_TRANSACTIONS = 2000  # 정상 데이터 개수

# 폴더 생성
OUTPUT_DIR = "audit_dataset_v2"
EVIDENCE_DIR = os.path.join(OUTPUT_DIR, "evidence")
os.makedirs(EVIDENCE_DIR, exist_ok=True)

# 1. 기초 데이터 (Master Data)
vendors = [
    {"id": "V001", "name": "Samsung Electronics", "category": "IT Equipment"},
    {"id": "V002", "name": "WeWork Korea", "category": "Rent"},
    {"id": "V003", "name": "AWS Web Services", "category": "Cloud Server"},
    {"id": "V004", "name": "Office Depot", "category": "Supplies"},
    {"id": "V005", "name": "Korean Air", "category": "Travel"},
]
employees = ["John Doe", "Jane Smith", "David Kim", "Sarah Park", "Michael Lee"]
accounts = ["Traveling Expense", "IT Maintenance", "Rent", "Entertainment", "Supplies"]

# 2. 정상 데이터 생성 함수
def random_date(start, end):
    return start + timedelta(days=random.randint(0, (end - start).days))

data = []
for _ in range(NUM_TRANSACTIONS):
    date = random_date(START_DATE, END_DATE)
    # 주말 제외 (정상적인 경우)
    if date.weekday() >= 5:
        date -= timedelta(days=2)
    
    vendor = random.choice(vendors)
    amount = round(random.uniform(100, 5000), 2)
    
    row = {
        "Transaction_ID": f"TRX-{random.randint(10000, 99999)}",
        "Date": date.strftime("%Y-%m-%d"),
        "Vendor_Name": vendor["name"],
        "Vendor_ID": vendor["id"],
        "Description": f"Payment for {vendor['category']}",
        "Amount": amount,
        "User": random.choice(employees),
        "Approval_Status": "Approved"
    }
    data.append(row)

# ---------------------------------------------------------
# 3. 부정 시나리오 주입 (Risk Scenarios Injection)
# ---------------------------------------------------------

# Case A: 쪼개기 결제 (Split Payment) - 전결 규정 $10,000 회피
# 같은 날, 같은 업체에 $9,500씩 두 번 결제
split_date = datetime(2025, 11, 15).strftime("%Y-%m-%d")
data.append({
    "Transaction_ID": "TRX-SPLIT-01", "Date": split_date, "Vendor_Name": "Apple Store", "Vendor_ID": "V001",
    "Description": "Macbook Pro Bulk Purchase (Part 1)", "Amount": 9500.00, "User": "David Kim", "Approval_Status": "Approved"
})
data.append({
    "Transaction_ID": "TRX-SPLIT-02", "Date": split_date, "Vendor_Name": "Apple Store", "Vendor_ID": "V001",
    "Description": "Macbook Pro Bulk Purchase (Part 2)", "Amount": 9500.00, "User": "David Kim", "Approval_Status": "Approved"
})

# Case B: 유령 거래처 (Ghost Vendor) - Master에 없는 업체
data.append({
    "Transaction_ID": "TRX-GHOST-01", "Date": "2025-05-20", "Vendor_Name": "Paper Company Inc.", "Vendor_ID": "V999", # V999는 없음
    "Description": "Consulting Fee", "Amount": 15000.00, "User": "Michael Lee", "Approval_Status": "Approved"
})

# Case C: 주말/심야 유흥업소 (Weekend/Holiday Abuse)
weekend_date = "2024-12-25" # 크리스마스
data.append({
    "Transaction_ID": "TRX-RISK-01", "Date": weekend_date, "Vendor_Name": "Gangnam Luxury Bar", "Vendor_ID": "V_Unknown",
    "Description": "Client Meeting", "Amount": 3200.00, "User": "Sarah Park", "Approval_Status": "Approved"
})

# Case D: 금액 불일치 (Evidence Mismatch)
# 장부엔 $8,000인데, 증빙 파일엔 $800으로 적혀있음 (횡령)
mismatch_id = "TRX-MISMATCH-99"
data.append({
    "Transaction_ID": mismatch_id, "Date": "2025-08-10", "Vendor_Name": "AWS Web Services", "Vendor_ID": "V003",
    "Description": "Cloud Server Annual Fee", "Amount": 8000.00, "User": "John Doe", "Approval_Status": "Approved"
})

# 증거 파일 생성 (가짜 영수증)
evidence_text = f"""
[INVOICE]
ID: {mismatch_id}
Date: 2025-08-10
Vendor: AWS Web Services
Item: EC2 Instance Usage
Total: $800.00  <-- (Mismatch! Ledger says 8000)
"""
with open(os.path.join(EVIDENCE_DIR, f"Invoice_{mismatch_id}.txt"), "w") as f:
    f.write(evidence_text)

# Case E: 내부 공모 (Kickback) 이메일 증거
# CSV에는 정상처럼 보이지만, 이메일 파일에서 정황 포착
kickback_vendor = "Creative Design Co."
data.append({
    "Transaction_ID": "TRX-KICK-01", "Date": "2025-09-01", "Vendor_Name": kickback_vendor, "Vendor_ID": "V010",
    "Description": "Logo Redesign Project", "Amount": 20000.00, "User": "Michael Lee", "Approval_Status": "Approved"
})

email_evidence = """
From: ceo@creativedesign.co
To: michael.lee@auditcorp.com
Subject: RE: Project Payment

Hi Michael,
We received the $20,000. As agreed, I will transfer 10% ($2,000) to your personal account by tomorrow.
Thanks for choosing us again. Let's keep this between us.
"""
with open(os.path.join(EVIDENCE_DIR, "Secret_Email_Thread.txt"), "w") as f:
    f.write(email_evidence)

# ---------------------------------------------------------
# 4. 파일 저장
# ---------------------------------------------------------
df = pd.DataFrame(data)
# 날짜순 정렬
df = df.sort_values(by="Date").reset_index(drop=True)

csv_path = os.path.join(OUTPUT_DIR, "General_Ledger_2024_2025.csv")
df.to_csv(csv_path, index=False)

print(f"✅ Data Generation Complete!")
print(f"📂 Folder: {OUTPUT_DIR}")
print(f"📄 Ledger: {csv_path} ({len(df)} rows)")
print(f"Evidences created in {EVIDENCE_DIR}")