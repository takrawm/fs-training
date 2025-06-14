import { OPERATIONS, SHEET_TYPES } from "./constants";
import { AccountUtils } from "../models/account";

/**
 * CF調整を考慮したBS科目計算ユーティリティ
 */

/**
 * CF調整を適用してstock科目の値を計算する
 * @param {Object} account 対象のstock科目
 * @param {Object} newPeriod 新しい期間
 * @param {Object} lastPeriod 前期間
 * @param {Array} values 値の配列
 * @param {Array} accounts 全アカウント配列
 * @returns {number} 計算された値
 */
export const calculateStockAccountWithCFAdjustment = (
  account,
  newPeriod,
  lastPeriod,
  values,
  accounts
) => {
  // 前期末残高を取得
  const lastPeriodValue =
    values.find(
      (v) => v.accountId === account.id && v.periodId === lastPeriod.id
    )?.value || 0;

  console.log(`=== CF調整計算: ${account.accountName} ===`);
  console.log(`前期末残高: ${lastPeriodValue}`);

  // このstock科目を対象としているCF調整を探す
  const cfAdjustments = accounts.filter((acc) => {
    const cfAdj = AccountUtils.getCFAdjustment(acc);
    return cfAdj?.targetAccountId === account.id;
  });

  console.log(`CF調整対象科目数: ${cfAdjustments.length}`);

  // CF調整を適用
  let adjustedValue = lastPeriodValue;
  cfAdjustments.forEach((cfAccount) => {
    const cfValue =
      values.find(
        (v) => v.accountId === cfAccount.id && v.periodId === newPeriod.id
      )?.value || 0;

    const cfAdj = AccountUtils.getCFAdjustment(cfAccount);
    const operation = cfAdj.operation;

    console.log(
      `CF調整科目: ${cfAccount.accountName}, 値: ${cfValue}, 演算: ${operation}`
    );

    if (operation === OPERATIONS.ADD) {
      adjustedValue += cfValue;
    } else if (operation === OPERATIONS.SUB) {
      adjustedValue -= cfValue;
    }
  });

  console.log(`調整後残高: ${adjustedValue}`);
  console.log(`=== CF調整計算終了 ===`);

  return adjustedValue;
};

/**
 * 指定されたstock科目がCF調整の対象かどうかを判定
 * @param {Object} account 対象のstock科目
 * @param {Array} accounts 全アカウント配列
 * @returns {boolean} CF調整の対象かどうか
 */
export const isCFAdjustmentTarget = (account, accounts) => {
  if (!AccountUtils.isStockAccount(account)) {
    return false;
  }

  // このstock科目を対象としているCF調整があるかチェック
  return accounts.some((acc) => {
    const cfAdj = AccountUtils.getCFAdjustment(acc);
    return cfAdj?.targetAccountId === account.id;
  });
};

/**
 * CF調整科目の一覧を取得
 * @param {Object} targetAccount 対象のstock科目
 * @param {Array} accounts 全アカウント配列
 * @returns {Array} CF調整科目の配列
 */
export const getCFAdjustmentAccounts = (targetAccount, accounts) => {
  return accounts.filter((acc) => {
    const cfAdj = AccountUtils.getCFAdjustment(acc);
    return cfAdj?.targetAccountId === targetAccount.id;
  });
};
