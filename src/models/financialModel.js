import { getCalculationOrder } from "../utils/dependencyCalculation";
import {
  createParentChildMap,
  calculateSummaryAccountValue,
  calculateSpecialAccount,
} from "../calculations/financialCalculations";

/**
 * 新しい期間の勘定科目の値を計算する
 * @param {Object} account 勘定科目
 * @param {Object} newPeriod 新しい期間
 * @param {Object} lastPeriod 前の期間
 * @param {Array} values 既存の値の配列
 * @param {Array} accounts アカウント配列
 * @returns {number} 計算された値
 */
const calculateAccountValueForNewPeriod = (
  account,
  newPeriod,
  lastPeriod,
  values,
  accounts
) => {
  // 前の期間の値を取得
  const lastValue = values.find(
    (v) => v.accountId === account.id && v.periodId === lastPeriod.id
  );

  // 前の期間の値が存在しない場合は0を返す
  if (!lastValue) return 0;

  // パラメータアカウントの場合は、前の期間の値をそのまま使用
  if (account.isParameter) {
    return lastValue.value;
  }

  // 通常のアカウントの場合は、前の期間の値をそのまま使用
  return lastValue.value;
};

/**
 * 財務モデルを作成する関数
 * @param {Array} accounts 勘定科目の定義
 * @param {Array} periods 期間情報
 * @param {Array} values 勘定科目と期間に紐づく値
 * @returns {Object} 統合された財務モデル
 */
export const createFinancialModel = (accounts, periods, values) => {
  return {
    accounts,
    periods,
    values,
  };
};

/**
 * 勘定科目と期間に紐づく値を生成する
 * @param {Object} aggregatedMap 集計マップ
 * @param {Array} periods 期間配列
 * @param {Array} accounts アカウント配列
 * @returns {Array} アカウント値配列
 */
export const createAccountValues = (aggregatedMap, periods, accounts) => {
  const accountValues = [];

  // 各アカウントの値を設定
  Object.values(aggregatedMap).forEach((account) => {
    // 全期間の値を設定
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

  const calculationOrder = getCalculationOrder(accounts);
  const parentChildMap = createParentChildMap(accounts);

  // 計算が必要なアカウントの値を計算
  calculationOrder.forEach((accountId) => {
    const summaryAccount = accounts.find((a) => a.id === accountId);
    if (!summaryAccount) return;

    if (summaryAccount.calculationType === "CHILDREN_SUM") {
      periods.forEach((period) => {
        const sumValue = calculateSummaryAccountValue(
          summaryAccount,
          period,
          parentChildMap,
          accountValues
        );

        accountValues.push({
          accountId: summaryAccount.id,
          periodId: period.id,
          value: sumValue,
          isCalculated: true,
        });
      });
    } else if (summaryAccount.calculationType === "ACCOUNT_CALC") {
      periods.forEach((period) => {
        const calculatedValue = calculateSpecialAccount(
          summaryAccount,
          period,
          accountValues,
          accounts
        );

        accountValues.push({
          accountId: summaryAccount.id,
          periodId: period.id,
          value: calculatedValue,
          isCalculated: true,
        });
      });
    }
  });

  return accountValues;
};

/**
 * 期間を1年追加し、新しい期間の値を計算する
 * @param {Object} model 財務モデル
 * @returns {Object} 更新された財務モデル
 */
export const addNewPeriodToModel = (model) => {
  const updatedModel = {
    accounts: [...model.accounts],
    periods: [...model.periods],
    values: [...model.values],
  };

  const lastPeriod = updatedModel.periods[updatedModel.periods.length - 1];
  const lastYear = parseInt(lastPeriod.year, 10);

  const newYear = lastYear + 1;
  const newPeriod = {
    id: `p-${newYear}`,
    year: newYear.toString(),
    isActual: false,
    isFromExcel: false,
    order: lastPeriod.order + 1,
  };

  updatedModel.periods.push(newPeriod);

  const calculationOrder = getCalculationOrder(updatedModel.accounts);

  calculationOrder.forEach((accountId) => {
    const account = updatedModel.accounts.find((a) => a.id === accountId);
    if (!account) return;

    if (account.calculationType === null) {
      const newValue = calculateAccountValueForNewPeriod(
        account,
        newPeriod,
        lastPeriod,
        updatedModel.values,
        updatedModel.accounts
      );

      updatedModel.values.push({
        accountId: account.id,
        periodId: newPeriod.id,
        value: newValue,
        isCalculated: false,
      });
    } else if (account.calculationType === "CHILDREN_SUM") {
      const childAccounts = updatedModel.accounts.filter(
        (a) => a.parentAccount === account.accountName
      );

      let sumValue = 0;
      childAccounts.forEach((child) => {
        const childValue = updatedModel.values.find(
          (v) => v.accountId === child.id && v.periodId === newPeriod.id
        );
        if (childValue) {
          sumValue += childValue.value;
        }
      });

      updatedModel.values.push({
        accountId: account.id,
        periodId: newPeriod.id,
        value: sumValue,
        isCalculated: true,
      });
    } else if (account.calculationType === "ACCOUNT_CALC") {
      const calculatedValue = calculateSpecialAccount(
        account,
        newPeriod,
        updatedModel.values,
        updatedModel.accounts
      );

      updatedModel.values.push({
        accountId: account.id,
        periodId: newPeriod.id,
        value: calculatedValue,
        isCalculated: true,
      });
    }
  });

  return updatedModel;
};
