import { getCalculationOrder } from "../utils/dependencyCalculation";
import {
  createParentChildMap,
  calculateSummaryAccountValue,
  calculateSpecialAccount,
  createDependenciesFromRelationMaster,
} from "../utils/financialCalculations";

/**
 * 財務モデルを作成する関数
 * @param {Array} accounts 勘定科目の定義
 * @param {Array} periods 期間情報
 * @param {Array} values 勘定科目と期間に紐づく値
 * @param {Object} relationMaster リレーション設定情報
 * @returns {Object} 統合された財務モデル
 */
export const createFinancialModel = (
  accounts,
  periods,
  values,
  relationMaster
) => {
  return {
    accounts,
    periods,
    values,
    relationMaster,
  };
};

/**
 * 勘定科目と期間に紐づく値を生成する
 * @param {Object} aggregatedMap 集計マップ
 * @param {Array} periods 期間配列
 * @param {Array} accounts アカウント配列
 * @param {Object} relationMaster リレーション設定情報
 * @returns {Array} アカウント値配列
 */
export const createAccountValues = (
  aggregatedMap,
  periods,
  accounts,
  relationMaster
) => {
  const accountValues = [];

  // 依存関係を生成
  const dependencies = createDependenciesFromRelationMaster(
    relationMaster,
    accounts
  );
  const parentChildMap = createParentChildMap(accounts);
  const orderedAccounts = getCalculationOrder(accounts);

  // 各アカウントの値を設定
  Object.values(aggregatedMap).forEach((account) => {
    account.values.forEach((value, index) => {
      if (index >= periods.length) return;

      accountValues.push({
        accountId: account.id,
        periodId: periods[index].id,
        value: value || 0,
        isCalculated: false,
      });
    });
  });

  // 計算が必要なアカウントの値を計算
  orderedAccounts.forEach((accountId) => {
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return;

    periods.forEach((period, periodIndex) => {
      let calculatedValue = 0;
      let isCalculated = true;

      // 計算タイプに応じて値を計算
      switch (account.calculationType) {
        case "CHILDREN_SUM":
          // 親子関係に基づく計算
          calculatedValue = calculateSummaryAccountValue(
            account,
            period,
            parentChildMap,
            accountValues
          );
          break;

        case "ACCOUNT_CALC":
          // 依存関係に基づく計算
          calculatedValue = calculateSpecialAccount(
            account,
            period,
            accountValues,
            accounts,
            dependencies,
            periods
          );
          break;

        default:
          isCalculated = false;
          return;
      }

      accountValues.push({
        accountId: account.id,
        periodId: period.id,
        value: calculatedValue,
        isCalculated,
      });
    });
  });

  return accountValues;
};
