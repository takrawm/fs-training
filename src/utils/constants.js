// 最初にインポートする対象シートの定義（キャッシュフロー計算書は最初インポート対象外）
export const TARGET_SHEETS = ["PL", "BS", "CAPEX"];

// ========== 新規追加：シートタイプの定数定義 ==========
export const SHEET_TYPES = {
  STOCK: "stock",
  FLOW: "flow",
};

export const FLOW_SHEETS = {
  PL: "pl",
  PPE: "ppe",
  FINANCING: "financing",
};

export const STOCK_SHEETS = {
  BS: "bs",
};

// BSタイプの定義（借方/貸方の判定用）
export const BS_TYPES = {
  ASSET: "ASSET",
  LIABILITY_EQUITY: "LIABILITY_EQUITY",
  CASH: "CASH", // 新規追加：現預金専用タイプ
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
  PERCENTAGE: "他科目割合",
  PROPORTIONATE: "他科目連動",
  FIXED_VALUE: "横置き",
  CHILDREN_SUM: "合計値",
  CALCULATION: "個別計算",
  REFERENCE: "参照",
  CASH_CALCULATION: "現預金計算",
  BS_CHANGE: "BS変動",
  CF_ADJUSTMENT_CALC: "CF調整計算",
};

export const CF_ADJUSTMENT_TYPE = {
  BS_MAPPING: "BS_MAPPING",
  RECLASSIFICATION: "RECLASSIFICATION",
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

// 集計用勘定科目の定義（構造を改善）
export const SUMMARY_ACCOUNTS = {
  // PLアカウント
  売上高合計: {
    id: "rev-total",
    accountName: "売上高合計",
    parentAccountId: null,
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PL,
    },
    stockAttributes: null,
    flowAttributes: {
      parameter: {
        paramType: PARAMETER_TYPES.CHILDREN_SUM,
        paramValue: null,
        paramReferences: null,
      },
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
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PL,
    },
    stockAttributes: null,
    flowAttributes: {
      parameter: {
        paramType: PARAMETER_TYPES.CHILDREN_SUM,
        paramValue: null,
        paramReferences: null,
      },
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
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PL,
    },
    stockAttributes: null,
    flowAttributes: {
      parameter: {
        paramType: PARAMETER_TYPES.CALCULATION,
        paramValue: null,
        paramReferences: [
          { accountId: "rev-total", operation: OPERATIONS.ADD, lag: 0 },
          { accountId: "cogs-total", operation: OPERATIONS.SUB, lag: 0 },
        ],
      },
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
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PL,
    },
    stockAttributes: null,
    flowAttributes: {
      parameter: {
        paramType: PARAMETER_TYPES.CHILDREN_SUM,
        paramValue: null,
        paramReferences: null,
      },
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
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PL,
    },
    stockAttributes: null,
    flowAttributes: {
      parameter: {
        paramType: PARAMETER_TYPES.CALCULATION,
        paramValue: null,
        paramReferences: [
          { accountId: "gross-profit", operation: OPERATIONS.ADD, lag: 0 },
          { accountId: "sga-total", operation: OPERATIONS.SUB, lag: 0 },
        ],
      },
      cfAdjustment: null,
    },
    displayOrder: {
      order: "E99",
      prefix: "E",
    },
  },

  // BSアカウント
  流動資産合計: {
    id: "current-asset-total",
    accountName: "流動資産合計",
    parentAccountId: "asset-total",
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    stockAttributes: {
      bsType: BS_TYPES.ASSET,
      isParameterBased: false,
      parameter: {
        paramType: PARAMETER_TYPES.CHILDREN_SUM,
        paramValue: null,
        paramReferences: null,
      },
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
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    stockAttributes: {
      bsType: BS_TYPES.ASSET,
      isParameterBased: false,
      parameter: {
        paramType: PARAMETER_TYPES.CHILDREN_SUM,
        paramValue: null,
        paramReferences: null,
      },
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
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    stockAttributes: {
      bsType: BS_TYPES.ASSET,
      isParameterBased: false,
      parameter: {
        paramType: PARAMETER_TYPES.CHILDREN_SUM,
        paramValue: null,
        paramReferences: null,
      },
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
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    stockAttributes: {
      bsType: BS_TYPES.LIABILITY_EQUITY,
      isParameterBased: false,
      parameter: {
        paramType: PARAMETER_TYPES.CHILDREN_SUM,
        paramValue: null,
        paramReferences: null,
      },
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
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    stockAttributes: {
      bsType: BS_TYPES.LIABILITY_EQUITY,
      isParameterBased: false,
      parameter: {
        paramType: PARAMETER_TYPES.CHILDREN_SUM,
        paramValue: null,
        paramReferences: null,
      },
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
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    stockAttributes: {
      bsType: BS_TYPES.LIABILITY_EQUITY,
      isParameterBased: false,
      parameter: {
        paramType: PARAMETER_TYPES.CHILDREN_SUM,
        paramValue: null,
        paramReferences: null,
      },
    },
    flowAttributes: null,
    displayOrder: {
      order: "K99",
      prefix: "K",
    },
  },
  純資産合計: {
    id: "equity-total",
    accountName: "純資産合計",
    parentAccountId: "li-eq-total",
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    stockAttributes: {
      bsType: BS_TYPES.LIABILITY_EQUITY,
      isParameterBased: false,
      parameter: {
        paramType: PARAMETER_TYPES.CHILDREN_SUM,
        paramValue: null,
        paramReferences: null,
      },
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
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    stockAttributes: {
      bsType: BS_TYPES.LIABILITY_EQUITY,
      isParameterBased: false,
      parameter: {
        paramType: PARAMETER_TYPES.CHILDREN_SUM,
        paramValue: null,
        paramReferences: null,
      },
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
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PPE,
    },
    stockAttributes: null,
    flowAttributes: {
      parameter: {
        paramType: PARAMETER_TYPES.CHILDREN_SUM,
        paramValue: null,
        paramReferences: null,
      },
      cfAdjustment: null,
    },
    displayOrder: {
      order: "Q99",
      prefix: "Q",
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
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.FINANCING,
    },
    stockAttributes: null,
    flowAttributes: {
      // parameterは使用しない（CF項目は派生的存在のため）
      parameter: null,
      cfAdjustment: null,

      // CF項目専用の属性
      cfItemAttributes: {
        cfItemType: "PL_ADJUSTMENT",
        sourceAccount: {
          accountId: "op-profit",
          accountName: "営業利益",
        },
        calculationMethod: "DERIVED",
        cfImpact: {
          multiplier: 1, // PLの値をそのまま使用
          formula: "営業利益[当期] × 1",
          description: "PL項目をCFに転記",
        },
      },
    },
    displayOrder: {
      order: "CF01",
      prefix: "CF",
    },
  },
};

// 勘定科目デフォルトシートタイプマッピング（構造を改善）
export const DEFAULT_SHEET_TYPES = {
  商品売上: {
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PL,
    },
    parentAccountId: "rev-total",
    stockAttributes: null,
    flowAttributes: {
      parameter: {
        paramType: PARAMETER_TYPES.GROWTH_RATE,
        paramValue: 0.05,
        paramReferences: null,
      },
      cfAdjustment: null,
    },
  },
  サービス売上: {
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PL,
    },
    parentAccountId: "rev-total",
    stockAttributes: null,
    flowAttributes: {
      parameter: {
        paramType: PARAMETER_TYPES.GROWTH_RATE,
        paramValue: 0.05,
        paramReferences: null,
      },
      cfAdjustment: null,
    },
  },
  その他売上: {
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PL,
    },
    parentAccountId: "rev-total",
    stockAttributes: null,
    flowAttributes: {
      parameter: {
        paramType: PARAMETER_TYPES.GROWTH_RATE,
        paramValue: 0.05,
        paramReferences: null,
      },
      cfAdjustment: null,
    },
  },
  売上高合計: {
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PL,
    },
    parentAccountId: null,
    stockAttributes: null,
    flowAttributes: {
      parameter: {
        paramType: PARAMETER_TYPES.CHILDREN_SUM,
        paramValue: null,
        paramReferences: null,
      },
      cfAdjustment: null,
    },
  },
  材料費: {
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PL,
    },
    parentAccountId: "cogs-total",
    stockAttributes: null,
    flowAttributes: {
      parameter: {
        paramType: PARAMETER_TYPES.PROPORTIONATE,
        paramValue: null,
        paramReferences: {
          accountId: "rev-total",
          operation: OPERATIONS.MUL,
          lag: 0,
        },
      },
      cfAdjustment: null,
    },
  },
  労務費: {
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PL,
    },
    parentAccountId: "cogs-total",
    stockAttributes: null,
    flowAttributes: {
      parameter: {
        paramType: PARAMETER_TYPES.FIXED_VALUE,
        paramValue: null,
        paramReferences: null,
      },
      cfAdjustment: null,
    },
  },
  売上原価合計: {
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PL,
    },
    parentAccountId: null,
    stockAttributes: null,
    flowAttributes: {
      parameter: {
        paramType: PARAMETER_TYPES.CHILDREN_SUM,
        paramValue: null,
        paramReferences: null,
      },
      cfAdjustment: null,
    },
  },
  売上総利益: {
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PL,
    },
    parentAccountId: null,
    stockAttributes: null,
    flowAttributes: {
      parameter: {
        paramType: PARAMETER_TYPES.CALCULATION,
        paramValue: null,
        paramReferences: [
          { accountId: "rev-total", operation: OPERATIONS.ADD, lag: 0 },
          { accountId: "cogs-total", operation: OPERATIONS.SUB, lag: 0 },
        ],
      },
      cfAdjustment: null,
    },
  },
  人件費: {
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PL,
    },
    parentAccountId: "sga-total",
    stockAttributes: null,
    flowAttributes: {
      parameter: {
        paramType: PARAMETER_TYPES.FIXED_VALUE,
        paramValue: null,
        paramReferences: null,
      },
      cfAdjustment: null,
    },
  },
  物流費: {
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PL,
    },
    parentAccountId: "sga-total",
    stockAttributes: null,
    flowAttributes: {
      parameter: {
        paramType: PARAMETER_TYPES.PROPORTIONATE,
        paramValue: null,
        paramReferences: {
          accountId: "rev-total",
          operation: OPERATIONS.MUL,
          lag: 0,
        },
      },
      cfAdjustment: null,
    },
  },
  減価償却費_PL: {
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PL,
    },
    parentAccountId: "sga-total",
    stockAttributes: null,
    flowAttributes: {
      parameter: {
        paramType: PARAMETER_TYPES.FIXED_VALUE,
        paramValue: null,
        paramReferences: null,
      },
      cfAdjustment: {
        type: CF_ADJUSTMENT_TYPE.BS_MAPPING,
        targetAccountId: "account-19", //有形固定資産
        operation: OPERATIONS.SUB,
        cfCategory: CF_CATEGORIES.OPERATING,
      },
    },
  },
  無形固定資産償却費_PL: {
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PL,
    },
    parentAccountId: "sga-total",
    stockAttributes: null,
    flowAttributes: {
      parameter: {
        paramType: PARAMETER_TYPES.FIXED_VALUE,
        paramValue: null,
        paramReferences: null,
      },
      cfAdjustment: null,
    },
  },
  その他販管費: {
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PL,
    },
    parentAccountId: "sga-total",
    stockAttributes: null,
    flowAttributes: {
      parameter: {
        paramType: PARAMETER_TYPES.PERCENTAGE,
        paramValue: 0.02,
        paramReferences: {
          accountId: "rev-total",
          operation: OPERATIONS.MUL,
          lag: 0,
        },
      },
      cfAdjustment: null,
    },
  },
  販管費合計: {
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PL,
    },
    parentAccountId: null,
    stockAttributes: null,
    flowAttributes: {
      parameter: {
        paramType: PARAMETER_TYPES.CHILDREN_SUM,
        paramValue: null,
        paramReferences: null,
      },
      cfAdjustment: null,
    },
  },
  営業利益: {
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PL,
    },
    parentAccountId: null,
    stockAttributes: null,
    flowAttributes: {
      parameter: {
        paramType: PARAMETER_TYPES.CALCULATION,
        paramValue: null,
        paramReferences: [
          { accountId: "gross-profit", operation: OPERATIONS.ADD, lag: 0 },
          { accountId: "sga-total", operation: OPERATIONS.SUB, lag: 0 },
        ],
      },
      cfAdjustment: null,
    },
  },
  現預金: {
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    parentAccountId: "current-asset-total",
    stockAttributes: {
      bsType: BS_TYPES.CASH, // ASSETからCASHに変更
      isParameterBased: true,
      parameter: {
        paramType: PARAMETER_TYPES.CASH_CALCULATION,
        paramValue: null,
        paramReferences: null,
      },
    },
    flowAttributes: null,
  },
  売掛金: {
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    parentAccountId: "current-asset-total",
    stockAttributes: {
      bsType: BS_TYPES.ASSET,
      isParameterBased: true,
      parameter: {
        paramType: PARAMETER_TYPES.PROPORTIONATE,
        paramValue: null,
        paramReferences: {
          accountId: "rev-total",
          operation: OPERATIONS.MUL,
          lag: 0,
        },
      },
    },
    flowAttributes: null,
  },
  棚卸資産: {
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    parentAccountId: "current-asset-total",
    stockAttributes: {
      bsType: BS_TYPES.ASSET,
      isParameterBased: true,
      parameter: {
        paramType: PARAMETER_TYPES.GROWTH_RATE,
        paramValue: 0.03,
        paramReferences: null,
      },
    },
    flowAttributes: null,
  },
  流動資産合計: {
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    parentAccountId: "asset-total",
    stockAttributes: {
      bsType: BS_TYPES.ASSET,
      isParameterBased: false,
      parameter: null,
    },
    flowAttributes: null,
  },
  有形固定資産: {
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    parentAccountId: "fixed-asset-total",
    stockAttributes: {
      bsType: BS_TYPES.ASSET,
      isParameterBased: false,
      parameter: null,
    },
    flowAttributes: null,
  },
  無形固定資産: {
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    parentAccountId: "fixed-asset-total",
    stockAttributes: {
      bsType: BS_TYPES.ASSET,
      isParameterBased: true,
      parameter: null,
    },
    flowAttributes: null,
  },
  固定資産合計: {
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    parentAccountId: "asset-total",
    stockAttributes: {
      bsType: BS_TYPES.ASSET,
      isParameterBased: false,
      parameter: null,
    },
    flowAttributes: null,
  },
  資産合計: {
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    parentAccountId: null,
    stockAttributes: {
      bsType: BS_TYPES.ASSET,
      isParameterBased: false,
      parameter: null,
    },
    flowAttributes: null,
  },
  買掛金: {
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    parentAccountId: "current-liability-total",
    stockAttributes: {
      bsType: BS_TYPES.LIABILITY_EQUITY,
      isParameterBased: true,
      parameter: {
        paramType: PARAMETER_TYPES.PROPORTIONATE,
        paramValue: null,
        paramReferences: {
          accountId: "rev-total",
          operation: OPERATIONS.MUL,
          lag: 0,
        },
      },
    },
    flowAttributes: null,
  },
  支払手形: {
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    parentAccountId: "current-liability-total",
    stockAttributes: {
      bsType: BS_TYPES.LIABILITY_EQUITY,
      isParameterBased: true,
      parameter: {
        paramType: PARAMETER_TYPES.PROPORTIONATE,
        paramValue: null,
        paramReferences: {
          accountId: "rev-total",
          operation: OPERATIONS.MUL,
          lag: 0,
        },
      },
    },
    flowAttributes: null,
  },
  流動負債合計: {
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    parentAccountId: "liability-total",
    stockAttributes: {
      bsType: BS_TYPES.LIABILITY_EQUITY,
      isParameterBased: false,
      parameter: null,
    },
    flowAttributes: null,
  },
  長期借入金: {
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    parentAccountId: "fixed-liability-total",
    stockAttributes: {
      bsType: BS_TYPES.LIABILITY_EQUITY,
      isParameterBased: true,
      parameter: {
        paramType: PARAMETER_TYPES.GROWTH_RATE,
        paramValue: 0.02,
        paramReferences: null,
      },
    },
    flowAttributes: null,
  },
  社債: {
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    parentAccountId: "fixed-liability-total",
    stockAttributes: {
      bsType: BS_TYPES.LIABILITY_EQUITY,
      isParameterBased: true,
      parameter: {
        paramType: PARAMETER_TYPES.FIXED_VALUE,
        paramValue: null,
        paramReferences: null,
      },
    },
    flowAttributes: null,
  },
  固定負債合計: {
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    parentAccountId: "liability-total",
    stockAttributes: {
      bsType: BS_TYPES.LIABILITY_EQUITY,
      isParameterBased: false,
      parameter: null,
    },
    flowAttributes: null,
  },
  負債合計: {
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    parentAccountId: "li-eq-total",
    stockAttributes: {
      bsType: BS_TYPES.LIABILITY_EQUITY,
      isParameterBased: false,
      parameter: null,
    },
    flowAttributes: null,
  },
  資本金: {
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    parentAccountId: "equity-total",
    stockAttributes: {
      bsType: BS_TYPES.LIABILITY_EQUITY,
      isParameterBased: true,
      parameter: {
        paramType: PARAMETER_TYPES.FIXED_VALUE,
        paramValue: null,
        paramReferences: null,
      },
    },
    flowAttributes: null,
  },
  利益剰余金: {
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    parentAccountId: "equity-total",
    stockAttributes: {
      bsType: BS_TYPES.LIABILITY_EQUITY,
      isParameterBased: true,
      parameter: null,
    },
    flowAttributes: null,
  },
  純資産合計: {
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    parentAccountId: "li-eq-total",
    stockAttributes: {
      bsType: BS_TYPES.LIABILITY_EQUITY,
      isParameterBased: false,
      parameter: null,
    },
    flowAttributes: null,
  },
  負債及び純資産合計: {
    sheet: {
      sheetType: SHEET_TYPES.STOCK,
      name: STOCK_SHEETS.BS,
    },
    parentAccountId: null,
    stockAttributes: {
      bsType: BS_TYPES.LIABILITY_EQUITY,
      isParameterBased: false,
      parameter: null,
    },
    flowAttributes: null,
  },
  有形資産投資: {
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PPE,
    },
    parentAccountId: "capex-total",
    stockAttributes: null,
    flowAttributes: {
      parameter: {
        paramType: PARAMETER_TYPES.FIXED_VALUE,
        paramValue: null,
        paramReferences: null,
      },
      cfAdjustment: {
        type: CF_ADJUSTMENT_TYPE.BS_MAPPING,
        targetAccountId: "account-19", //有形固定資産
        operation: OPERATIONS.ADD,
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
    stockAttributes: null,
    flowAttributes: {
      parameter: {
        paramType: PARAMETER_TYPES.PROPORTIONATE,
        paramValue: null,
        paramReferences: {
          accountId: "rev-total",
          operation: OPERATIONS.MUL,
          lag: 0,
        },
      },
      cfAdjustment: null,
    },
  },
  設備投資合計: {
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.PPE,
    },
    parentAccountId: null,
    stockAttributes: null,
    flowAttributes: {
      parameter: {
        paramType: PARAMETER_TYPES.CHILDREN_SUM,
        paramValue: null,
        paramReferences: null,
      },
      cfAdjustment: null,
    },
  },
  // 営業利益_CF: {
  //   sheet: {
  //     sheetType: SHEET_TYPES.FLOW,
  //     name: FLOW_SHEETS.FINANCING,
  //   },
  //   parentAccountId: "ope-cf-total",
  //   stockAttributes: null,
  //   flowAttributes: {
  //     parameter: {
  //       paramType: PARAMETER_TYPES.REFERENCE,
  //       paramValue: null,
  //       paramReferences: {
  //         accountId: "op-profit",
  //         operation: OPERATIONS.ADD,
  //         lag: 0,
  //       },
  //     },
  //     cfAdjustment: {
  //       category: CF_CATEGORIES.OPERATING,
  //     },
  //   },
  // },
  // 減価償却費_CF: {
  //   sheet: {
  //     sheetType: SHEET_TYPES.FLOW,
  //     name: FLOW_SHEETS.FINANCING,
  //   },
  //   parentAccountId: "ope-cf-total",
  //   stockAttributes: null,
  //   flowAttributes: {
  //     parameter: {
  //       paramType: PARAMETER_TYPES.REFERENCE,
  //       paramValue: null,
  //       paramReferences: {
  //         accountId: "depreciation-pl",
  //         operation: OPERATIONS.ADD,
  //         lag: 0,
  //       },
  //     },
  //     cfAdjustment: {
  //       category: CF_CATEGORIES.OPERATING,
  //     },
  //   },
  // },
  // 無形固定資産償却費_CF: {
  //   sheet: {
  //     sheetType: SHEET_TYPES.FLOW,
  //     name: FLOW_SHEETS.FINANCING,
  //   },
  //   parentAccountId: "ope-cf-total",
  //   stockAttributes: null,
  //   flowAttributes: {
  //     parameter: {
  //       paramType: PARAMETER_TYPES.REFERENCE,
  //       paramValue: null,
  //       paramReferences: {
  //         accountId: "intangible-depreciation-pl",
  //         operation: OPERATIONS.ADD,
  //         lag: 0,
  //       },
  //     },
  //     cfAdjustment: {
  //       category: CF_CATEGORIES.OPERATING,
  //     },
  //   },
  // },
  // 運転資本増減: {
  //   sheet: {
  //     sheetType: SHEET_TYPES.FLOW,
  //     name: FLOW_SHEETS.FINANCING,
  //   },
  //   parentAccountId: "ope-cf-total",
  //   stockAttributes: null,
  //   flowAttributes: {
  //     parameter: {
  //       paramType: PARAMETER_TYPES.CALCULATION,
  //       paramValue: null,
  //       paramReferences: null,
  //     },
  //     cfAdjustment: {
  //       category: CF_CATEGORIES.OPERATING,
  //     },
  //   },
  // },
  // 営業CF合計: {
  //   sheet: {
  //     sheetType: SHEET_TYPES.FLOW,
  //     name: FLOW_SHEETS.FINANCING,
  //   },
  //   parentAccountId: null,
  //   stockAttributes: null,
  //   flowAttributes: {
  //     parameter: {
  //       paramType: PARAMETER_TYPES.CHILDREN_SUM,
  //       paramValue: null,
  //       paramReferences: null,
  //     },
  //     cfAdjustment: {
  //       category: CF_CATEGORIES.OPERATING,
  //     },
  //   },
  // },
  // 設備投資合計_CF: {
  //   sheet: {
  //     sheetType: SHEET_TYPES.FLOW,
  //     name: FLOW_SHEETS.FINANCING,
  //   },
  //   parentAccountId: "inv-cf-total",
  //   stockAttributes: null,
  //   flowAttributes: {
  //     parameter: {
  //       paramType: PARAMETER_TYPES.REFERENCE,
  //       paramValue: null,
  //       paramReferences: {
  //         accountId: "capex-total",
  //         operation: OPERATIONS.SUB,
  //         lag: 0,
  //       },
  //     },
  //     cfAdjustment: {
  //       category: CF_CATEGORIES.INVESTING,
  //     },
  //   },
  // },
  // 投資CF合計: {
  //   sheet: {
  //     sheetType: SHEET_TYPES.FLOW,
  //     name: FLOW_SHEETS.FINANCING,
  //   },
  //   parentAccountId: null,
  //   stockAttributes: null,
  //   flowAttributes: {
  //     parameter: {
  //       paramType: PARAMETER_TYPES.CHILDREN_SUM,
  //       paramValue: null,
  //       paramReferences: null,
  //     },
  //     cfAdjustment: {
  //       category: CF_CATEGORIES.INVESTING,
  //     },
  //   },
  // },
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
