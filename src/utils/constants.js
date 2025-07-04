// 最初にインポートする対象シートの定義（キャッシュフロー計算書は最初インポート対象外）
export const TARGET_SHEETS = ["PL", "BS", "CAPEX"];

// ========== 新規追加：シートタイプの定数定義 ==========
export const SHEET_TYPES = {
  STOCK: "stock",
  FLOW: "flow",
  CASH_CALC: "cashCalc", // 新規追加：現預金計算専用シート
};

export const FLOW_SHEETS = {
  PL: "pl",
  PPE: "ppe",
  CF: "cf",
};

export const STOCK_SHEETS = {
  BS: "bs",
};

export const CASH_CALC_SHEETS = {
  CASH_CALC: "cashCalc",
};

export const CF_ADJUSTMENT_TYPE = {
  BS_MAPPING: "BS_MAPPING",
  RECLASSIFICATION: "RECLASSIFICATION",
  BASE_PROFIT: "BASE_PROFIT",
};

// CF区分の定義
export const CF_CATEGORIES = {
  OPERATING: "OPERATING",
  INVESTING: "INVESTING",
  FINANCING: "FINANCING",
};

// 演算タイプの定義
export const OPERATIONS = {
  ADD: "ADD",
  SUB: "SUB",
  MUL: "MUL",
  DIV: "DIV",
};
// ==========ここまで新規追加 ==========

export const SHEET_ATTRIBUTES = {
  CASH: "CASH",
  ASSET: "ASSET",
  LIABILITY: "LIABILITY",
  EQUITY: "EQUITY",
  RETAINED_EARNINGS: "RETAINED_EARNINGS",
  NET_INCOME: "NET_INCOME",
};

// パラメータタイプの選択肢（既存のものを改善）
// 注：ストック科目（BS）では以下のパラメータタイプのみ使用可能：
//   - GROWTH_RATE: 前期比成長率
//   - PROPORTIONATE: 他科目連動（売上連動など）
export const PARAMETER_TYPES = {
  NONE: "なし",
  GROWTH_RATE: "成長率",
  PERCENTAGE: "比率",
  PROPORTIONATE: "他科目連動",
  FIXED_VALUE: "横置き",
  CHILDREN_SUM: "子科目合計",
  CALCULATION: "計算",
  REFERENCE: "参照",

  BS_CHANGE: "BS変動",
  CF_ADJUSTMENT_CALC: "CF調整計算",
  CASH_BEGINNING_BALANCE: "現預金期首残高",
  CASH_FLOW_TOTAL: "現預金フロー合計",
  CASH_CHANGE_CALCULATION: "現預金増減計算",
  CASH_ENDING_BALANCE: "現預金期末残高",
};

// パラメータタイプの選択肢
export const PARAM_OP_MAPPING = {
  [PARAMETER_TYPES.GROWTH_RATE]: ["CONST"],
  [PARAMETER_TYPES.PERCENTAGE]: ["CONST"],
  [PARAMETER_TYPES.CALCULATION]: ["ADD", "SUB"],
};

export const DEFAULT_PARAMETER_REFERENCE = "rev-total";

export const DEFAULT_PARAMETER_VALUES = {
  GROWTH_RATE: 0.05,
  PERCENTAGE: 0.02,
};

// 集計用勘定科目の定義（新しい構造に更新）
export const SUMMARY_ACCOUNTS = {
  // PLアカウント
  売上高合計: {
    id: "rev-total",
    accountName: "売上高合計",
    parentAccountId: null,
    isCredit: true, // 収益科目
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PL,
    },
    // パラメータは共通プロパティ
    parameter: {
      paramType: PARAMETER_TYPES.CHILDREN_SUM,
      paramValue: null,
      paramReferences: null,
    },
    stockAttributes: null,
    flowAttributes: {
      reclassification: null,
      baseProfit: false,
      cfAdjustment: null,
    },
    displayOrder: {
      order: "A99",
      prefix: "A",
    },
  },
  売上原価合計: {
    id: "cogs-total",
    accountName: "売上原価合計",
    parentAccountId: null,
    isCredit: false, // 費用科目
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PL,
    },
    // パラメータは共通プロパティ
    parameter: {
      paramType: PARAMETER_TYPES.CHILDREN_SUM,
      paramValue: null,
      paramReferences: null,
    },
    stockAttributes: null,
    flowAttributes: {
      reclassification: null,
      baseProfit: false,
      cfAdjustment: null,
    },
    displayOrder: {
      order: "B99",
      prefix: "B",
    },
  },
  売上総利益: {
    id: "gross-profit",
    accountName: "売上総利益",
    parentAccountId: null,
    isCredit: true, // 利益科目
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PL,
    },
    // パラメータは共通プロパティ
    parameter: {
      paramType: PARAMETER_TYPES.CALCULATION,
      paramValue: null,
      paramReferences: [
        { accountId: "rev-total", operation: OPERATIONS.ADD, lag: 0 },
        { accountId: "cogs-total", operation: OPERATIONS.SUB, lag: 0 },
      ],
    },
    stockAttributes: null,
    flowAttributes: {
      reclassification: null,
      baseProfit: false,
      cfAdjustment: null,
    },
    displayOrder: {
      order: "C99",
      prefix: "C",
    },
  },
  販管費合計: {
    id: "sga-total",
    accountName: "販管費合計",
    parentAccountId: null,
    isCredit: false, // 費用科目
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PL,
    },
    // パラメータは共通プロパティ
    parameter: {
      paramType: PARAMETER_TYPES.CHILDREN_SUM,
      paramValue: null,
      paramReferences: null,
    },
    stockAttributes: null,
    flowAttributes: {
      reclassification: null,
      baseProfit: false,
      cfAdjustment: null,
    },
    displayOrder: {
      order: "D99",
      prefix: "D",
    },
  },
  営業利益: {
    id: "op-profit",
    accountName: "営業利益",
    parentAccountId: null,
    isCredit: true, // 利益科目
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PL,
    },
    // パラメータは共通プロパティ
    parameter: {
      paramType: PARAMETER_TYPES.CALCULATION,
      paramValue: null,
      paramReferences: [
        { accountId: "gross-profit", operation: OPERATIONS.ADD, lag: 0 },
        { accountId: "sga-total", operation: OPERATIONS.SUB, lag: 0 },
      ],
    },
    stockAttributes: null,
    flowAttributes: {
      reclassification: null,
      baseProfit: true, //利益剰余金を増加させる利益を指定
      cfAdjustment: null,
    },
    displayOrder: {
      order: "E99",
      prefix: "E",
    },
  },

  // 現預金計算科目
  前期末現預金: {
    id: "cash-beginning-balance",
    accountName: "前期末現預金",
    parentAccountId: null,
    isCredit: null, // 現預金計算科目は符号を持たない
    sheet: {
      sheetType: SHEET_TYPES.CASH_CALC,
      name: CASH_CALC_SHEETS.CASH_CALC,
    },
    parameter: {
      paramType: PARAMETER_TYPES.CASH_BEGINNING_BALANCE,
      paramValue: null,
      paramReferences: {
        accountId: "cash-total", // BSの現預金合計を参照
        operation: OPERATIONS.ADD,
        lag: 1, // 前期の値を取得
      },
    },
    stockAttributes: null,
    flowAttributes: null,
    displayOrder: {
      order: "CASH01",
      prefix: "CASH",
    },
  },

  当期現預金の増減: {
    id: "cash-flow-change",
    accountName: "当期現預金の増減",
    parentAccountId: null,
    isCredit: null,
    sheet: {
      sheetType: SHEET_TYPES.CASH_CALC,
      name: CASH_CALC_SHEETS.CASH_CALC,
    },
    parameter: {
      paramType: PARAMETER_TYPES.CASH_CHANGE_CALCULATION,
      paramValue: null,
      paramReferences: null, // 間接法による現預金増減計算のため、静的な参照はなし
    },
    stockAttributes: null,
    flowAttributes: null,
    displayOrder: {
      order: "CASH02",
      prefix: "CASH",
    },
  },

  当期末現預金: {
    id: "cash-ending-balance",
    accountName: "当期末現預金",
    parentAccountId: null,
    isCredit: null,
    sheet: {
      sheetType: SHEET_TYPES.CASH_CALC,
      name: CASH_CALC_SHEETS.CASH_CALC,
    },
    parameter: {
      paramType: PARAMETER_TYPES.CASH_ENDING_BALANCE,
      paramValue: null,
      paramReferences: [
        {
          accountId: "cash-beginning-balance",
          operation: OPERATIONS.ADD,
          lag: 0,
        },
        { accountId: "cash-flow-change", operation: OPERATIONS.ADD, lag: 0 },
      ],
    },
    stockAttributes: null,
    flowAttributes: null,
    displayOrder: {
      order: "CASH03",
      prefix: "CASH",
    },
  },

  // BSアカウント（新しい構造に更新）
  現預金合計: {
    id: "cash-total",
    accountName: "現預金合計",
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    parentAccountId: "current-asset-total",
    isCredit: false, // 資産科目
    // 変更箇所: 専用の現預金計算ロジックから、当期末現預金への参照に変更
    parameter: {
      paramType: PARAMETER_TYPES.REFERENCE,
      paramValue: null,
      paramReferences: {
        accountId: "cash-ending-balance", // 当期末現預金を参照
        operation: OPERATIONS.ADD,
        lag: 0,
      },
    },
    stockAttributes: {
      generatesCFItem: false, // 現預金はCF項目生成対象外
    },
    flowAttributes: null,
    displayOrder: {
      order: "F01",
      prefix: "F",
    },
  },
  流動資産合計: {
    id: "current-asset-total",
    accountName: "流動資産合計",
    parentAccountId: "asset-total",
    isCredit: false, // 資産科目
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    // パラメータは共通プロパティ
    parameter: {
      paramType: PARAMETER_TYPES.CHILDREN_SUM,
      paramValue: null,
      paramReferences: null,
    },
    stockAttributes: {
      generatesCFItem: false, // 集計科目（CHILDREN_SUM）はCF項目生成対象外
    },
    flowAttributes: null,
    displayOrder: {
      order: "F99",
      prefix: "F",
    },
  },
  固定資産合計: {
    id: "fixed-asset-total",
    accountName: "固定資産合計",
    parentAccountId: "asset-total",
    isCredit: false, // 資産科目
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    // パラメータは共通プロパティ
    parameter: {
      paramType: PARAMETER_TYPES.CHILDREN_SUM,
      paramValue: null,
      paramReferences: null,
    },
    stockAttributes: {
      generatesCFItem: false, // 集計科目（CHILDREN_SUM）はCF項目生成対象外
    },
    flowAttributes: null,
    displayOrder: {
      order: "G99",
      prefix: "G",
    },
  },
  資産合計: {
    id: "asset-total",
    accountName: "資産合計",
    parentAccountId: null,
    isCredit: false, // 資産科目
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    // パラメータは共通プロパティ
    parameter: {
      paramType: PARAMETER_TYPES.CHILDREN_SUM,
      paramValue: null,
      paramReferences: null,
    },
    stockAttributes: {
      generatesCFItem: false, // 集計科目（CHILDREN_SUM）はCF項目生成対象外
    },
    flowAttributes: null,
    displayOrder: {
      order: "H99",
      prefix: "H",
    },
  },
  流動負債合計: {
    id: "current-liability-total",
    accountName: "流動負債合計",
    parentAccountId: "liability-total",
    isCredit: true, // 負債科目
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    // パラメータは共通プロパティ
    parameter: {
      paramType: PARAMETER_TYPES.CHILDREN_SUM,
      paramValue: null,
      paramReferences: null,
    },
    stockAttributes: {
      generatesCFItem: false, // 集計科目（CHILDREN_SUM）はCF項目生成対象外
    },
    flowAttributes: null,
    displayOrder: {
      order: "I99",
      prefix: "I",
    },
  },
  固定負債合計: {
    id: "fixed-liability-total",
    accountName: "固定負債合計",
    parentAccountId: "liability-total",
    isCredit: true, // 負債科目
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    // パラメータは共通プロパティ
    parameter: {
      paramType: PARAMETER_TYPES.CHILDREN_SUM,
      paramValue: null,
      paramReferences: null,
    },
    stockAttributes: {
      generatesCFItem: false, // 集計科目（CHILDREN_SUM）はCF項目生成対象外
    },
    flowAttributes: null,
    displayOrder: {
      order: "J99",
      prefix: "J",
    },
  },
  負債合計: {
    id: "liability-total",
    accountName: "負債合計",
    parentAccountId: "li-eq-total",
    isCredit: true, // 負債科目
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    // パラメータは共通プロパティ
    parameter: {
      paramType: PARAMETER_TYPES.CHILDREN_SUM,
      paramValue: null,
      paramReferences: null,
    },
    stockAttributes: {
      generatesCFItem: false, // 集計科目（CHILDREN_SUM）はCF項目生成対象外
    },
    flowAttributes: null,
    displayOrder: {
      order: "K99",
      prefix: "K",
    },
  },
  利益剰余金: {
    id: "retained-earnings",
    accountName: "利益剰余金",
    parentAccountId: "equity-total",
    isCredit: true, // 純資産科目
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    // パラメータは共通プロパティ
    parameter: null,
    stockAttributes: {
      generatesCFItem: false,
    },
    flowAttributes: null,
    displayOrder: {
      order: "M99",
      prefix: "M",
    },
  },
  純資産合計: {
    id: "equity-total",
    accountName: "純資産合計",
    parentAccountId: "li-eq-total",
    isCredit: true, // 純資産科目
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    // パラメータは共通プロパティ
    parameter: {
      paramType: PARAMETER_TYPES.CHILDREN_SUM,
      paramValue: null,
      paramReferences: null,
    },
    stockAttributes: {
      generatesCFItem: false, // 集計科目（CHILDREN_SUM）はCF項目生成対象外
    },
    flowAttributes: null,
    displayOrder: {
      order: "N99",
      prefix: "N",
    },
  },
  負債及び純資産合計: {
    id: "li-eq-total",
    accountName: "負債及び純資産合計",
    parentAccountId: null,
    isCredit: true, // 負債・純資産科目
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    // パラメータは共通プロパティ
    parameter: {
      paramType: PARAMETER_TYPES.CHILDREN_SUM,
      paramValue: null,
      paramReferences: null,
    },
    stockAttributes: {
      generatesCFItem: false, // 集計科目（CHILDREN_SUM）はCF項目生成対象外
    },
    flowAttributes: null,
    displayOrder: {
      order: "O99",
      prefix: "O",
    },
  },

  // CAPEXアカウント
  設備投資合計: {
    id: "capex-total",
    accountName: "設備投資合計",
    parentAccountId: null,
    isCredit: null, // PPE項目
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PPE,
    },
    // パラメータは共通プロパティ
    parameter: {
      paramType: PARAMETER_TYPES.CHILDREN_SUM,
      paramValue: null,
      paramReferences: null,
    },
    stockAttributes: null,
    flowAttributes: {
      reclassification: null,
      baseProfit: false,
      cfAdjustment: null,
    },
    displayOrder: {
      order: "Q99",
      prefix: "Q",
    },
  },

  // CFアカウント（集計科目）
  営業CF合計: {
    id: "ope-cf-total",
    accountName: "営業CF合計",
    parentAccountId: null,
    isCredit: null, // CF項目
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.CF,
    },
    // パラメータは共通プロパティ
    parameter: {
      paramType: PARAMETER_TYPES.CHILDREN_SUM,
      paramValue: null,
      paramReferences: null,
    },
    stockAttributes: null,
    flowAttributes: {
      reclassification: null,
      baseProfit: false,
      cfAdjustment: null,
    },
    displayOrder: {
      order: "R99",
      prefix: "R",
    },
  },
  投資CF合計: {
    id: "inv-cf-total",
    accountName: "投資CF合計",
    parentAccountId: null,
    isCredit: null, // CF項目
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.CF,
    },
    // パラメータは共通プロパティ
    parameter: {
      paramType: PARAMETER_TYPES.CHILDREN_SUM,
      paramValue: null,
      paramReferences: null,
    },
    stockAttributes: null,
    flowAttributes: {
      reclassification: null,
      baseProfit: false,
      cfAdjustment: null,
    },
    displayOrder: {
      order: "S99",
      prefix: "S",
    },
  },
  財務CF合計: {
    id: "fin-cf-total",
    accountName: "財務CF合計",
    parentAccountId: null,
    isCredit: null, // CF項目
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.CF,
    },
    // パラメータは共通プロパティ
    parameter: {
      paramType: PARAMETER_TYPES.CHILDREN_SUM,
      paramValue: null,
      paramReferences: null,
    },
    stockAttributes: null,
    flowAttributes: {
      reclassification: null,
      baseProfit: false,
      cfAdjustment: null,
    },
    displayOrder: {
      order: "T99",
      prefix: "T",
    },
  },
};

// CF項目の定義
// CF項目の定義（新しい cfItemAttributes 構造を使用）
export const CF_ITEMS = {
  営業利益_間接法: {
    id: "cf-operating-profit",
    accountName: "営業利益（間接法CF）",
    parentAccountId: "ope-cf-total",
    isCredit: null, // CF項目
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.CF,
    },
    stockAttributes: null,
    flowAttributes: {
      // 基本的なflowAttributes構造
      reclassification: null,
      baseProfit: false,
      cfAdjustment: null,
    },
    displayOrder: {
      order: "CF01",
      prefix: "CF",
    },
  },
};

// 勘定科目デフォルトシートタイプマッピング（新しい構造に更新）
export const DEFAULT_SHEET_TYPES = {
  商品売上: {
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PL,
    },
    parentAccountId: "rev-total",
    isCredit: true, // 収益科目
    // パラメータは共通プロパティ
    parameter: {
      paramType: PARAMETER_TYPES.GROWTH_RATE,
      paramValue: 0.05,
      paramReferences: null,
    },
    stockAttributes: null,
    flowAttributes: {
      reclassification: null,
      baseProfit: false,
      cfAdjustment: null,
    },
  },
  サービス売上: {
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PL,
    },
    parentAccountId: "rev-total",
    isCredit: true, // 収益科目
    // パラメータは共通プロパティ
    parameter: {
      paramType: PARAMETER_TYPES.GROWTH_RATE,
      paramValue: 0.05,
      paramReferences: null,
    },
    stockAttributes: null,
    flowAttributes: {
      reclassification: null,
      baseProfit: false,
      cfAdjustment: null,
    },
  },
  その他売上: {
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PL,
    },
    parentAccountId: "rev-total",
    isCredit: true, // 収益科目
    // パラメータは共通プロパティ
    parameter: {
      paramType: PARAMETER_TYPES.GROWTH_RATE,
      paramValue: 0.05,
      paramReferences: null,
    },
    stockAttributes: null,
    flowAttributes: {
      reclassification: null,
      baseProfit: false,
      cfAdjustment: null,
    },
  },
  売上高合計: {
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PL,
    },
    parentAccountId: null,
    isCredit: true, // 収益科目
    // パラメータは共通プロパティ
    parameter: {
      paramType: PARAMETER_TYPES.CHILDREN_SUM,
      paramValue: null,
      paramReferences: null,
    },
    stockAttributes: null,
    flowAttributes: {
      reclassification: null,
      baseProfit: false,
      cfAdjustment: null,
    },
  },
  材料費: {
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PL,
    },
    parentAccountId: "cogs-total",
    isCredit: false, // 費用科目
    // パラメータは共通プロパティ
    parameter: {
      paramType: PARAMETER_TYPES.PERCENTAGE,
      paramValue: 0.4,
      paramReferences: {
        accountId: "rev-total",
        operation: OPERATIONS.MUL,
        lag: 0,
      },
    },
    stockAttributes: null,
    flowAttributes: {
      reclassification: null,
      baseProfit: false,
      cfAdjustment: null,
    },
  },

  労務費: {
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PL,
    },
    parentAccountId: "cogs-total",
    isCredit: false, // 費用科目
    // パラメータは共通プロパティ
    parameter: {
      paramType: PARAMETER_TYPES.PERCENTAGE,
      paramValue: 0.3,
      paramReferences: {
        accountId: "rev-total",
        operation: OPERATIONS.MUL,
        lag: 0,
      },
    },
    stockAttributes: null,
    flowAttributes: {
      reclassification: null,
      baseProfit: false,
      cfAdjustment: null,
    },
  },
  売上原価合計: {
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PL,
    },
    parentAccountId: null,
    isCredit: false, // 費用科目
    // パラメータは共通プロパティ
    parameter: {
      paramType: PARAMETER_TYPES.CHILDREN_SUM,
      paramValue: null,
      paramReferences: null,
    },
    stockAttributes: null,
    flowAttributes: {
      reclassification: null,
      baseProfit: false,
      cfAdjustment: null,
    },
  },

  売上総利益: {
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PL,
    },
    parentAccountId: null,
    isCredit: true, // 利益科目
    // パラメータは共通プロパティ
    parameter: {
      paramType: PARAMETER_TYPES.CALCULATION,
      paramValue: null,
      paramReferences: [
        { accountId: "rev-total", operation: OPERATIONS.ADD, lag: 0 },
        { accountId: "cogs-total", operation: OPERATIONS.SUB, lag: 0 },
      ],
    },
    stockAttributes: null,
    flowAttributes: {
      reclassification: null,
      baseProfit: false,
      cfAdjustment: null,
    },
  },

  人件費: {
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PL,
    },
    parentAccountId: "sga-total",
    isCredit: false, // 費用科目
    // パラメータは共通プロパティ
    parameter: {
      paramType: PARAMETER_TYPES.PERCENTAGE,
      paramValue: 0.2,
      paramReferences: {
        accountId: "rev-total",
        operation: OPERATIONS.MUL,
        lag: 0,
      },
    },
    stockAttributes: null,
    flowAttributes: {
      reclassification: null,
      baseProfit: false,
      cfAdjustment: null,
    },
  },

  物流費: {
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PL,
    },
    parentAccountId: "sga-total",
    isCredit: false, // 費用科目
    // パラメータは共通プロパティ
    parameter: {
      paramType: PARAMETER_TYPES.PERCENTAGE,
      paramValue: 0.1,
      paramReferences: {
        accountId: "rev-total",
        operation: OPERATIONS.MUL,
        lag: 0,
      },
    },
    stockAttributes: null,
    flowAttributes: {
      reclassification: null,
      baseProfit: false,
      cfAdjustment: null,
    },
  },

  減価償却費: {
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PL,
    },
    parentAccountId: "sga-total",
    isCredit: false, // 費用科目
    // パラメータは共通プロパティ
    parameter: {
      paramType: PARAMETER_TYPES.PERCENTAGE,
      paramValue: 0.025,
      paramReferences: {
        accountId: "rev-total",
        operation: OPERATIONS.MUL,
        lag: 1,
      },
    },
    stockAttributes: null,
    flowAttributes: {
      reclassification: null,
      baseProfit: false,
      cfAdjustment: {
        operation: OPERATIONS.SUB,
        targetAccountId: "account-19",
        cfCategory: CF_CATEGORIES.OPERATING,
      },
    },
  },

  無形固定資産償却費: {
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PL,
    },
    parentAccountId: "sga-total",
    isCredit: false, // 費用科目
    // パラメータは共通プロパティ
    parameter: {
      paramType: PARAMETER_TYPES.PERCENTAGE,
      paramValue: 0.04,
      paramReferences: {
        accountId: "rev-total",
        operation: OPERATIONS.MUL,
        lag: 1,
      },
    },
    stockAttributes: null,
    flowAttributes: {
      reclassification: null,
      baseProfit: false,
      cfAdjustment: {
        operation: OPERATIONS.SUB,
        targetAccountId: "account-20",
        cfCategory: CF_CATEGORIES.OPERATING,
      },
    },
  },
  その他販管費: {
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PL,
    },
    parentAccountId: "sga-total",
    isCredit: false, // 費用科目
    // パラメータは共通プロパティ
    parameter: {
      paramType: PARAMETER_TYPES.PERCENTAGE,
      paramValue: 0.05,
      paramReferences: {
        accountId: "rev-total",
        operation: OPERATIONS.MUL,
        lag: 0,
      },
    },
    stockAttributes: null,
    flowAttributes: {
      reclassification: null,
      baseProfit: false,
      cfAdjustment: null,
    },
  },

  販管費合計: {
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PL,
    },
    parentAccountId: null,
    isCredit: false, // 費用科目
    // パラメータは共通プロパティ
    parameter: {
      paramType: PARAMETER_TYPES.CHILDREN_SUM,
      paramValue: null,
      paramReferences: null,
    },
    stockAttributes: null,
    flowAttributes: {
      reclassification: null,
      baseProfit: false,
      cfAdjustment: null,
    },
  },

  営業利益: {
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PL,
    },
    parentAccountId: null,
    isCredit: true, // 利益科目
    // パラメータは共通プロパティ
    parameter: {
      paramType: PARAMETER_TYPES.CALCULATION,
      paramValue: null,
      paramReferences: [
        { accountId: "gross-profit", operation: OPERATIONS.ADD, lag: 0 },
        { accountId: "sga-total", operation: OPERATIONS.SUB, lag: 0 },
      ],
    },
    stockAttributes: null,
    flowAttributes: {
      reclassification: null,
      baseProfit: true,
      cfAdjustment: null,
    },
  },
  // BS項目（新しい構造に更新）
  現預金合計: {
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    parentAccountId: "current-asset-total",
    isCredit: false, // 資産科目
    // パラメータは共通プロパティ
    parameter: {
      paramType: PARAMETER_TYPES.REFERENCE,
      paramValue: null,
      paramReferences: {
        accountId: "cash-ending-balance", // 当期末現預金を参照
        operation: OPERATIONS.ADD,
        lag: 0,
      },
    },
    stockAttributes: {
      generatesCFItem: false, // 現預金はCF項目生成対象外
    },
    flowAttributes: null,
  },
  売掛金: {
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    parentAccountId: "current-asset-total",
    isCredit: false, // 資産科目
    // パラメータは共通プロパティ
    parameter: {
      paramType: PARAMETER_TYPES.PROPORTIONATE,
      paramValue: null,
      paramReferences: {
        accountId: "rev-total",
        operation: OPERATIONS.MUL,
        lag: 0,
      },
    },
    stockAttributes: {
      generatesCFItem: true, // パラメータで独立計算されるBS科目
    },
    flowAttributes: null,
  },
  棚卸資産: {
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    parentAccountId: "current-asset-total",
    isCredit: false, // 資産科目
    // パラメータは共通プロパティ
    parameter: {
      paramType: PARAMETER_TYPES.GROWTH_RATE,
      paramValue: 0.03,
      paramReferences: null,
    },
    stockAttributes: {
      generatesCFItem: true, // パラメータで独立計算されるBS科目
    },
    flowAttributes: null,
  },
  流動資産合計: {
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    parentAccountId: "asset-total",
    isCredit: false, // 資産科目
    // パラメータは共通プロパティ
    parameter: null,
    stockAttributes: {
      generatesCFItem: false, // 集計科目はCF項目生成対象外
    },
    flowAttributes: null,
  },
  有形固定資産: {
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    parentAccountId: "fixed-asset-total",
    isCredit: false, // 資産科目
    // パラメータは共通プロパティ
    parameter: null,
    stockAttributes: {
      generatesCFItem: false, // CF調整対象科目（減価償却費で処理）
    },
    flowAttributes: null,
  },
  無形固定資産: {
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    parentAccountId: "fixed-asset-total",
    isCredit: false, // 資産科目
    // パラメータは共通プロパティ
    parameter: null,
    stockAttributes: {
      generatesCFItem: false,
    },
    flowAttributes: null,
  },
  固定資産合計: {
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    parentAccountId: "asset-total",
    isCredit: false, // 資産科目
    // パラメータは共通プロパティ
    parameter: null,
    stockAttributes: {
      generatesCFItem: false, // 集計科目はCF項目生成対象外
    },
    flowAttributes: null,
  },
  資産合計: {
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    parentAccountId: null,
    isCredit: false, // 資産科目
    // パラメータは共通プロパティ
    parameter: null,
    stockAttributes: {
      generatesCFItem: false, // 集計科目はCF項目生成対象外
    },
    flowAttributes: null,
  },
  買掛金: {
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    parentAccountId: "current-liability-total",
    isCredit: true, // 負債科目
    // パラメータは共通プロパティ
    parameter: {
      paramType: PARAMETER_TYPES.PROPORTIONATE,
      paramValue: null,
      paramReferences: {
        accountId: "rev-total",
        operation: OPERATIONS.MUL,
        lag: 0,
      },
    },
    stockAttributes: {
      generatesCFItem: true, // パラメータで独立計算されるBS科目
    },
    flowAttributes: null,
  },
  支払手形: {
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    parentAccountId: "current-liability-total",
    isCredit: true, // 負債科目
    // パラメータは共通プロパティ
    parameter: {
      paramType: PARAMETER_TYPES.PROPORTIONATE,
      paramValue: null,
      paramReferences: {
        accountId: "rev-total",
        operation: OPERATIONS.MUL,
        lag: 0,
      },
    },
    stockAttributes: {
      generatesCFItem: true, // パラメータで独立計算されるBS科目
    },
    flowAttributes: null,
  },
  流動負債合計: {
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    parentAccountId: "liability-total",
    isCredit: true, // 負債科目
    // パラメータは共通プロパティ
    parameter: null,
    stockAttributes: {
      generatesCFItem: false, // 集計科目はCF項目生成対象外
    },
    flowAttributes: null,
  },
  長期借入金: {
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    parentAccountId: "fixed-liability-total",
    isCredit: true, // 負債科目
    // パラメータは共通プロパティ
    parameter: {
      paramType: PARAMETER_TYPES.GROWTH_RATE,
      paramValue: 0.02,
      paramReferences: null,
    },
    stockAttributes: {
      generatesCFItem: true, // パラメータで独立計算されるBS科目
    },
    flowAttributes: null,
  },
  社債: {
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    parentAccountId: "fixed-liability-total",
    isCredit: true, // 負債科目
    // パラメータは共通プロパティ
    parameter: {
      paramType: PARAMETER_TYPES.FIXED_VALUE,
      paramValue: null,
      paramReferences: null,
    },
    stockAttributes: {
      generatesCFItem: true, // パラメータで独立計算されるBS科目
    },
    flowAttributes: null,
  },
  固定負債合計: {
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    parentAccountId: "liability-total",
    isCredit: true, // 負債科目
    // パラメータは共通プロパティ
    parameter: null,
    stockAttributes: {
      generatesCFItem: false, // 集計科目はCF項目生成対象外
    },
    flowAttributes: null,
  },
  負債合計: {
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    parentAccountId: "li-eq-total",
    isCredit: true, // 負債科目
    // パラメータは共通プロパティ
    parameter: null,
    stockAttributes: {
      generatesCFItem: false, // 集計科目はCF項目生成対象外
    },
    flowAttributes: null,
  },
  資本金: {
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    parentAccountId: "equity-total",
    isCredit: true, // 純資産科目
    // パラメータは共通プロパティ
    parameter: {
      paramType: PARAMETER_TYPES.FIXED_VALUE,
      paramValue: null,
      paramReferences: null,
    },
    stockAttributes: {
      generatesCFItem: true, // パラメータで独立計算されるBS科目
    },
    flowAttributes: null,
  },
  利益剰余金: {
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    parentAccountId: "equity-total",
    isCredit: true, // 純資産科目
    // パラメータは共通プロパティ
    parameter: null,
    stockAttributes: {
      generatesCFItem: false, // パラメータで独立計算されるBS科目
    },
    flowAttributes: null,
  },
  純資産合計: {
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    parentAccountId: "li-eq-total",
    isCredit: true, // 純資産科目
    // パラメータは共通プロパティ
    parameter: null,
    stockAttributes: {
      generatesCFItem: false, // 集計科目はCF項目生成対象外
    },
    flowAttributes: null,
  },
  負債及び純資産合計: {
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    parentAccountId: null,
    isCredit: true, // 負債・純資産科目
    // パラメータは共通プロパティ
    parameter: null,
    stockAttributes: {
      generatesCFItem: false, // 集計科目はCF項目生成対象外
    },
    flowAttributes: null,
  },
  // CAPEX項目
  有形資産投資: {
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PPE,
    },
    parentAccountId: "capex-total",
    isCredit: true,
    // パラメータは共通プロパティ
    parameter: {
      paramType: PARAMETER_TYPES.PERCENTAGE,
      paramValue: 0.05,
      paramReferences: {
        accountId: "rev-total",
        operation: OPERATIONS.MUL,
        lag: 0,
      },
    },
    stockAttributes: null,
    flowAttributes: {
      reclassification: null,
      baseProfit: false,
      cfAdjustment: {
        operation: OPERATIONS.ADD,
        targetAccountId: "account-19",
        cfCategory: CF_CATEGORIES.INVESTING,
      },
    },
  },
  無形資産投資: {
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PPE,
    },
    parentAccountId: "capex-total",
    isCredit: true,
    // パラメータは共通プロパティ
    parameter: {
      paramType: PARAMETER_TYPES.PERCENTAGE,
      paramValue: 0.02,
      paramReferences: {
        accountId: "rev-total",
        operation: OPERATIONS.MUL,
        lag: 0,
      },
    },
    stockAttributes: null,
    flowAttributes: {
      reclassification: null,
      baseProfit: false,
      cfAdjustment: {
        operation: OPERATIONS.ADD,
        targetAccountId: "account-20",
        cfCategory: CF_CATEGORIES.INVESTING,
      },
    },
  },
  設備投資合計: {
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PPE,
    },
    parentAccountId: null,
    isCredit: null, // PPE項目
    // パラメータは共通プロパティ
    parameter: {
      paramType: PARAMETER_TYPES.CHILDREN_SUM,
      paramValue: null,
      paramReferences: null,
    },
    stockAttributes: null,
    flowAttributes: {
      reclassification: null,
      baseProfit: false,
      cfAdjustment: null,
    },
  },
};

// モデルの勘定科目リスト（元の勘定科目 + 集計科目）
export const MODEL_ACCOUNTS = [
  "売上高1",
  "売上高2",
  "売上原価1",
  "売上原価2",
  "人件費",
  "広告宣伝費",
  "物件費",
  "減価償却費_PL",
  "無形固定資産償却費_PL",
  "その他償却費1",
  "その他償却費2",
  "その他販管費",
  "現預金",
  "売掛金",
  "棚卸資産",
  "その他流動資産",
  "償却資産1",
  "償却資産2",
  "その他固定資産",
  "買掛金",
  "支払手形",
  "その他流動負債",
  "長期借入金",
  "その他固定負債",
  "資本金等",
  "利益剰余金等",
  "固定資産投資1",
  "固定資産投資2",
  "減価償却費_CF",
  "無形固定資産償却費_CF",
];
