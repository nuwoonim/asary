-- NULL 또는 0인 경우 계산하여 업데이트
UPDATE stocksum
SET "남_1인평균급여액" = CAST("남연간급여총액" AS REAL) / NULLIF("남합계", 0)
WHERE "남_1인평균급여액" IS NULL OR "남_1인평균급여액" = 0;

UPDATE stocksum
SET "여_1인평균급여액" = CAST("여연간급여총액" AS REAL) / NULLIF("여합계", 0)
WHERE "여_1인평균급여액" IS NULL OR "여_1인평균급여액" = 0;

-- 결과 확인
SELECT '남_1인평균급여액' as col, COUNT(*) as null_count FROM stocksum WHERE "남_1인평균급여액" IS NULL OR "남_1인평균급여액" = 0
UNION ALL
SELECT '여_1인평균급여액', COUNT(*) FROM stocksum WHERE "여_1인평균급여액" IS NULL OR "여_1인평균급여액" = 0;