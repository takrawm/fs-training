import { createPeriods } from "./period";

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
