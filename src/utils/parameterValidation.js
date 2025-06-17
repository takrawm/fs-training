import { PARAMETER_TYPES } from "./constants.js";
import { ParameterUtils } from "./parameterUtils.js";
import { isCFItem, getCFItemType } from "./cfItemUtils.js";

/**
 * 旧構造を検出してエラーを投げる
 * データ読み込み時に使用
 * @param {Object} account アカウント
 */
export const detectLegacyStructure = (account) => {
  const param = ParameterUtils.getParameter(account);
  if (!param) return;

  const errors = [];

  switch (param.paramType) {
    case PARAMETER_TYPES.PERCENTAGE:
    case PARAMETER_TYPES.PROPORTIONATE:
    case PARAMETER_TYPES.REFERENCE:
      // 配列形式が使用されている場合
      if (Array.isArray(param.paramReferences)) {
        errors.push({
          account: account.accountName || account.id,
          paramType: param.paramType,
          issue: `旧構造：paramReferences配列が使用されています。単一オブジェクト形式を使用してください。`,
          currentStructure: { paramReferences: param.paramReferences },
          expectedStructure: {
            paramReferences: {
              accountId: "...",
              operation: "MUL",
              lag: 0,
            },
          },
        });
      }
      // paramReferencesが存在しない場合
      if (!param.paramReferences) {
        errors.push({
          account: account.accountName || account.id,
          paramType: param.paramType,
          issue: `必須プロパティparamReferencesが存在しません。`,
          currentStructure: param,
          expectedStructure: {
            paramReferences: {
              accountId: "...",
              operation: "MUL",
              lag: 0,
            },
          },
        });
      }
      break;

    case PARAMETER_TYPES.CALCULATION:
      // paramReferencesが配列でない場合
      if (param.paramReferences && !Array.isArray(param.paramReferences)) {
        errors.push({
          account: account.accountName || account.id,
          paramType: param.paramType,
          issue: `paramReferencesが配列ではありません。`,
          currentStructure: { paramReferences: param.paramReferences },
          expectedStructure: {
            paramReferences: [
              { accountId: "...", operation: "ADD", lag: 0 },
              { accountId: "...", operation: "SUB", lag: 0 },
            ],
          },
        });
      }
      // paramReferencesが存在しない場合
      if (!param.paramReferences) {
        errors.push({
          account: account.accountName || account.id,
          paramType: param.paramType,
          issue: `必須プロパティparamReferences配列が存在しません。`,
          currentStructure: param,
          expectedStructure: {
            paramReferences: [{ accountId: "...", operation: "ADD", lag: 0 }],
          },
        });
      }
      break;
  }

  if (errors.length > 0) {
    const errorMessage = errors
      .map(
        (e) =>
          `\n[${e.account}] ${e.paramType}: ${e.issue}\n` +
          `  現在の構造: ${JSON.stringify(e.currentStructure, null, 2)}\n` +
          `  期待される構造: ${JSON.stringify(e.expectedStructure, null, 2)}`
      )
      .join("\n");

    throw new Error(`旧構造が検出されました：${errorMessage}`);
  }
};

/**
 * 依存関係抽出（エラー強化版）
 * @param {Object} account アカウント
 * @returns {Array} 依存するアカウントIDの配列
 */
export function extractAccountDependencies(account) {
  const dependencies = [];

  try {
    // CF項目は専用の依存関係抽出を使用
    if (isCFItem(account)) {
      const cfAttrs = account.flowAttributes?.cfItemAttributes;
      if (cfAttrs?.sourceAccount?.accountId) {
        dependencies.push(cfAttrs.sourceAccount.accountId);
      }
      return dependencies;
    }

    const parameterReferences = ParameterUtils.getParameterReferences(account);
    const parameterType = ParameterUtils.getParameterType(account);

    // 単一参照の場合
    if (ParameterUtils.isSingleReference(account) && parameterReferences) {
      const accountId = parameterReferences.accountId;
      if (!accountId) {
        throw new Error(
          `参照アカウントIDが見つかりません。アカウント: ${
            account.accountName || account.id
          }`
        );
      }
      if (!dependencies.includes(accountId)) {
        dependencies.push(accountId);
      }
    }
    // 複数参照の場合
    else if (
      ParameterUtils.isMultipleReferences(account) &&
      parameterReferences
    ) {
      parameterReferences.forEach((ref, index) => {
        const accountId = ref.accountId;
        if (!accountId) {
          throw new Error(
            `参照アカウントIDが見つかりません。アカウント: ${
              account.accountName || account.id
            }, インデックス: ${index}`
          );
        }
        if (!dependencies.includes(accountId)) {
          dependencies.push(accountId);
        }
      });
    }

    // PROPORTIONATE の特別処理（自分自身への依存）
    if (parameterType === PARAMETER_TYPES.PROPORTIONATE) {
      if (!dependencies.includes(account.id)) {
        dependencies.push(account.id); // 前期の自分自身
      }
    }
  } catch (error) {
    // エラー情報を拡張して再throw
    error.message = `依存関係抽出エラー [${
      account.accountName || account.id
    }]: ${error.message}`;
    throw error;
  }

  return dependencies;
}

/**
 * 全アカウントの構造を検証
 * アプリケーション起動時やデータ読み込み時に使用
 * @param {Array} accounts 全アカウント配列
 * @returns {Object} 検証結果
 */
export const validateAllAccountStructures = (accounts) => {
  const validationResults = {
    valid: true,
    errors: [],
    warnings: [],
  };

  accounts.forEach((account) => {
    try {
      // 旧構造の検出
      detectLegacyStructure(account);

      // パラメータ参照の取得テスト
      const param = ParameterUtils.getParameter(account);
      if (param) {
        ParameterUtils.getParameterReferences(account);

        // 依存関係抽出テスト
        extractAccountDependencies(account);
      }
    } catch (error) {
      validationResults.valid = false;
      validationResults.errors.push({
        account: account.accountName || account.id,
        error: error.message,
        stack: error.stack,
      });
    }
  });

  if (!validationResults.valid) {
    console.error("アカウント構造検証エラー:", validationResults);
    throw new Error(
      `アカウント構造に問題があります。${validationResults.errors.length}件のエラーが検出されました。` +
        `詳細はコンソールを確認してください。`
    );
  }

  return validationResults;
};

/**
 * アプリケーションのエントリーポイントでの使用例
 * @param {Array} accounts 全アカウント配列
 */
export const initializeApplication = (accounts) => {
  try {
    // 全アカウントの構造を検証
    validateAllAccountStructures(accounts);

    // 検証に成功した場合のみ処理を続行
    console.log("アカウント構造検証: OK");

    // AST構築などの後続処理...
  } catch (error) {
    // 旧構造が検出された場合はここでエラーとなる
    console.error("初期化エラー:", error);
    throw error;
  }
};

/**
 * パラメータの詳細バリデーション
 * @param {Object} account アカウント
 * @returns {Object} 詳細な検証結果
 */
export const validateParameterDetails = (account) => {
  const result = {
    valid: true,
    errors: [],
    warnings: [],
    info: [],
  };

  const param = ParameterUtils.getParameter(account);
  if (!param) {
    result.info.push("パラメータが設定されていません");
    return result;
  }

  const paramType = param.paramType;

  // パラメータタイプ別の詳細検証
  switch (paramType) {
    case PARAMETER_TYPES.GROWTH_RATE:
      if (typeof param.paramValue !== "number") {
        result.valid = false;
        result.errors.push("GROWTH_RATEには数値のparamValueが必要です");
      } else {
        if (param.paramValue > 1 || param.paramValue < -0.5) {
          result.warnings.push(
            `異常な成長率が設定されています: ${param.paramValue * 100}%`
          );
        }
      }
      break;

    case PARAMETER_TYPES.PERCENTAGE:
      if (typeof param.paramValue !== "number") {
        result.valid = false;
        result.errors.push("PERCENTAGEには数値のparamValueが必要です");
      }
      if (!param.paramReferences?.accountId) {
        result.valid = false;
        result.errors.push("PERCENTAGEには参照先accountIdが必要です");
      }
      break;

    case PARAMETER_TYPES.PROPORTIONATE:
      if (!param.paramReferences?.accountId) {
        result.valid = false;
        result.errors.push("PROPORTIONATEには参照先accountIdが必要です");
      }
      break;

    case PARAMETER_TYPES.REFERENCE:
      if (!param.paramReferences?.accountId) {
        result.valid = false;
        result.errors.push("REFERENCEには参照先accountIdが必要です");
      }
      break;

    case PARAMETER_TYPES.CALCULATION:
      if (
        !Array.isArray(param.paramReferences) ||
        param.paramReferences.length === 0
      ) {
        result.valid = false;
        result.errors.push("CALCULATIONには参照配列が必要です");
      } else {
        param.paramReferences.forEach((ref, index) => {
          if (!ref.accountId) {
            result.valid = false;
            result.errors.push(`CALCULATION[${index}]: accountIdが必要です`);
          }
          if (!ref.operation) {
            result.valid = false;
            result.errors.push(`CALCULATION[${index}]: operationが必要です`);
          }
        });
      }
      break;
  }

  return result;
};
