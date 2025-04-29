import { AccountType, ParameterType, CashflowType } from "../types/models.js";

// パラメータのデフォルト値
export const DEFAULT_PARAMETER_VALUES = {
  // export const ParameterType = {
  // GROWTH_RATE: "GROWTH_RATE", 成長率（前年比）
  // PERCENTAGE: "PERCENTAGE", 割合（参照値に対する割合）
  // FIXED_VALUE: "FIXED_VALUE", 固定値
  // PROPORTIONATE: "PROPORTIONATE", 参照科目の増減率に連動
  // OTHER: "OTHER", // その他の特殊計算
  // };
  // [ParameterType.GROWTH_RATE]は結局"GROWTH_RATE"
  // →ParameterType.GROWTH_RATE が "ANNUAL_GROWTH"に変わった時も変更不要
  [ParameterType.GROWTH_RATE]: 10.0, // 10% 成長
  [ParameterType.PERCENTAGE]: 30.0, // 30% の割合
  [ParameterType.PROPORTIONATE]: null, // 参照科目に連動するため値はnull
  [ParameterType.OTHER]: null, // 特殊計算用
};

// 基本マッピング構造の定義
const baseMapping = {
  accountType: null,
  parameter: null,
  aggregateMethod: "NONE",
};

// 基本パラメータ構造の定義
const baseParameter = {
  type: null,
  value: null,
  referenceAccountId: null,
  periodIds: [],
  isEditable: true,
};

// シートごとの勘定科目マッピング
export const SHEET_ACCOUNT_MAPPING = {
  PL: {
    売上高: {
      ...baseMapping,
      accountType: AccountType.REVENUE,
      parameter: {
        ...baseParameter,
        type: ParameterType.GROWTH_RATE,
      },
    },
    売上高合計: {
      ...baseMapping,
      accountType: AccountType.REVENUE_TOTAL,
      aggregateMethod: "CHILDREN_SUM",
    },
    売上原価: {
      ...baseMapping,
      accountType: AccountType.COGS,
      parameter: {
        ...baseParameter,
        type: ParameterType.PERCENTAGE,
      },
    },
    売上原価合計: {
      ...baseMapping,
      accountType: AccountType.COGS_TOTAL,
      aggregateMethod: "CHILDREN_SUM",
    },
    売上総利益: {
      ...baseMapping,
      accountType: AccountType.GROSS_MARGIN,
      aggregateMethod: "FORMULA",
    },
    販管費: {
      ...baseMapping,
      accountType: AccountType.SGA,
      parameter: {
        ...baseParameter,
        type: ParameterType.PERCENTAGE,
      },
    },
    販管費合計: {
      ...baseMapping,
      accountType: AccountType.SGA_TOTAL,
      aggregateMethod: "CHILDREN_SUM",
    },
    営業利益: {
      ...baseMapping,
      accountType: AccountType.OPERATING_PROFIT,
      aggregateMethod: "FORMULA",
    },
  },
  BS: {
    流動資産: {
      ...baseMapping,
      accountType: AccountType.CURRENT_ASSET,
      parameter: {
        ...baseParameter,
        type: ParameterType.PROPORTIONATE,
      },
    },
    流動資産合計: {
      ...baseMapping,
      accountType: AccountType.CUR_ASSET_TOTAL,
      aggregateMethod: "CHILDREN_SUM",
    },
    有形固定資産: {
      ...baseMapping,
      accountType: AccountType.FIXED_ASSET,
      parameter: {
        ...baseParameter,
        type: ParameterType.OTHER,
      },
    },
    無形固定資産: {
      ...baseMapping,
      accountType: AccountType.FIXED_ASSET,
      parameter: {
        ...baseParameter,
        type: ParameterType.OTHER,
      },
    },
    固定資産: {
      ...baseMapping,
      accountType: AccountType.FIXED_ASSET,
    },
    固定資産合計: {
      ...baseMapping,
      accountType: AccountType.FIX_ASSET_TOTAL,
      aggregateMethod: "CHILDREN_SUM",
    },
    資産合計: {
      ...baseMapping,
      accountType: AccountType.ASSET_TOTAL,
      aggregateMethod: "FORMULA",
    },
    流動負債: {
      ...baseMapping,
      accountType: AccountType.CURRENT_LIABILITY,
      parameter: {
        ...baseParameter,
        type: ParameterType.PROPORTIONATE,
      },
    },
    流動負債合計: {
      ...baseMapping,
      accountType: AccountType.CUR_LIABILITY_TOTAL,
      aggregateMethod: "CHILDREN_SUM",
    },
    固定負債: {
      ...baseMapping,
      accountType: AccountType.FIXED_LIABILITY,
    },
    固定負債合計: {
      ...baseMapping,
      accountType: AccountType.FIX_LIABILITY_TOTAL,
      aggregateMethod: "CHILDREN_SUM",
    },
    負債合計: {
      ...baseMapping,
      accountType: AccountType.LIABILITY_TOTAL,
      aggregateMethod: "FORMULA",
    },
    資本金: {
      ...baseMapping,
      accountType: AccountType.EQUITY,
    },
    利益剰余金: {
      ...baseMapping,
      accountType: AccountType.EQUITY,
      parameter: {
        ...baseParameter,
        type: ParameterType.OTHER,
      },
    },
    純資産: {
      ...baseMapping,
      accountType: AccountType.EQUITY,
    },
    純資産合計: {
      ...baseMapping,
      accountType: AccountType.EQUITY_TOTAL,
      aggregateMethod: "CHILDREN_SUM",
    },
    負債及び純資産合計: {
      ...baseMapping,
      accountType: AccountType.LI_EQ_TOTAL,
      aggregateMethod: "FORMULA",
    },
    チェック: {
      ...baseMapping,
      accountType: AccountType.OTHER,
    },
  },
  CAPEX: {
    設備投資: {
      ...baseMapping,
      accountType: AccountType.CAPEX,
      parameter: {
        ...baseParameter,
        type: ParameterType.PROPORTIONATE,
        referenceAccountId: "rev-total",
      },
    },
    設備投資合計: {
      ...baseMapping,
      accountType: AccountType.CAPEX_TOTAL,
      aggregateMethod: "CHILDREN_SUM",
    },
  },
  CS: {
    営業CF: {
      ...baseMapping,
      accountType: AccountType.OPE_CF,
    },
    営業CF合計: {
      ...baseMapping,
      accountType: AccountType.OPE_CF_TOTAL,
      aggregateMethod: "CHILDREN_SUM",
    },
    投資CF: {
      ...baseMapping,
      accountType: AccountType.INV_CF,
    },
    投資CF合計: {
      ...baseMapping,
      accountType: AccountType.INV_CF_TOTAL,
      aggregateMethod: "CHILDREN_SUM",
    },
    現預金増減: {
      ...baseMapping,
      accountType: AccountType.CHANGE_CASH,
      aggregateMethod: "CHILDREN_SUM",
    },
  },
};

// キャッシュフロー計算用のマッピング
export const SHEET_CASHFLOW_MAPPING = {
  PL: {
    // 収益・費用科目（デフォルトはPROFIT）
    営業利益: CashflowType.PROFIT,
    売上高: CashflowType.PROFIT,
    売上高合計: CashflowType.N_A, // SUMMARY_ACCOUNTSは全てN/Aに設定
    売上原価: CashflowType.PROFIT,
    売上原価合計: CashflowType.N_A,
    売上総利益: CashflowType.N_A,
    販管費: CashflowType.PROFIT,
    販管費合計: CashflowType.N_A,
    営業利益: CashflowType.N_A,
    // 特殊科目
    減価償却費: CashflowType.DEPRECIATION,
    無形固定資産償却費: CashflowType.AMORTIZATION,
  },

  BS: {
    // 流動資産
    現預金: CashflowType.CASH,
    売掛金: CashflowType.WC_ASSET,
    棚卸資産: CashflowType.WC_ASSET,
    流動資産合計: CashflowType.N_A,

    // 固定資産
    有形固定資産: CashflowType.TNG_ASSET,
    無形固定資産: CashflowType.INTNG_ASSET,
    固定資産合計: CashflowType.N_A,
    資産合計: CashflowType.N_A,

    // 流動負債
    買掛金: CashflowType.WC_LIABILITY,
    支払手形: CashflowType.WC_LIABILITY,
    流動負債合計: CashflowType.N_A,

    // 固定負債
    長期借入金: CashflowType.LOAN,
    社債: CashflowType.OTHER_DEBT,
    固定負債合計: CashflowType.N_A,
    負債合計: CashflowType.N_A,

    // 純資産
    資本金: CashflowType.CAPITAL_STOCK,
    利益剰余金: CashflowType.RETAINED_EARNINGS,
    純資産合計: CashflowType.N_A,
    負債及び純資産合計: CashflowType.N_A,
  },

  CAPEX: {
    有形資産投資: CashflowType.TNG_INVESTMENT,
    無形資産投資: CashflowType.INTNG_INVESTMENT,
    設備投資合計: CashflowType.N_A,
  },

  CS: {
    // CSシートの全アカウントはN/A
    営業CF: CashflowType.N_A,
    営業CF合計: CashflowType.N_A,
    投資CF: CashflowType.N_A,
    投資CF合計: CashflowType.N_A,
    現預金増減: CashflowType.N_A,
  },
};

// 後方互換性のために残す
export const ACCOUNT_MAPPING = SHEET_ACCOUNT_MAPPING.PL;

// 初期の被参照科目リスト
export const INITIAL_REFERENCE_ACCOUNTS = [
  "rev-total", // 売上高合計
  "labour-cost", // 労務費
  "personnel-expenses", // 人件費
  "tng-investment", // 有形資産投資
];

// 集計用勘定科目の定義
export const SUMMARY_ACCOUNTS = {
  // PLアカウント
  売上高合計: {
    id: "rev-total",
    accountName: "売上高合計",
    sheetType: "PL",
    parentAccount: null,
    calculationType: "CHILDREN_SUM",
    parameterType: null,
    isReferenceAccount: true,
    order: "A99",
    prefix: "A",
    relationType: "NONE",
  },
  売上原価合計: {
    id: "cogs-total",
    accountName: "売上原価合計",
    sheetType: "PL",
    parentAccount: null,
    calculationType: "CHILDREN_SUM",
    parameterType: null,
    isReferenceAccount: false,
    order: "B99",
    prefix: "B",
    relationType: "NONE",
  },
  売上総利益: {
    id: "gross-profit",
    accountName: "売上総利益",
    sheetType: "PL",
    parentAccount: null,
    calculationType: "ACCOUNT_CALC",
    parameterType: null,
    isReferenceAccount: false,
    order: "C99",
    prefix: "C",
    relationType: "NONE",
  },
  販管費合計: {
    id: "sga-total",
    accountName: "販管費合計",
    sheetType: "PL",
    parentAccount: null,
    calculationType: "CHILDREN_SUM",
    parameterType: null,
    isReferenceAccount: false,
    order: "D99",
    prefix: "D",
    relationType: "NONE",
  },
  営業利益: {
    id: "op-profit",
    accountName: "営業利益",
    sheetType: "PL",
    parentAccount: null,
    calculationType: "ACCOUNT_CALC",
    parameterType: null,
    isReferenceAccount: false,
    order: "E99",
    prefix: "E",
    relationType: "RETAINED_EARNINGS",
  },

  // BSアカウント
  流動資産合計: {
    id: "current-asset-total",
    accountName: "流動資産合計",
    sheetType: "BS",
    parentAccount: null,
    calculationType: "CHILDREN_SUM",
    parameterType: null,
    isReferenceAccount: false,
    order: "F99",
    prefix: "F",
    relationType: "NONE",
  },
  固定資産合計: {
    id: "fixed-asset-total",
    accountName: "固定資産合計",
    sheetType: "BS",
    parentAccount: null,
    calculationType: "CHILDREN_SUM",
    parameterType: null,
    isReferenceAccount: false,
    order: "G99",
    prefix: "G",
    relationType: "NONE",
  },
  資産合計: {
    id: "asset-total",
    accountName: "資産合計",
    sheetType: "BS",
    parentAccount: null,
    calculationType: "ACCOUNT_CALC",
    parameterType: null,
    isReferenceAccount: false,
    order: "H99",
    prefix: "H",
    relationType: "NONE",
  },
  流動負債合計: {
    id: "current-liability-total",
    accountName: "流動負債合計",
    sheetType: "BS",
    parentAccount: null,
    calculationType: "CHILDREN_SUM",
    parameterType: null,
    isReferenceAccount: false,
    order: "I99",
    prefix: "I",
    relationType: "NONE",
  },
  固定負債合計: {
    id: "fixed-liability-total",
    accountName: "固定負債合計",
    sheetType: "BS",
    parentAccount: null,
    calculationType: "CHILDREN_SUM",
    parameterType: null,
    isReferenceAccount: false,
    order: "J99",
    prefix: "J",
    relationType: "NONE",
  },
  負債合計: {
    id: "liability-total",
    accountName: "負債合計",
    sheetType: "BS",
    parentAccount: null,
    calculationType: "ACCOUNT_CALC",
    parameterType: null,
    isReferenceAccount: false,
    order: "K99",
    prefix: "K",
    relationType: "NONE",
  },
  純資産合計: {
    id: "equity-total",
    accountName: "純資産合計",
    sheetType: "BS",
    parentAccount: null,
    calculationType: "CHILDREN_SUM",
    parameterType: null,
    isReferenceAccount: false,
    order: "L99",
    prefix: "L",
    relationType: "NONE",
  },
  負債及び純資産合計: {
    id: "li-eq-total",
    accountName: "負債及び純資産合計",
    sheetType: "BS",
    parentAccount: null,
    calculationType: "ACCOUNT_CALC",
    parameterType: null,
    isReferenceAccount: false,
    order: "M99",
    prefix: "M",
    relationType: "NONE",
  },

  // CAPEXアカウント
  設備投資合計: {
    id: "capex-total",
    accountName: "設備投資合計",
    sheetType: "CAPEX",
    parentAccount: null,
    calculationType: "CHILDREN_SUM",
    parameterType: null,
    isReferenceAccount: false,
    order: "N99",
    prefix: "N",
    relationType: "NONE",
  },

  // CFアカウント
  営業CF合計: {
    id: "ope-cf-total",
    accountName: "営業CF合計",
    sheetType: "CF",
    parentAccount: null,
    calculationType: "CHILDREN_SUM",
    parameterType: null,
    isReferenceAccount: false,
    order: "O99",
    prefix: "O",
    relationType: "NONE",
  },
  投資CF合計: {
    id: "inv-cf-total",
    accountName: "投資CF合計",
    sheetType: "CF",
    parentAccount: null,
    calculationType: "CHILDREN_SUM",
    parameterType: null,
    isReferenceAccount: false,
    order: "P99",
    prefix: "P",
    relationType: "NONE",
  },
  // 現預金増減: {
  //   id: "change-cash",
  //   accountName: "現預金増減",
  //   sheetType: "CF",
  //   parentAccount: null,
  //   calculationType: "CHILDREN_SUM",
  //   parameterType: null,
  //   isReferenceAccount: false,
  //   order: "Q99",
  // },
};

// 勘定科目デフォルトシートタイプマッピング
export const DEFAULT_SHEET_TYPES = {
  商品売上: {
    sheetType: "PL",
    parentAccount: "売上高合計",
    parameterType: "GROWTH_RATE",
    relationType: "NONE",
  },
  サービス売上: {
    sheetType: "PL",
    parentAccount: "売上高合計",
    parameterType: "GROWTH_RATE",
    relationType: "NONE",
  },
  その他売上: {
    sheetType: "PL",
    parentAccount: "売上高合計",
    parameterType: "GROWTH_RATE",
    relationType: "NONE",
  },
  売上高合計: {
    sheetType: "集約科目",
    parentAccount: "",
    parameterType: "NONE",
    relationType: "NONE",
  },
  材料費: {
    sheetType: "PL",
    parentAccount: "売上原価合計",
    parameterType: "PERCENTAGE",
    relationType: "NONE",
  },
  労務費: {
    sheetType: "PL",
    parentAccount: "売上原価合計",
    parameterType: "PERCENTAGE",
    relationType: "NONE",
  },
  売上原価合計: {
    sheetType: "集約科目",
    parentAccount: "",
    parameterType: "NONE",
    relationType: "NONE",
  },
  売上総利益: {
    sheetType: "集約科目",
    parentAccount: "",
    parameterType: "NONE",
    relationType: "NONE",
  },
  人件費: {
    sheetType: "PL",
    parentAccount: "販管費合計",
    parameterType: "PERCENTAGE",
    relationType: "NONE",
  },
  物流費: {
    sheetType: "PL",
    parentAccount: "販管費合計",
    parameterType: "PERCENTAGE",
    relationType: "NONE",
  },
  減価償却費_PL: {
    sheetType: "PL",
    parentAccount: "販管費合計",
    parameterType: "PERCENTAGE",
    relationType: "PP&E",
  },
  無形固定資産償却費_PL: {
    sheetType: "PL",
    parentAccount: "販管費合計",
    parameterType: "PERCENTAGE",
    relationType: "PP&E",
  },
  その他販管費: {
    sheetType: "PL",
    parentAccount: "販管費合計",
    parameterType: "PERCENTAGE",
    relationType: "NONE",
  },
  販管費合計: {
    sheetType: "集約科目",
    parentAccount: "",
    parameterType: "NONE",
    relationType: "NONE",
  },
  営業利益: {
    sheetType: "集約科目",
    parentAccount: "",
    parameterType: "NONE",
    relationType: "RETAINED_EARNINGS",
  },
  現預金: {
    sheetType: "BS",
    parentAccount: "流動資産合計",
    parameterType: "PROPORTIONATE",
    relationType: "NONE",
  },
  売掛金: {
    sheetType: "BS",
    parentAccount: "流動資産合計",
    parameterType: "PROPORTIONATE",
    relationType: "WORKING_CAPITAL",
  },
  棚卸資産: {
    sheetType: "BS",
    parentAccount: "流動資産合計",
    parameterType: "PROPORTIONATE",
    relationType: "WORKING_CAPITAL",
  },
  流動資産合計: {
    sheetType: "集約科目",
    parentAccount: "",
    parameterType: "NONE",
    relationType: "NONE",
  },
  有形固定資産: {
    sheetType: "BS",
    parentAccount: "固定資産合計",
    parameterType: "PROPORTIONATE",
    relationType: "PP&E",
  },
  無形固定資産: {
    sheetType: "BS",
    parentAccount: "固定資産合計",
    parameterType: "PROPORTIONATE",
    relationType: "PP&E",
  },
  固定資産合計: {
    sheetType: "集約科目",
    parentAccount: "",
    parameterType: "NONE",
    relationType: "NONE",
  },
  資産合計: {
    sheetType: "集約科目",
    parentAccount: "",
    parameterType: "NONE",
    relationType: "NONE",
  },
  買掛金: {
    sheetType: "BS",
    parentAccount: "流動負債合計",
    parameterType: "PROPORTIONATE",
    relationType: "WORKING_CAPITAL",
  },
  支払手形: {
    sheetType: "BS",
    parentAccount: "流動負債合計",
    parameterType: "PROPORTIONATE",
    relationType: "WORKING_CAPITAL",
  },
  流動負債合計: {
    sheetType: "集約科目",
    parentAccount: "",
    parameterType: "NONE",
    relationType: "NONE",
  },
  長期借入金: {
    sheetType: "BS",
    parentAccount: "固定負債合計",
    parameterType: "PROPORTIONATE",
    relationType: "NONE",
  },
  社債: {
    sheetType: "BS",
    parentAccount: "固定負債合計",
    parameterType: "PROPORTIONATE",
    relationType: "NONE",
  },
  固定負債合計: {
    sheetType: "集約科目",
    parentAccount: "",
    parameterType: "NONE",
    relationType: "NONE",
  },
  負債合計: {
    sheetType: "集約科目",
    parentAccount: "",
    parameterType: "NONE",
    relationType: "NONE",
  },
  資本金: {
    sheetType: "BS",
    parentAccount: "純資産合計",
    parameterType: "PROPORTIONATE",
    relationType: "NONE",
  },
  利益剰余金: {
    sheetType: "BS",
    parentAccount: "純資産合計",
    parameterType: "PROPORTIONATE",
    relationType: "RETAINED_EARNINGS",
  },
  純資産合計: {
    sheetType: "集約科目",
    parentAccount: "",
    parameterType: "NONE",
    relationType: "NONE",
  },
  負債及び純資産合計: {
    sheetType: "集約科目",
    parentAccount: "",
    parameterType: "NONE",
    relationType: "NONE",
  },
  有形資産投資: {
    sheetType: "CAPEX",
    parentAccount: "設備投資合計",
    parameterType: "PROPORTIONATE",
    relationType: "PP&E",
  },
  無形資産投資: {
    sheetType: "CAPEX",
    parentAccount: "設備投資合計",
    parameterType: "PROPORTIONATE",
    relationType: "PP&E",
  },
  設備投資合計: {
    sheetType: "集約科目",
    parentAccount: "",
    parameterType: "NONE",
    relationType: "NONE",
  },
  営業利益_CF: {
    sheetType: "集約科目",
    parentAccount: "営業CF合計",
    parameterType: "NONE",
    relationType: "NONE",
  },
  減価償却費_CF: {
    sheetType: "CF",
    parentAccount: "営業CF合計",
    parameterType: "NONE",
    relationType: "NONE",
  },
  無形固定資産償却費_CF: {
    sheetType: "CF",
    parentAccount: "営業CF合計",
    parameterType: "NONE",
    relationType: "NONE",
  },
  運転資本増減: {
    sheetType: "CF",
    parentAccount: "営業CF合計",
    parameterType: "NONE",
    relationType: "NONE",
  },
  営業CF合計: {
    sheetType: "集約科目",
    parentAccount: "",
    parameterType: "NONE",
    relationType: "NONE",
  },
  設備投資合計_CF: {
    sheetType: "CF",
    parentAccount: "投資CF合計",
    parameterType: "NONE",
    relationType: "NONE",
  },
  投資CF合計: {
    sheetType: "集約科目",
    parentAccount: "",
    parameterType: "NONE",
    relationType: "NONE",
  },

  // MODEL_ACCOUNTSから追加された科目
  売上高1: {
    sheetType: "PL",
    parentAccount: "売上高合計",
    parameterType: "GROWTH_RATE",
    relationType: "NONE",
  },
  売上高2: {
    sheetType: "PL",
    parentAccount: "売上高合計",
    parameterType: "GROWTH_RATE",
    relationType: "NONE",
  },
  売上原価1: {
    sheetType: "PL",
    parentAccount: "売上原価合計",
    parameterType: "PERCENTAGE",
    relationType: "NONE",
  },
  売上原価2: {
    sheetType: "PL",
    parentAccount: "売上原価合計",
    parameterType: "PERCENTAGE",
    relationType: "NONE",
  },
  広告宣伝費: {
    sheetType: "PL",
    parentAccount: "販管費合計",
    parameterType: "PERCENTAGE",
    relationType: "NONE",
  },
  物件費: {
    sheetType: "PL",
    parentAccount: "販管費合計",
    parameterType: "PERCENTAGE",
    relationType: "NONE",
  },
  その他償却費1: {
    sheetType: "PL",
    parentAccount: "販管費合計",
    parameterType: "PERCENTAGE",
    relationType: "PP&E",
  },
  その他償却費2: {
    sheetType: "PL",
    parentAccount: "販管費合計",
    parameterType: "PERCENTAGE",
    relationType: "PP&E",
  },
  その他流動資産: {
    sheetType: "BS",
    parentAccount: "流動資産合計",
    parameterType: "PROPORTIONATE",
    relationType: "NONE",
  },
  償却資産1: {
    sheetType: "BS",
    parentAccount: "固定資産合計",
    parameterType: "PROPORTIONATE",
    relationType: "NONE",
  },
  償却資産2: {
    sheetType: "BS",
    parentAccount: "固定資産合計",
    parameterType: "PROPORTIONATE",
    relationType: "NONE",
  },
  その他固定資産: {
    sheetType: "BS",
    parentAccount: "固定資産合計",
    parameterType: "PROPORTIONATE",
    relationType: "PP&E",
  },
  その他流動負債: {
    sheetType: "BS",
    parentAccount: "流動負債合計",
    parameterType: "PROPORTIONATE",
    relationType: "NONE",
  },
  その他固定負債: {
    sheetType: "BS",
    parentAccount: "固定負債合計",
    parameterType: "PROPORTIONATE",
    relationType: "NONE",
  },
  固定資産投資1: {
    sheetType: "CAPEX",
    parentAccount: "設備投資合計",
    parameterType: "PROPORTIONATE",
    relationType: "PP&E",
  },
  固定資産投資2: {
    sheetType: "CAPEX",
    parentAccount: "設備投資合計",
    parameterType: "PROPORTIONATE",
    relationType: "PP&E",
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
