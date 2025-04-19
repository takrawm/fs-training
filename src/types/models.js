/**
 * @typedef {Object} FinancialModel
 * @property {ModelMetadata} metadata - モデルのメタデータ
 * @property {Account[]} accounts - 勘定科目リスト
 * @property {Period[]} periods - 期間リスト
 * @property {CellValue[]} values - セル値リスト
 * //[]で囲われているのはオプショナルなプロパティ
 * @property {string[]} [sheets] - モデルに含まれるシート名のリスト
 * @property {Object} [preparedUI] - UI表示用の整形済みデータ
 * @property {Account[]} [preparedUI.preparedAccounts] - パラメータ値と参照科目名を含む整形済み勘定科目
 * @property {CellValue[]} [preparedUI.preparedValues] - 表示用に整形されたセル値
 * @property {Account[]} [allAccounts] - 全ての勘定科目リスト（フィルタリング前）
 */

/**
 * @typedef {Object} ModelMetadata
 * @property {string} id - モデルID
 * @property {string} name - モデル名
 * @property {string} description - 説明
 * @property {Date} lastModified - 最終更新日
 * @property {number} version - バージョン
 */

/**
 * @typedef {Object} Account
 * @property {string} id - 勘定科目ID
 * @property {string} code - 会計コード
 * @property {string} name - 勘定科目名
 * @property {string|null} parentId - 親科目ID
 * @property {AccountType} accountType - タイプ (売上/原価/販管費/資産など)
 * @property {AccountCategory} category - 大分類 (BS/PL)
 * @property {string} subtype - より詳細な分類
 * @property {number} order - 表示順
 * @property {string|null} formula - 計算式
 * @property {boolean} isEditable - 手動編集可能か
 * @property {boolean} isVisible - 表示するか
 * @property {AGGREGATE_METHOD} aggregateMethod - 集計方法
 * @property {number|null} aggregateSign - 集計符号
 * @property {AccountParameter|null} parameter - パラメータ設定
 * @property {CashflowType|null} cashflowType - キャッシュフロー計算の分類
 * @property {string|null} cashFlowElement - キャッシュフロー要素タイプ
 * @property {string} [sheetName] - 科目が所属するシート名（PL/BS/CAPEX/CSなど）
 * @property {number} [computedParamValue] - UI表示用の計算済みパラメータ値
 * @property {string} [referenceAccountName] - 参照科目の名前（UI表示用）
 * @property {boolean} [isReferenceAccount] - 被参照科目かどうか
 */

/**
 * @typedef {Object} AccountParameter
 * @property {ParameterType} type - パラメータの種類（成長率/割合）
 * @property {number} value - パラメータ値
 * @property {string|null} referenceAccountId - 参照する勘定科目ID（PERCENTAGE型の場合）
 * @property {string[]} periodIds - 適用される期間IDs
 * @property {boolean} isEditable - 編集可能か
 */

/**
 * @typedef {Object} Period
 * @property {string} id - 期間ID
 * @property {number} year - 年度
 * @property {number|null} month - 月 (nullは年次データの場合)
 * @property {boolean} isActual - 実績か計画か
 * @property {boolean} isFromExcel - エクセルから読み込んだデータか
 * @property {number} order - 表示順
 */

/**
 * @typedef {Object} CellValue
 * @property {string} accountId - 勘定科目ID
 * @property {string} periodId - 期間ID
 * @property {number} value - 値
 * @property {boolean} isCalculated - 計算値か入力値か
 * @property {string|null} formula - 計算式
 * @property {number} [displayValue] - 表示用に整形された値（UI表示用）
 */

/**
 * 勘定科目のタイプ
 * @enum {string}
 */
export const AccountType = {
  // PLアカウント
  REVENUE: "REVENUE", // 売上
  REVENUE_TOTAL: "REVENUE_TOTAL", // 売上合計
  COGS: "COGS", // 売上原価
  COGS_TOTAL: "COGS_TOTAL", // 売上原価合計
  SGA: "SGA", // 販管費
  SGA_TOTAL: "SGA_TOTAL", // 販管費合計
  GROSS_MARGIN: "GROSS_MARGIN", // 売上総利益
  OPERATING_PROFIT: "OPERATING_PROFIT", // 営業利益

  // BSアカウント
  ASSET: "ASSET", // 資産
  CURRENT_ASSET: "CURRENT_ASSET", // 流動資産
  CUR_ASSET_TOTAL: "CUR_ASSET_TOTAL", // 流動資産合計
  FIXED_ASSET: "FIXED_ASSET", // 固定資産
  FIX_ASSET_TOTAL: "FIX_ASSET_TOTAL", // 固定資産合計
  ASSET_TOTAL: "ASSET_TOTAL", // 資産合計

  LIABILITY: "LIABILITY", // 負債
  CURRENT_LIABILITY: "CURRENT_LIABILITY", // 流動負債
  CUR_LIABILITY_TOTAL: "CUR_LIABILITY_TOTAL", // 流動負債合計
  FIXED_LIABILITY: "FIXED_LIABILITY", // 固定負債
  FIX_LIABILITY_TOTAL: "FIX_LIABILITY_TOTAL", // 固定負債合計
  LIABILITY_TOTAL: "LIABILITY_TOTAL", // 負債合計

  EQUITY: "EQUITY", // 純資産/資本
  EQUITY_TOTAL: "EQUITY_TOTAL", // 純資産合計
  LI_EQ_TOTAL: "LI_EQ_TOTAL", // 負債・純資産合計

  // CAPEXアカウント
  INVESTMENT: "INVESTMENT", // 設備投資
  CAPEX: "CAPEX", // 設備投資
  CAPEX_TOTAL: "CAPEX_TOTAL", // 設備投資合計

  // CFアカウント
  CASH_FLOW: "CASH_FLOW", // キャッシュフロー
  OPE_CF: "OPE_CF", // 営業CF
  OPE_CF_TOTAL: "OPE_CF_TOTAL", // 営業CF合計
  INV_CF: "INV_CF", // 投資CF
  INV_CF_TOTAL: "INV_CF_TOTAL", // 投資CF合計
  CHANGE_CASH: "CHANGE_CASH", // 現預金増減

  // その他
  OTHER: "OTHER", // その他
};

/**
 * キャッシュフロー計算用の分類
 * @enum {string}
 */
export const CashflowType = {
  // PLアカウント関連
  PROFIT: "PROFIT", // 利益計算科目（減価償却費・無形固定資産償却費を除く）
  DEPRECIATION: "DEPRECIATION", // 減価償却費
  AMORTIZATION: "AMORTIZATION", // 無形固定資産償却費

  // BSアカウント関連
  CASH: "CASH", // 現預金
  WC_ASSET: "WC_ASSET", // 売掛金、棚卸資産など運転資本（資産）
  TNG_ASSET: "TNG_ASSET", // 有形固定資産
  INTNG_ASSET: "INTNG_ASSET", // 無形固定資産
  WC_LIABILITY: "WC_LIABILITY", // 買掛金、支払手形など運転資本（負債）
  LOAN: "LOAN", // 長期借入金
  OTHER_DEBT: "OTHER_DEBT", // 社債等その他の負債
  CAPITAL_STOCK: "CAPITAL_STOCK", // 資本金
  RETAINED_EARNINGS: "RETAINED_EARNINGS", // 利益剰余金

  // CAPEXアカウント関連
  TNG_INVESTMENT: "TNG_INVESTMENT", // 有形資産投資
  INTNG_INVESTMENT: "INTNG_INVESTMENT", // 無形資産投資

  // 未分類
  N_A: "N/A", // 該当なし/分類対象外
};

/**
 * キャッシュフロー要素タイプ
 * @enum {string}
 */
export const CashFlowElementType = {
  OPE_PROFIT: "OPE_PROFIT", // 営業利益
  DEP: "DEP", // 減価償却費
  AMT: "AMT", // 無形資産償却費
  WC: "WC", // 運転資本
  CAPEX: "CAPEX", // 設備投資
};

/**
 * パラメータタイプ
 * @enum {string}
 */
export const ParameterType = {
  GROWTH_RATE: "GROWTH_RATE", // 成長率（前年比）
  PERCENTAGE: "PERCENTAGE", // 割合（参照値に対する割合）
  FIXED_VALUE: "FIXED_VALUE", // 固定値
  PROPORTIONATE: "PROPORTIONATE", // 参照科目の増減率に連動
  OTHER: "OTHER", // その他の特殊計算
};

/**
 * パラメータ単位列挙型
 * @readonly
 * @enum {string}
 */
export const AGGREGATE_METHOD = {
  CHILDREN_SUM: "CHILDREN_SUM",
  FORMULA: "FORMULA",
  NONE: "NONE",
};
