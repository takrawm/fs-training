// ========================================
// CF項目（BS変動項目）専用ユーティリティ
// ========================================

import { SHEET_TYPES, FLOW_SHEETS, OPERATIONS } from "./constants.js";

/**
 * CF項目のタイプ定義
 */
export const CF_ITEM_TYPES = {
  BS_CHANGE: "BS_CHANGE", // BS科目の変動
  PL_ADJUSTMENT: "PL_ADJUSTMENT", // PL項目の非資金調整
  OTHER: "OTHER", // その他のCF項目
};

/**
 * CF項目属性の構造定義
 */
export const createCFItemAttributes = (
  cfItemType,
  sourceAccount,
  options = {}
) => {
  const baseAttributes = {
    cfItemType,
    sourceAccount: {
      accountId: sourceAccount.id,
      accountName: sourceAccount.accountName,
    },
    calculationMethod: "DERIVED", // 派生計算
  };

  switch (cfItemType) {
    case CF_ITEM_TYPES.BS_CHANGE:
      return {
        ...baseAttributes,
        sourceAccount: {
          ...baseAttributes.sourceAccount,
          isCredit: sourceAccount.isCredit,
        },
        cfImpact: {
          // 資産増加は-1（現金減少）、負債増加は+1（現金増加）
          multiplier: sourceAccount.isCredit === false ? -1 : 1,
          description:
            sourceAccount.isCredit === false
              ? "資産増加により現金減少"
              : "負債増加により現金増加",
        },
      };

    case CF_ITEM_TYPES.PL_ADJUSTMENT:
      return {
        ...baseAttributes,
        sourceAccount: {
          ...baseAttributes.sourceAccount,
          plCategory: options.plCategory || "other",
        },
        cfImpact: {
          multiplier: options.multiplier || 1,
          description: options.description || "PL項目の非資金調整",
        },
      };

    default:
      return baseAttributes;
  }
};

/**
 * BS変動項目を生成する（改善版）
 */
export const createBSChangeAccount = (bsAccount, orderCounter) => {
  const cfItemAttributes = createCFItemAttributes(
    CF_ITEM_TYPES.BS_CHANGE,
    bsAccount
  );

  return {
    id: `cf-bs-change-${bsAccount.id}`,
    accountName: `${bsAccount.accountName}の増減`,
    parentAccountId: "ope-cf-total",

    // シート情報
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.CF,
    },

    // ストック属性は持たない（フロー科目なので）
    stockAttributes: null,

    // フロー属性
    flowAttributes: {
      // parameterは持たない（CF項目は派生的な存在なので）
      parameter: null,

      // CF調整情報も不要（これ自体がCF項目）
      cfAdjustment: null,

      // CF項目専用の属性
      cfItemAttributes,
    },

    // 表示順序
    displayOrder: {
      order: `CF2${orderCounter.toString().padStart(2, "0")}`,
      prefix: "CF",
    },
  };
};

/**
 * PL調整項目を生成する
 */
export const createPLAdjustmentAccount = (plAccount, options = {}) => {
  const cfItemAttributes = createCFItemAttributes(
    CF_ITEM_TYPES.PL_ADJUSTMENT,
    plAccount,
    options
  );

  return {
    id: `cf-pl-adj-${plAccount.id}`,
    accountName: `${plAccount.accountName}（CF調整）`,
    parentAccountId: "ope-cf-total",

    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.CF,
    },

    stockAttributes: null,

    flowAttributes: {
      parameter: null,
      cfAdjustment: null,
      cfItemAttributes,
    },

    displayOrder: {
      order: `CF1${(options.orderCounter || 1).toString().padStart(2, "0")}`,
      prefix: "CF",
    },
  };
};

/**
 * CF項目の値を計算する専用関数
 */
export const calculateCFItemValue = (
  cfAccount,
  newPeriod,
  lastPeriod,
  values,
  accounts
) => {
  const cfAttrs = cfAccount.flowAttributes?.cfItemAttributes;

  if (!cfAttrs) {
    throw new Error(`CF項目属性が見つかりません: ${cfAccount.accountName}`);
  }

  switch (cfAttrs.cfItemType) {
    case CF_ITEM_TYPES.BS_CHANGE: {
      // 元のBS科目の値を取得
      const currentValue = getValue(
        values,
        cfAttrs.sourceAccount.accountId,
        newPeriod.id
      );
      const previousValue = getValue(
        values,
        cfAttrs.sourceAccount.accountId,
        lastPeriod.id
      );

      // 変動額を計算
      const change = currentValue - previousValue;

      // CF影響額を計算（符号調整込み）
      const cfImpact = change * cfAttrs.cfImpact.multiplier;

      console.log(`CF計算: ${cfAccount.accountName}`);
      console.log(`  元BS科目: ${cfAttrs.sourceAccount.accountName}`);
      console.log(`  当期: ${currentValue}, 前期: ${previousValue}`);
      console.log(`  変動: ${change}`);
      console.log(`  CF影響: ${cfImpact} (×${cfAttrs.cfImpact.multiplier})`);

      return cfImpact;
    }

    case CF_ITEM_TYPES.PL_ADJUSTMENT: {
      // PL項目の非資金調整（例：減価償却費）
      const currentValue = getValue(
        values,
        cfAttrs.sourceAccount.accountId,
        newPeriod.id
      );
      const cfImpact = currentValue * cfAttrs.cfImpact.multiplier;

      console.log(`CF調整計算: ${cfAccount.accountName}`);
      console.log(`  元PL科目: ${cfAttrs.sourceAccount.accountName}`);
      console.log(`  当期値: ${currentValue}`);
      console.log(`  CF影響: ${cfImpact} (×${cfAttrs.cfImpact.multiplier})`);

      return cfImpact;
    }

    case CF_ITEM_TYPES.OTHER: {
      // その他のCF項目（CAPEX投資CFなど）
      const currentValue = getValue(
        values,
        cfAttrs.sourceAccount.accountId,
        newPeriod.id
      );
      const cfImpact = currentValue * cfAttrs.cfImpact.multiplier;

      console.log(`その他CF計算: ${cfAccount.accountName}`);
      console.log(`  元科目: ${cfAttrs.sourceAccount.accountName}`);
      console.log(`  当期値: ${currentValue}`);
      console.log(`  CF影響: ${cfImpact} (×${cfAttrs.cfImpact.multiplier})`);

      return cfImpact;
    }

    default:
      throw new Error(`未知のCF項目タイプ: ${cfAttrs.cfItemType}`);
  }
};

/**
 * 値取得のヘルパー関数
 */
const getValue = (values, accountId, periodId) => {
  const valueRecord = values.find(
    (v) => v.accountId === accountId && v.periodId === periodId
  );
  return valueRecord ? valueRecord.value : 0;
};

/**
 * アカウントがCF項目かどうかを判定
 */
export const isCFItem = (account) => {
  return account.flowAttributes?.cfItemAttributes != null;
};

/**
 * CF項目のタイプを取得
 */
export const getCFItemType = (account) => {
  return account.flowAttributes?.cfItemAttributes?.cfItemType || null;
};

/**
 * CF項目の元となる科目IDを取得
 */
export const getCFItemSourceAccountId = (account) => {
  return (
    account.flowAttributes?.cfItemAttributes?.sourceAccount?.accountId || null
  );
};

/**
 * CF項目のCF影響情報を取得
 */
export const getCFItemImpact = (account) => {
  return account.flowAttributes?.cfItemAttributes?.cfImpact || null;
};

/**
 * BS科目からCF項目が必要かどうかを判定
 */
export const shouldCreateCFItem = (bsAccount) => {
  // パラメータベースのBS科目のみCF項目を作成
  const hasParameter = bsAccount.stockAttributes?.isParameterBased === true;

  // 現預金は除外（別途計算される）
  const isCash = bsAccount.id === "cash-total";

  return hasParameter && !isCash;
};

/**
 * CF項目をフィルタリングする
 */
export const filterCFItems = (accounts) => {
  return accounts.filter(isCFItem);
};

/**
 * 通常の科目をフィルタリングする
 */
export const filterRegularAccounts = (accounts) => {
  return accounts.filter((account) => !isCFItem(account));
};

/**
 * CF項目の依存関係を抽出する
 */
export const extractCFItemDependencies = (cfAccount) => {
  const cfAttrs = cfAccount.flowAttributes?.cfItemAttributes;
  if (!cfAttrs) return [];

  const dependencies = [];

  // 元となる科目への依存
  const sourceAccountId = cfAttrs.sourceAccount?.accountId;
  if (sourceAccountId) {
    dependencies.push(sourceAccountId);
  }

  // BS変動の場合は自分自身の前期値にも依存
  if (cfAttrs.cfItemType === CF_ITEM_TYPES.BS_CHANGE) {
    dependencies.push(sourceAccountId); // 前期値のため重複だが明示的に
  }

  return dependencies;
};
