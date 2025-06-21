/**
 * 財務モデルの依存関係計算に関するユーティリティ
 *
 * ASTとparameterReferenceAccountsを用いて、複雑な依存関係を持つ計算を最適な順序で実行します。
 */

import { buildFormula } from "./astBuilder";
import { extractDependencies } from "./astEvaluator";
import { ParameterUtils } from "./parameterUtils";
import { AccountUtils } from "./accountUtils.js";
import {
  getCFAdjustmentAccounts,
  isBaseProfitTarget,
} from "./balanceSheetCalculator";
import { PARAMETER_TYPES } from "./constants";

/**
 * アカウントからAST式を構築し、依存関係を抽出する（新構造のみ対応）
 * @param {Object} account アカウント
 * @returns {Array} 依存するアカウントIDの配列
 */
export function extractAccountDependencies(account) {
  // CF項目は依存関係を持たない（統合設計では作成時に値も計算される）
  if (AccountUtils.isCFItem(account)) {
    return [];
  }

  const dependencies = [];

  try {
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
 * アカウントの依存関係グラフを構築する
 * @param {Array} accounts アカウントの配列
 * @returns {Object} 依存関係グラフ（キー: アカウントID、値: 依存するIDの配列）
 */
export function buildDependencyGraph(accounts) {
  const graph = {};

  // グラフの初期化
  accounts.forEach((account) => {
    graph[account.id] = [];
  });

  // 依存関係の追加
  accounts.forEach((account) => {
    const parameterType = ParameterUtils.getParameterType(account);
    const parameterReferences = ParameterUtils.getParameterReferences(account);

    // 1. 親子関係（合計）
    if (parameterType === PARAMETER_TYPES.CHILDREN_SUM) {
      // 子アカウントを見つける（現在の構造対応）
      const childAccounts = accounts.filter(
        (a) => a.parentAccountId === account.id
      );
      childAccounts.forEach((child) => {
        if (!graph[account.id].includes(child.id)) {
          graph[account.id].push(child.id); // 親は子に依存する
        }
      });
    }

    // 2. parameterReferencesによる依存関係（新構造対応）
    // 単一参照の場合
    if (ParameterUtils.isSingleReference(account) && parameterReferences) {
      const refId = parameterReferences.accountId;
      if (refId && !graph[account.id].includes(refId)) {
        graph[account.id].push(refId);
      }
    }
    // 複数参照の場合
    else if (
      ParameterUtils.isMultipleReferences(account) &&
      parameterReferences
    ) {
      parameterReferences.forEach((ref) => {
        const refId = ref.accountId;
        if (refId && !graph[account.id].includes(refId)) {
          graph[account.id].push(refId);
        }
      });
    }

    // 3. PROPORTIONATE の場合、前期の自分自身への依存関係
    if (parameterType === PARAMETER_TYPES.PROPORTIONATE) {
      // 前期の自分自身への依存は、計算時に特別に処理するため、
      // ここでは依存関係グラフには追加しない（循環参照を避けるため）
    }

    // 4. CF調整による依存関係
    const cfAdj = AccountUtils.getCFAdjustment(account);
    if (cfAdj?.targetAccountId) {
      // CF調整科目は対象BS科目より先に計算される必要がある
      const targetAccount = accounts.find(
        (a) => a.id === cfAdj.targetAccountId
      );
      if (targetAccount && !graph[targetAccount.id].includes(account.id)) {
        graph[targetAccount.id].push(account.id);
      }
    }

    // 5. baseProfit調整による依存関係（新規追加）
    // baseProfitのターゲット（利益剰余金）は、baseProfit科目（営業利益等）に依存する
    if (isBaseProfitTarget(account, accounts)) {
      const baseProfitAccounts = accounts.filter((acc) =>
        AccountUtils.getBaseProfit(acc)
      );
      baseProfitAccounts.forEach((profitAccount) => {
        if (!graph[account.id].includes(profitAccount.id)) {
          graph[account.id].push(profitAccount.id);
          console.log(
            `依存関係追加: ${account.accountName} → ${profitAccount.accountName}`
          );
        }
      });
    }

    // 6. 現預金計算による依存関係（新規追加）
    // CASH_FLOW_TOTALは全てのCF項目に依存する
    if (parameterType === PARAMETER_TYPES.CASH_FLOW_TOTAL) {
      const cfAccounts = accounts.filter((acc) =>
        AccountUtils.shouldIncludeInCashFlowTotal(acc)
      );
      cfAccounts.forEach((cfAccount) => {
        if (!graph[account.id].includes(cfAccount.id)) {
          graph[account.id].push(cfAccount.id);
          console.log(
            `現預金計算依存関係追加: ${account.accountName} → ${cfAccount.accountName}`
          );
        }
      });
    }

    // CASH_BEGINNING_BALANCEは前期の現預金合計に依存
    // ただし、これは前期の値なので実際の依存関係ではない
    // （トポロジカルソートには影響しない）

    // CASH_ENDING_BALANCEは通常のparameterReferencesで処理される
    // （既存のロジックで対応済み）
  });

  return graph;
}

/**
 * トポロジカルソートを実行する
 * @param {Object} graph 依存関係グラフ
 * @returns {Array} 計算順序でソートされたアカウントIDの配列
 */
export function topologicalSort(graph) {
  const result = [];
  const visited = {};
  const temp = {}; // 循環参照検出用

  function visit(nodeId) {
    // 循環参照チェック
    if (temp[nodeId]) {
      console.warn(`循環参照が検出されました: ${nodeId} - スキップします`);
      return;
    }

    // 既に処理済みならスキップ
    if (visited[nodeId]) return;

    // 処理中としてマーク
    temp[nodeId] = true;

    // 依存先をすべて先に処理
    (graph[nodeId] || []).forEach((dependency) => {
      visit(dependency);
    });

    // 処理完了
    temp[nodeId] = false;
    visited[nodeId] = true;

    // 結果に追加（依存関係を満たす順序）
    result.push(nodeId);
  }

  // グラフ内のすべてのノードに対して処理
  Object.keys(graph).forEach((nodeId) => {
    if (!visited[nodeId]) {
      visit(nodeId);
    }
  });

  return result;
}

/**
 * 依存関係グラフからトポロジカルソートで計算順序を決定
 * @param {Array} accounts アカウントの配列
 * @returns {Array} 計算順序でソートされたアカウントIDの配列
 */
export function getCalculationOrder(accounts) {
  console.log("=== 依存関係計算開始 ===");
  console.log("対象アカウント数:", accounts.length);

  // 現預金計算科目が含まれているかチェック
  const cashCalcAccounts = accounts.filter(
    (acc) =>
      acc.id === "cash-beginning-balance" ||
      acc.id === "cash-flow-change" ||
      acc.id === "cash-ending-balance"
  );
  console.log("現預金計算科目の数:", cashCalcAccounts.length);
  cashCalcAccounts.forEach((acc) => {
    console.log(`- ${acc.accountName} (ID: ${acc.id})`);
  });

  const graph = buildDependencyGraph(accounts);
  const order = topologicalSort(graph);

  // デバッグ用：計算順序を表示
  console.log("=== 計算順序 ===");
  order.forEach((accountId, index) => {
    const account = accounts.find((acc) => acc.id === accountId);
    const dependencies = graph[accountId] || [];
    console.log(
      `${index + 1}. ${account?.accountName || accountId} (依存: ${
        dependencies.join(", ") || "なし"
      })`
    );
  });

  return order;
}
