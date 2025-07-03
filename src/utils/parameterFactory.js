// ========================================
// パラメータファクトリの完全実装
// ========================================

import { PARAMETER_TYPES, OPERATIONS } from "./constants.js";

/**
 * 包括的なパラメータファクトリ
 * すべてのパラメータタイプに対して一貫した作成方法を提供
 */
export const ParameterFactory = {
  /**
   * NONE: パラメータなし
   * 使用例：実績値の入力科目など
   *
   * このタイプは実際にはパラメータを持たないが、
   * 一貫性のためにファクトリメソッドを提供
   */
  createNone() {
    return null; // またはパラメータプロパティ自体を省略
  },

  /**
   * GROWTH_RATE: 成長率
   * 使用例：売上高の年次成長率5%など
   *
   * @param {number} rate - 成長率（0.05 = 5%）
   * @returns {Object} パラメータオブジェクト
   */
  createGrowthRate(rate = 0.05) {
    // 成長率の妥当性チェック
    if (typeof rate !== "number" || isNaN(rate)) {
      throw new Error("成長率は数値である必要があります");
    }

    // 異常な成長率に対する警告
    if (rate > 1 || rate < -0.5) {
      console.warn(`異常な成長率が設定されています: ${rate * 100}%`);
    }

    return {
      paramType: PARAMETER_TYPES.GROWTH_RATE,
      paramValue: rate,
      paramReferences: null, // 成長率は他科目を参照しない
    };
  },

  /**
   * PERCENTAGE: 他科目割合
   * 使用例：広告宣伝費 = 売上高 × 2%
   *
   * @param {string} baseAccountId - 基準となる科目ID
   * @param {number} percentage - 割合（0.02 = 2%）
   * @returns {Object} パラメータオブジェクト
   */
  createPercentage(baseAccountId, percentage = 0.02) {
    if (!baseAccountId) {
      throw new Error("基準科目IDが必要です");
    }

    if (typeof percentage !== "number" || isNaN(percentage)) {
      throw new Error("割合は数値である必要があります");
    }

    // PERCENTAGEは単一の基準科目に対する割合
    // PROPORTIONATEと同様に単一参照型として実装
    return {
      paramType: PARAMETER_TYPES.PERCENTAGE,
      paramValue: percentage,
      paramReferences: {
        accountId: baseAccountId,
        operation: OPERATIONS.MUL, // 掛け算
        lag: 0,
      },
    };
  },

  /**
   * PROPORTIONATE: 他科目連動
   * 使用例：売掛金が売上高の成長率に連動
   *
   * @param {string} referenceAccountId - 連動先科目ID
   * @returns {Object} パラメータオブジェクト
   */
  createProportionate(referenceAccountId) {
    if (!referenceAccountId) {
      throw new Error("連動先科目IDが必要です");
    }

    // PROPORTIONATEは概念的に単一の科目に連動するため、
    // 単一オブジェクトとして定義（配列ではない）
    return {
      paramType: PARAMETER_TYPES.PROPORTIONATE,
      paramValue: null, // 連動なので固定値は持たない
      paramReferences: {
        accountId: referenceAccountId,
        operation: OPERATIONS.MUL, // 連動は乗算
        lag: 0,
      },
    };
  },

  /**
   * FIXED_VALUE: 横置き（前期値をそのまま使用）
   * 使用例：資本金など変動しない項目
   *
   * 横置きは前期の値をそのまま使用するため、
   * パラメータとしては特別な設定は不要
   */
  createFixedValue() {
    return {
      paramType: PARAMETER_TYPES.FIXED_VALUE,
      paramValue: null,
      paramReferences: null,
    };
  },

  /**
   * CHILDREN_SUM: 子要素の合計
   * 使用例：売上高合計、売上原価合計など
   *
   * 子要素は親子関係から動的に決定されるため、
   * パラメータとしては参照を持たない
   */
  createChildrenSum() {
    return {
      paramType: PARAMETER_TYPES.CHILDREN_SUM,
      paramValue: null,
      paramReferences: null,
    };
  },

  /**
   * CALCULATION: 個別計算（複数科目の四則演算）
   * 使用例：売上総利益 = 売上高 - 売上原価
   *
   * @param {Array} calculations - 計算式の配列
   * @returns {Object} パラメータオブジェクト
   */
  createCalculation(calculations) {
    if (!Array.isArray(calculations) || calculations.length === 0) {
      throw new Error("計算式の配列が必要です");
    }

    // 最初の要素は演算子を持たない（または ADD）
    const normalizedCalculations = calculations.map((calc, index) => {
      if (index === 0 && !calc.operation) {
        // 最初の要素にはADDをデフォルトで設定
        return {
          accountId: calc.accountId,
          operation: OPERATIONS.ADD,
          lag: calc.lag || 0,
        };
      }

      // 演算子の妥当性チェック
      if (
        !calc.operation ||
        !Object.values(OPERATIONS).includes(calc.operation)
      ) {
        throw new Error(`無効な演算子: ${calc.operation}`);
      }

      return {
        accountId: calc.accountId,
        operation: calc.operation,
        lag: calc.lag || 0,
      };
    });

    return {
      paramType: PARAMETER_TYPES.CALCULATION,
      paramValue: null,
      paramReferences: normalizedCalculations, // 配列形式
    };
  },

  /**
   * REFERENCE: 単純参照
   * 使用例：営業利益をそのまま参照
   *
   * @param {string} referenceAccountId - 参照先科目ID
   * @returns {Object} パラメータオブジェクト
   */
  createReference(referenceAccountId) {
    if (!referenceAccountId) {
      throw new Error("参照先科目IDが必要です");
    }

    // REFERENCEは単一の値をそのまま参照
    // 構造的にはPROPORTIONATEに似ているが、意味が異なる
    return {
      paramType: PARAMETER_TYPES.REFERENCE,
      paramValue: null,
      paramReferences: {
        accountId: referenceAccountId,
        operation: OPERATIONS.ADD, // 参照は加算
        lag: 0,
      },
    };
  },

  /**
   * BS_CHANGE: BS変動
   * 使用例：BSの変動を反映する計算
   */
  createBSChange() {
    return {
      paramType: PARAMETER_TYPES.BS_CHANGE,
      paramValue: null,
      paramReferences: null,
    };
  },

  /**
   * CF_ADJUSTMENT_CALC: CF調整計算
   * 使用例：キャッシュフロー調整の計算
   */
  createCFAdjustmentCalc() {
    return {
      paramType: PARAMETER_TYPES.CF_ADJUSTMENT_CALC,
      paramValue: null,
      paramReferences: null,
    };
  },

  /**
   * 現預金増減計算パラメータの作成
   * 間接法によるキャッシュフロー計算
   * CASH_CHANGE_CALCULATION: 現預金増減の間接法計算
   * @returns {Object} 現預金増減計算パラメータ
   */
  createCashChangeCalculation() {
    return {
      paramType: PARAMETER_TYPES.CASH_CHANGE_CALCULATION,
      paramValue: null,
      paramReferences: null,
    };
  },
};

// ========================================
// パラメータタイプの特性を理解するためのヘルパー
// ========================================

/**
 * パラメータタイプの特性を定義
 * これにより、各タイプの使い分けが明確になる
 */
export const PARAMETER_TYPE_CHARACTERISTICS = {
  [PARAMETER_TYPES.NONE]: {
    hasValue: false,
    hasReferences: false,
    description: "パラメータを持たない（実績値入力など）",
  },

  [PARAMETER_TYPES.GROWTH_RATE]: {
    hasValue: true,
    hasReferences: false,
    description: "固定の成長率を適用",
  },

  [PARAMETER_TYPES.PERCENTAGE]: {
    hasValue: true,
    hasReferences: true,
    referenceCount: "single",
    description: "他科目の一定割合",
  },

  [PARAMETER_TYPES.PROPORTIONATE]: {
    hasValue: false,
    hasReferences: true,
    referenceCount: "single",
    description: "他科目の成長率に連動",
  },

  [PARAMETER_TYPES.FIXED_VALUE]: {
    hasValue: false,
    hasReferences: false,
    description: "前期値を維持",
  },

  [PARAMETER_TYPES.CHILDREN_SUM]: {
    hasValue: false,
    hasReferences: false,
    description: "子要素の自動合計",
  },

  [PARAMETER_TYPES.CALCULATION]: {
    hasValue: false,
    hasReferences: true,
    referenceCount: "multiple",
    description: "複数科目の計算式",
  },

  [PARAMETER_TYPES.REFERENCE]: {
    hasValue: false,
    hasReferences: true,
    referenceCount: "single",
    description: "他科目の値を参照",
  },

  [PARAMETER_TYPES.CASH_CHANGE_CALCULATION]: {
    hasValue: false,
    hasReferences: false,
    description: "現預金増減の間接法計算",
  },

  [PARAMETER_TYPES.BS_CHANGE]: {
    hasValue: false,
    hasReferences: false,
    description: "BS変動の計算",
  },

  [PARAMETER_TYPES.CF_ADJUSTMENT_CALC]: {
    hasValue: false,
    hasReferences: false,
    description: "CF調整の計算",
  },

  // 注意: CF項目は通常のパラメータとは異なる構造を持つため、
  // cfItemAttributesを使用し、parameterは使用しない,
};

// ========================================
// 使用例とベストプラクティス
// ========================================

/**
 * パラメータファクトリの使用例
 */
export const parameterExamples = {
  // 売上高：年率5%成長
  salesGrowth: () => {
    return ParameterFactory.createGrowthRate(0.05);
  },

  // 広告宣伝費：売上高の2%
  advertisingExpense: () => {
    return ParameterFactory.createPercentage("rev-total", 0.02);
  },

  // 売掛金：売上高に連動
  accountsReceivable: () => {
    return ParameterFactory.createProportionate("rev-total");
  },

  // 売上総利益：売上高 - 売上原価
  grossProfit: () => {
    return ParameterFactory.createCalculation([
      { accountId: "rev-total", operation: OPERATIONS.ADD },
      { accountId: "cogs-total", operation: OPERATIONS.SUB },
    ]);
  },

  // 資本金：横置き
  capitalStock: () => {
    return ParameterFactory.createFixedValue();
  },

  // 売上高合計：子要素の合計
  totalRevenue: () => {
    return ParameterFactory.createChildrenSum();
  },

  // 営業利益参照：PLの営業利益をそのまま参照
  operatingProfitReference: () => {
    return ParameterFactory.createReference("op-profit");
  },
};

// ========================================
// パラメータの妥当性検証
// ========================================

/**
 * 作成されたパラメータの妥当性を検証
 * @param {Object} parameter - パラメータオブジェクト
 * @returns {Object} 検証結果
 */
export const validateParameter = (parameter) => {
  if (!parameter) {
    return { valid: true, type: PARAMETER_TYPES.NONE };
  }

  const characteristics = PARAMETER_TYPE_CHARACTERISTICS[parameter.paramType];
  if (!characteristics) {
    return {
      valid: false,
      error: `未知のパラメータタイプ: ${parameter.paramType}`,
    };
  }

  const errors = [];

  // 値の検証
  if (characteristics.hasValue && parameter.paramValue == null) {
    errors.push("paramValueが必要です");
  }
  if (!characteristics.hasValue && parameter.paramValue != null) {
    errors.push("このタイプはparamValueを持ちません");
  }

  // 参照の検証
  if (characteristics.hasReferences) {
    const hasArrayRefs = Array.isArray(parameter.paramReferences);
    const hasSingleRef =
      parameter.paramReferences != null &&
      !Array.isArray(parameter.paramReferences);

    if (!hasArrayRefs && !hasSingleRef) {
      errors.push("参照が必要です");
    }

    if (characteristics.referenceCount === "single" && hasArrayRefs) {
      errors.push("単一参照は配列形式ではありません");
    }

    if (characteristics.referenceCount === "multiple" && !hasArrayRefs) {
      errors.push("複数参照は配列形式である必要があります");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    characteristics,
  };
};

// ========================================
// 既存データからのパラメータ作成
// ========================================

/**
 * 既存のパラメータデータから適切なファクトリメソッドを呼び出す
 * @param {Object} parameterData - 既存のパラメータデータ
 * @returns {Object} ファクトリで作成されたパラメータ
 */
export const createParameterFromData = (parameterData) => {
  if (!parameterData || !parameterData.paramType) {
    return ParameterFactory.createNone();
  }

  switch (parameterData.paramType) {
    case PARAMETER_TYPES.GROWTH_RATE:
      return ParameterFactory.createGrowthRate(parameterData.paramValue);

    case PARAMETER_TYPES.PERCENTAGE:
      return ParameterFactory.createPercentage(
        parameterData.paramReferences?.accountId,
        parameterData.paramValue
      );

    case PARAMETER_TYPES.PROPORTIONATE:
      return ParameterFactory.createProportionate(
        parameterData.paramReferences?.accountId
      );

    case PARAMETER_TYPES.FIXED_VALUE:
      return ParameterFactory.createFixedValue();

    case PARAMETER_TYPES.CHILDREN_SUM:
      return ParameterFactory.createChildrenSum();

    case PARAMETER_TYPES.CALCULATION:
      return ParameterFactory.createCalculation(parameterData.paramReferences);

    case PARAMETER_TYPES.REFERENCE:
      return ParameterFactory.createReference(
        parameterData.paramReferences?.accountId
      );

    case PARAMETER_TYPES.BS_CHANGE:
      return ParameterFactory.createBSChange();

    case PARAMETER_TYPES.CF_ADJUSTMENT_CALC:
      return ParameterFactory.createCFAdjustmentCalc();

    case PARAMETER_TYPES.CASH_CHANGE_CALCULATION:
      return ParameterFactory.createCashChangeCalculation();

    default:
      throw new Error(`未対応のパラメータタイプ: ${parameterData.paramType}`);
  }
};
