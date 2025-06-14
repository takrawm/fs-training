import {
  PARAMETER_TYPES,
  SHEET_ATTRIBUTES,
  STOCK_SHEETS,
} from "./constants.js";
import { buildCashflowFormula } from "./astBuilder.js";
import { evalNode } from "./astEvaluator.js";
import { AccountUtils } from "../models/account.js";
import { ParameterUtils } from "./parameterUtils.js";

/**
 * BSシートの科目の年度末残高の差分を計算する
 * @param {Object} model - 財務モデルオブジェクト
 * @param {Object} newPeriod - 新しい期間
 * @param {Object} lastPeriod - 前の期間
 * @returns {Array} 差分値の配列
 */
export const calculateBSDifference = (model, newPeriod, lastPeriod) => {
  const { accounts, values } = model;

  // BSシートの科目を抽出（新しい構造に対応）
  const bsAccounts = accounts.filter((account) => {
    // 新しい構造
    if (account.sheet?.name === STOCK_SHEETS.BS) {
      return true;
    }
    // 旧構造との互換性
    if (account.sheetType?.sheet === "BS") {
      return true;
    }
    return false;
  });

  // 値取得関数を定義
  const getValue = (accountId, periodId) => {
    return (
      values.find((v) => v.accountId === accountId && v.periodId === periodId)
        ?.value || 0
    );
  };

  const differences = bsAccounts.map((account) => {
    // キャッシュフロー計算用のASTを構築
    const ast = buildCashflowFormula(account);

    // 当年度の値を計算
    const currentValue = getValue(account.id, newPeriod.id);
    const previousValue = getValue(account.id, lastPeriod.id);

    // ASTを評価して差分を計算
    const difference = evalNode(ast, newPeriod.id, (id, periodId) =>
      getValue(id, periodId)
    );

    return {
      accountId: account.id,
      accountName: account.accountName,
      currentPeriod: newPeriod.year,
      previousPeriod: lastPeriod.year,
      currentValue,
      previousValue,
      difference,
    };
  });

  // 結果をコンソールに表示
  console.log("Differences", differences);

  return differences;
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
