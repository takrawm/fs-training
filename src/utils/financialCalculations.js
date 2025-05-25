import { getCalculationOrder } from "./dependencyCalculation";
import { buildFormula } from "./astBuilder";
import { evalNode } from "./astEvaluator";
import { PARAMETER_TYPES } from "./constants";

/**
 * 親子関係のマップを作成する
 * @param {Array} accounts アカウント配列
 * @returns {Object} 親子関係のマップ
 */
export const createParentChildMap = (accounts) => {
  const parentChildMap = {};
  accounts.forEach((account) => {
    if (account.parentAccount) {
      // parentChildMap = {
      // "売上高": [] or ["account-0"]
      // ←parentChildMap[account.parentAccount]があるときは["account-0"]が返り、ないときは空配列
      // "売上原価": []
      // ...
      // }
      parentChildMap[account.parentAccount] =
        parentChildMap[account.parentAccount] || [];
      parentChildMap[account.parentAccount].push(account.id);
    }
  });
  return parentChildMap;
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
  // summaryAccountを親科目に持つ科目のIdが入っている配列
  const childAccounts = parentChildMap[summaryAccount.accountName] || [];

  childAccounts.forEach((childId) => {
    // 子科目のidからaccountValuesを特定し、そのvalueを抽出する
    const childValue = accountValues.find(
      (v) => v.accountId === childId && v.periodId === period.id
    );
    if (childValue) {
      sumValue += childValue.value;
    }
  });

  return sumValue;
};

/**
 * パラメータタイプに基づいてアカウントの値を計算する
 * @param {Object} account アカウント
 * @param {Object} newPeriod 新しい期間
 * @param {Object} lastPeriod 最後の期間
 * @param {Array} values 値の配列
 * @param {Array} accounts アカウント配列
 * @returns {number} 計算された値
 */
export const calculateParameterAccount = (
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
    case PARAMETER_TYPES.GROWTH_RATE:
      const growthRate = account.parameterValue || 0.05;
      return lastPeriodValue * (1 + growthRate);

    case PARAMETER_TYPES.PERCENTAGE:
      const percentage = account.parameterValue || 0.02;
      if (account.parameterReferenceAccounts?.length > 0) {
        const refAccount = account.parameterReferenceAccounts[0];
        const referenceValue =
          values.find(
            (v) => v.accountId === refAccount.id && v.periodId === newPeriod.id
          )?.value || 0;
        return referenceValue * percentage;
      }
      return lastPeriodValue;

    case PARAMETER_TYPES.PROPORTIONATE:
      if (account.parameterReferenceAccounts?.length > 0) {
        const refAccount = account.parameterReferenceAccounts[0];
        return (
          values.find(
            (v) => v.accountId === refAccount.id && v.periodId === newPeriod.id
          )?.value || 0
        );
      }
      return lastPeriodValue;

    case PARAMETER_TYPES.REFERENCE:
      // 個別参照型：AST式を使用して計算
      if (account.parameterReferenceAccounts?.length > 0) {
        let result = 0;
        account.parameterReferenceAccounts.forEach((ref) => {
          const refValue =
            values.find(
              (v) => v.accountId === ref.id && v.periodId === newPeriod.id
            )?.value || 0;

          switch (ref.operation) {
            case "ADD":
              result += refValue;
              break;
            case "SUB":
              result -= refValue;
              break;
            case "MUL":
              result *= refValue;
              break;
            case "DIV":
              if (refValue !== 0) result /= refValue;
              break;
            default:
              result += refValue;
          }
        });
        return result;
      }
      return lastPeriodValue;

    case PARAMETER_TYPES.BALANCE_AND_CHANGE:
      // 期末残高+/-変動型：前期残高 + 当期変動
      let balanceResult = lastPeriodValue; // 前期残高

      if (account.parameterReferenceAccounts?.length > 0) {
        account.parameterReferenceAccounts.forEach((ref) => {
          const refValue =
            values.find(
              (v) => v.accountId === ref.id && v.periodId === newPeriod.id
            )?.value || 0;

          switch (ref.operation) {
            case "ADD":
              balanceResult += refValue;
              break;
            case "SUB":
              balanceResult -= refValue;
              break;
            default:
              balanceResult += refValue;
          }
        });
      }
      return balanceResult;

    case "NONE":
    default:
      return lastPeriodValue;
  }
};

/**
 * 新しい期間を作成する
 * @param {Object} lastPeriod 最後の期間
 * @returns {Object} 新しい期間
 */
export const createNewPeriod = (lastPeriod) => {
  const lastYear = parseInt(lastPeriod.year, 10);
  const newYear = lastYear + 1;

  return {
    id: `p-${newYear}`,
    year: newYear.toString(),
    isActual: false,
    isFromExcel: false,
    order: lastPeriod.order + 1,
  };
};

/**
 * 財務モデルに新しい期間を追加する
 * @param {Object} model 財務モデル
 * @returns {Object} 更新された財務モデル
 */
export const addNewPeriodToModel = (model) => {
  // 更新用のモデルを作成
  const updatedModel = {
    accounts: [...model.accounts],
    periods: [...model.periods],
    values: [...model.values],
  };

  // 期間の追加
  const lastPeriod = updatedModel.periods[updatedModel.periods.length - 1];
  const newPeriod = createNewPeriod(lastPeriod);
  updatedModel.periods.push(newPeriod);

  console.log("=== 期間追加デバッグ ===");
  console.log("新しい期間:", newPeriod);

  // 計算順序を取得
  const calculationOrder = getCalculationOrder(updatedModel.accounts);
  console.log("計算順序:", calculationOrder);

  // 計算順序に従って各アカウントの新しい期間の値を計算
  calculationOrder.forEach((accountId) => {
    const account = updatedModel.accounts.find((a) => a.id === accountId);
    if (!account) return;

    let newValue = 0;
    let isCalculated = true;

    // パラメータタイプに応じて値を計算
    if (account.parameterType === PARAMETER_TYPES.CHILDREN_SUM) {
      newValue = calculateSummaryAccountValue(
        account,
        newPeriod,
        createParentChildMap(updatedModel.accounts),
        updatedModel.values
      );
    } else {
      newValue = calculateParameterAccount(
        account,
        newPeriod,
        lastPeriod,
        updatedModel.values,
        updatedModel.accounts
      );
      isCalculated = false;
    }

    console.log(`${account.accountName}: ${newValue}`);

    // 新しい値を追加
    updatedModel.values.push({
      accountId: account.id,
      periodId: newPeriod.id,
      value: newValue,
      isCalculated,
    });
  });

  console.log("=== デバッグ終了 ===");

  return updatedModel;
};
