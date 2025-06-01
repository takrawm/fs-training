// 最初にインポートする対象シートの定義（キャッシュフロー計算書は最初インポート対象外）
export const TARGET_SHEETS = ["PL", "BS", "CAPEX"];

export const SHEET_ATTRIBUTES = {
  CASH: "CASH",
  ASSET: "ASSET",
  LIABILITY: "LIABILITY",
  EQUITY: "EQUITY",
  RETAINED_EARNINGS: "RETAINED_EARNINGS",
  NET_INCOME: "NET_INCOME",
};

// パラメータタイプの選択肢
export const PARAMETER_TYPES = {
  NONE: "なし",
  GROWTH_RATE: "成長率",
  PERCENTAGE: "他科目割合",
  PROPORTIONATE: "他科目連動",
  FIXED_VALUE: "横置き",
  CHILDREN_SUM: "合計値",
  CALCULATION: "個別計算",
  BALANCE_AND_CHANGE: "期末残高＋当期変動",
  REFERENCE: "参照",
};

// パラメータタイプの選択肢
export const PARAM_OP_MAPPING = {
  [PARAMETER_TYPES.GROWTH_RATE]: ["CONST"],
  [PARAMETER_TYPES.PERCENTAGE]: ["CONST"],
  [PARAMETER_TYPES.CALCULATION]: ["ADD", "SUB"],
  [PARAMETER_TYPES.BALANCE_AND_CHANGE]: ["ADD", "SUB"],
};

export const DEFAULT_PARAMETER_VALUES = {
  GROWTH_RATE: 0.05,
  PERCENTAGE: 0.02,
};

// 集計用勘定科目の定義
export const SUMMARY_ACCOUNTS = {
  // PLアカウント
  売上高合計: {
    id: "rev-total",
    accountName: "売上高合計",
    sheetType: { sheet: "PL", attribute: null },
    parentAccount: "SUMMARY_ACCOUNTS",
    parameterType: PARAMETER_TYPES.CHILDREN_SUM,
    order: "A99",
    prefix: "A",
  },
  売上原価合計: {
    id: "cogs-total",
    accountName: "売上原価合計",
    sheetType: { sheet: "PL", attribute: null },
    parentAccount: "SUMMARY_ACCOUNTS",
    parameterType: PARAMETER_TYPES.CHILDREN_SUM,
    order: "B99",
    prefix: "B",
  },
  売上総利益: {
    id: "gross-profit",
    accountName: "売上総利益",
    sheetType: { sheet: "PL", attribute: null },
    parentAccount: "SUMMARY_ACCOUNTS",
    parameterType: PARAMETER_TYPES.CALCULATION,
    order: "C99",
    prefix: "C",
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
    sheetType: { sheet: "PL", attribute: null },
    parentAccount: "SUMMARY_ACCOUNTS",
    parameterType: PARAMETER_TYPES.CHILDREN_SUM,
    order: "D99",
    prefix: "D",
  },
  営業利益: {
    id: "op-profit",
    accountName: "営業利益",
    sheetType: { sheet: "PL", attribute: SHEET_ATTRIBUTES.NET_INCOME },
    parentAccount: "SUMMARY_ACCOUNTS",
    parameterType: PARAMETER_TYPES.CALCULATION,
    order: "E99",
    prefix: "E",
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
    sheetType: { sheet: "BS", attribute: SHEET_ATTRIBUTES.ASSET },
    parentAccount: "資産合計",
    parameterType: PARAMETER_TYPES.CHILDREN_SUM,
    order: "F99",
    prefix: "F",
  },
  固定資産合計: {
    id: "fixed-asset-total",
    accountName: "固定資産合計",
    sheetType: { sheet: "BS", attribute: SHEET_ATTRIBUTES.ASSET },
    parentAccount: "資産合計",
    parameterType: PARAMETER_TYPES.CHILDREN_SUM,
    order: "G99",
    prefix: "G",
  },
  資産合計: {
    id: "asset-total",
    accountName: "資産合計",
    sheetType: { sheet: "BS", attribute: SHEET_ATTRIBUTES.ASSET },
    parentAccount: "SUMMARY_ACCOUNTS",
    parameterType: PARAMETER_TYPES.CHILDREN_SUM,
    order: "H99",
    prefix: "H",
  },
  流動負債合計: {
    id: "current-liability-total",
    accountName: "流動負債合計",
    sheetType: { sheet: "BS", attribute: SHEET_ATTRIBUTES.LIABILITY },
    parentAccount: "負債合計",
    parameterType: PARAMETER_TYPES.CHILDREN_SUM,
    order: "I99",
    prefix: "I",
  },
  固定負債合計: {
    id: "fixed-liability-total",
    accountName: "固定負債合計",
    sheetType: { sheet: "BS", attribute: SHEET_ATTRIBUTES.LIABILITY },
    parentAccount: "負債合計",
    parameterType: PARAMETER_TYPES.CHILDREN_SUM,
    order: "J99",
    prefix: "J",
  },
  負債合計: {
    id: "liability-total",
    accountName: "負債合計",
    sheetType: { sheet: "BS", attribute: SHEET_ATTRIBUTES.LIABILITY },
    parentAccount: "負債及び純資産合計",
    parameterType: PARAMETER_TYPES.CHILDREN_SUM,
    order: "K99",
    prefix: "K",
  },
  純資産合計: {
    id: "equity-total",
    accountName: "純資産合計",
    sheetType: { sheet: "BS", attribute: SHEET_ATTRIBUTES.EQUITY },
    parentAccount: "負債及び純資産合計",
    parameterType: PARAMETER_TYPES.CHILDREN_SUM,
    order: "N99",
    prefix: "N",
  },
  負債及び純資産合計: {
    id: "li-eq-total",
    accountName: "負債及び純資産合計",
    sheetType: { sheet: "BS", attribute: SHEET_ATTRIBUTES.EQUITY },
    parentAccount: "SUMMARY_ACCOUNTS",
    parameterType: PARAMETER_TYPES.CHILDREN_SUM,
    order: "O99",
    prefix: "O",
  },

  // CAPEXアカウント
  設備投資合計: {
    id: "capex-total",
    accountName: "設備投資合計",
    sheetType: { sheet: "CAPEX", attribute: null },
    parentAccount: "SUMMARY_ACCOUNTS",
    parameterType: PARAMETER_TYPES.CHILDREN_SUM,
    order: "Q99",
    prefix: "Q",
  },

  // CFアカウント
  営業CF合計: {
    id: "ope-cf-total",
    accountName: "営業CF合計",
    sheetType: { sheet: "CF", attribute: null },
    parentAccount: "SUMMARY_ACCOUNTS",
    parameterType: PARAMETER_TYPES.CHILDREN_SUM,
    order: "R99",
    prefix: "R",
  },
  投資CF合計: {
    id: "inv-cf-total",
    accountName: "投資CF合計",
    sheetType: { sheet: "CF", attribute: null },
    parentAccount: "SUMMARY_ACCOUNTS",
    parameterType: PARAMETER_TYPES.CHILDREN_SUM,
    order: "S99",
    prefix: "S",
  },
};

// 勘定科目デフォルトシートタイプマッピング
export const DEFAULT_SHEET_TYPES = {
  商品売上: {
    sheetType: { sheet: "PL", attribute: null },
    parentAccount: "売上高合計",
    parameterType: PARAMETER_TYPES.GROWTH_RATE,
  },
  サービス売上: {
    sheetType: { sheet: "PL", attribute: null },
    parentAccount: "売上高合計",
    parameterType: PARAMETER_TYPES.GROWTH_RATE,
  },
  その他売上: {
    sheetType: { sheet: "PL", attribute: null },
    parentAccount: "売上高合計",
    parameterType: PARAMETER_TYPES.GROWTH_RATE,
  },
  売上高合計: {
    sheetType: { sheet: "集約科目", attribute: null },
    parentAccount: "集約科目",
    parameterType: PARAMETER_TYPES.NONE,
  },
  材料費: {
    sheetType: { sheet: "PL", attribute: null },
    parentAccount: "売上原価合計",
    parameterType: PARAMETER_TYPES.PROPORTIONATE,
    parameterReferenceAccounts: [
      {
        id: "rev-total",
        operation: "MUL",
      },
    ],
  },
  労務費: {
    sheetType: { sheet: "PL", attribute: null },
    parentAccount: "売上原価合計",
    parameterType: PARAMETER_TYPES.FIXED_VALUE,
  },
  売上原価合計: {
    sheetType: { sheet: "集約科目", attribute: null },
    parentAccount: "集約科目",
    parameterType: PARAMETER_TYPES.NONE,
  },
  売上総利益: {
    sheetType: { sheet: "集約科目", attribute: null },
    parentAccount: "集約科目",
    parameterType: PARAMETER_TYPES.CALCULATION,
  },
  人件費: {
    sheetType: { sheet: "PL", attribute: null },
    parentAccount: "販管費合計",
    parameterType: PARAMETER_TYPES.FIXED_VALUE,
  },
  物流費: {
    sheetType: { sheet: "PL", attribute: null },
    parentAccount: "販管費合計",
    parameterType: PARAMETER_TYPES.PROPORTIONATE,
    parameterReferenceAccounts: [
      {
        id: "rev-total",
        operation: "MUL",
      },
    ],
  },
  減価償却費_PL: {
    sheetType: { sheet: "PL", attribute: null },
    parentAccount: "販管費合計",
    parameterType: PARAMETER_TYPES.FIXED_VALUE,
  },
  無形固定資産償却費_PL: {
    sheetType: { sheet: "PL", attribute: null },
    parentAccount: "販管費合計",
    parameterType: PARAMETER_TYPES.FIXED_VALUE,
  },
  その他販管費: {
    sheetType: { sheet: "PL", attribute: null },
    parentAccount: "販管費合計",
    parameterType: PARAMETER_TYPES.PERCENTAGE,
    parameterReferenceAccounts: [
      {
        id: "rev-total",
        operation: "MUL",
      },
    ],
  },
  販管費合計: {
    sheetType: { sheet: "集約科目", attribute: null },
    parentAccount: "集約科目",
    parameterType: PARAMETER_TYPES.NONE,
  },
  営業利益: {
    sheetType: { sheet: "PL", attribute: SHEET_ATTRIBUTES.NET_INCOME },
    parentAccount: "集約科目",
    parameterType: PARAMETER_TYPES.CALCULATION,
  },
  現預金: {
    sheetType: { sheet: "BS", attribute: SHEET_ATTRIBUTES.CASH },
    parentAccount: "流動資産合計",
    parameterType: PARAMETER_TYPES.CHILDREN_SUM,
  },
  売掛金: {
    sheetType: { sheet: "BS", attribute: SHEET_ATTRIBUTES.ASSET },
    parentAccount: "流動資産合計",
    parameterType: PARAMETER_TYPES.PROPORTIONATE,
    parameterReferenceAccounts: [
      {
        id: "rev-total",
        operation: "MUL",
      },
    ],
  },
  棚卸資産: {
    sheetType: { sheet: "BS", attribute: SHEET_ATTRIBUTES.ASSET },
    parentAccount: "流動資産合計",
    parameterType: PARAMETER_TYPES.PROPORTIONATE,
    parameterReferenceAccounts: [
      {
        id: "rev-total",
        operation: "MUL",
      },
    ],
  },
  流動資産合計: {
    sheetType: { sheet: "集約科目", attribute: null },
    parentAccount: "集約科目",
    parameterType: PARAMETER_TYPES.NONE,
  },
  有形固定資産: {
    sheetType: { sheet: "BS", attribute: SHEET_ATTRIBUTES.ASSET },
    parentAccount: "固定資産合計",
    parameterType: PARAMETER_TYPES.BALANCE_AND_CHANGE,
    parameterReferenceAccounts: [
      {
        id: "account-34",
        operation: "ADD",
      },
      {
        id: "account-10",
        operation: "SUB",
      },
    ],
  },
  無形固定資産: {
    sheetType: { sheet: "BS", attribute: SHEET_ATTRIBUTES.ASSET },
    parentAccount: "固定資産合計",
    parameterType: PARAMETER_TYPES.BALANCE_AND_CHANGE,
    parameterReferenceAccounts: [
      {
        id: "account-35",
        operation: "ADD",
      },
      {
        id: "account-11",
        operation: "SUB",
      },
    ],
  },
  固定資産合計: {
    sheetType: { sheet: "集約科目", attribute: null },
    parentAccount: "集約科目",
    parameterType: PARAMETER_TYPES.NONE,
  },
  資産合計: {
    sheetType: { sheet: "集約科目", attribute: null },
    parentAccount: "集約科目",
    parameterType: PARAMETER_TYPES.NONE,
  },
  買掛金: {
    sheetType: { sheet: "BS", attribute: SHEET_ATTRIBUTES.LIABILITY },
    parentAccount: "流動負債合計",
    parameterType: PARAMETER_TYPES.PROPORTIONATE,
    parameterReferenceAccounts: [
      {
        id: "rev-total",
        operation: "MUL",
      },
    ],
  },
  支払手形: {
    sheetType: { sheet: "BS", attribute: SHEET_ATTRIBUTES.LIABILITY },
    parentAccount: "流動負債合計",
    parameterType: PARAMETER_TYPES.PROPORTIONATE,
    parameterReferenceAccounts: [
      {
        id: "rev-total",
        operation: "MUL",
      },
    ],
  },
  流動負債合計: {
    sheetType: { sheet: "集約科目", attribute: null },
    parentAccount: "集約科目",
    parameterType: PARAMETER_TYPES.NONE,
  },
  長期借入金: {
    sheetType: { sheet: "BS", attribute: SHEET_ATTRIBUTES.LIABILITY },
    parentAccount: "固定負債合計",
    parameterType: PARAMETER_TYPES.PROPORTIONATE,
    parameterReferenceAccounts: [
      {
        id: "rev-total",
        operation: "MUL",
      },
    ],
  },
  社債: {
    sheetType: { sheet: "BS", attribute: SHEET_ATTRIBUTES.LIABILITY },
    parentAccount: "固定負債合計",
    parameterType: PARAMETER_TYPES.PROPORTIONATE,
    parameterReferenceAccounts: [
      {
        id: "rev-total",
        operation: "MUL",
      },
    ],
  },
  固定負債合計: {
    sheetType: { sheet: "集約科目", attribute: null },
    parentAccount: "集約科目",
    parameterType: PARAMETER_TYPES.NONE,
  },
  負債合計: {
    sheetType: { sheet: "集約科目", attribute: null },
    parentAccount: "集約科目",
    parameterType: PARAMETER_TYPES.NONE,
  },
  資本金: {
    sheetType: { sheet: "BS", attribute: SHEET_ATTRIBUTES.EQUITY },
    parentAccount: "純資産合計",
    parameterType: PARAMETER_TYPES.FIXED_VALUE,
  },
  利益剰余金: {
    sheetType: { sheet: "BS", attribute: SHEET_ATTRIBUTES.RETAINED_EARNINGS },
    parentAccount: "純資産合計",
    parameterType: PARAMETER_TYPES.BALANCE_AND_CHANGE,
    parameterReferenceAccounts: [
      {
        id: "op-profit",
        operation: "ADD",
      },
    ],
  },
  純資産合計: {
    sheetType: { sheet: "集約科目", attribute: null },
    parentAccount: "集約科目",
    parameterType: PARAMETER_TYPES.NONE,
  },
  負債及び純資産合計: {
    sheetType: { sheet: "集約科目", attribute: null },
    parentAccount: "集約科目",
    parameterType: PARAMETER_TYPES.NONE,
  },
  有形資産投資: {
    sheetType: { sheet: "CAPEX", attribute: null },
    parentAccount: "設備投資合計",
    parameterType: PARAMETER_TYPES.FIXED_VALUE,
    parameterReferenceAccounts: [],
  },
  無形資産投資: {
    sheetType: { sheet: "CAPEX", attribute: null },
    parentAccount: "設備投資合計",
    parameterType: PARAMETER_TYPES.PROPORTIONATE,
    parameterReferenceAccounts: [
      {
        id: "rev-total",
        operation: null,
      },
    ],
  },
  設備投資合計: {
    sheetType: { sheet: "集約科目", attribute: null },
    parentAccount: "集約科目",
    parameterType: PARAMETER_TYPES.NONE,
  },
  営業利益_CF: {
    sheetType: { sheet: "集約科目", attribute: null },
    parentAccount: "営業CF合計",
    parameterType: PARAMETER_TYPES.NONE,
  },
  減価償却費_CF: {
    sheetType: { sheet: "CF", attribute: null },
    parentAccount: "営業CF合計",
    parameterType: PARAMETER_TYPES.NONE,
  },
  無形固定資産償却費_CF: {
    sheetType: { sheet: "CF", attribute: null },
    parentAccount: "営業CF合計",
    parameterType: PARAMETER_TYPES.NONE,
  },
  運転資本増減: {
    sheetType: { sheet: "CF", attribute: null },
    parentAccount: "営業CF合計",
    parameterType: PARAMETER_TYPES.NONE,
  },
  営業CF合計: {
    sheetType: { sheet: "集約科目", attribute: null },
    parentAccount: "集約科目",
    parameterType: PARAMETER_TYPES.NONE,
  },
  設備投資合計_CF: {
    sheetType: { sheet: "CF", attribute: null },
    parentAccount: "投資CF合計",
    parameterType: PARAMETER_TYPES.NONE,
  },
  投資CF合計: {
    sheetType: { sheet: "集約科目", attribute: null },
    parentAccount: "集約科目",
    parameterType: PARAMETER_TYPES.NONE,
  },

  // MODEL_ACCOUNTSから追加された科目
  売上高1: {
    sheetType: "PL",
    parentAccount: "売上高合計",
    parameterType: PARAMETER_TYPES.GROWTH_RATE,
  },
  売上高2: {
    sheetType: "PL",
    parentAccount: "売上高合計",
    parameterType: PARAMETER_TYPES.GROWTH_RATE,
  },
  売上原価1: {
    sheetType: "PL",
    parentAccount: "売上原価合計",
    parameterType: PARAMETER_TYPES.PERCENTAGE,
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
  },
  その他償却費2: {
    sheetType: "PL",
    parentAccount: "販管費合計",
    parameterType: PARAMETER_TYPES.PERCENTAGE,
  },
  その他流動資産: {
    sheetType: "BS",
    parentAccount: "流動資産合計",
    parameterType: PARAMETER_TYPES.PROPORTIONATE,
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
