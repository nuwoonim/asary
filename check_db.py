import sqlite3

conn = sqlite3.connect(r'C:\Users\gytw2\Desktop\iqcom\asary\asary.db')
cur = conn.cursor()

cur.execute('SELECT name FROM sqlite_master WHERE type="table"')
print('테이블:', cur.fetchone())

cur.execute('SELECT COUNT(*) FROM stock_data')
print('행 수:', cur.fetchone()[0])

cur.execute('PRAGMA table_info(stock_data)')
print('\n컬럼:')
for col in cur.fetchall():
    print(f'  {col[1]} ({col[2]})')

cur.execute('SELECT * FROM stock_data LIMIT 3')
print('\n샘플 데이터:')
for row in cur.fetchall():
    print(row)

conn.close()