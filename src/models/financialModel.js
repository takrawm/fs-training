/**
 * 勘定科目と期間に紐づく値を生成する
 * @param {Object} aggregatedMap 集計マップ
 * @param {Array} periods 期間配列
 * @param {Array} accounts アカウント配列
 * @returns {Array} アカウント値配列
 */
export const createAccountValues = (aggregatedMap, periods, accounts) => {
  const values = [];
  periods.forEach((period) => {
    accounts.forEach((account) => {
      const accountData = aggregatedMap[account.accountName];
      if (accountData) {
        values.push({
          id: `v-${account.id}-${period.id}`,
          accountId: account.id,
          periodId: period.id,
          value: accountData.values[period.order - 1] || 0,
        });
      }
    });
  });
  return values;
};

export const createPeriods = (flattenedData) => {
  const newPeriods = [];
  if (flattenedData?.headerRow && flattenedData.headerRow.length > 0) {
    flattenedData.headerRow.forEach((year, index) => {
      const currentYear = new Date().getFullYear();
      const isActual = Number(year) <= currentYear;
      newPeriods.push({
        id: `p-${year}`,
        year,
        isActual,
        isFromExcel: true,
        order: index + 1,
      });
    });
  }
  return newPeriods;
};
