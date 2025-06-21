import { OPERATIONS, SHEET_TYPES } from "./constants";
import { AccountUtils } from "./accountUtils.js";

/**
 * CF調整を考慮したBS科目計算ユーティリティ
 */

/**
 * 値の配列から指定されたアカウントと期間の値を取得
 */
const getValue = (values, accountId, periodId) => {
  return (
    values.find((v) => v.accountId === accountId && v.periodId === periodId)
      ?.value || 0
  );
};

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

  // このstock科目を対象としているCF調整科目を探す
  const cfAdjustmentAccounts = accounts.filter((acc) => {
    const cfAdj = AccountUtils.getCFAdjustment(acc);
    return cfAdj?.targetAccountId === account.id;
  });

  // CF調整を適用
  let adjustedValue = lastPeriodValue;
  cfAdjustmentAccounts.forEach((cfAccount) => {
    const cfValue =
      values.find(
        (v) => v.accountId === cfAccount.id && v.periodId === newPeriod.id
      )?.value || 0;

    const cfAdj = AccountUtils.getCFAdjustment(cfAccount);
    const operation = cfAdj.operation;

    if (operation === OPERATIONS.ADD) {
      adjustedValue += cfValue;
    } else if (operation === OPERATIONS.SUB) {
      adjustedValue -= cfValue;
    }
  });

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

/**
 * 指定されたstock科目がbaseProfitのターゲットかどうかを判定
 *
 * この関数はisCFAdjustmentTargetと対をなし、
 * stock科目の計算方法を統一的に判定するために使用されます。
 *
 * @param {Object} account - 判定対象のstock科目
 * @param {Array} accounts - 全アカウント配列
 * @returns {boolean} baseProfitのターゲットの場合true
 */
export const isBaseProfitTarget = (account, accounts) => {
  return AccountUtils.isBaseProfitTarget(account, accounts);
};

/**
 * baseProfitを考慮したstock科目の値を計算
 *
 * この関数は利益剰余金の計算に使用されます。
 * 前期末残高に、baseProfit科目（営業利益等）の当期値を加算して、
 * 今期末の利益剰余金残高を算出します。
 *
 * 計算式：利益剰余金(当期) = 利益剰余金(前期) + Σ(baseProfit科目)
 *
 * @param {Object} account - 計算対象のstock科目
 * @param {Object} newPeriod - 今期の期間情報
 * @param {Object} lastPeriod - 前期の期間情報
 * @param {Array} values - 値の配列
 * @param {Array} accounts - 全アカウント配列
 * @returns {number} 計算された値
 */
export const calculateStockAccountWithBaseProfitAdjustment = (
  account,
  newPeriod,
  lastPeriod,
  values,
  accounts
) => {
  // 前期末残高を取得（利益剰余金の開始残高）
  const lastPeriodValue = getValue(values, account.id, lastPeriod.id);

  // このstock科目をターゲットとするbaseProfit科目を取得
  const baseProfitAccounts = AccountUtils.getBaseProfitAccounts(
    account,
    accounts
  );

  // baseProfit調整を適用
  // 利益は常に利益剰余金を増加させるため、ADD操作のみ
  let adjustedValue = lastPeriodValue;
  baseProfitAccounts.forEach((profitAccount) => {
    const profitValue = getValue(values, profitAccount.id, newPeriod.id);
    adjustedValue += profitValue; // baseProfit は常にADD操作

    // デバッグ用ログ（開発時のみ）
    console.log(
      `利益剰余金計算: ${profitAccount.accountName} ${profitValue}を加算`
    );
  });

  return adjustedValue;
};
