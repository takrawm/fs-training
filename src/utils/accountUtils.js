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

  /**
   * パラメータを持っているかチェック
   * （ParameterUtilsに委譲）
   */
  hasParameter(account) {
    return account.parameter != null;
  },

  /**
   * CF調整を取得（flow固有）
   */
  getCFAdjustment(account) {
    if (this.isFlowAccount(account)) {
      return account.flowAttributes?.cfAdjustment;
    }
    return null;
  },

  /**
   * ベース利益を取得（flow固有）
   * 利益剰余金に加算される利益かどうかを判定
   */
  getBaseProfit(account) {
    if (this.isFlowAccount(account)) {
      return account.flowAttributes?.baseProfit === true;
    }
    return false;
  },

  /**
   * CF項目を生成すべきかチェック（stock固有）
   * 新しい構造ではstockAttributesのgeneratesCFItemプロパティで判定
   * @param {Object} account 勘定科目
   * @returns {boolean} CF項目を生成すべき場合true
   */
  shouldGenerateCFItem(account) {
    if (!this.isStockAccount(account)) return false;
    return account.stockAttributes?.generatesCFItem === true;
  },

  /**
   * パラメータ参照を取得（新しい構造に対応）
   * @param {Object} account 勘定科目
   * @returns {Object|Array} パラメータ参照
   */
  getParameterReferences(account) {
    return account.parameter?.paramReferences || [];
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
   * CF項目かどうかを判定（従来の構造）
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

  /**
   * CF項目かどうかを判定（新しいシンプル化設計版）
   * 新しい設計では、CF項目はsheetプロパティがnullで、
   * flowAttributesとstockAttributesもnullとなります
   * @param {Object} account 勘定科目
   * @returns {boolean} CF項目の場合true
   */
  isCFItem(account) {
    return (
      account.sheet === null &&
      account.flowAttributes === null &&
      account.stockAttributes === null &&
      account.isCredit === null
    );
  },
};
