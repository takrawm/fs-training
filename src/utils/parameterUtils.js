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
   * パラメータ参照を取得
   * @param {Object} account アカウント
   * @returns {Array|Object} パラメータ参照（配列または単一オブジェクト）
   */
  getParameterReferences(account) {
    const param = this.getParameter(account);
    if (!param?.paramReferences) {
      return [];
    }

    // 既に配列の場合はそのまま返す
    if (Array.isArray(param.paramReferences)) {
      return param.paramReferences;
    }

    // 単一オブジェクトの場合はそのまま返す（配列に変換しない）
    return param.paramReferences;
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
};
