import { SHEET_TYPES, SUMMARY_ACCOUNTS } from "./constants";

/**
 * アカウントタイプ判定ユーティリティ
 */
export const AccountUtils = {
  isStockAccount(account) {
    return account.sheet?.sheetType === SHEET_TYPES.STOCK;
  },

  /**
   * CF調整を取得（flow固有）
   */
  getCFAdjustment(account) {
    if (account.sheet?.sheetType === SHEET_TYPES.FLOW) {
      return account.flowAttributes?.cfAdjustment;
    }
    return null;
  },

  /**
   * ベース利益を取得（flow固有）
   * 利益剰余金に加算される利益かどうかを判定
   */
  getBaseProfit(account) {
    if (account.sheet?.sheetType === SHEET_TYPES.FLOW) {
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

  /**
   * 指定されたstock科目がbaseProfitのターゲットかどうかを判定
   *
   * baseProfitは間接法キャッシュフローの出発点となる利益項目を表し、
   * これらの利益は利益剰余金に加算される特別な性質を持ちます。
   * 現在は利益剰余金のみがターゲットですが、将来の拡張も考慮した設計としています。
   *
   * @param {Object} account - 判定対象のstock科目
   * @param {Array} accounts - 全アカウント配列（将来の拡張で使用予定）
   * @returns {boolean} baseProfitのターゲットの場合true
   */
  isBaseProfitTarget(account, accounts) {
    // ストック科目でない場合は対象外
    if (!this.isStockAccount(account)) {
      return false;
    }

    // 現在は利益剰余金のみがbaseProfitのターゲット
    // 将来的に他の科目（例：その他の剰余金科目）もターゲットになる可能性を考慮
    return account.id === "retained-earnings";
  },

  /**
   * 指定されたstock科目をターゲットとするbaseProfit科目を取得
   *
   * この関数は、利益剰余金のような科目に対して、
   * どの利益項目（営業利益、経常利益等）が加算されるべきかを特定します。
   *
   * @param {Object} targetAccount - ターゲットとなるstock科目
   * @param {Array} accounts - 全アカウント配列
   * @returns {Array} baseProfit科目の配列
   */
  getBaseProfitAccounts(targetAccount, accounts) {
    // baseProfitのターゲットでない場合は空配列を返す
    if (!this.isBaseProfitTarget(targetAccount, accounts)) {
      return [];
    }

    // baseProfit: true の科目を抽出
    // 複数の利益項目が存在する場合にも対応
    return accounts.filter((acc) => this.getBaseProfit(acc));
  },

  /**
   * 現預金計算科目かどうかを判定
   *
   * 現預金計算科目は、現預金の期首残高、増減、期末残高を計算する
   * 特別な科目群で、通常のstock/flow科目とは独立して管理されます。
   *
   * @param {Object} account - 判定対象のアカウント
   * @returns {boolean} 現預金計算科目の場合true
   */
  isCashCalcAccount(account) {
    return account.sheet?.sheetType === SHEET_TYPES.CASH_CALC;
  },

  /**
   * CF項目の合計対象かどうかを判定
   *
   * CASH_FLOW_TOTAL の計算で、この科目を集計対象に含めるかを判定します。
   * SUMMARY_ACCOUNTSや現預金計算科目自体は除外されます。
   *
   * @param {Object} account - 判定対象のアカウント
   * @returns {boolean} CF項目合計の対象に含める場合true
   */
  shouldIncludeInCashFlowTotal(account) {
    // CF項目でない場合は除外
    if (!this.isCFItem(account)) {
      return false;
    }

    // 現預金計算科目は除外（自己参照を避けるため）
    if (this.isCashCalcAccount(account)) {
      return false;
    }

    // SUMMARY_ACCOUNTSに含まれる科目は除外
    // （営業CF合計、投資CF合計、財務CF合計などの集計科目）
    const summaryAccountIds = Object.values(SUMMARY_ACCOUNTS).map(
      (acc) => acc.id
    );
    if (summaryAccountIds.includes(account.id)) {
      return false;
    }

    return true;
  },
};
