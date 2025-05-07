import { getCalculationOrder } from "../utils/dependencyCalculation";
import {
  createParentChildMap,
  calculateSummaryAccountValue,
  calculateSpecialAccount,
} from "../calculations/financialCalculations";

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
 * @param {Array} finalAccounts 最終的なアカウント配列
 * @returns {Array} アカウント値配列
 */
export const createAccountValues = (aggregatedMap, periods, finalAccounts) => {
  const accountValues = [];

  Object.entries(aggregatedMap).forEach(([accountName, account]) => {
    account.values.forEach((value, index) => {
      if (index >= periods.length) return;

      accountValues.push({
        accountId: account.id,
        periodId: periods[index].id,
        value: value,
        isCalculated: false,
      });
    });
  });

  const calculationOrder = getCalculationOrder(finalAccounts);
  const parentChildMap = createParentChildMap(finalAccounts);

  calculationOrder.forEach((accountId) => {
    const summaryAccount = finalAccounts.find((a) => a.id === accountId);
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
          finalAccounts
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
 * 財務モデルから表示用データを生成する
 * @param {Object} model 財務モデル
 * @returns {Object} 表示用データ
 */
export const createDisplayDataFromModel = (model) => {
  const { accounts, periods, values } = model;
  return createAggregatedValueForDisplay(accounts, periods, values);
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
