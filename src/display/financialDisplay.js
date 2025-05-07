/**
 * 表示用の最終集計値を生成する
 * @param {Array} finalAccounts 最終的なアカウント配列
 * @param {Array} periods 期間配列
 * @param {Array} accountValues アカウント値配列
 * @returns {Array} 表示用最終集計値配列
 */
export const createAggregatedValueForDisplay = (
  finalAccounts,
  periods,
  accountValues
) => {
  return finalAccounts.map((account) => {
    const valuesRow = periods.map((p) => {
      const v = accountValues.find(
        (av) => av.accountId === account.id && av.periodId === p.id
      );
      const raw = v ? v.value : 0;
      return Math.trunc(raw);
    });
    return [account.accountName, ...valuesRow];
  });
};

/**
 * タブに基づいてフィルタリングされたデータを生成する
 * @param {string} tabName タブ名
 * @param {Array} aggregatedValue 集計値配列
 * @param {Array} accounts アカウント配列
 * @returns {Array} フィルタリングされたデータ
 */
export const getFilteredDataByTab = (tabName, aggregatedValue, accounts) => {
  // パラメータタブの場合
  if (tabName === "パラメータ") {
    return accounts.map((account) => {
      return [
        account.accountName,
        account.parentAccount || "",
        account.parameterType || "NONE",
        account.isParameterReference ? "true" : "false",
        account.relation?.type || "NONE",
        account.relation?.subType || "",
        account.calculationType || "null",
      ];
    });
  }

  // タブに該当する勘定科目のみをフィルタリング
  return aggregatedValue.filter((row) => {
    const accountName = row[0];
    const account = accounts.find((acc) => acc.accountName === accountName);
    return account && account.sheetType === tabName;
  });
};
