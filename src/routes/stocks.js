const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

const DATA_FILTER_CONDITIONS = '"남연간급여총액" > 0 AND "여연간급여총액" > 0 AND "남_1인평균급여액" > 0 AND "여_1인평균급여액" > 0 AND "남합계" > 0 AND "여합계" > 0';

router.get('/stocks', (req, res) => {
    const db = getDb();
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const stockCode = req.query.stockCode || '';
        const market = req.query.market || '';
        const sortBy = req.query.sortBy || '회사명';
        const sortOrder = req.query.sortOrder || 'ASC';

        let whereClauses = [DATA_FILTER_CONDITIONS];
        let params = [];

        if (search) {
            whereClauses.push('회사명 LIKE ?');
            params.push(`%${search}%`);
        }

        if (stockCode) {
            whereClauses.push('종목코드 = ?');
            params.push(stockCode);
        }

        if (market) {
            whereClauses.push('시장구분 = ?');
            params.push(market);
        }

        const whereSQL = `WHERE ${whereClauses.join(' AND ')}`;

        const countSql = `SELECT COUNT(*) as total FROM stocksum ${whereSQL}`;
        const { total } = db.prepare(countSql).get(...params);

        const validColumns = ['연도', '회사명', '종목코드', '시장구분', '남정규직', '남기간제', '남합계', '남평균근속개월수_추정', '남연간급여총액', '남_1인평균급여액', '여정규직', '여기간제', '여합계', '여평균근속개월수_추정', '여연간급여총액', '여_1인평균급여액'];
        const orderColumn = validColumns.includes(sortBy) ? sortBy : '회사명';
        const order = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

        const dataSql = `SELECT * FROM stocksum ${whereSQL} ORDER BY "${orderColumn}" ${order} LIMIT ? OFFSET ?`;
        const rows = db.prepare(dataSql).all(...params, limit, offset);

        db.close();

        res.json({
            success: true,
            data: rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        db.close();
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/stocks/:stockCode', (req, res) => {
    const db = getDb();
    try {
        const { stockCode } = req.params;
        const row = db.prepare('SELECT * FROM stocksum WHERE 종목코드 = ?').get(stockCode);

        db.close();

        if (row) {
            res.json({ success: true, data: row });
        } else {
            res.status(404).json({ success: false, message: 'Not found' });
        }
    } catch (error) {
        db.close();
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/stats/summary', (req, res) => {
    const db = getDb();
    try {
        const stats = db.prepare(`
            SELECT
                COUNT(*) as totalCompanies,
                SUM(남합계 + 여합계) as totalEmployees,
                SUM(남합계) as totalMaleEmployees,
                SUM(여합계) as totalFemaleEmployees,
                SUM(남연간급여총액 + 여연간급여총액) as totalSalary,
                AVG(CAST(남_1인평균급여액 AS INTEGER)) as avgMaleSalary,
                AVG(CAST(여_1인평균급여액 AS INTEGER)) as avgFemaleSalary,
                SUM(CASE WHEN 시장구분 = 'Q' THEN 1 ELSE 0 END) as kosdaqCount,
                SUM(CASE WHEN 시장구분 = 'I' THEN 1 ELSE 0 END) as kospiCount
            FROM stocksum
            WHERE ${DATA_FILTER_CONDITIONS}
        `).get();

        const maleSalaries = db.prepare(`SELECT CAST("남_1인평균급여액" AS INTEGER) as salary FROM stocksum WHERE ${DATA_FILTER_CONDITIONS} ORDER BY salary`).all();
        const femaleSalaries = db.prepare(`SELECT CAST("여_1인평균급여액" AS INTEGER) as salary FROM stocksum WHERE ${DATA_FILTER_CONDITIONS} ORDER BY salary`).all();

        const calcMedian = (arr) => {
            if (arr.length === 0) return 0;
            const sorted = arr.map(r => r.salary).sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
        };

        stats.medianMaleSalary = calcMedian(maleSalaries);
        stats.medianFemaleSalary = calcMedian(femaleSalaries);

        db.close();
        res.json({ success: true, data: stats });
    } catch (error) {
        db.close();
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/stats/by-market', (req, res) => {
    const db = getDb();
    try {
        const rows = db.prepare(`
            SELECT
                시장구분,
                COUNT(*) as companyCount,
                SUM(남합계 + 여합계) as totalEmployees,
                AVG(CAST(남_1인평균급여액 AS INTEGER)) as avgMaleSalary,
                AVG(CAST(여_1인평균급여액 AS INTEGER)) as avgFemaleSalary
            FROM stocksum
            WHERE ${DATA_FILTER_CONDITIONS}
            GROUP BY 시장구분
        `).all();

        db.close();
        res.json({ success: true, data: rows });
    } catch (error) {
        db.close();
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/stats/salary-distribution', (req, res) => {
    const db = getDb();
    try {
        const maleSalary = db.prepare(`
            SELECT CAST("남_1인평균급여액" AS INTEGER) as salary FROM stocksum
            WHERE ${DATA_FILTER_CONDITIONS}
            ORDER BY salary
        `).all();

        const femaleSalary = db.prepare(`
            SELECT CAST("여_1인평균급여액" AS INTEGER) as salary FROM stocksum
            WHERE ${DATA_FILTER_CONDITIONS}
            ORDER BY salary
        `).all();

        const calcStats = (arr) => {
            if (arr.length === 0) return { min: 0, max: 0, median: 0, avg: 0 };
            const salaries = arr.map(r => r.salary);
            const sorted = [...salaries].sort((a, b) => a - b);
            const min = sorted[0];
            const max = sorted[sorted.length - 1];
            const median = sorted.length % 2 === 0
                ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
                : sorted[Math.floor(sorted.length / 2)];
            const avg = salaries.reduce((a, b) => a + b, 0) / salaries.length;
            return { min, max, median, avg: Math.round(avg) };
        };

        const result = {
            male: calcStats(maleSalary),
            female: calcStats(femaleSalary)
        };

        db.close();
        res.json({ success: true, data: result });
    } catch (error) {
        db.close();
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/stats/market-comparison', (req, res) => {
    const db = getDb();
    try {
        const rows = db.prepare(`
            SELECT
                시장구분,
                COUNT(*) as companyCount,
                SUM(남합계 + 여합계) as totalEmployees,
                SUM(CAST(남연간급여총액 AS INTEGER) + CAST(여연간급여총액 AS INTEGER)) as totalSalary,
                AVG(CAST(남_1인평균급여액 AS INTEGER)) as avgMaleSalary,
                AVG(CAST(여_1인평균급여액 AS INTEGER)) as avgFemaleSalary
            FROM stocksum
            WHERE ${DATA_FILTER_CONDITIONS}
            GROUP BY 시장구분
        `).all();

        const result = {};
        rows.forEach(r => {
            result[r.시장구분] = {
                companyCount: r.companyCount,
                totalEmployees: r.totalEmployees,
                avgSalary: Math.round((r.avgMaleSalary + r.avgFemaleSalary) / 2),
                avgMaleSalary: Math.round(r.avgMaleSalary),
                avgFemaleSalary: Math.round(r.avgFemaleSalary)
            };
        });

        db.close();
        res.json({ success: true, data: result });
    } catch (error) {
        db.close();
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/search/suggestions', (req, res) => {
    const db = getDb();
    try {
        const keyword = req.query.keyword || '';
        const rows = db.prepare(`
            SELECT DISTINCT 회사명 FROM stocksum 
            WHERE 회사명 LIKE ? 
            LIMIT 10
        `).all(`%${keyword}%`);

        db.close();
        res.json({ success: true, data: rows.map(r => r.회사명) });
    } catch (error) {
        db.close();
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/stats/gender-top10', (req, res) => {
    const db = getDb();
    try {
        const topMale = db.prepare(`
            SELECT
                회사명,
                종목코드,
                시장구분,
                남합계,
                여합계,
                (CAST(남합계 AS REAL) / (CAST(남합계 AS REAL) + CAST(여합계 AS REAL))) * 100 as maleRatio
            FROM stocksum
            WHERE ${DATA_FILTER_CONDITIONS}
            ORDER BY maleRatio DESC
            LIMIT 10
        `).all();

        const topFemale = db.prepare(`
            SELECT
                회사명,
                종목코드,
                시장구분,
                남합계,
                여합계,
                (CAST(여합계 AS REAL) / (CAST(남합계 AS REAL) + CAST(여합계 AS REAL))) * 100 as femaleRatio
            FROM stocksum
            WHERE ${DATA_FILTER_CONDITIONS}
            ORDER BY femaleRatio DESC
            LIMIT 10
        `).all();

        const avgStats = db.prepare(`
            SELECT
                AVG(CAST(남합계 AS REAL) / (CAST(남합계 AS REAL) + CAST(여합계 AS REAL)) * 100) as avgMaleRatio,
                AVG(CAST(여합계 AS REAL) / (CAST(남합계 AS REAL) + CAST(여합계 AS REAL)) * 100) as avgFemaleRatio,
                COUNT(*) as totalCount
            FROM stocksum
            WHERE ${DATA_FILTER_CONDITIONS}
        `).get();

        db.close();
        res.json({ success: true, data: { topMale, topFemale, avgMaleRatio: avgStats.avgMaleRatio, avgFemaleRatio: avgStats.avgFemaleRatio, totalCount: avgStats.totalCount } });
    } catch (error) {
        db.close();
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;