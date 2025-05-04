// シートタイプの選択肢
export const SHEET_TYPES = ["PL", "BS", "CF", "CAPEX", "集約科目"];

// 親科目（集計科目）の選択肢
export const PARENT_ACCOUNTS = [
  "",
  "売上高合計",
  "売上原価合計",
  "販管費合計",
  "流動資産合計",
  "有形固定資産合計",
  "無形固定資産合計",
  "流動負債合計",
  "固定負債合計",
  "設備投資合計",
];

// パラメータタイプの選択肢
export const PARAMETER_TYPES = [
  "NONE",
  "GROWTH_RATE",
  "PERCENTAGE",
  "PROPORTIONATE",
];

// リレーションタイプの定義
export const RELATIONS = {
  NONE: null,
  PPE: {
    asset: "fixedAsset",
    investment: "investment",
    depreciation: "depreciation",
  },
  RETAINED_EARNINGS: {
    asset: "retained",
    profit: "profit_loss",
    dividend: "dividend",
  },
};
