const DATA_FILTER = (row) => {
    return row['남연간급여총액'] > 0 && row['여연간급여총액'] > 0 &&
           row['남_1인평균급여액'] > 0 && row['여_1인평균급여액'] > 0 &&
           row['남합계'] > 0 && row['여합계'] > 0 &&
           row['종목코드'] !== '007700' && row['종목코드'] !== '271830';
};

let allData = [];

export async function initData() {
    try {
        const res = await fetch('./data.json');
        if (!res.ok) throw new Error('data.json not found');
        allData = await res.json();
        console.log('Loaded', allData.length, 'companies');
        return true;
    } catch (e) {
        console.error('Data load failed:', e);
        return false;
    }
}

export function getFilteredData(search = '', stockCode = '', market = '') {
    let result = allData.filter(DATA_FILTER);
    if (search) result = result.filter(r => r['회사명'].includes(search));
    if (stockCode) result = result.filter(r => r['종목코드'] === stockCode);
    if (market) result = result.filter(r => r['시장구분'] === market);
    return result;
}

export function getStats() {
    const data = getFilteredData();
    if (data.length === 0) return null;

    const totalEmployees = data.reduce((s, r) => s + (parseInt(r['남합계']) || 0) + (parseInt(r['여합계']) || 0), 0);
    const totalMale = data.reduce((s, r) => s + (parseInt(r['남합계']) || 0), 0);
    const totalFemale = data.reduce((s, r) => s + (parseInt(r['여합계']) || 0), 0);
    const avgMale = data.reduce((s, r) => s + (parseInt(r['남_1인평균급여액']) || 0), 0) / data.length;
    const avgFemale = data.reduce((s, r) => s + (parseInt(r['여_1인평균급여액']) || 0), 0) / data.length;

    const maleSalaries = data.map(r => parseInt(r['남_1인평균급여액']) || 0).sort((a, b) => a - b);
    const femaleSalaries = data.map(r => parseInt(r['여_1인평균급여액']) || 0).sort((a, b) => a - b);
    const medianMale = maleSalaries[Math.floor(maleSalaries.length / 2)] || 0;
    const medianFemale = femaleSalaries[Math.floor(femaleSalaries.length / 2)] || 0;

    return {
        totalCompanies: data.length,
        totalEmployees,
        totalMale,
        totalFemale,
        avgMaleSalary: Math.round(avgMale),
        avgFemaleSalary: Math.round(avgFemale),
        medianMaleSalary: medianMale,
        medianFemaleSalary: medianFemale
    };
}

export function searchCompanies(search = '', stockCode = '', market = '', sortBy = '회사명', page = 1, limit = 20) {
    const filtered = getFilteredData(search, stockCode, market);
    const order = (sortBy === '남합계' || sortBy === '여합계') ? -1 : 1;
    const sorted = [...filtered].sort((a, b) => {
        if (a[sortBy] < b[sortBy]) return -1 * order;
        if (a[sortBy] > b[sortBy]) return 1 * order;
        return 0;
    });
    const total = sorted.length;
    const start = (page - 1) * limit;
    return { data: sorted.slice(start, start + limit), total, totalPages: Math.ceil(total / limit) };
}

export function getCompany(code) {
    return allData.find(r => r['종목코드'] === code) || null;
}

export function getGenderTop10() {
    const data = getFilteredData();
    const withRatio = data.map(r => ({
        ...r,
        maleRatio: (parseInt(r['남합계']) || 0) / ((parseInt(r['남합계']) || 0) + (parseInt(r['여합계']) || 0)) * 100,
        femaleRatio: (parseInt(r['여합계']) || 0) / ((parseInt(r['남합계']) || 0) + (parseInt(r['여합계']) || 0)) * 100
    }));
    return {
        topMale: [...withRatio].sort((a, b) => b.maleRatio - a.maleRatio).slice(0, 10),
        topFemale: [...withRatio].sort((a, b) => b.femaleRatio - a.femaleRatio).slice(0, 10),
        totalCount: data.length
    };
}