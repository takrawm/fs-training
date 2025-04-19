import {
  AccountType,
  ParameterType,
  CashflowType,
} from "../types/models.js";

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
  aggregateMethod: "NONE"
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
    負債・純資産合計: {
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
    負債・純資産合計: CashflowType.N_A,
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
  "rev-total",   // 売上高合計
  "labour-cost",  // 労務費
  "personnel-expenses", // 人件費
  "tng-investment"   // 有形資産投資
];

// 集計用勘定科目の定義
export const SUMMARY_ACCOUNTS = {
  // PLアカウント
  REVENUE_TOTAL: {
    id: "rev-total",
    code: "A99",
    name: "売上高合計",
    accountType: AccountType.REVENUE_TOTAL,
    order: 99,
    parentId: null,
    aggregateMethod: "CHILDREN_SUM",
    parameter: null,
    cashflowType: CashflowType.N_A,
    sheetName: "PL",
    isReferenceAccount: true,
  },
  COGS_TOTAL: {
    id: "cogs-total",
    code: "B99",
    name: "売上原価合計",
    accountType: AccountType.COGS_TOTAL,
    order: 199,
    parentId: null,
    aggregateMethod: "CHILDREN_SUM",
    parameter: null,
    cashflowType: CashflowType.N_A,
    sheetName: "PL",
  },
  GROSS_PROFIT: {
    id: "gross-profit",
    code: "B999",
    name: "売上総利益",
    accountType: AccountType.GROSS_MARGIN,
    order: 299,
    parentId: null,
    aggregateMethod: "FORMULA",
    parameter: null,
    cashflowType: CashflowType.N_A,
    sheetName: "PL",
  },
  SGA_TOTAL: {
    id: "sga-total",
    code: "C99",
    name: "販管費合計",
    accountType: AccountType.SGA_TOTAL,
    order: 399,
    parentId: null,
    aggregateMethod: "CHILDREN_SUM",
    parameter: null,
    cashflowType: CashflowType.N_A,
    sheetName: "PL",
  },
  OPERATING_PROFIT: {
    id: "op-profit",
    code: "C999",
    name: "営業利益",
    accountType: AccountType.OPERATING_PROFIT,
    order: 499,
    parentId: null,
    aggregateMethod: "FORMULA",
    parameter: null,
    cashflowType: CashflowType.N_A,
    sheetName: "PL",
  },
  
  // BSアカウント
  CUR_ASSET_TOTAL: {
    id: "current-asset-total",
    code: "BS-A99",
    name: "流動資産合計",
    accountType: AccountType.CUR_ASSET_TOTAL,
    order: 599,
    parentId: null,
    aggregateMethod: "CHILDREN_SUM",
    parameter: null,
    cashflowType: CashflowType.N_A,
    sheetName: "BS",
  },
  FIX_ASSET_TOTAL: {
    id: "fixed-asset-total",
    code: "BS-B99",
    name: "固定資産合計",
    accountType: AccountType.FIX_ASSET_TOTAL,
    order: 699,
    parentId: null,
    aggregateMethod: "CHILDREN_SUM",
    parameter: null,
    cashflowType: CashflowType.N_A,
    sheetName: "BS",
  },
  ASSET_TOTAL: {
    id: "asset-total",
    code: "BS-C99",
    name: "資産合計",
    accountType: AccountType.ASSET_TOTAL,
    order: 799,
    parentId: null,
    aggregateMethod: "FORMULA",
    parameter: null,
    cashflowType: CashflowType.N_A,
    sheetName: "BS",
  },
  CUR_LIABILITY_TOTAL: {
    id: "current-liability-total",
    code: "BS-D99",
    name: "流動負債合計",
    accountType: AccountType.CUR_LIABILITY_TOTAL,
    order: 899,
    parentId: null,
    aggregateMethod: "CHILDREN_SUM",
    parameter: null,
    cashflowType: CashflowType.N_A,
    sheetName: "BS",
  },
  FIX_LIABILITY_TOTAL: {
    id: "fixed-liability-total",
    code: "BS-E99",
    name: "固定負債合計",
    accountType: AccountType.FIX_LIABILITY_TOTAL,
    order: 999,
    parentId: null,
    aggregateMethod: "CHILDREN_SUM",
    parameter: null,
    cashflowType: CashflowType.N_A,
    sheetName: "BS",
  },
  LIABILITY_TOTAL: {
    id: "liability-total",
    code: "BS-F99",
    name: "負債合計",
    accountType: AccountType.LIABILITY_TOTAL,
    order: 1099,
    parentId: null,
    aggregateMethod: "FORMULA",
    parameter: null,
    cashflowType: CashflowType.N_A,
    sheetName: "BS",
  },
  EQUITY_TOTAL: {
    id: "equity-total",
    code: "BS-G99",
    name: "純資産合計",
    accountType: AccountType.EQUITY_TOTAL,
    order: 1199,
    parentId: null,
    aggregateMethod: "CHILDREN_SUM",
    parameter: null,
    cashflowType: CashflowType.N_A,
    sheetName: "BS",
  },
  LI_EQ_TOTAL: {
    id: "li-eq-total",
    code: "BS-H99",
    name: "負債・純資産合計",
    accountType: AccountType.LI_EQ_TOTAL,
    order: 1299,
    parentId: null,
    aggregateMethod: "FORMULA",
    parameter: null,
    cashflowType: CashflowType.N_A,
    sheetName: "BS",
  },
  
  // CAPEXアカウント
  CAPEX_TOTAL: {
    id: "capex-total",
    code: "CAPEX-A99",
    name: "設備投資合計",
    accountType: AccountType.CAPEX_TOTAL,
    order: 1399,
    parentId: null,
    aggregateMethod: "CHILDREN_SUM",
    parameter: null,
    cashflowType: CashflowType.N_A,
    sheetName: "CAPEX",
  },
  
  // CSアカウント
  OPE_CF_TOTAL: {
    id: "ope-cf-total",
    code: "CS-A99",
    name: "営業CF合計",
    accountType: AccountType.OPE_CF_TOTAL,
    order: 1499,
    parentId: null,
    aggregateMethod: "CHILDREN_SUM",
    parameter: null,
    cashflowType: CashflowType.N_A,
    sheetName: "CS",
  },
  INV_CF_TOTAL: {
    id: "inv-cf-total",
    code: "CS-B99",
    name: "投資CF合計",
    accountType: AccountType.INV_CF_TOTAL,
    order: 1599,
    parentId: null,
    aggregateMethod: "CHILDREN_SUM",
    parameter: null,
    cashflowType: CashflowType.N_A,
    sheetName: "CS",
  },
  CHANGE_CASH: {
    id: "change-cash",
    code: "CS20",
    name: "現預金増減",
    accountType: AccountType.CHANGE_CASH,
    order: 20,
    parentId: null,
    aggregateMethod: "CHILDREN_SUM",
    parameter: null,
    cashflowType: CashflowType.N_A,
    sheetName: "CS",
  },
};
