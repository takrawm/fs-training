import { buildFormula } from "./src/utils/astBuilder.js";
import { PARAMETER_TYPES, OPERATIONS } from "./src/utils/constants.js";
import { createNode, AST_OPERATIONS } from "./src/utils/astTypes.js";

// ParameterUtilsのモックも追加
const ParameterUtils = {
  getParameterType: (account) => account.parameter?.paramType,
  getParameterValue: (account) => account.parameter?.paramValue,
  getParameterReferences: (account) => account.parameter?.paramReferences,
  hasParameter: (account) => Boolean(account.parameter),
};

// グローバルに設定
global.ParameterUtils = ParameterUtils;

// テスト用のモックアカウント
const mockAccounts = [
  {
    id: "op-profit",
    accountName: "営業利益",
    isCredit: true,
    flowAttributes: { baseProfit: true },
  },
  {
    id: "depreciation",
    accountName: "減価償却費",
    isCredit: false,
    flowAttributes: {
      cfAdjustment: {
        operation: OPERATIONS.SUB,
        targetAccountId: "ppe-account",
        cfCategory: "OPERATING",
      },
    },
  },
  {
    id: "ppe-account",
    accountName: "有形固定資産",
    isCredit: false,
  },
  {
    id: "accounts-receivable",
    accountName: "売掛金",
    isCredit: false,
    stockAttributes: { generatesCFItem: true },
  },
  {
    id: "accounts-payable",
    accountName: "買掛金",
    isCredit: true,
    stockAttributes: { generatesCFItem: true },
  },
  {
    id: "cash-flow-change",
    accountName: "当期現預金の増減",
    parameter: {
      paramType: PARAMETER_TYPES.CASH_CHANGE_CALCULATION,
      paramValue: null,
      paramReferences: null,
    },
  },
];

// AccountUtils のモック
global.AccountUtils = {
  getBaseProfit: (acc) => acc.flowAttributes?.baseProfit === true,
  getCFAdjustment: (acc) => acc.flowAttributes?.cfAdjustment || null,
  shouldGenerateCFItem: (acc) => acc.stockAttributes?.generatesCFItem === true,
};

// テスト実行
console.log("=== CASH_CHANGE_CALCULATION AST構築テスト ===");

try {
  const testAccount = mockAccounts.find((acc) => acc.id === "cash-flow-change");
  const result = buildFormula(testAccount, 2024, mockAccounts);

  console.log("構築されたAST:");
  console.log(JSON.stringify(result, null, 2));

  // 期待される構造の検証
  if (result && result.operation === AST_OPERATIONS.ADD) {
    console.log("✓ 正しくADDノードが構築されました");
    console.log(`✓ 引数の数: ${result.args.length}`);
  } else {
    console.error("✗ ASTの構造が期待と異なります");
  }
} catch (error) {
  console.error("テスト実行エラー:", error.message);
}

console.log("=== テスト完了 ===");
