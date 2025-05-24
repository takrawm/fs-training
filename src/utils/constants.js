// 対象シートの定義
export const TARGET_SHEETS = ["PL", "BS", "CAPEX", "CS"];

// パラメータタイプの選択肢
export const PARAMETER_TYPES = {
  NONE: "なし",
  GROWTH_RATE: "成長率",
  PERCENTAGE: "他科目割合",
  PROPORTIONATE: "他科目連動",
  FIXED_VALUE: "横置き",
  CHILDREN_SUM: "合計値",
  REFERENCE: "個別参照",
  BALANCE_AND_CHANGE: "期末残高+/-変動",
};

// パラメータタイプの選択肢
export const PARAM_OP_MAPPING = {
  [PARAMETER_TYPES.GROWTH_RATE]: ["CONST"],
  [PARAMETER_TYPES.PERCENTAGE]: ["CONST"],
  [PARAMETER_TYPES.REFERENCE]: ["ADD", "SUB"],
  [PARAMETER_TYPES.BALANCE_AND_CHANGE]: ["ADD", "SUB"],
};

export const DEFAULT_PARAMETER_VALUES = {
  GROWTH_RATE: 0.05,
  PERCENTAGE: 0.02,
};

// リレーションタイプの定義
export const RELATION_TYPES = {
  NONE: null,
  PPE: "PPE",
  RETAINED_EARNINGS: "RETAINED_EARNINGS",
  WORKING_CAPITAL: "WORKING_CAPITAL",
};

// リレーションサブタイプの定義
export const RELATION_SUB_TYPES = {
  PROFIT: "PROFIT",
  ASSET: "ASSET",
  FIXED_ASSET: "FIXED_ASSET",
  INVESTMENT: "INVESTMENT",
  DEPRECIATION: "DEPRECIATION",
  RETAINED: "RETAINED",
  DIVIDEND: "DIVIDEND",
  WC_ASSET: "WC_ASSET",
  WC_LIABILITY: "WC_LIABILITY",
};

// 集計用勘定科目の定義
export const SUMMARY_ACCOUNTS = {
  // PLアカウント
  売上高合計: {
    id: "rev-total",
    accountName: "売上高合計",
    sheetType: "PL",
    parentAccount: "SUMMARY_ACCOUNTS",
    parameterType: PARAMETER_TYPES.CHILDREN_SUM,
    order: "A99",
    prefix: "A",
    relation: { type: RELATION_TYPES.NONE, subType: null },
  },
  売上原価合計: {
    id: "cogs-total",
    accountName: "売上原価合計",
    sheetType: "PL",
    parentAccount: "SUMMARY_ACCOUNTS",
    parameterType: PARAMETER_TYPES.CHILDREN_SUM,
    order: "B99",
    prefix: "B",
    relation: { type: RELATION_TYPES.NONE, subType: null },
  },
  売上総利益: {
    id: "gross-profit",
    accountName: "売上総利益",
    sheetType: "PL",
    parentAccount: "SUMMARY_ACCOUNTS",
    calculationType: "ACCOUNT_CALC",
    parameterType: PARAMETER_TYPES.REFERENCE,
    order: "C99",
    prefix: "C",
    relation: { type: RELATION_TYPES.NONE, subType: null },
    dependencies: {
      depends_on: ["rev-total", "cogs-total"],
    },
    parameterReferenceAccounts: [
      {
        id: "rev-total",
        operation: "ADD",
      },
      {
        id: "cogs-total",
        operation: "SUB",
      },
    ],
  },
  販管費合計: {
    id: "sga-total",
    accountName: "販管費合計",
    sheetType: "PL",
    parentAccount: "SUMMARY_ACCOUNTS",
    parameterType: PARAMETER_TYPES.CHILDREN_SUM,
    order: "D99",
    prefix: "D",
    relation: { type: RELATION_TYPES.NONE, subType: null },
  },
  営業利益: {
    id: "op-profit",
    accountName: "営業利益",
    sheetType: "PL",
    parentAccount: "SUMMARY_ACCOUNTS",
    calculationType: "ACCOUNT_CALC",
    parameterType: PARAMETER_TYPES.REFERENCE,
    order: "E99",
    prefix: "E",
    relation: {
      type: RELATION_TYPES.RETAINED_EARNINGS,
      subType: RELATION_SUB_TYPES.PROFIT,
    },
    dependencies: {
      depends_on: ["gross-profit", "sga-total"],
    },
    parameterReferenceAccounts: [
      {
        id: "gross-profit",
        operation: "ADD",
      },
      {
        id: "sga-total",
        operation: "SUB",
      },
    ],
  },

  // BSアカウント - 親子関係の階層構造を明確化
  流動資産合計: {
    id: "current-asset-total",
    accountName: "流動資産合計",
    sheetType: "BS",
    parentAccount: "資産合計",
    parameterType: PARAMETER_TYPES.CHILDREN_SUM,
    order: "F99",
    prefix: "F",
    relation: { type: RELATION_TYPES.NONE, subType: null },
  },
  固定資産合計: {
    id: "fixed-asset-total",
    accountName: "固定資産合計",
    sheetType: "BS",
    parentAccount: "資産合計",
    parameterType: PARAMETER_TYPES.CHILDREN_SUM,
    order: "G99",
    prefix: "G",
    relation: { type: RELATION_TYPES.NONE, subType: null },
  },
  資産合計: {
    id: "asset-total",
    accountName: "資産合計",
    sheetType: "BS",
    parentAccount: "SUMMARY_ACCOUNTS",
    parameterType: PARAMETER_TYPES.CHILDREN_SUM,
    order: "H99",
    prefix: "H",
    relation: { type: RELATION_TYPES.NONE, subType: null },
  },
  流動負債合計: {
    id: "current-liability-total",
    accountName: "流動負債合計",
    sheetType: "BS",
    parentAccount: "負債合計",
    parameterType: PARAMETER_TYPES.CHILDREN_SUM,
    order: "I99",
    prefix: "I",
    relation: { type: RELATION_TYPES.NONE, subType: null },
  },
  固定負債合計: {
    id: "fixed-liability-total",
    accountName: "固定負債合計",
    sheetType: "BS",
    parentAccount: "負債合計",
    parameterType: PARAMETER_TYPES.CHILDREN_SUM,
    order: "J99",
    prefix: "J",
    relation: { type: RELATION_TYPES.NONE, subType: null },
  },
  負債合計: {
    id: "liability-total",
    accountName: "負債合計",
    sheetType: "BS",
    parentAccount: "負債及び純資産合計",
    parameterType: PARAMETER_TYPES.CHILDREN_SUM,
    order: "K99",
    prefix: "K",
    relation: { type: RELATION_TYPES.NONE, subType: null },
  },
  純資産合計: {
    id: "equity-total",
    accountName: "純資産合計",
    sheetType: "BS",
    parentAccount: "負債及び純資産合計",
    parameterType: PARAMETER_TYPES.CHILDREN_SUM,
    order: "N99",
    prefix: "N",
    relation: { type: RELATION_TYPES.NONE, subType: null },
  },
  負債及び純資産合計: {
    id: "li-eq-total",
    accountName: "負債及び純資産合計",
    sheetType: "BS",
    parentAccount: "SUMMARY_ACCOUNTS",
    parameterType: PARAMETER_TYPES.CHILDREN_SUM,
    order: "O99",
    prefix: "O",
    relation: { type: RELATION_TYPES.NONE, subType: null },
  },

  // CAPEXアカウント
  設備投資合計: {
    id: "capex-total",
    accountName: "設備投資合計",
    sheetType: "CAPEX",
    parentAccount: "SUMMARY_ACCOUNTS",
    parameterType: PARAMETER_TYPES.CHILDREN_SUM,
    order: "Q99",
    prefix: "Q",
    relation: { type: RELATION_TYPES.NONE, subType: null },
  },

  // CFアカウント
  営業CF合計: {
    id: "ope-cf-total",
    accountName: "営業CF合計",
    sheetType: "CF",
    parentAccount: "SUMMARY_ACCOUNTS",
    parameterType: PARAMETER_TYPES.CHILDREN_SUM,
    order: "R99",
    prefix: "R",
    relation: { type: RELATION_TYPES.NONE, subType: null },
  },
  投資CF合計: {
    id: "inv-cf-total",
    accountName: "投資CF合計",
    sheetType: "CF",
    parentAccount: "SUMMARY_ACCOUNTS",
    parameterType: PARAMETER_TYPES.CHILDREN_SUM,
    order: "S99",
    prefix: "S",
    relation: { type: RELATION_TYPES.NONE, subType: null },
  },
};

// 勘定科目デフォルトシートタイプマッピング
export const DEFAULT_SHEET_TYPES = {
  商品売上: {
    sheetType: "PL",
    parentAccount: "売上高合計",
    parameterType: PARAMETER_TYPES.GROWTH_RATE,
    relation: { type: RELATION_TYPES.NONE, subType: null },
  },
  サービス売上: {
    sheetType: "PL",
    parentAccount: "売上高合計",
    parameterType: PARAMETER_TYPES.GROWTH_RATE,
    relation: { type: RELATION_TYPES.NONE, subType: null },
  },
  その他売上: {
    sheetType: "PL",
    parentAccount: "売上高合計",
    parameterType: PARAMETER_TYPES.GROWTH_RATE,
    relation: { type: RELATION_TYPES.NONE, subType: null },
  },
  売上高合計: {
    sheetType: "集約科目",
    parentAccount: "集約科目",
    parameterType: PARAMETER_TYPES.NONE,
    relation: { type: RELATION_TYPES.NONE, subType: null },
  },
  材料費: {
    sheetType: "PL",
    parentAccount: "売上原価合計",
    parameterType: PARAMETER_TYPES.PROPORTIONATE,
    relation: { type: RELATION_TYPES.NONE, subType: null },
    parameterReferenceAccounts: [
      {
        id: "rev-total",
        operation: "MUL",
      },
    ],
  },
  労務費: {
    sheetType: "PL",
    parentAccount: "売上原価合計",
    parameterType: PARAMETER_TYPES.FIXED_VALUE,
    relation: { type: RELATION_TYPES.NONE, subType: null },
  },
  売上原価合計: {
    sheetType: "集約科目",
    parentAccount: "集約科目",
    parameterType: PARAMETER_TYPES.NONE,
    relation: { type: RELATION_TYPES.NONE, subType: null },
  },
  売上総利益: {
    sheetType: "集約科目",
    parentAccount: "集約科目",
    parameterType: PARAMETER_TYPES.NONE,
    relation: { type: RELATION_TYPES.NONE, subType: null },
  },
  人件費: {
    sheetType: "PL",
    parentAccount: "販管費合計",
    parameterType: PARAMETER_TYPES.FIXED_VALUE,
    relation: { type: RELATION_TYPES.NONE, subType: null },
  },
  物流費: {
    sheetType: "PL",
    parentAccount: "販管費合計",
    parameterType: PARAMETER_TYPES.PROPORTIONATE,
    relation: { type: RELATION_TYPES.NONE, subType: null },
    parameterReferenceAccounts: [
      {
        id: "rev-total",
        operation: "MUL",
      },
    ],
  },
  減価償却費_PL: {
    sheetType: "PL",
    parentAccount: "販管費合計",
    parameterType: PARAMETER_TYPES.FIXED_VALUE,
    relation: {
      type: RELATION_TYPES.PPE,
      subType: RELATION_SUB_TYPES.DEPRECIATION,
    },
  },
  無形固定資産償却費_PL: {
    sheetType: "PL",
    parentAccount: "販管費合計",
    parameterType: PARAMETER_TYPES.FIXED_VALUE,
    relation: {
      type: RELATION_TYPES.PPE,
      subType: RELATION_SUB_TYPES.DEPRECIATION,
    },
  },
  その他販管費: {
    sheetType: "PL",
    parentAccount: "販管費合計",
    parameterType: PARAMETER_TYPES.PERCENTAGE,
    relation: { type: RELATION_TYPES.NONE, subType: null },
    parameterReferenceAccounts: [
      {
        id: "rev-total",
        operation: "MUL",
      },
    ],
  },
  販管費合計: {
    sheetType: "集約科目",
    parentAccount: "集約科目",
    parameterType: PARAMETER_TYPES.NONE,
    relation: { type: RELATION_TYPES.NONE, subType: null },
  },
  営業利益: {
    sheetType: "集約科目",
    parentAccount: "集約科目",
    parameterType: PARAMETER_TYPES.NONE,
    relation: {
      type: RELATION_TYPES.RETAINED_EARNINGS,
      subType: RELATION_SUB_TYPES.PROFIT,
    },
  },
  現預金: {
    sheetType: "BS",
    parentAccount: "流動資産合計",
    parameterType: PARAMETER_TYPES.CHILDREN_SUM,
    relation: { type: RELATION_TYPES.NONE, subType: null },
    parameterReferenceAccounts: [
      {
        id: "rev-total",
        operation: "MUL",
      },
    ],
  },
  売掛金: {
    sheetType: "BS",
    parentAccount: "流動資産合計",
    parameterType: PARAMETER_TYPES.PROPORTIONATE,
    relation: {
      type: RELATION_TYPES.WORKING_CAPITAL,
      subType: RELATION_SUB_TYPES.WC_ASSET,
    },
    parameterReferenceAccounts: [
      {
        id: "rev-total",
        operation: "MUL",
      },
    ],
  },
  棚卸資産: {
    sheetType: "BS",
    parentAccount: "流動資産合計",
    parameterType: PARAMETER_TYPES.PROPORTIONATE,
    relation: {
      type: RELATION_TYPES.WORKING_CAPITAL,
      subType: RELATION_SUB_TYPES.WC_ASSET,
    },
    parameterReferenceAccounts: [
      {
        id: "rev-total",
        operation: "MUL",
      },
    ],
  },
  流動資産合計: {
    sheetType: "集約科目",
    parentAccount: "集約科目",
    parameterType: PARAMETER_TYPES.NONE,
    relation: { type: RELATION_TYPES.NONE, subType: null },
  },
  有形固定資産: {
    sheetType: "BS",
    parentAccount: "固定資産合計",
    parameterType: PARAMETER_TYPES.BALANCE_AND_CHANGE,
    calculationType: "ACCOUNT_CALC",
    relation: { type: RELATION_TYPES.PPE, subType: RELATION_SUB_TYPES.ASSET },
    parameterReferenceAccounts: [
      {
        id: "rev-total",
        operation: "MUL",
      },
    ],
  },
  無形固定資産: {
    sheetType: "BS",
    parentAccount: "固定資産合計",
    parameterType: PARAMETER_TYPES.BALANCE_AND_CHANGE,
    relation: { type: RELATION_TYPES.PPE, subType: RELATION_SUB_TYPES.ASSET },
    parameterReferenceAccounts: [
      {
        id: "rev-total",
        operation: "MUL",
      },
    ],
  },
  固定資産合計: {
    sheetType: "集約科目",
    parentAccount: "集約科目",
    parameterType: PARAMETER_TYPES.NONE,
    relation: { type: RELATION_TYPES.NONE, subType: null },
  },
  資産合計: {
    sheetType: "集約科目",
    parentAccount: "集約科目",
    parameterType: PARAMETER_TYPES.NONE,
    relation: { type: RELATION_TYPES.NONE, subType: null },
  },
  買掛金: {
    sheetType: "BS",
    parentAccount: "流動負債合計",
    parameterType: PARAMETER_TYPES.PROPORTIONATE,
    relation: {
      type: RELATION_TYPES.WORKING_CAPITAL,
      subType: RELATION_SUB_TYPES.WC_LIABILITY,
    },
    parameterReferenceAccounts: [
      {
        id: "rev-total",
        operation: "MUL",
      },
    ],
  },
  支払手形: {
    sheetType: "BS",
    parentAccount: "流動負債合計",
    parameterType: PARAMETER_TYPES.PROPORTIONATE,
    relation: {
      type: RELATION_TYPES.WORKING_CAPITAL,
      subType: RELATION_SUB_TYPES.WC_LIABILITY,
    },
    parameterReferenceAccounts: [
      {
        id: "rev-total",
        operation: "MUL",
      },
    ],
  },
  流動負債合計: {
    sheetType: "集約科目",
    parentAccount: "集約科目",
    parameterType: PARAMETER_TYPES.NONE,
    relation: { type: RELATION_TYPES.NONE, subType: null },
  },
  長期借入金: {
    sheetType: "BS",
    parentAccount: "固定負債合計",
    parameterType: PARAMETER_TYPES.PROPORTIONATE,
    relation: { type: RELATION_TYPES.NONE, subType: null },
    parameterReferenceAccounts: [
      {
        id: "rev-total",
        operation: "MUL",
      },
    ],
  },
  社債: {
    sheetType: "BS",
    parentAccount: "固定負債合計",
    parameterType: PARAMETER_TYPES.PROPORTIONATE,
    relation: { type: RELATION_TYPES.NONE, subType: null },
    parameterReferenceAccounts: [
      {
        id: "rev-total",
        operation: "MUL",
      },
    ],
  },
  固定負債合計: {
    sheetType: "集約科目",
    parentAccount: "集約科目",
    parameterType: PARAMETER_TYPES.NONE,
    relation: { type: RELATION_TYPES.NONE, subType: null },
  },
  負債合計: {
    sheetType: "集約科目",
    parentAccount: "集約科目",
    parameterType: PARAMETER_TYPES.NONE,
    relation: { type: RELATION_TYPES.NONE, subType: null },
  },
  資本金: {
    sheetType: "BS",
    parentAccount: "純資産合計",
    parameterType: PARAMETER_TYPES.FIXED_VALUE,
    relation: { type: RELATION_TYPES.NONE, subType: null },
  },
  利益剰余金: {
    sheetType: "BS",
    parentAccount: "純資産合計",
    parameterType: PARAMETER_TYPES.BALANCE_AND_CHANGE,
    relation: {
      type: RELATION_TYPES.RETAINED_EARNINGS,
      subType: RELATION_SUB_TYPES.RETAINED,
    },
    parameterReferenceAccounts: [
      {
        id: "op-profit",
        operation: "MUL",
      },
    ],
  },
  純資産合計: {
    sheetType: "集約科目",
    parentAccount: "集約科目",
    parameterType: PARAMETER_TYPES.NONE,
    relation: { type: RELATION_TYPES.NONE, subType: null },
  },
  負債及び純資産合計: {
    sheetType: "集約科目",
    parentAccount: "集約科目",
    parameterType: PARAMETER_TYPES.NONE,
    relation: { type: RELATION_TYPES.NONE, subType: null },
  },
  有形資産投資: {
    sheetType: "CAPEX",
    parentAccount: "設備投資合計",
    parameterType: PARAMETER_TYPES.PROPORTIONATE,
    relation: {
      type: RELATION_TYPES.PPE,
      subType: RELATION_SUB_TYPES.INVESTMENT,
    },
    parameterReferenceAccounts: [
      {
        id: "rev-total",
        operation: "MUL",
      },
    ],
  },
  無形資産投資: {
    sheetType: "CAPEX",
    parentAccount: "設備投資合計",
    parameterType: PARAMETER_TYPES.PROPORTIONATE,
    relation: {
      type: RELATION_TYPES.PPE,
      subType: RELATION_SUB_TYPES.INVESTMENT,
    },
    parameterReferenceAccounts: [
      {
        id: "rev-total",
        operation: "MUL",
      },
    ],
  },
  設備投資合計: {
    sheetType: "集約科目",
    parentAccount: "集約科目",
    parameterType: PARAMETER_TYPES.NONE,
    relation: { type: RELATION_TYPES.NONE, subType: null },
  },
  営業利益_CF: {
    sheetType: "集約科目",
    parentAccount: "営業CF合計",
    parameterType: PARAMETER_TYPES.NONE,
    relation: { type: RELATION_TYPES.NONE, subType: null },
  },
  減価償却費_CF: {
    sheetType: "CF",
    parentAccount: "営業CF合計",
    parameterType: PARAMETER_TYPES.NONE,
    relation: { type: RELATION_TYPES.NONE, subType: null },
  },
  無形固定資産償却費_CF: {
    sheetType: "CF",
    parentAccount: "営業CF合計",
    parameterType: PARAMETER_TYPES.NONE,
    relation: { type: RELATION_TYPES.NONE, subType: null },
  },
  運転資本増減: {
    sheetType: "CF",
    parentAccount: "営業CF合計",
    parameterType: PARAMETER_TYPES.NONE,
    relation: { type: RELATION_TYPES.NONE, subType: null },
  },
  営業CF合計: {
    sheetType: "集約科目",
    parentAccount: "集約科目",
    parameterType: PARAMETER_TYPES.NONE,
    relation: { type: RELATION_TYPES.NONE, subType: null },
  },
  設備投資合計_CF: {
    sheetType: "CF",
    parentAccount: "投資CF合計",
    parameterType: PARAMETER_TYPES.NONE,
    relation: { type: RELATION_TYPES.NONE, subType: null },
  },
  投資CF合計: {
    sheetType: "集約科目",
    parentAccount: "集約科目",
    parameterType: PARAMETER_TYPES.NONE,
    relation: { type: RELATION_TYPES.NONE, subType: null },
  },

  // MODEL_ACCOUNTSから追加された科目
  売上高1: {
    sheetType: "PL",
    parentAccount: "売上高合計",
    parameterType: PARAMETER_TYPES.GROWTH_RATE,
    relation: { type: RELATION_TYPES.NONE, subType: null },
  },
  売上高2: {
    sheetType: "PL",
    parentAccount: "売上高合計",
    parameterType: PARAMETER_TYPES.GROWTH_RATE,
    relation: { type: RELATION_TYPES.NONE, subType: null },
  },
  売上原価1: {
    sheetType: "PL",
    parentAccount: "売上原価合計",
    parameterType: PARAMETER_TYPES.PERCENTAGE,
    relation: { type: RELATION_TYPES.NONE, subType: null },
    parameterReferenceAccounts: [
      {
        id: "rev-total",
        operation: "MUL",
      },
    ],
  },
  売上原価2: {
    sheetType: "PL",
    parentAccount: "売上原価合計",
    parameterType: PARAMETER_TYPES.PERCENTAGE,
    relation: { type: RELATION_TYPES.NONE, subType: null },
    parameterReferenceAccounts: [
      {
        id: "rev-total",
        operation: "MUL",
      },
    ],
  },
  広告宣伝費: {
    sheetType: "PL",
    parentAccount: "販管費合計",
    parameterType: PARAMETER_TYPES.PERCENTAGE,
    relation: { type: RELATION_TYPES.NONE, subType: null },
    parameterReferenceAccounts: [
      {
        id: "rev-total",
        operation: "MUL",
      },
    ],
  },
  物件費: {
    sheetType: "PL",
    parentAccount: "販管費合計",
    parameterType: PARAMETER_TYPES.PERCENTAGE,
    relation: { type: RELATION_TYPES.NONE, subType: null },
    parameterReferenceAccounts: [
      {
        id: "rev-total",
        operation: "MUL",
      },
    ],
  },
  その他償却費1: {
    sheetType: "PL",
    parentAccount: "販管費合計",
    parameterType: PARAMETER_TYPES.PERCENTAGE,
    relation: {
      type: RELATION_TYPES.PPE,
      subType: RELATION_SUB_TYPES.DEPRECIATION,
    },
    parameterReferenceAccounts: [
      {
        id: "rev-total",
        operation: "MUL",
      },
    ],
  },
  その他償却費2: {
    sheetType: "PL",
    parentAccount: "販管費合計",
    parameterType: PARAMETER_TYPES.PERCENTAGE,
    relation: {
      type: RELATION_TYPES.PPE,
      subType: RELATION_SUB_TYPES.DEPRECIATION,
    },
    parameterReferenceAccounts: [
      {
        id: "rev-total",
        operation: "MUL",
      },
    ],
  },
  その他流動資産: {
    sheetType: "BS",
    parentAccount: "流動資産合計",
    parameterType: PARAMETER_TYPES.PROPORTIONATE,
    relation: { type: RELATION_TYPES.NONE, subType: null },
    parameterReferenceAccounts: [
      {
        id: "rev-total",
        operation: "MUL",
      },
    ],
  },
  償却資産1: {
    sheetType: "BS",
    parentAccount: "固定資産合計",
    parameterType: PARAMETER_TYPES.PROPORTIONATE,
    relation: { type: RELATION_TYPES.PPE, subType: RELATION_SUB_TYPES.ASSET },
    parameterReferenceAccounts: [
      {
        id: "rev-total",
        operation: "MUL",
      },
    ],
  },
  償却資産2: {
    sheetType: "BS",
    parentAccount: "固定資産合計",
    parameterType: PARAMETER_TYPES.PROPORTIONATE,
    relation: { type: RELATION_TYPES.PPE, subType: RELATION_SUB_TYPES.ASSET },
    parameterReferenceAccounts: [
      {
        id: "rev-total",
        operation: "MUL",
      },
    ],
  },
  その他固定資産: {
    sheetType: "BS",
    parentAccount: "固定資産合計",
    parameterType: PARAMETER_TYPES.PROPORTIONATE,
    relation: { type: RELATION_TYPES.NONE, subType: null },
    parameterReferenceAccounts: [
      {
        id: "rev-total",
        operation: "MUL",
      },
    ],
  },
  その他流動負債: {
    sheetType: "BS",
    parentAccount: "流動負債合計",
    parameterType: PARAMETER_TYPES.PROPORTIONATE,
    relation: { type: RELATION_TYPES.NONE, subType: null },
    parameterReferenceAccounts: [
      {
        id: "rev-total",
        operation: "MUL",
      },
    ],
  },
  その他固定負債: {
    sheetType: "BS",
    parentAccount: "固定負債合計",
    parameterType: PARAMETER_TYPES.PROPORTIONATE,
    relation: { type: RELATION_TYPES.NONE, subType: null },
    parameterReferenceAccounts: [
      {
        id: "rev-total",
        operation: "MUL",
      },
    ],
  },
  固定資産投資1: {
    sheetType: "CAPEX",
    parentAccount: "設備投資合計",
    parameterType: PARAMETER_TYPES.PROPORTIONATE,
    relation: {
      type: RELATION_TYPES.PPE,
      subType: RELATION_SUB_TYPES.INVESTMENT,
    },
    parameterReferenceAccounts: [
      {
        id: "rev-total",
        operation: "MUL",
      },
    ],
  },
  固定資産投資2: {
    sheetType: "CAPEX",
    parentAccount: "設備投資合計",
    parameterType: PARAMETER_TYPES.PROPORTIONATE,
    relation: {
      type: RELATION_TYPES.PPE,
      subType: RELATION_SUB_TYPES.INVESTMENT,
    },
    parameterReferenceAccounts: [
      {
        id: "rev-total",
        operation: "MUL",
      },
    ],
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
