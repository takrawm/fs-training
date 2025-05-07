/**
 * 親子関係のマップを作成する
 * @param {Array} accounts アカウント配列
 * @returns {Object} 親子関係のマップ
 */
export const createParentChildMap = (accounts) => {
  const parentChildMap = {};
  accounts.forEach((account) => {
    if (account.parentAccount) {
      parentChildMap[account.parentAccount] =
        parentChildMap[account.parentAccount] || [];
      parentChildMap[account.parentAccount].push(account.id);
    }
  });
  return parentChildMap;
};

/**
 * 特殊計算を行うアカウントの値を計算する
 * @param {Object} account アカウント
 * @param {Object} period 期間
 * @param {Array} values 値の配列
 * @param {Array} accounts アカウント配列
 * @returns {number} 計算された値
 */
export const calculateSpecialAccount = (account, period, values, accounts) => {
  // 売上総利益の計算（売上高合計 - 売上原価合計）
  if (account.accountName === "売上総利益") {
    const revTotal = accounts.find((a) => a.accountName === "売上高合計");
    const cogsTotal = accounts.find((a) => a.accountName === "売上原価合計");

    const revValue =
      values.find(
        (v) => v.accountId === revTotal?.id && v.periodId === period.id
      )?.value || 0;

    const cogsValue =
      values.find(
        (v) => v.accountId === cogsTotal?.id && v.periodId === period.id
      )?.value || 0;

    return revValue - cogsValue;
  }

  // 営業利益の計算（売上総利益 - 販管費合計）
  if (account.accountName === "営業利益") {
    const grossProfit = accounts.find((a) => a.accountName === "売上総利益");
    const sgaTotal = accounts.find((a) => a.accountName === "販管費合計");

    const grossProfitValue =
      values.find(
        (v) => v.accountId === grossProfit?.id && v.periodId === period.id
      )?.value || 0;

    const sgaValue =
      values.find(
        (v) => v.accountId === sgaTotal?.id && v.periodId === period.id
      )?.value || 0;

    return grossProfitValue - sgaValue;
  }

  // 汎用的な依存関係に基づく計算
  if (
    account.dependencies &&
    account.dependencies.depends_on &&
    account.dependencies.depends_on.length > 0
  ) {
    if (account.dependencies.depends_on.length === 2) {
      const firstDepId = account.dependencies.depends_on[0];
      const secondDepId = account.dependencies.depends_on[1];

      const firstValue =
        values.find(
          (v) => v.accountId === firstDepId && v.periodId === period.id
        )?.value || 0;

      const secondValue =
        values.find(
          (v) => v.accountId === secondDepId && v.periodId === period.id
        )?.value || 0;

      return firstValue - secondValue;
    }
  }

  return 0;
};

/**
 * アカウントの新しい期間の値をパラメータとリレーションに基づいて計算する
 * @param {Object} account アカウント
 * @param {Object} newPeriod 新しい期間
 * @param {Object} lastPeriod 最後の期間
 * @param {Array} values 値の配列
 * @param {Array} accounts アカウント配列
 * @returns {number} 計算された値
 */
export const calculateAccountValueForNewPeriod = (
  account,
  newPeriod,
  lastPeriod,
  values,
  accounts
) => {
  const lastPeriodValue =
    values.find(
      (v) => v.accountId === account.id && v.periodId === lastPeriod.id
    )?.value || 0;

  switch (account.parameterType) {
    case "GROWTH_RATE":
      const growthRate = account.parameter?.growthRate || 0.05;
      return lastPeriodValue * (1 + growthRate);

    case "PERCENTAGE":
      const percentage = account.parameter?.percentage || 0.1;
      const referenceAccount = accounts.find((a) => a.isReferenceAccount);
      if (!referenceAccount) return lastPeriodValue;

      const referenceValue =
        values.find(
          (v) =>
            v.accountId === referenceAccount.id && v.periodId === newPeriod.id
        )?.value || 0;

      return referenceValue * percentage;

    case "FIXED_AMOUNT":
      return account.parameter?.fixedAmount || lastPeriodValue;

    case "NONE":
    default:
      return lastPeriodValue;
  }
};

/**
 * サマリーアカウントの値を計算する
 * @param {Object} summaryAccount サマリーアカウント
 * @param {Object} period 期間
 * @param {Object} parentChildMap 親子関係のマップ
 * @param {Array} accountValues アカウント値配列
 * @returns {number} 計算された値
 */
export const calculateSummaryAccountValue = (
  summaryAccount,
  period,
  parentChildMap,
  accountValues
) => {
  let sumValue = 0;
  const childAccounts = parentChildMap[summaryAccount.accountName] || [];

  childAccounts.forEach((childId) => {
    const childValue = accountValues.find(
      (v) => v.accountId === childId && v.periodId === period.id
    );
    if (childValue) {
      sumValue += childValue.value;
    }
  });

  return sumValue;
};
