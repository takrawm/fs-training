import { CF_CATEGORIES } from "../utils/constants";
import { AccountUtils } from "../utils/accountUtils.js";

/**
 * 値の配列から指定されたアカウントと期間の値を取得
 * @param {Array} values - 値の配列
 * @param {string} accountId - アカウントID
 * @param {string} periodId - 期間ID
 * @returns {number} 値（見つからない場合は0）
 */
const getValue = (values, accountId, periodId) => {
  return (
    values.find((v) => v.accountId === accountId && v.periodId === periodId)
      ?.value || 0
  );
};

/**
 * CF調整項目を作成し、値も計算する
 * CF調整項目は損益計算書の項目から派生するCF項目です。
 * 非資金項目（減価償却費など）の影響を調整するために使用されます。
 *
 * @param {Object} sourceAccount - 元となるアカウント（PL項目）
 * @param {number} order - 表示順序
 * @param {Object} period - 当期の期間情報
 * @param {Object} lastPeriod - 前期の期間情報
 * @param {Array} values - 全ての値配列
 * @returns {Object} { account: CFアカウント, value: 計算値 }
 */
export const createCFAdjustmentAccountWithValue = (
  sourceAccount,
  order,
  period,
  lastPeriod,
  values
) => {
  const cfAdj = AccountUtils.getCFAdjustment(sourceAccount);
  if (!cfAdj) {
    throw new Error("Source account does not have cfAdjustment");
  }

  // CF調整項目のアカウント構造（シンプル化版）
  const cfAccount = {
    id: `cf-adj-${sourceAccount.id}`,
    accountName: `${sourceAccount.accountName}（CF）`,
    parentAccountId: getCFParentId(cfAdj.cfCategory),
    isCredit: null, // CF項目は符号を持たない
    sheet: null, // 構造的に分離されているため不要
    stockAttributes: null, // CF項目はストック項目ではない
    flowAttributes: null, // regularItems専用プロパティ
    displayOrder: {
      order: `CF1${(order || 1).toString().padStart(2, "0")}`,
      prefix: "CF",
    },
  };

  // CF調整項目の値計算
  // 元アカウントの当期値を取得
  const baseValue = getValue(values, sourceAccount.id, period.id);

  // 符号計算：会計理論に基づく自動決定
  // 費用項目（isCredit: false）→ CFではプラス（非資金費用の加算）
  // 収益項目（isCredit: true）→ CFではマイナス（非資金収益の減算）
  const calculatedValue = sourceAccount.isCredit ? -baseValue : baseValue;

  return {
    account: cfAccount,
    value: calculatedValue,
  };
};

/**
 * BS変動項目を作成し、値も計算する
 * BS変動項目は貸借対照表の項目の期間変動から派生するCF項目です。
 * 運転資本の変動がキャッシュフローに与える影響を表します。
 *
 * @param {Object} sourceAccount - 元となるアカウント（BS項目）
 * @param {number} order - 表示順序
 * @param {Object} period - 当期の期間情報
 * @param {Object} lastPeriod - 前期の期間情報
 * @param {Array} values - 全ての値配列
 * @returns {Object} { account: CFアカウント, value: 計算値 }
 */
export const createBSChangeAccountWithValue = (
  sourceAccount,
  order,
  period,
  lastPeriod,
  values
) => {
  if (!AccountUtils.isStockAccount(sourceAccount)) {
    throw new Error("Source account must be a stock account");
  }

  // BS変動項目のアカウント構造（シンプル化版）
  const cfAccount = {
    id: `cf-bs-${sourceAccount.id}`,
    accountName: `${sourceAccount.accountName}の変動`,
    parentAccountId: "ope-cf-total", // BS変動は通常営業CFに分類
    isCredit: null, // CF項目は符号を持たない
    sheet: null, // 構造的に分離されているため不要
    stockAttributes: null, // CF項目はストック項目ではない
    flowAttributes: null, // regularItems専用プロパティ
    displayOrder: {
      order: `CF2${(order || 1).toString().padStart(2, "0")}`,
      prefix: "CF",
    },
  };

  // BS変動項目の値計算
  // 当期末と前期末の差額を計算
  const currentValue = getValue(values, sourceAccount.id, period.id);
  const lastValue = getValue(values, sourceAccount.id, lastPeriod.id);
  const changeValue = currentValue - lastValue;

  // 符号計算：運転資本理論に基づく自動決定
  // 資産増加（isCredit: false）→ CFではマイナス（資金流出）
  // 負債・純資産増加（isCredit: true）→ CFではプラス（資金流入）
  const calculatedValue = sourceAccount.isCredit ? changeValue : -changeValue;

  return {
    account: cfAccount,
    value: calculatedValue,
  };
};

/**
 * CF区分に応じた親科目IDを取得する
 * @param {string} cfCategory - CF区分
 * @returns {string} 親科目ID
 */
const getCFParentId = (cfCategory) => {
  switch (cfCategory) {
    case CF_CATEGORIES.OPERATING:
      return "ope-cf-total";
    case CF_CATEGORIES.INVESTING:
      return "inv-cf-total";
    case CF_CATEGORIES.FINANCING:
      return "fin-cf-total";
    default:
      return "ope-cf-total";
  }
};
