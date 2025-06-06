import { PARAMETER_TYPES, SHEET_ATTRIBUTES } from "./constants.js";
import { buildCashflowFormula } from "./astBuilder.js";
import { evalNode } from "./astEvaluator.js";

/**
 * BSシートの科目の年度末残高の差分を計算する
 * @param {Object} model - 財務モデルオブジェクト
 * @param {Object} newPeriod - 新しい期間
 * @param {Object} lastPeriod - 前の期間
 * @returns {Array} 差分値の配列
 */
export const calculateBSDifference = (model, newPeriod, lastPeriod) => {
  const { accounts, values } = model;

  // BSシートの科目を抽出
  const bsAccounts = accounts.filter(
    (account) => account.sheetType.sheet === "BS"
  );

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

  // BALANCE_AND_CHANGEタイプのアカウントを抽出
  const balanceAndChangeAccounts = accounts.filter(
    (account) => account.parameterType === PARAMETER_TYPES.BALANCE_AND_CHANGE
  );

  // 参照されているアカウントのIDを収集
  const referencedAccountIds = new Set();
  balanceAndChangeAccounts.forEach((account) => {
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
