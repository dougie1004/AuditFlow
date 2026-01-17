
import csv
import random
from datetime import datetime, timedelta
import os

# Configuration (Current Directory)
FILENAME = os.path.join(os.getcwd(), "blind_test_audit_data.csv")
ROW_COUNT = 1000

# Vendors & Categories
VENDORS = [
    ("Global Tech Solutions", "System Maint", 500000, 2000000),
    ("City Office Depot", "Supplies", 10000, 150000),
    ("Ace Management", "Advisory Fee", 2000000, 3000000), 
    ("Blue Sky Lounge", "Team Dinner", 100000, 500000),   
    ("Golden Mart", "Office Supplies", 50000, 300000),    
    ("J-Network", "IT Service", 1000000, 5000000),
]

def random_date(start, end):
    return start + timedelta(
        seconds=random.randint(0, int((end - start).total_seconds())),
    )

start_date = datetime(2024, 1, 1)
end_date = datetime.now()

rows = []
# Header
rows.append(["Date", "Vendor", "Amount", "User", "Description", "Time"])

# 1. Generate Noise (Normal Data) - 95%
for _ in range(int(ROW_COUNT * 0.95)):
    vendor, desc, min_amt, max_amt = random.choice(VENDORS)
    date = random_date(start_date, end_date)
    amount = random.randint(min_amt, max_amt)
    
    # Make some look normal
    if "Lounge" in vendor:
        hour = random.randint(18, 21) # Normal dinner time
    else:
        hour = random.randint(9, 18)
        
    user = f"Employee_{random.randint(1, 50)}"
    time_str = f"{hour:02}:{random.randint(0, 59):02}"
    
    rows.append([date.strftime("%Y-%m-%d"), vendor, amount, user, desc, time_str])

# 2. Inject Specific Risk Patterns (The "Blind Test")

# Risk A: Split Payment (The "Structuring" Trap)
# "Star Office Supplies" - 495,000 KRW x 2 within 2 minutes.
split_date = datetime(2024, 3, 15).strftime("%Y-%m-%d")
rows.append([split_date, "Star Office Supplies", 495000, "Manager_Kim", "Office Equip A", "14:10"])
rows.append([split_date, "Star Office Supplies", 495000, "Manager_Kim", "Office Equip B", "14:12"])

# Risk B: Phantom Vendor (The "Forest View" Trap)
# "Nexus Strategy Group" - 2,500,000 KRW x 3 months. Description "General Service".
for m in range(3, 6):
    d = datetime(2024, m, 10).strftime("%Y-%m-%d")
    rows.append([d, "Nexus Strategy Group", 2500000, "Director_Lee", "Monthly Fee", "10:00"])

# Risk C: Personal Expense Disguise (The "Skepticism" Trap)
# "Galaxy Store" (Generic electronics sound). Round number 1,000,000. Weekend.
weekend_date = datetime(2024, 6, 1) # Saturday
rows.append([weekend_date.strftime("%Y-%m-%d"), "Galaxy Store", 1000000, "Sales_Park", "Team Welfare", "15:30"])

# Risk D: Late Night Entertainment
late_date = datetime(2024, 5, 20).strftime("%Y-%m-%d")
rows.append([late_date, "Moonlight Club", 1250000, "Sales_Park", "Client Meeting", "01:30"]) # 1:30 AM

# Shuffle
header = rows[0]
data = rows[1:]
random.shuffle(data)
final_rows = [header] + data

with open(FILENAME, 'w', newline='', encoding='utf-8-sig') as f:
    writer = csv.writer(f)
    writer.writerows(final_rows)

print(f"Generated {len(final_rows)} rows of blind test data at {FILENAME}")
