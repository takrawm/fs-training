/**
 * 財務モデルの依存関係計算に関するユーティリティ
 *
 * ASTとparameterReferenceAccountsを用いて、複雑な依存関係を持つ計算を最適な順序で実行します。
 */

import { buildFormula } from "./astBuilder";
import { extractDependencies } from "./astEvaluator";
import { ParameterUtils } from "./parameterUtils";
import { AccountUtils } from "../models/account";
import { getCFAdjustmentAccounts } from "./balanceSheetCalculator";
import { PARAMETER_TYPES } from "./constants";

/**
 * アカウントからAST式を構築し、依存関係を抽出する
 * @param {Object} account アカウント
 * @returns {Array} 依存するアカウントIDの配列
 */
export function extractAccountDependencies(account) {
  const dependencies = [];

  // 新しいParameterUtilsを使用
  const parameterReferences = ParameterUtils.getParameterReferences(account);
  const parameterType = ParameterUtils.getParameterType(account);

  // 1. parameterReferencesからの依存関係
  if (parameterReferences?.length > 0) {
    parameterReferences.forEach((ref) => {
      const refId = ref.accountId || ref.id; // 新旧形式対応
      if (refId && !dependencies.includes(refId)) {
        dependencies.push(refId);
      }
    });
  }

  // 2. 期末残高+/-変動型の場合、前期の自分自身への依存関係を追加
  if (parameterType === PARAMETER_TYPES.BALANCE_AND_CHANGE) {
    if (!dependencies.includes(account.id)) {
      dependencies.push(account.id); // 前期の自分自身
    }
  }

  // 旧形式との互換性
  if (account.parameterReferenceAccounts?.length > 0) {
    account.parameterReferenceAccounts.forEach((ref) => {
      if (ref.id && !dependencies.includes(ref.id)) {
        dependencies.push(ref.id);
      }
    });
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
      // 子アカウントを見つける（新しい構造対応）
      const childAccounts = accounts.filter(
        (a) =>
          a.parentAccountId === account.id ||
          a.parentAccount === account.accountName
      );
      childAccounts.forEach((child) => {
        if (!graph[account.id].includes(child.id)) {
          graph[account.id].push(child.id); // 親は子に依存する
        }
      });
    }

    // 2. parameterReferencesによる依存関係
    if (parameterReferences?.length > 0) {
      parameterReferences.forEach((ref) => {
        const refId = ref.accountId || ref.id; // 新旧形式対応
        if (refId && !graph[account.id].includes(refId)) {
          graph[account.id].push(refId);
        }
      });
    }

    // 3. 期末残高+/-変動型の場合、前期の自分自身への依存関係
    if (parameterType === PARAMETER_TYPES.BALANCE_AND_CHANGE) {
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

    // 旧形式との互換性
    if (account.parameterReferenceAccounts?.length > 0) {
      account.parameterReferenceAccounts.forEach((ref) => {
        if (ref.id && !graph[account.id].includes(ref.id)) {
          graph[account.id].push(ref.id);
        }
      });
    }
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
  const graph = buildDependencyGraph(accounts);
  console.log("依存関係グラフ:", graph);
  const order = topologicalSort(graph);
  console.log("計算順序:", order);
  return order;
}
