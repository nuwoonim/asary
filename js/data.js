const DATA_FILTER = (row) => {
    return row['남연간급여총액'] > 0 && row['여연간급여총액'] > 0 &&
           row['남_1인평균급여액'] > 0 && row['여_1인평균급여액'] > 0 &&
           row['남합계'] > 0 && row['여합계'] > 0 &&
           row['종목코드'] !== '007700' && row['종목코드'] !== '271830';
};

let allData = [];
let filteredData = [];
let companyMap = new Map();
let statsCache = null;
let salaryDistributionCache = null;
let marketComparisonCache = null;
let genderTop10Cache = null;

export async function initData() {
    try {
        const res = await fetch('./data.json');
        if (!res.ok) throw new Error('data.json not found');
        allData = await res.json();
        console.log('Loaded', allData.length, 'companies');

        // Pre-filter and cache
        filteredData = allData.filter(DATA_FILTER);
        console.log('Filtered to', filteredData.length, 'valid companies');

        // Build index for fast lookup
        filteredData.forEach(row => {
            companyMap.set(row['종목코드'], row);
        });

        // Pre-calculate stats
        statsCache = calculateStats();

        return true;
    } catch (e) {
        console.error('Data load failed:', e);
        return false;
    }
}

function calculateStats() {
    if (filteredData.length === 0) return null;

    const totalEmployees = filteredData.reduce((s, r) => s + (parseInt(r['남합계']) || 0) + (parseInt(r['여합계']) || 0), 0);
    const totalMale = filteredData.reduce((s, r) => s + (parseInt(r['남합계']) || 0), 0);
    const totalFemale = filteredData.reduce((s, r) => s + (parseInt(r['여합계']) || 0), 0);
    const avgMale = filteredData.reduce((s, r) => s + (parseInt(r['남_1인평균급여액']) || 0), 0) / filteredData.length;
    const avgFemale = filteredData.reduce((s, r) => s + (parseInt(r['여_1인평균급여액']) || 0), 0) / filteredData.length;

    const maleSalaries = filteredData.map(r => parseInt(r['남_1인평균급여액']) || 0).sort((a, b) => a - b);
    const femaleSalaries = filteredData.map(r => parseInt(r['여_1인평균급여액']) || 0).sort((a, b) => a - b);
    const medianMale = maleSalaries[Math.floor(maleSalaries.length / 2)] || 0;
    const medianFemale = femaleSalaries[Math.floor(femaleSalaries.length / 2)] || 0;

    return {
        totalCompanies: filteredData.length,
        totalEmployees,
        totalMale,
        totalFemale,
        avgMaleSalary: Math.round(avgMale),
        avgFemaleSalary: Math.round(avgFemale),
        medianMaleSalary: medianMale,
        medianFemaleSalary: medianFemale
    };
}

export function getStats() {
    return statsCache;
}

export function searchCompanies(search = '', stockCode = '', market = '', sortBy = '회사명', page = 1, limit = 20) {
    let result = filteredData;

    // Apply filters
    if (search) {
        const searchLower = search.toLowerCase();
        result = result.filter(r => r['회사명'].toLowerCase().includes(searchLower));
    }
    if (stockCode) {
        result = result.filter(r => r['종목코드'] === stockCode);
    }
    if (market) {
        result = result.filter(r => r['시장구분'] === market);
    }

    // Sort
    const order = (sortBy === '남합계' || sortBy === '여합계') ? -1 : 1;
    result = [...result].sort((a, b) => {
        const aVal = a[sortBy] || '';
        const bVal = b[sortBy] || '';
        if (aVal < bVal) return -1 * order;
        if (aVal > bVal) return 1 * order;
        return 0;
    });

    const total = result.length;
    const start = (page - 1) * limit;
    return { data: result.slice(start, start + limit), total, totalPages: Math.ceil(total / limit) };
}

export function getCompany(code) {
    return companyMap.get(code) || null;
}

export function getGenderTop10() {
    if (genderTop10Cache) return genderTop10Cache;

    const withRatio = filteredData.map(r => ({
        ...r,
        maleRatio: (parseInt(r['남합계']) || 0) / ((parseInt(r['남합계']) || 0) + (parseInt(r['여합계']) || 0)) * 100,
        femaleRatio: (parseInt(r['여합계']) || 0) / ((parseInt(r['남합계']) || 0) + (parseInt(r['여합계']) || 0)) * 100
    }));

    const topMale = [...withRatio].sort((a, b) => b.maleRatio - a.maleRatio).slice(0, 10);
    const topFemale = [...withRatio].sort((a, b) => b.femaleRatio - a.femaleRatio).slice(0, 10);

    const totalMale = filteredData.reduce((s, r) => s + (parseInt(r['남합계']) || 0), 0);
    const totalFemale = filteredData.reduce((s, r) => s + (parseInt(r['여합계']) || 0), 0);
    const totalAll = totalMale + totalFemale;
    const avgMaleRatio = totalAll > 0 ? (totalMale / totalAll) * 100 : 0;
    const avgFemaleRatio = 100 - avgMaleRatio;

    genderTop10Cache = {
        topMale,
        topFemale,
        avgMaleRatio,
        avgFemaleRatio,
        totalCount: filteredData.length
    };

    return genderTop10Cache;
}

export function getSalaryDistribution() {
    if (salaryDistributionCache) return salaryDistributionCache;

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

    const maleSalaries = filteredData.map(r => parseInt(r['남_1인평균급여액']) || 0);
    const femaleSalaries = filteredData.map(r => parseInt(r['여_1인평균급여액']) || 0);

    salaryDistributionCache = {
        male: calcStats(maleSalaries),
        female: calcStats(femaleSalaries)
    };

    return salaryDistributionCache;
}

export function getMarketComparison() {
    if (marketComparisonCache) return marketComparisonCache;

    const byMarket = {};
    filteredData.forEach(r => {
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

    marketComparisonCache = result;
    return marketComparisonCache;
}