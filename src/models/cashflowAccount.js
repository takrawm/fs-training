import {
  SHEET_TYPES,
  FLOW_SHEETS,
  PARAMETER_TYPES,
  CF_CATEGORIES,
  OPERATIONS,
  BS_TYPES,
} from "../utils/constants";
import { AccountUtils } from "../utils/accountUtils.js";

/**
 * CF調整項目用のアカウントを生成する
 * @param {Object} sourceAccount - cfAdjustmentを持つ元のアカウント（PL項目など）
 * @param {number} order - 表示順序
 * @returns {Object} CF調整用アカウント
 */
export const createCFAdjustmentAccount = (sourceAccount, order = null) => {
  const cfAdj = AccountUtils.getCFAdjustment(sourceAccount);
  if (!cfAdj) {
    throw new Error("Source account does not have cfAdjustment");
  }

  // CF調整項目の名前を生成（例：「減価償却費（非資金項目）」）
  const accountName = `${sourceAccount.accountName}（非資金項目）`;

  return {
    id: `cf-adj-${sourceAccount.id}`,
    accountName: accountName,
    parentAccountId: getCFParentId(cfAdj.category), // 営業CF合計などの親科目
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.FINANCING,
    },
    stockAttributes: null,
    flowAttributes: {
      parameter: {
        paramType: PARAMETER_TYPES.CF_ADJUSTMENT_CALC,
        paramValue: null,
        paramReferences: {
          accountId: sourceAccount.id,
          // 演算子を反転（重要：PLでマイナスならCFではプラス）
          operation:
            cfAdj.operation === OPERATIONS.SUB
              ? OPERATIONS.ADD
              : OPERATIONS.SUB,
          lag: 0,
        },
      },
      cfAdjustment: {
        category: cfAdj.category,
        sourceType: "PL_ADJUSTMENT",
      },
    },
    displayOrder: {
      order: order ? `CF1${order.toString().padStart(2, "0")}` : null,
      prefix: "CF",
    },
  };
};

/**
 * BS変動項目用のアカウントを生成する
 * @param {Object} bsAccount - BS科目
 * @param {string} changeType - 'increase' or 'decrease'
 * @param {number} order - 表示順序
 * @returns {Object} BS変動用CFアカウント
 */
export const createBSChangeAccount = (bsAccount, changeType, order = null) => {
  if (!AccountUtils.isStockAccount(bsAccount)) {
    throw new Error("Account must be a stock account");
  }

  const accountName = `${bsAccount.accountName}の${
    changeType === "increase" ? "増加" : "減少"
  }`;
  const bsType = bsAccount.stockAttributes.bsType;

  // 資産の増加はCFマイナス、負債の増加はCFプラス
  const operation = determineOperationForBSChange(bsType, changeType);

  return {
    id: `cf-bs-${bsAccount.id}-${changeType}`,
    accountName: accountName,
    parentAccountId: "ope-cf-total", // 運転資本変動は営業CFに含まれる
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.FINANCING,
    },
    stockAttributes: null,
    flowAttributes: {
      parameter: {
        paramType: PARAMETER_TYPES.BS_CHANGE,
        paramValue: null,
        paramReferences: {
          accountId: bsAccount.id,
          operation: operation,
          lag: 0,
        },
      },
      cfAdjustment: {
        category: CF_CATEGORIES.OPERATING,
        sourceType: "WORKING_CAPITAL",
      },
    },
    displayOrder: {
      order: order ? `CF2${order.toString().padStart(2, "0")}` : null,
      prefix: "CF",
    },
  };
};

/**
 * CF区分に応じた親科目IDを取得する
 * @param {string} cfCategory - CF区分
 * @returns {string} 親科目ID
 */
const getCFParentId = (cfCategory) => {
  switch (cfCategory) {
    case CF_CATEGORIES.OPERATING:
      return "ope-cf-total";
    case CF_CATEGORIES.INVESTING:
      return "inv-cf-total";
    case CF_CATEGORIES.FINANCING:
      return "fin-cf-total";
    default:
      return "ope-cf-total";
  }
};

/**
 * BS変動のCF演算子を決定する
 * @param {string} bsType - BSタイプ（ASSET/LIABILITY_EQUITY）
 * @param {string} changeType - 変動タイプ（increase/decrease）
 * @returns {string} 演算子
 */
const determineOperationForBSChange = (bsType, changeType) => {
  if (bsType === BS_TYPES.ASSET) {
    // 資産の増加はCFマイナス、減少はプラス
    return changeType === "increase" ? OPERATIONS.SUB : OPERATIONS.ADD;
  } else {
    // 負債・資本の増加はCFプラス、減少はマイナス
    return changeType === "increase" ? OPERATIONS.ADD : OPERATIONS.SUB;
  }
};
