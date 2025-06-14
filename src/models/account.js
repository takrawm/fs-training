import {
  SUMMARY_ACCOUNTS,
  DEFAULT_SHEET_TYPES,
  SHEET_TYPES,
  PARAMETER_TYPES,
  OPERATIONS,
} from "../utils/constants";

/**
 * 初期マッピングデータを生成する
 * @param {Array} flattenedRows フラット化されたデータ行
 * @returns {Array} 初期マッピングデータ
 */
export const createInitialMappingData = (flattenedRows) => {
  if (!flattenedRows || flattenedRows.length === 0) return [];

  return flattenedRows.map((row, idx) => {
    const name = row[0]?.toString().trim();
    return {
      id: `row-${idx}`,
      originalAccount: name,
      modelAccount: name,
    };
  });
};

/**
 * パラメータ参照を新しい構造に変換する
 * @param {Array} oldReferences 旧形式の参照配列
 * @returns {Array} 新形式の参照配列
 */
const convertParameterReferences = (oldReferences) => {
  if (!oldReferences || !Array.isArray(oldReferences)) {
    return [];
  }

  return oldReferences.map((ref) => ({
    accountId: ref.id,
    operation: ref.operation || OPERATIONS.ADD,
    lag: ref.lag || 0,
  }));
};

/**
 * 集計マップを生成する（改善版構造）
 * @param {Array} flattenedRows フラット化されたデータ行
 * @param {Array} mappingData マッピングデータ
 * @returns {Object} 集計マップ
 */
export const createAggregatedMap = (flattenedRows, mappingData) => {
  const newAggregatedMap = {};

  flattenedRows.forEach((row, idx) => {
    const key = mappingData[idx]?.modelAccount || row[0];
    if (!key) return;

    const values = row.slice(1).map((v) => Number(v) || 0);

    if (!newAggregatedMap[key]) {
      // デフォルト設定を取得
      const defaultConfig = DEFAULT_SHEET_TYPES[key] || {};

      // 新しいアカウント構造で作成
      const accountId = `account-${Object.keys(newAggregatedMap).length}`;

      // 基本情報
      const baseAccount = {
        id: accountId,
        accountName: key,
        parentAccountId: defaultConfig.parentAccountId || null,
      };

      // シート情報
      const sheet = defaultConfig.sheet || {
        sheetType: SHEET_TYPES.FLOW,
        name: "pl",
      };

      // パラメータタイプから適切な構造を作成
      let account;

      if (sheet.sheetType === SHEET_TYPES.STOCK) {
        // ストック科目の場合
        account = {
          ...baseAccount,
          sheet,
          stockAttributes: defaultConfig.stockAttributes || {
            bsType: "ASSET",
            isParameterBased:
              defaultConfig.parameterType !== PARAMETER_TYPES.NONE,
            parameter: null,
          },
          flowAttributes: null,
          displayOrder: {
            order: null,
            prefix: null,
          },
        };

        // パラメータ設定（修正版：stockAttributesの中にparameterを配置）
        if (account.stockAttributes.isParameterBased) {
          const parameter = {
            paramType: defaultConfig.parameterType,
            paramValue: null,
            paramReferences: [],
          };

          if (defaultConfig.parameterType === PARAMETER_TYPES.PROPORTIONATE) {
            // PROPORTIONATEの場合
            if (defaultConfig.defaultReferences) {
              parameter.paramReferences = convertParameterReferences(
                defaultConfig.defaultReferences
              );
            }
          } else if (
            defaultConfig.parameterType === PARAMETER_TYPES.GROWTH_RATE
          ) {
            // GROWTH_RATEの場合
            parameter.paramValue = defaultConfig.defaultParamValue || 0.05;
          } else if (
            defaultConfig.parameterType === PARAMETER_TYPES.BALANCE_AND_CHANGE
          ) {
            // BALANCE_AND_CHANGEの場合
            if (defaultConfig.defaultReferences) {
              parameter.paramReferences = convertParameterReferences(
                defaultConfig.defaultReferences
              );
            }
          }

          account.stockAttributes.parameter = parameter;
        }
      } else {
        // フロー科目の場合
        account = {
          ...baseAccount,
          sheet,
          stockAttributes: null,
          flowAttributes: {
            parameter: null, // 後で設定
            cfAdjustment: defaultConfig.flowAttributes?.cfAdjustment || null,
          },
          displayOrder: {
            order: null,
            prefix: null,
          },
        };

        // パラメータ設定（修正版：必ずflowAttributesの中に配置）
        if (defaultConfig.flowAttributes?.parameter) {
          // 新構造で既に定義されている場合はそのまま使用
          account.flowAttributes.parameter =
            defaultConfig.flowAttributes.parameter;
        } else if (
          defaultConfig.parameterType &&
          defaultConfig.parameterType !== PARAMETER_TYPES.NONE
        ) {
          // 旧構造からの変換
          const parameter = {
            paramType: defaultConfig.parameterType,
            paramValue: null,
            paramReferences: null,
          };

          // パラメータタイプ別の設定
          if (
            [PARAMETER_TYPES.GROWTH_RATE, PARAMETER_TYPES.PERCENTAGE].includes(
              defaultConfig.parameterType
            )
          ) {
            parameter.paramValue = defaultConfig.defaultParamValue || 0;
          }

          if (
            [
              PARAMETER_TYPES.PERCENTAGE,
              PARAMETER_TYPES.PROPORTIONATE,
              PARAMETER_TYPES.CALCULATION,
            ].includes(defaultConfig.parameterType)
          ) {
            if (defaultConfig.defaultReferences) {
              parameter.paramReferences = convertParameterReferences(
                defaultConfig.defaultReferences
              );
            } else if (defaultConfig.parameterReferenceAccounts) {
              parameter.paramReferences = convertParameterReferences(
                defaultConfig.parameterReferenceAccounts
              );
            }
          }

          account.flowAttributes.parameter = parameter;
        }
      }

      // 値を追加
      account.values = [...values];

      newAggregatedMap[key] = account;
    } else {
      // 既存のアカウントに値を加算
      newAggregatedMap[key].values = newAggregatedMap[key].values.map(
        (sum, i) => sum + (values[i] || 0)
      );
    }
  });

  return newAggregatedMap;
};

/**
 * アカウントが正しい構造かチェックする
 * @param {Object} account アカウント
 * @returns {Object} バリデーション結果
 */
export const validateAccount = (account) => {
  const errors = [];

  // 基本的なバリデーション
  if (!account.id) errors.push("ID is required");
  if (!account.accountName) errors.push("Account name is required");
  if (!account.sheet?.sheetType) errors.push("Sheet type is required");

  // シートタイプ別のバリデーション
  if (account.sheet?.sheetType === SHEET_TYPES.FLOW) {
    if (account.stockAttributes !== null) {
      errors.push("Flow account should have null stockAttributes");
    }
    if (!account.flowAttributes) {
      errors.push("Flow account must have flowAttributes");
    }
  } else if (account.sheet?.sheetType === SHEET_TYPES.STOCK) {
    if (account.flowAttributes !== null) {
      errors.push("Stock account should have null flowAttributes");
    }
    if (!account.stockAttributes) {
      errors.push("Stock account must have stockAttributes");
    }
    if (!account.stockAttributes?.bsType) {
      errors.push("Stock account must have bsType");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * ソートされたアカウントリストを生成する（改善版）
 * @param {Array} accounts アカウント配列
 * @returns {Array} ソートされたアカウント配列
 */
export const createSortedAccounts = (accounts) => {
  const filteredAccounts = accounts
    .filter((account) => account.parentAccountId !== "集約科目")
    .map((account) => ({
      ...account,
    }));

  const prefixMap = {};
  Object.values(SUMMARY_ACCOUNTS).forEach((account) => {
    prefixMap[account.accountName] = account.displayOrder.prefix;
  });

  const counterMap = {};

  // displayOrderを設定
  const accountsWithOrder = filteredAccounts.map((account) => {
    // 親科目名を取得（親科目IDから逆引き）
    let parentAccountName = null;
    if (account.parentAccountId) {
      const parentAccount = Object.values(SUMMARY_ACCOUNTS).find(
        (summary) => summary.id === account.parentAccountId
      );
      if (parentAccount) {
        parentAccountName = parentAccount.accountName;
      }
    }

    if (!parentAccountName) return account;

    const prefix = prefixMap[parentAccountName];
    if (!prefix) return account;

    counterMap[parentAccountName] = (counterMap[parentAccountName] || 0) + 1;

    return {
      ...account,
      displayOrder: {
        order: `${prefix}${counterMap[parentAccountName]}`,
        prefix: prefix,
      },
    };
  });

  // 集計科目を追加
  const sortedAccounts = [...accountsWithOrder];
  Object.values(SUMMARY_ACCOUNTS).forEach((summaryAccount) => {
    if (sortedAccounts.some((account) => account.id === summaryAccount.id)) {
      return;
    }

    sortedAccounts.push({
      ...summaryAccount,
      sheetType: { sheet: summaryAccount.sheet.name, attribute: null },
      parentAccount: "SUMMARY_ACCOUNTS",
    });
  });

  // ソート実行
  sortedAccounts.sort((a, b) => {
    const orderA = a.displayOrder?.order || a.order;
    const orderB = b.displayOrder?.order || b.order;

    if (!orderA) return 1;
    if (!orderB) return -1;
    if (orderA < orderB) return -1;
    if (orderA > orderB) return 1;
    return 0;
  });

  return sortedAccounts;
};

/**
 * アカウントタイプ判定ユーティリティ
 */
export const AccountUtils = {
  isStockAccount(account) {
    return account.sheet?.sheetType === SHEET_TYPES.STOCK;
  },

  isFlowAccount(account) {
    return account.sheet?.sheetType === SHEET_TYPES.FLOW;
  },

  hasParameter(account) {
    if (this.isStockAccount(account)) {
      return account.stockAttributes?.isParameterBased === true;
    }
    return account.flowAttributes?.parameter != null;
  },

  getCFAdjustment(account) {
    if (this.isFlowAccount(account)) {
      return account.flowAttributes?.cfAdjustment;
    }
    return null;
  },

  getParameterReferences(account) {
    if (
      this.isStockAccount(account) &&
      account.stockAttributes?.parameter?.paramReferences
    ) {
      return account.stockAttributes.parameter.paramReferences;
    }
    if (
      this.isFlowAccount(account) &&
      account.flowAttributes?.parameter?.paramReferences
    ) {
      return account.flowAttributes.parameter.paramReferences;
    }
    return [];
  },
};
