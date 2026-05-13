const express = require('express');
const router = express.Router();
const { getDb, getData } = require('../db/database');

const DATA_FILTER = (row) => {
    return row['남연간급여총액'] > 0 && row['여연간급여총액'] > 0 &&
           row['남_1인평균급여액'] > 0 && row['여_1인평균급여액'] > 0 &&
           row['남합계'] > 0 && row['여합계'] > 0;
};

function applyFilters(data, search, stockCode, market) {
    let result = data.filter(DATA_FILTER);

    if (search) {
        result = result.filter(r => r['회사명'].includes(search));
    }
    if (stockCode) {
        result = result.filter(r => r['종목코드'] === stockCode);
    }
    if (market) {
        result = result.filter(r => r['시장구분'] === market);
    }
    return result;
}

function sortData(data, sortBy, sortOrder) {
    const validColumns = ['연도', '회사명', '종목코드', '시장구분', '남정규직', '남기간제', '남합계', '남평균근속개월수_추정', '남연간급여총액', '남_1인평균급여액', '여정규직', '여기간제', '여합계', '여평균근속개월수_추정', '여연간급여총액', '여_1인평균급여액'];
    const column = validColumns.includes(sortBy) ? sortBy : '회사명';
    const order = sortOrder === 'DESC' ? -1 : 1;

    return [...data].sort((a, b) => {
        if (a[column] < b[column]) return -1 * order;
        if (a[column] > b[column]) return 1 * order;
        return 0;
    });
}

router.get('/stocks', (req, res) => {
    try {
        const db = getData();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const stockCode = req.query.stockCode || '';
        const market = req.query.market || '';
        const sortBy = req.query.sortBy || '회사명';
        const sortOrder = req.query.sortOrder || 'ASC';

        let filtered = applyFilters(db, search, stockCode, market);
        const total = filtered.length;
        const sorted = sortData(filtered, sortBy, sortOrder);
        const rows = sorted.slice(offset, offset + limit);

        res.json({
            success: true,
            data: rows,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/stocks/:stockCode', (req, res) => {
    try {
        const db = getData();
        const row = db.find(r => r['종목코드'] === req.params.stockCode);
        if (row) {
            res.json({ success: true, data: row });
        } else {
            res.status(404).json({ success: false, message: 'Not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/stats/summary', (req, res) => {
    try {
        const db = getData();
        const filtered = db.filter(DATA_FILTER);

        const totalCompanies = filtered.length;
        const totalEmployees = filtered.reduce((sum, r) => sum + (parseInt(r['남합계']) || 0) + (parseInt(r['여합계']) || 0), 0);
        const totalMaleEmployees = filtered.reduce((sum, r) => sum + (parseInt(r['남합계']) || 0), 0);
        const totalFemaleEmployees = filtered.reduce((sum, r) => sum + (parseInt(r['여합계']) || 0), 0);
        const avgMaleSalary = filtered.length > 0 ? filtered.reduce((sum, r) => sum + (parseInt(r['남_1인평균급여액']) || 0), 0) / filtered.length : 0;
        const avgFemaleSalary = filtered.length > 0 ? filtered.reduce((sum, r) => sum + (parseInt(r['여_1인평균급여액']) || 0), 0) / filtered.length : 0;
        const kosdaqCount = filtered.filter(r => r['시장구분'] === 'Q').length;
        const kospiCount = filtered.filter(r => r['시장구분'] === 'I').length;

        // 중앙값 계산
        const maleSalaries = filtered.map(r => parseInt(r['남_1인평균급여액']) || 0).sort((a, b) => a - b);
        const femaleSalaries = filtered.map(r => parseInt(r['여_1인평균급여액']) || 0).sort((a, b) => a - b);
        const calcMedian = (arr) => {
            if (arr.length === 0) return 0;
            const mid = Math.floor(arr.length / 2);
            return arr.length % 2 !== 0 ? arr[mid] : Math.round((arr[mid - 1] + arr[mid]) / 2);
        };

        res.json({
            success: true,
            data: {
                totalCompanies,
                totalEmployees,
                totalMaleEmployees,
                totalFemaleEmployees,
                avgMaleSalary: Math.round(avgMaleSalary),
                avgFemaleSalary: Math.round(avgFemaleSalary),
                kosdaqCount,
                kospiCount,
                medianMaleSalary: calcMedian(maleSalaries),
                medianFemaleSalary: calcMedian(femaleSalaries)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/stats/by-market', (req, res) => {
    try {
        const db = getData();
        const filtered = db.filter(DATA_FILTER);

        const byMarket = {};
        filtered.forEach(r => {
            const market = r['시장구분'];
            if (!byMarket[market]) {
                byMarket[market] = { companyCount: 0, totalEmployees: 0, salaries: [] };
            }
            byMarket[market].companyCount++;
            byMarket[market].totalEmployees += (parseInt(r['남합계']) || 0) + (parseInt(r['여합계']) || 0);
            byMarket[market].salaries.push(parseInt(r['남_1인평균급여액']) || 0, parseInt(r['여_1인평균급여액']) || 0);
        });

        const result = Object.entries(byMarket).map(([시장구분, data]) => ({
            시장구분,
            companyCount: data.companyCount,
            totalEmployees: data.totalEmployees,
            avgMaleSalary: Math.round(data.salaries.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b, 0) / data.companyCount),
            avgFemaleSalary: Math.round(data.salaries.filter((_, i) => i % 2 === 1).reduce((a, b) => a + b, 0) / data.companyCount)
        }));

        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/stats/salary-distribution', (req, res) => {
    try {
        const db = getData();
        const filtered = db.filter(DATA_FILTER);

        const calcStats = (arr) => {
            if (arr.length === 0) return { min: 0, max: 0, median: 0, avg: 0 };
            const sorted = [...arr].sort((a, b) => a - b);
            return {
                min: sorted[0],
                max: sorted[sorted.length - 1],
                median: sorted.length % 2 === 0 ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2 : sorted[Math.floor(sorted.length / 2)],
                avg: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
            };
        };

        const maleSalaries = filtered.map(r => parseInt(r['남_1인평균급여액']) || 0);
        const femaleSalaries = filtered.map(r => parseInt(r['여_1인평균급여액']) || 0);

        res.json({ success: true, data: { male: calcStats(maleSalaries), female: calcStats(femaleSalaries) } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/stats/market-comparison', (req, res) => {
    try {
        const db = getData();
        const filtered = db.filter(DATA_FILTER);

        const byMarket = {};
        filtered.forEach(r => {
            const market = r['시장구분'];
            if (!byMarket[market]) {
                byMarket[market] = { companyCount: 0, totalEmployees: 0, maleSalaries: [], femaleSalaries: [] };
            }
            byMarket[market].companyCount++;
            byMarket[market].totalEmployees += (parseInt(r['남합계']) || 0) + (parseInt(r['여합계']) || 0);
            byMarket[market].maleSalaries.push(parseInt(r['남_1인평균급여액']) || 0);
            byMarket[market].femaleSalaries.push(parseInt(r['여_1인평균급여액']) || 0);
        });

        const result = {};
        Object.entries(byMarket).forEach(([key, data]) => {
            result[key] = {
                companyCount: data.companyCount,
                totalEmployees: data.totalEmployees,
                avgSalary: Math.round([...data.maleSalaries, ...data.femaleSalaries].reduce((a, b) => a + b, 0) / data.companyCount / 2),
                avgMaleSalary: Math.round(data.maleSalaries.reduce((a, b) => a + b, 0) / data.maleSalaries.length),
                avgFemaleSalary: Math.round(data.femaleSalaries.reduce((a, b) => a + b, 0) / data.femaleSalaries.length)
            };
        });

        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/search/suggestions', (req, res) => {
    try {
        const db = getData();
        const keyword = req.query.keyword || '';
        const suggestions = [...new Set(db.filter(r => r['회사명'].includes(keyword)).map(r => r['회사명']))].slice(0, 10);
        res.json({ success: true, data: suggestions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/stats/gender-top10', (req, res) => {
    try {
        const db = getData();
        const filtered = db.filter(DATA_FILTER);

        const withRatio = filtered.map(r => ({
            ...r,
            maleRatio: (parseInt(r['남합계']) || 0) / ((parseInt(r['남합계']) || 0) + (parseInt(r['여합계']) || 0)) * 100,
            femaleRatio: (parseInt(r['여합계']) || 0) / ((parseInt(r['남합계']) || 0) + (parseInt(r['여합계']) || 0)) * 100
        }));

        const topMale = [...withRatio].sort((a, b) => b.maleRatio - a.maleRatio).slice(0, 10);
        const topFemale = [...withRatio].sort((a, b) => b.femaleRatio - a.femaleRatio).slice(0, 10);

        const avgMaleRatio = filtered.length > 0 ? filtered.reduce((sum, r) => sum + (parseInt(r['남합계']) || 0), 0) / filtered.reduce((sum, r) => sum + (parseInt(r['남합계']) || 0) + (parseInt(r['여합계']) || 0), 0) * 100 : 0;
        const avgFemaleRatio = 100 - avgMaleRatio;

        res.json({
            success: true,
            data: {
                topMale: topMale.map(r => ({ 회사명: r['회사명'], 종목코드: r['종목코드'], 시장구분: r['시장구분'], 남합계: r['남합계'], 여합계: r['여합계'], maleRatio: r.maleRatio })),
                topFemale: topFemale.map(r => ({ 회사명: r['회사명'], 종목코드: r['종목코드'], 시장구분: r['시장구분'], 남합계: r['남합계'], 여합계: r['여합계'], femaleRatio: r.femaleRatio })),
                avgMaleRatio,
                avgFemaleRatio,
                totalCount: filtered.length
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;