import { PARAMETER_TYPES } from "./constants";

/**
 * パラメータ取得の統一化ユーティリティ
 * stock科目とflow科目でパラメータの格納場所が異なるため、統一的にアクセスするためのヘルパー関数群
 */
export const ParameterUtils = {
  /**
   * アカウントからパラメータオブジェクトを取得
   * @param {Object} account アカウント
   * @returns {Object|null} パラメータオブジェクト
   */
  getParameter(account) {
    if (account.stockAttributes?.parameter) {
      return account.stockAttributes.parameter;
    }
    if (account.flowAttributes?.parameter) {
      return account.flowAttributes.parameter;
    }
    return null;
  },

  /**
   * パラメータタイプを取得
   * @param {Object} account アカウント
   * @returns {string} パラメータタイプ
   */
  getParameterType(account) {
    const param = this.getParameter(account);
    return param?.paramType || PARAMETER_TYPES.NONE;
  },

  /**
   * パラメータ値を取得
   * @param {Object} account アカウント
   * @returns {number|null} パラメータ値
   */
  getParameterValue(account) {
    const param = this.getParameter(account);
    return param?.paramValue;
  },

  /**
   * パラメータ参照を取得（新構造のみ対応）
   * 旧構造の場合はエラーを投げる
   * @param {Object} account アカウント
   * @returns {Object|Array|null} パラメータ参照
   */
  getParameterReferences(account) {
    const param = this.getParameter(account);
    if (!param) return null;

    const paramType = param.paramType;

    // 新構造：単一参照（PROPORTIONATE, PERCENTAGE, REFERENCE）
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
            `単一オブジェクト形式を使用するように修正してください。` +
            `アカウント: ${account.accountName || account.id}`
        );
      }

      return param.paramReferences;
    }

    // 新構造：複数参照（CALCULATION）
    if (paramType === PARAMETER_TYPES.CALCULATION) {
      if (!Array.isArray(param.paramReferences)) {
        throw new Error(
          `CALCULATIONタイプには'paramReferences'配列が必要です。` +
            `アカウント: ${account.accountName || account.id}`
        );
      }

      return param.paramReferences;
    }

    return null;
  },

  /**
   * パラメータが設定されているかチェック
   * @param {Object} account アカウント
   * @returns {boolean} パラメータが設定されているか
   */
  hasParameter(account) {
    const paramType = this.getParameterType(account);
    return paramType !== PARAMETER_TYPES.NONE;
  },

  /**
   * パラメータを設定
   * @param {Object} account アカウント
   * @param {string} paramType パラメータタイプ
   * @param {number|null} paramValue パラメータ値
   * @param {Array} paramReferences パラメータ参照配列
   * @returns {Object} 更新されたアカウント
   */
  setParameter(account, paramType, paramValue = null, paramReferences = []) {
    const updatedAccount = { ...account };

    const parameter = {
      paramType,
      paramValue,
      paramReferences,
    };

    if (updatedAccount.stockAttributes) {
      updatedAccount.stockAttributes = {
        ...updatedAccount.stockAttributes,
        parameter,
        isParameterBased: paramType !== PARAMETER_TYPES.NONE,
      };
    } else if (updatedAccount.flowAttributes) {
      updatedAccount.flowAttributes = {
        ...updatedAccount.flowAttributes,
        parameter,
      };
    }

    return updatedAccount;
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
    ].includes(paramType);
  },

  /**
   * 参照が複数（配列）かを判定
   * @param {Object} account アカウント
   * @returns {boolean} 複数参照の場合true
   */
  isMultipleReferences(account) {
    const paramType = this.getParameterType(account);
    return paramType === PARAMETER_TYPES.CALCULATION;
  },
};
