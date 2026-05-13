import sqlite3
import csv
import re

csv_path = r'C:\Users\gytw2\Desktop\iqcom\allstock2025.CSV'
db_path = r'C:\Users\gytw2\Desktop\iqcom\asary\asary.db'

conn = sqlite3.connect(db_path)
cur = conn.cursor()

with open(csv_path, 'r', encoding='cp949') as f:
    reader = csv.reader(f)
    headers = next(reader)

def make_col(name):
    s = re.sub(r'[^\w가-힣]', '_', name).strip('_')
    if s[0].isdigit():
        s = '_' + s
    return s

col_names = [make_col(h) for h in headers]

print('컬럼명 매핑:')
for orig, new in zip(headers, col_names):
    print(f'  {orig} -> {new}')

cols = ', '.join([f'"{cn}" TEXT' for cn in col_names])
cur.execute(f'CREATE TABLE stock_data ({cols})')

placeholders = ', '.join(['?'] * len(col_names))
insert_sql = f'INSERT INTO stock_data VALUES ({placeholders})'

print(f'\nCSV import 시작 (8828 rows)...')

cur.execute('BEGIN TRANSACTION')
with open(csv_path, 'r', encoding='cp949') as f:
    reader = csv.reader(f)
    next(reader)
    rows = list(reader)

cur.executemany(insert_sql, rows)
cur.execute('COMMIT')

print(f'{len(rows)} rows inserted')
conn.close()
print('완료!')