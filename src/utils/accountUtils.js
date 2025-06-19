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

  /**
   * 資産科目かどうかを判定
   * @param {Object} account 勘定科目
   * @returns {boolean} 資産科目の場合true
   */
  isAssetAccount(account) {
    return account.isCredit === false && this.isStockAccount(account);
  },

  /**
   * 負債科目かどうかを判定
   * @param {Object} account 勘定科目
   * @returns {boolean} 負債科目の場合true
   */
  isLiabilityAccount(account) {
    return account.isCredit === true && this.isStockAccount(account);
  },

  /**
   * 純資産科目かどうかを判定
   * @param {Object} account 勘定科目
   * @returns {boolean} 純資産科目の場合true
   */
  isEquityAccount(account) {
    return account.isCredit === true && this.isStockAccount(account);
  },

  /**
   * 収益科目かどうかを判定
   * @param {Object} account 勘定科目
   * @returns {boolean} 収益科目の場合true
   */
  isRevenueAccount(account) {
    return account.isCredit === true && this.isFlowAccount(account);
  },

  /**
   * 費用科目かどうかを判定
   * @param {Object} account 勘定科目
   * @returns {boolean} 費用科目の場合true
   */
  isExpenseAccount(account) {
    return account.isCredit === false && this.isFlowAccount(account);
  },

  /**
   * CAPEX科目かどうかを判定
   * @param {Object} account 勘定科目
   * @returns {boolean} CAPEX科目の場合true
   */
  isCAPEXAccount(account) {
    return account.isCredit === null && this.isFlowAccount(account);
  },

  /**
   * CF項目かどうかを判定
   * @param {Object} account 勘定科目
   * @returns {boolean} CF項目の場合true
   */
  isCFAccount(account) {
    return (
      account.isCredit === null &&
      this.isFlowAccount(account) &&
      account.sheet?.name === "cf"
    );
  },
};
