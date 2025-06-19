import { OPERATIONS } from "./constants";
import { ParameterUtils } from "./parameterUtils";
import { AccountUtils } from "./accountUtils.js";
import { getValue } from "./financialCalculations.js";

/**
 * 現預金の変動を計算する
 * 間接法によるキャッシュフロー計算を実装
 */
export const calculateCashChange = (
  accounts,
  newPeriod,
  lastPeriod,
  values
) => {
  console.log("=== 現預金計算開始 ===");

  let cashChange = 0;

  // 1. 営業利益を加算
  const operatingProfit = getOperatingProfit(accounts, values, newPeriod);
  cashChange += operatingProfit;
  console.log(`営業利益: +${operatingProfit}`);

  // 2. CF調整項目の処理
  const cfAdjustment = calculateCFAdjustments(accounts, values, newPeriod);
  cashChange += cfAdjustment;
  console.log(`CF調整: ${cfAdjustment > 0 ? "+" : ""}${cfAdjustment}`);

  // 3. BS変動の処理
  const bsChanges = calculateBSChanges(accounts, values, newPeriod, lastPeriod);
  cashChange += bsChanges;
  console.log(`BS変動: ${bsChanges > 0 ? "+" : ""}${bsChanges}`);

  console.log(`現預金増減合計: ${cashChange > 0 ? "+" : ""}${cashChange}`);
  console.log("=== 現預金計算終了 ===");

  return cashChange;
};

/**
 * 営業利益を取得
 */
const getOperatingProfit = (accounts, values, period) => {
  const opAccount = accounts.find(
    (acc) => acc.id === "op-profit" || acc.accountName === "営業利益"
  );

  if (!opAccount) {
    console.warn("営業利益科目が見つかりません");
    return 0;
  }

  return getValue(values, opAccount.id, period.id);
};

/**
 * CF調整項目の影響を計算
 * 演算子を逆にして適用することで、非資金項目を調整
 */
const calculateCFAdjustments = (accounts, values, period) => {
  let adjustment = 0;

  // CF調整を持つ科目を抽出
  const cfAdjustmentAccounts = accounts.filter(
    (acc) => AccountUtils.getCFAdjustment(acc) !== null
  );

  cfAdjustmentAccounts.forEach((account) => {
    const cfAdj = AccountUtils.getCFAdjustment(account);
    const value = getValue(values, account.id, period.id);

    console.log(
      `CF調整科目: ${account.accountName}, 値: ${value}, 演算: ${cfAdj.operation}`
    );

    // 演算子を逆にして適用
    // 例：減価償却費はPLでは費用（マイナス）だが、キャッシュフローではプラス
    if (cfAdj.operation === OPERATIONS.SUB) {
      adjustment += value; // SUBの場合は加算
      console.log(`  → キャッシュフローに +${value}`);
    } else if (cfAdj.operation === OPERATIONS.ADD) {
      adjustment -= value; // ADDの場合は減算
      console.log(`  → キャッシュフローに -${value}`);
    }
  });

  return adjustment;
};

/**
 * BS項目の変動によるキャッシュフローへの影響を計算
 */
const calculateBSChanges = (accounts, values, newPeriod, lastPeriod) => {
  let bsImpact = 0;

  // isParameterBasedがtrueのBS科目を抽出（現預金自身は除外）
  const bsAccounts = accounts.filter(
    (acc) =>
      AccountUtils.isStockAccount(acc) &&
      acc.stockAttributes?.isParameterBased === true &&
      acc.id !== "cash-total"
  );

  bsAccounts.forEach((account) => {
    // 当期と前期の値を取得
    const currentValue = getValue(values, account.id, newPeriod.id);
    const previousValue = getValue(values, account.id, lastPeriod.id);

    const change = currentValue - previousValue;
    const isCredit = account.isCredit;

    console.log(`BS科目: ${account.accountName}`);
    console.log(
      `  前期: ${previousValue}, 当期: ${currentValue}, 変動: ${change}`
    );

    // 資産の増加はキャッシュの減少、負債・資本の増加はキャッシュの増加
    if (isCredit === false) {
      bsImpact -= change; // 資産増加はマイナス
      console.log(`  → 資産増加のため、キャッシュフロー: -${change}`);
    } else if (isCredit === true) {
      bsImpact += change; // 負債・資本増加はプラス
      console.log(`  → 負債・資本増加のため、キャッシュフロー: +${change}`);
    }
  });

  return bsImpact;
};

/**
 * 現預金の期末残高を計算
 */
export const calculateCashBalance = (
  account,
  newPeriod,
  lastPeriod,
  values,
  accounts
) => {
  // 前期末残高を取得
  const lastPeriodCash = getValue(values, account.id, lastPeriod.id);

  console.log(`前期末現預金: ${lastPeriodCash}`);

  // 今期の現預金増減を計算
  const cashChange = calculateCashChange(
    accounts,
    newPeriod,
    lastPeriod,
    values
  );

  // 今期末残高 = 前期末残高 + 今期増減
  const currentCash = lastPeriodCash + cashChange;

  console.log(
    `今期末現預金: ${currentCash} (= ${lastPeriodCash} + ${cashChange})`
  );

  return currentCash;
};
