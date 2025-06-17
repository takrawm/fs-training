// ========================================
// Constants.js パラメータ移行ヘルパー
// ========================================

import { ParameterFactory } from "./parameterFactory.js";
import { PARAMETER_TYPES, OPERATIONS } from "./constants.js";

/**
 * パラメータファクトリを使用して一貫したパラメータ定義を作成
 * constants.jsで使用される定義の標準化
 */
export const StandardParameters = {
  /**
   * 売上高関連の成長率パラメータ
   */
  salesGrowth: (rate = 0.05) => ParameterFactory.createGrowthRate(rate),

  /**
   * 売上高連動パラメータ（PROPORTIONATE）
   * 売掛金、棚卸資産などで使用
   */
  salesProportionate: () => ParameterFactory.createProportionate("rev-total"),

  /**
   * 売上高割合パラメータ（PERCENTAGE）
   * 広告宣伝費、その他販管費などで使用
   */
  salesPercentage: (percentage = 0.02) =>
    ParameterFactory.createPercentage("rev-total", percentage),

  /**
   * 固定値パラメータ（FIXED_VALUE）
   * 資本金、減価償却費などで使用
   */
  fixedValue: () => ParameterFactory.createFixedValue(),

  /**
   * 合計値パラメータ（CHILDREN_SUM）
   * 売上高合計、売上原価合計などで使用
   */
  childrenSum: () => ParameterFactory.createChildrenSum(),

  /**
   * 現預金計算パラメータ
   */
  cashCalculation: () => ParameterFactory.createCashCalculation(),

  /**
   * 売上総利益計算（売上高 - 売上原価）
   */
  grossProfitCalculation: () =>
    ParameterFactory.createCalculation([
      { accountId: "rev-total", operation: OPERATIONS.ADD },
      { accountId: "cogs-total", operation: OPERATIONS.SUB },
    ]),

  /**
   * 営業利益計算（売上総利益 - 販管費）
   */
  operatingProfitCalculation: () =>
    ParameterFactory.createCalculation([
      { accountId: "gross-profit", operation: OPERATIONS.ADD },
      { accountId: "sga-total", operation: OPERATIONS.SUB },
    ]),

  /**
   * 営業利益参照（CF計算用）
   */
  operatingProfitReference: () => ParameterFactory.createReference("op-profit"),

  /**
   * カスタム成長率パラメータ
   */
  customGrowthRate: (rate) => ParameterFactory.createGrowthRate(rate),

  /**
   * カスタム割合パラメータ
   */
  customPercentage: (baseAccountId, percentage) =>
    ParameterFactory.createPercentage(baseAccountId, percentage),

  /**
   * カスタム連動パラメータ
   */
  customProportionate: (referenceAccountId) =>
    ParameterFactory.createProportionate(referenceAccountId),
};

/**
 * constants.jsの特定の科目用に最適化されたパラメータ定義
 */
export const AccountSpecificParameters = {
  // PL科目
  商品売上: () => StandardParameters.salesGrowth(0.05),
  サービス売上: () => StandardParameters.salesGrowth(0.05),
  その他売上: () => StandardParameters.salesGrowth(0.05),
  売上高合計: () => StandardParameters.childrenSum(),

  材料費: () => StandardParameters.salesProportionate(),
  労務費: () => StandardParameters.fixedValue(),
  売上原価合計: () => StandardParameters.childrenSum(),
  売上総利益: () => StandardParameters.grossProfitCalculation(),

  人件費: () => StandardParameters.fixedValue(),
  物流費: () => StandardParameters.salesProportionate(), // ❌ operation: null を修正
  減価償却費_PL: () => StandardParameters.fixedValue(),
  無形固定資産償却費_PL: () => StandardParameters.fixedValue(),
  その他販管費: () => StandardParameters.salesPercentage(0.02),
  販管費合計: () => StandardParameters.childrenSum(),
  営業利益: () => StandardParameters.operatingProfitCalculation(),

  // BS科目
  現預金: () => StandardParameters.cashCalculation(),
  売掛金: () => StandardParameters.salesProportionate(), // ❌ operation: null を修正
  棚卸資産: () => StandardParameters.customGrowthRate(0.03),
  流動資産合計: () => StandardParameters.childrenSum(),

  有形固定資産: () => null, // パラメータなし（CF調整で計算）
  無形固定資産: () => null, // パラメータなし
  固定資産合計: () => StandardParameters.childrenSum(),
  資産合計: () => StandardParameters.childrenSum(),

  買掛金: () => StandardParameters.salesProportionate(), // ❌ operation: null を修正
  支払手形: () => StandardParameters.salesProportionate(), // ❌ operation: null を修正
  流動負債合計: () => StandardParameters.childrenSum(),

  長期借入金: () => StandardParameters.customGrowthRate(0.02),
  社債: () => StandardParameters.fixedValue(),
  固定負債合計: () => StandardParameters.childrenSum(),
  負債合計: () => StandardParameters.childrenSum(),

  資本金: () => StandardParameters.fixedValue(),
  利益剰余金: () => null, // 特別計算
  純資産合計: () => StandardParameters.childrenSum(),
  負債及び純資産合計: () => StandardParameters.childrenSum(),

  // CAPEX科目
  有形資産投資: () => StandardParameters.fixedValue(),
  無形資産投資: () => StandardParameters.salesProportionate(),
  設備投資合計: () => StandardParameters.childrenSum(),
};

/**
 * constants.jsの移行実行関数
 * DEFAULT_SHEET_TYPESの各エントリを新構造に変換
 */
export const migrateConstantsParameters = () => {
  const migratedDefinitions = {};

  Object.entries(AccountSpecificParameters).forEach(
    ([accountName, parameterFactory]) => {
      const parameter = parameterFactory();

      if (parameter) {
        migratedDefinitions[accountName] = {
          parameter: parameter,
          // 既存の他のプロパティは保持
          migrated: true,
          migratedAt: new Date().toISOString(),
        };
      } else {
        migratedDefinitions[accountName] = {
          parameter: null,
          migrated: true,
          migratedAt: new Date().toISOString(),
        };
      }
    }
  );

  return migratedDefinitions;
};

/**
 * 移行前後の比較用ヘルパー
 */
export const compareParameterStructures = (oldParameter, newParameter) => {
  const comparison = {
    structureChanged: false,
    changes: [],
    issues: [],
  };

  if (!oldParameter && !newParameter) {
    return comparison;
  }

  if (!oldParameter && newParameter) {
    comparison.structureChanged = true;
    comparison.changes.push("パラメータが新規追加されました");
    return comparison;
  }

  if (oldParameter && !newParameter) {
    comparison.structureChanged = true;
    comparison.changes.push("パラメータが削除されました");
    return comparison;
  }

  // パラメータタイプの比較
  if (oldParameter.paramType !== newParameter.paramType) {
    comparison.structureChanged = true;
    comparison.changes.push(
      `パラメータタイプが変更: ${oldParameter.paramType} → ${newParameter.paramType}`
    );
  }

  // 値の比較
  if (oldParameter.paramValue !== newParameter.paramValue) {
    comparison.structureChanged = true;
    comparison.changes.push(
      `パラメータ値が変更: ${oldParameter.paramValue} → ${newParameter.paramValue}`
    );
  }

  // 参照構造の比較
  const oldRefs = oldParameter.paramReferences;
  const newRefs = newParameter.paramReferences;

  if (JSON.stringify(oldRefs) !== JSON.stringify(newRefs)) {
    comparison.structureChanged = true;
    comparison.changes.push("参照構造が変更されました");

    // operation: null の問題をチェック
    if (oldRefs?.operation === null && newRefs?.operation !== null) {
      comparison.issues.push("operation: null が修正されました");
    }
  }

  return comparison;
};

/**
 * 移行検証用の関数
 */
export const validateMigration = (migratedDefinitions) => {
  const validationResults = {
    valid: true,
    errors: [],
    warnings: [],
    summary: {
      total: 0,
      migrated: 0,
      errors: 0,
      warnings: 0,
    },
  };

  Object.entries(migratedDefinitions).forEach(([accountName, definition]) => {
    validationResults.summary.total++;

    if (definition.migrated) {
      validationResults.summary.migrated++;
    }

    try {
      // パラメータファクトリで作成された構造の検証
      if (definition.parameter) {
        const validation = validateParameter(definition.parameter);
        if (!validation.valid) {
          validationResults.valid = false;
          validationResults.errors.push({
            account: accountName,
            errors: validation.errors,
          });
          validationResults.summary.errors++;
        }

        if (validation.warnings?.length > 0) {
          validationResults.warnings.push({
            account: accountName,
            warnings: validation.warnings,
          });
          validationResults.summary.warnings++;
        }
      }
    } catch (error) {
      validationResults.valid = false;
      validationResults.errors.push({
        account: accountName,
        error: error.message,
      });
      validationResults.summary.errors++;
    }
  });

  return validationResults;
};

// パラメータファクトリからvalidateParameterをインポート
import { validateParameter } from "./parameterFactory.js";
