import { getCalculationOrder } from "./dependencyCalculation";
import { buildFormula, buildCashflowFormula } from "./astBuilder";
import { evalNode } from "./astEvaluator";
import { PARAMETER_TYPES } from "./constants";
import {
  extractReferencedAccounts,
  calculateBSDifference,
} from "./cashflowCalc.js";
import { createCashflowAccount } from "../models/cashflowAccount";

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
 * AST評価用の値取得関数を作成
 * @param {Array} values 値の配列
 * @param {number} targetPeriod 対象期間の年
 * @returns {Function} getValue関数
 */
export const createGetValueFunction = (values, targetPeriod) => {
  return (accountId, period) => {
    const periodId = `p-${period}`;
    const value = values.find(
      (v) => v.accountId === accountId && v.periodId === periodId
    );
    return value?.value || 0;
  };
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
  try {
    // AST構築
    const periodYear = parseInt(newPeriod.year, 10);
    const ast = buildFormula(account, periodYear, accounts);

    // ASTがnullの場合（計算不要）は前期値を返す
    if (!ast) {
      const lastPeriodValue =
        values.find(
          (v) => v.accountId === account.id && v.periodId === lastPeriod.id
        )?.value || 0;
      return lastPeriodValue;
    }

    // AST評価
    const getValue = createGetValueFunction(values, periodYear);
    return evalNode(ast, periodYear, getValue) || 0;
  } catch (error) {
    console.warn(
      `AST evaluation failed for ${account.accountName}:`,
      error.message
    );
    // フォールバック：既存の計算方法を使用
    return calculateParameterAccountFallback(
      account,
      newPeriod,
      lastPeriod,
      values,
      accounts
    );
  }
};

/**
 * パラメータタイプに基づいてアカウントの値を計算する（フォールバック）
 * @param {Object} account アカウント
 * @param {Object} newPeriod 新しい期間
 * @param {Object} lastPeriod 最後の期間
 * @param {Array} values 値の配列
 * @param {Array} accounts アカウント配列
 * @returns {number} 計算された値
 */
export const calculateParameterAccountFallback = (
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
      const growthRate = account.parameterValue || 0.0;
      return lastPeriodValue * (1 + growthRate);

    case PARAMETER_TYPES.PERCENTAGE:
      const percentage = account.parameterValue || 0.0;
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

    case PARAMETER_TYPES.CALCULATION:
      // 個別計算型：AST式を使用して計算
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
  // 以下のようなnewPeriodオブジェクトがfinancialModel.periodsに追加される
  // {id: 'p-2028', year: '2028', isActual: false, isFromExcel: false, order: 10}
  console.log("新しい期間:", newPeriod);

  // 計算順序を取得
  const calculationOrder = getCalculationOrder(updatedModel.accounts);
  console.log("計算順序:", calculationOrder);

  // 計算順序に従って各アカウントの新しい期間の値を計算
  calculationOrder.forEach((accountId) => {
    // 並び替えられたaccountのidから、accountを取得
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

    // 新しい値を追加
    updatedModel.values.push({
      accountId: account.id,
      periodId: newPeriod.id,
      value: newValue,
      isCalculated,
    });
  });

  console.log("=== デバッグ終了 ===");

  // BALANCE_AND_CHANGEタイプのアカウントから参照されているアカウントを抽出

  calculateBSDifference(updatedModel, newPeriod, lastPeriod);

  // キャッシュフロー計算書の構築
  const referencedAccounts = extractReferencedAccounts(updatedModel) || [];
  console.log("CFreferencedAccounts", referencedAccounts);
  if (referencedAccounts.length > 0) {
    // 新しいアカウントと値を保持する配列
    const newCfAccounts = [];
    const newCfValues = [];

    // 既存のCFアカウントを取得
    const existingCfAccounts = updatedModel.accounts.filter(
      (acc) => acc.sheetType?.sheet === "CF"
    );

    // referencedAccountsをループ
    referencedAccounts.forEach((referencedAccount) => {
      // 既存のCFアカウントをチェック
      let cfAccount = existingCfAccounts.find(
        (acc) => acc.accountName === referencedAccount.accountName
      );

      // CFアカウントが存在しない場合のみ新規作成
      if (!cfAccount) {
        cfAccount = createCashflowAccount(referencedAccount);
        newCfAccounts.push(cfAccount);
      }

      // キャッシュフロー計算用のASTを構築（単純参照モード）
      const ast = buildCashflowFormula(referencedAccount, true);
      console.log("ast: ", ast);

      // 値を計算（単純参照モード）
      const value = evalNode(ast, newPeriod.order, (accountId, period) => {
        // periodIdは直接newPeriod.idを使用
        const valueObj = updatedModel.values.find(
          (v) => v.accountId === accountId && v.periodId === newPeriod.id
        );
        console.log("valueObj for", accountId, ":", valueObj);
        return valueObj ? valueObj.value : 0;
      });

      // 新しい値を追加（既存のCFアカウントでも新しい期間の値は追加）
      newCfValues.push({
        id: `v-${cfAccount.id}-${newPeriod.id}`,
        accountId: cfAccount.id,
        periodId: newPeriod.id,
        value: value,
      });
    });

    // 新しいアカウントのみをモデルに追加
    if (newCfAccounts.length > 0) {
      updatedModel.accounts = [...updatedModel.accounts, ...newCfAccounts];
    }

    // 新しい値をモデルに追加
    updatedModel.values = [...updatedModel.values, ...newCfValues];
  }

  return updatedModel;
};
