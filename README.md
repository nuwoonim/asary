# Asary - 기업 인력 데이터 분석

한국 주식시장 상장기업의 인력 및 급여 데이터를 분석하는 웹 서비스입니다.

## 실행 방법

```bash
# 의존성 설치
npm install

# 서버 실행
npm start

# 접속
# http://localhost:3001
```

## 주요 페이지

| URL | 설명 |
|-----|------|
| `/` | 기업 검색 |
| `/stats.html` | 통계 현황 |
| `/gender-top10.html` | 남초/여초 TOP10 |

## API 엔드포인트

- `GET /api/stocks` - 기업 목록 (검색, 필터, 페이징)
- `GET /api/stocks/:stockCode` - 기업 상세
- `GET /api/stats/summary` - 통계 요약
- `GET /api/stats/gender-top10` - 남초/여초 TOP10

## 기술 스택

- Backend: Express.js + better-sqlite3
- Frontend: Vanilla JS + Chart.js
- Database: SQLite