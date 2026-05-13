let rawData = [];
let isLoaded = false;

const DATA_FILTER = (row) => {
    return row['남연간급여총액'] > 0 && row['여연간급여총액'] > 0 &&
           row['남_1인평균급여액'] > 0 && row['여_1인평균급여액'] > 0 &&
           row['남합계'] > 0 && row['여합계'] > 0 &&
           row['종목코드'] !== '007700' && row['종목코드'] !== '271830';
};

export async function loadData() {
    if (isLoaded) return rawData;
    const res = await fetch('./data.json');
    rawData = await res.json();
    isLoaded = true;
    return rawData;
}

export function applyFilters(data, search, stockCode, market) {
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

export function sortData(data, sortBy, sortOrder) {
    const validColumns = ['연도', '회사명', '종목코드', '시장구분', '남정규직', '남기간제', '남합계', '남평균근속개월수_추정', '남연간급여총액', '남_1인평균급여액', '여정규직', '여기간제', '여합계', '여평균근속개월수_추정', '여연간급여총액', '여_1인평균급여액'];
    const column = validColumns.includes(sortBy) ? sortBy : '회사명';
    const order = sortOrder === 'DESC' ? -1 : 1;

    return [...data].sort((a, b) => {
        if (a[column] < b[column]) return -1 * order;
        if (a[column] > b[column]) return 1 * order;
        return 0;
    });
}

export function getStocks({ search = '', stockCode = '', market = '', sortBy = '회사명', sortOrder = 'ASC', page = 1, limit = 20 }) {
    const filtered = applyFilters(rawData, search, stockCode, market);
    const total = filtered.length;
    const sorted = sortData(filtered, sortBy, sortOrder);
    const offset = (page - 1) * limit;
    const rows = sorted.slice(offset, offset + limit);

    return {
        success: true,
        data: rows,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
}

export function getStockByCode(code) {
    const row = rawData.find(r => r['종목코드'] === code);
    if (row) return { success: true, data: row };
    return { success: false, message: 'Not found' };
}

export function getSummaryStats() {
    const filtered = rawData.filter(DATA_FILTER);

    const totalCompanies = filtered.length;
    const totalEmployees = filtered.reduce((sum, r) => sum + (parseInt(r['남합계']) || 0) + (parseInt(r['여합계']) || 0), 0);
    const totalMaleEmployees = filtered.reduce((sum, r) => sum + (parseInt(r['남합계']) || 0), 0);
    const totalFemaleEmployees = filtered.reduce((sum, r) => sum + (parseInt(r['여합계']) || 0), 0);
    const avgMaleSalary = filtered.length > 0 ? filtered.reduce((sum, r) => sum + (parseInt(r['남_1인평균급여액']) || 0), 0) / filtered.length : 0;
    const avgFemaleSalary = filtered.length > 0 ? filtered.reduce((sum, r) => sum + (parseInt(r['여_1인평균급여액']) || 0), 0) / filtered.length : 0;
    const kosdaqCount = filtered.filter(r => r['시장구분'] === 'Q').length;
    const kospiCount = filtered.filter(r => r['시장구분'] === 'I').length;

    const maleSalaries = filtered.map(r => parseInt(r['남_1인평균급여액']) || 0).sort((a, b) => a - b);
    const femaleSalaries = filtered.map(r => parseInt(r['여_1인평균급여액']) || 0).sort((a, b) => a - b);
    const calcMedian = (arr) => {
        if (arr.length === 0) return 0;
        const mid = Math.floor(arr.length / 2);
        return arr.length % 2 !== 0 ? arr[mid] : Math.round((arr[mid - 1] + arr[mid]) / 2);
    };

    return {
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
    };
}

export function getSalaryDistribution() {
    const filtered = rawData.filter(DATA_FILTER);

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

    return { success: true, data: { male: calcStats(maleSalaries), female: calcStats(femaleSalaries) } };
}

export function getMarketComparison() {
    const filtered = rawData.filter(DATA_FILTER);

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

    return { success: true, data: result };
}

export function getGenderTop10() {
    const filtered = rawData.filter(DATA_FILTER);

    const withRatio = filtered.map(r => ({
        ...r,
        maleRatio: (parseInt(r['남합계']) || 0) / ((parseInt(r['남합계']) || 0) + (parseInt(r['여합계']) || 0)) * 100,
        femaleRatio: (parseInt(r['여합계']) || 0) / ((parseInt(r['남합계']) || 0) + (parseInt(r['여합계']) || 0)) * 100
    }));

    const topMale = [...withRatio].sort((a, b) => b.maleRatio - a.maleRatio).slice(0, 10);
    const topFemale = [...withRatio].sort((a, b) => b.femaleRatio - a.femaleRatio).slice(0, 10);

    const avgMaleRatio = filtered.length > 0 ? filtered.reduce((sum, r) => sum + (parseInt(r['남합계']) || 0), 0) / filtered.reduce((sum, r) => sum + (parseInt(r['남합계']) || 0) + (parseInt(r['여합계']) || 0), 0) * 100 : 0;
    const avgFemaleRatio = 100 - avgMaleRatio;

    return {
        success: true,
        data: {
            topMale: topMale.map(r => ({ 회사명: r['회사명'], 종목코드: r['종목코드'], 시장구분: r['시장구분'], 남합계: r['남합계'], 여합계: r['여합계'], maleRatio: r.maleRatio })),
            topFemale: topFemale.map(r => ({ 회사명: r['회사명'], 종목코드: r['종목코드'], 시장구분: r['시장구분'], 남합계: r['남합계'], 여합계: r['여합계'], femaleRatio: r.femaleRatio })),
            avgMaleRatio,
            avgFemaleRatio,
            totalCount: filtered.length
        }
    };
}

export function getSearchSuggestions(keyword) {
    if (!keyword) return { success: true, data: [] };
    const suggestions = [...new Set(rawData.filter(r => r['회사명'].includes(keyword)).map(r => r['회사명']))].slice(0, 10);
    return { success: true, data: suggestions };
}