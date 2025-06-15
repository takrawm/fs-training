import { SHEET_TYPES } from "./constants";

/**
 * アカウントタイプ判定ユーティリティ
 */
export const AccountUtils = {
  isStockAccount(account) {
    return account.sheet?.sheetType === SHEET_TYPES.STOCK;
  },

  isFlowAccount(account) {
    return account.sheet?.sheetType === SHEET_TYPES.FLOW;
  },

  hasParameter(account) {
    if (this.isStockAccount(account)) {
      return account.stockAttributes?.isParameterBased === true;
    }
    return account.flowAttributes?.parameter != null;
  },

  getCFAdjustment(account) {
    if (this.isFlowAccount(account)) {
      return account.flowAttributes?.cfAdjustment;
    }
    return null;
  },

  getParameterReferences(account) {
    if (
      this.isStockAccount(account) &&
      account.stockAttributes?.parameter?.paramReferences
    ) {
      return account.stockAttributes.parameter.paramReferences;
    }
    if (
      this.isFlowAccount(account) &&
      account.flowAttributes?.parameter?.paramReferences
    ) {
      return account.flowAttributes.parameter.paramReferences;
    }
    return [];
  },
};
