import { FinancialModel } from "../models/FinancialModel.js";

/**
 * 現預金の変動を計算する（後方互換性のため維持）
 * @deprecated 代わりにFinancialModel.calculateCashFlow()を使用してください
 */
export const calculateCashChange = (
  accounts,
  newPeriod,
  lastPeriod,
  values
) => {
  // 一時的なFinancialModelインスタンスを作成
  const tempModel = new FinancialModel();
  tempModel.accounts.migrateFromArray(accounts);
  tempModel.values = values;
  tempModel.periods = [lastPeriod, newPeriod];

  // 新しいカプセル化されたメソッドを使用
  const result = tempModel.calculateCashFlow(newPeriod);
  return result.change;
};

/**
 * 現預金の期末残高を計算（後方互換性のため維持）
 * @deprecated 代わりにFinancialModel.calculateCashFlow()を使用してください
 */
export const calculateCashBalance = (
  account,
  newPeriod,
  lastPeriod,
  values,
  accounts
) => {
  // 一時的なFinancialModelインスタンスを作成
  const tempModel = new FinancialModel();
  tempModel.accounts.migrateFromArray(accounts);
  tempModel.values = values;
  tempModel.periods = [lastPeriod, newPeriod];

  // 新しいカプセル化されたメソッドを使用
  const result = tempModel.calculateCashFlow(newPeriod);
  return result.endingBalance;
};
