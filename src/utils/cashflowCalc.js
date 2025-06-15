import {
  PARAMETER_TYPES,
  SHEET_ATTRIBUTES,
  STOCK_SHEETS,
} from "./constants.js";
import { buildCashflowFormula } from "./astBuilder.js";
import { evalNode } from "./astEvaluator.js";
import { AccountUtils } from "./accountUtils.js";
import { ParameterUtils } from "./parameterUtils.js";

/**
 * BSシートの科目の年度末残高の差分を計算し、キャッシュフロー影響を算出する
 * @param {Object} model - 財務モデルオブジェクト
 * @param {Object} newPeriod - 新しい期間
 * @param {Object} lastPeriod - 前の期間
 * @returns {Array} キャッシュフロー影響の配列
 */
export const calculateBSDifference = (model, newPeriod, lastPeriod) => {
  const { accounts, values } = model;

  // 対象となるBS科目を抽出
  // 1. isParameterBasedがtrue
  // 2. bsTypeがASSETまたはLIABILITY_EQUITY
  const targetBSAccounts = accounts.filter((account) => {
    return (
      AccountUtils.isStockAccount(account) &&
      account.stockAttributes?.isParameterBased === true &&
      (account.stockAttributes?.bsType === "ASSET" ||
        account.stockAttributes?.bsType === "LIABILITY_EQUITY")
    );
  });

  // 値取得関数を定義
  const getValue = (accountId, periodId) => {
    return (
      values.find((v) => v.accountId === accountId && v.periodId === periodId)
        ?.value || 0
    );
  };

  const bsDifferences = targetBSAccounts.map((account) => {
    // 当年度と前年度の値を取得
    const currentValue = getValue(account.id, newPeriod.id);
    const previousValue = getValue(account.id, lastPeriod.id);
    const change = currentValue - previousValue;

    // キャッシュフロー影響を計算
    let cashflowImpact = 0;
    if (Math.abs(change) > 0.01) {
      if (account.stockAttributes.bsType === "ASSET") {
        // 資産の場合：増加はマイナス、減少はプラス
        cashflowImpact = -change;
      } else if (account.stockAttributes.bsType === "LIABILITY_EQUITY") {
        // 負債・資本の場合：増加はプラス、減少はマイナス
        cashflowImpact = change;
      }
    }

    return {
      accountId: account.id,
      accountName: account.accountName,
      bsType: account.stockAttributes.bsType,
      currentPeriod: newPeriod.year,
      previousPeriod: lastPeriod.year,
      currentValue,
      previousValue,
      change,
      cashflowImpact,
      hasSignificantChange: Math.abs(change) > 0.01,
    };
  });

  // 結果をコンソールに表示
  console.log("BS Differences with Cashflow Impact:", bsDifferences);

  return bsDifferences;
};

/**
 * BALANCE_AND_CHANGEタイプのアカウントから参照されているアカウントを抽出する
 * @param {Object} model - 財務モデルオブジェクト
 * @returns {Array} 参照されているアカウントの配列
 */
export const extractReferencedAccounts = (model) => {
  const { accounts } = model;

  // BALANCE_AND_CHANGEタイプのアカウントを抽出（新しい構造に対応）
  const balanceAndChangeAccounts = accounts.filter((account) => {
    const parameterType = ParameterUtils.getParameterType(account);
    return parameterType === PARAMETER_TYPES.BALANCE_AND_CHANGE;
  });

  // 参照されているアカウントのIDを収集（新しい構造に対応）
  const referencedAccountIds = new Set();
  balanceAndChangeAccounts.forEach((account) => {
    const parameterReferences = ParameterUtils.getParameterReferences(account);

    if (Array.isArray(parameterReferences)) {
      parameterReferences.forEach((ref) => {
        const refId = ref.accountId || ref.id;
        if (refId) {
          referencedAccountIds.add(refId);
        }
      });
    } else if (parameterReferences) {
      // 単一オブジェクトの場合
      const refId = parameterReferences.accountId || parameterReferences.id;
      if (refId) {
        referencedAccountIds.add(refId);
      }
    }

    // 旧構造との互換性
    if (account.parameterReferenceAccounts) {
      account.parameterReferenceAccounts.forEach((ref) => {
        referencedAccountIds.add(ref.id);
      });
    }
  });

  // 参照されているアカウントを抽出
  const referencedAccounts = accounts.filter((account) =>
    referencedAccountIds.has(account.id)
  );

  // 結果をコンソールに表示
  console.log("referencedAccounts", referencedAccounts);

  return referencedAccounts;
};
