import sqlite3

conn = sqlite3.connect(r'C:\Users\gytw2\Desktop\iqcom\asary\asary.db')
cur = conn.cursor()

print('=== 급여 데이터 업데이트 ===')

# 업데이트 전 상태
cur.execute('SELECT COUNT(*) FROM stocksum')
total = cur.fetchone()[0]
print(f'전체 행 수: {total}')

# NULL/0 개수 확인
cur.execute('SELECT COUNT(*) FROM stocksum WHERE "남_1인평균급여액" IS NULL OR "남_1인평균급여액" = 0')
male_null = cur.fetchone()[0]
print(f'남성 NULL/0 행: {male_null}')

cur.execute('SELECT COUNT(*) FROM stocksum WHERE "여_1인평균급여액" IS NULL OR "여_1인평균급여액" = 0')
female_null = cur.fetchone()[0]
print(f'여성 NULL/0 행: {female_null}')

# 업데이트 실행
cur.execute('''
UPDATE stocksum
SET "남_1인평균급여액" = CAST("남연간급여총액" AS REAL) / NULLIF("남합계", 0)
WHERE "남_1인평균급여액" IS NULL OR "남_1인평균급여액" = 0
''')
print(f'\n남성 업데이트 완료: {cur.rowcount}행')

cur.execute('''
UPDATE stocksum
SET "여_1인평균급여액" = CAST("여연간급여총액" AS REAL) / NULLIF("여합계", 0)
WHERE "여_1인평균급여액" IS NULL OR "여_1인평균급여액" = 0
''')
print(f'여성 업데이트 완료: {cur.rowcount}행')

# 업데이트 후 확인
cur.execute('SELECT COUNT(*) FROM stocksum WHERE "남_1인평균급여액" IS NULL OR "남_1인평균급여액" = 0')
print(f'\n남성 NULL/0 행 (업데이트 후): {cur.fetchone()[0]}')

cur.execute('SELECT COUNT(*) FROM stocksum WHERE "여_1인평균급여액" IS NULL OR "여_1인평균급여액" = 0')
print(f'여성 NULL/0 행 (업데이트 후): {cur.fetchone()[0]}')

# 샘플 확인
cur.execute('SELECT 회사명, "남합계", "남연간급여총액", "남_1인평균급여액" FROM stocksum LIMIT 5')
print('\n샘플 (남성):')
for row in cur.fetchall():
    합계, 총액, 평균 = row[1], row[2], row[3]
    calc = round(총액 / 합계) if 합계 > 0 else 0
    print(f'  {row[0]}: 합계={합계}, 총액={총액}, 계산값={calc}, 저장값={round(평균)}')

conn.commit()
conn.close()
print('\n완료!')