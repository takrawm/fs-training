import { PARAMETER_TYPES } from "./constants";

/**
 * パラメータ取得の統一化ユーティリティ
 * parameterがトップレベルプロパティになったことでシンプル化
 */
export const ParameterUtils = {
  /**
   * アカウントからパラメータオブジェクトを取得
   * @param {Object} account アカウント
   * @returns {Object|null} パラメータオブジェクト
   */
  getParameter(account) {
    return account.parameter || null;
  },

  /**
   * パラメータタイプを取得
   * @param {Object} account アカウント
   * @returns {string} パラメータタイプ
   */
  getParameterType(account) {
    return account.parameter?.paramType || PARAMETER_TYPES.NONE;
  },

  /**
   * パラメータ値を取得
   * @param {Object} account アカウント
   * @returns {number|null} パラメータ値
   */
  getParameterValue(account) {
    return account.parameter?.paramValue;
  },

  /**
   * パラメータ参照を取得
   * @param {Object} account アカウント
   * @returns {Object|Array|null} パラメータ参照
   */
  getParameterReferences(account) {
    const param = account.parameter;
    if (!param) return null;

    const paramType = param.paramType;

    // 単一参照タイプ
    if (
      [
        PARAMETER_TYPES.PROPORTIONATE,
        PARAMETER_TYPES.PERCENTAGE,
        PARAMETER_TYPES.REFERENCE,
      ].includes(paramType)
    ) {
      if (!param.paramReferences) {
        throw new Error(
          `${paramType}タイプには'paramReferences'プロパティが必要です。` +
            `アカウント: ${account.accountName || account.id}`
        );
      }

      // 配列形式の旧構造を検出
      if (Array.isArray(param.paramReferences)) {
        throw new Error(
          `旧構造が検出されました。${paramType}タイプで配列形式の'paramReferences'が使用されています。` +
            `アカウント: ${account.accountName || account.id}`
        );
      }

      return param.paramReferences;
    }

    // 複数参照タイプ
    if (paramType === PARAMETER_TYPES.CALCULATION) {
      if (!Array.isArray(param.paramReferences)) {
        throw new Error(
          `CALCULATIONタイプには'paramReferences'配列が必要です。` +
            `アカウント: ${account.accountName || account.id}`
        );
      }

      return param.paramReferences;
    }

    // 現預金計算科目の特殊処理
    if (paramType === PARAMETER_TYPES.CASH_BEGINNING_BALANCE) {
      // 単一参照形式
      return param.paramReferences;
    }

    if (paramType === PARAMETER_TYPES.CASH_ENDING_BALANCE) {
      // 複数参照（配列）形式
      return param.paramReferences;
    }

    if (paramType === PARAMETER_TYPES.CASH_FLOW_TOTAL) {
      // 動的計算のため、paramReferencesはnull
      return null;
    }

    // その他の特殊タイプ（CHILDREN_SUM等）
    return null;
  },

  /**
   * パラメータが設定されているかチェック
   * @param {Object} account アカウント
   * @returns {boolean} パラメータが設定されているか
   */
  hasParameter(account) {
    const paramType = this.getParameterType(account);
    return paramType !== PARAMETER_TYPES.NONE && paramType !== null;
  },

  /**
   * 参照が単一か複数かを判定
   * @param {Object} account アカウント
   * @returns {boolean} 単一参照の場合true
   */
  isSingleReference(account) {
    const paramType = this.getParameterType(account);
    return [
      PARAMETER_TYPES.PROPORTIONATE,
      PARAMETER_TYPES.PERCENTAGE,
      PARAMETER_TYPES.REFERENCE,
      PARAMETER_TYPES.CASH_BEGINNING_BALANCE,
    ].includes(paramType);
  },

  /**
   * 参照が複数（配列）かを判定
   * @param {Object} account アカウント
   * @returns {boolean} 複数参照の場合true
   */
  isMultipleReferences(account) {
    const paramType = this.getParameterType(account);
    return (
      paramType === PARAMETER_TYPES.CALCULATION ||
      paramType === PARAMETER_TYPES.CASH_ENDING_BALANCE
    );
  },
};
