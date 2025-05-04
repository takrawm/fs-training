/**
 * 財務モデルの依存関係計算に関するユーティリティ
 *
 * トポロジカルソートを用いて、複雑な依存関係を持つ計算を最適な順序で実行します。
 */

/**
 * 式から依存関係を抽出する
 * @param {Object} expr 計算式
 * @returns {Array} 依存するアカウントIDの配列
 */
export function extractDependencies(expr) {
  if (!expr) return [];

  switch (expr.op) {
    case "CONST":
      return [];

    case "REF":
      return [expr.id]; // 単一の依存関係

    case "ADD":
    case "SUB":
    case "MUL":
      // すべての引数から依存関係を再帰的に抽出して平坦化
      return expr.args
        .flatMap((arg) => extractDependencies(arg))
        .filter((v, i, a) => a.indexOf(v) === i); // 重複除去

    default:
      return [];
  }
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
    // 1. 親子関係（合計）
    if (account.calculationType === "CHILDREN_SUM") {
      // 子アカウントを見つける
      const childAccounts = accounts.filter(
        (a) => a.parentAccount === account.accountName
      );
      childAccounts.forEach((child) => {
        if (!graph[account.id].includes(child.id)) {
          graph[account.id].push(child.id); // 親は子に依存する
        }
      });
    }

    // 2. 個別計算式による依存関係
    if (account.calculationType === "ACCOUNT_CALC") {
      // 明示的な依存関係プロパティがある場合はそれを使用
      if (account.dependencies && account.dependencies.depends_on) {
        account.dependencies.depends_on.forEach((depId) => {
          if (!graph[account.id].includes(depId)) {
            graph[account.id].push(depId);
          }
        });
      }
    }

    // 3. パラメータによる依存関係
    if (account.parameterType === "PERCENTAGE") {
      const referenceAccounts = accounts.filter((a) => a.isReferenceAccount);
      referenceAccounts.forEach((ref) => {
        if (!graph[account.id].includes(ref.id)) {
          graph[account.id].push(ref.id);
        }
      });
    }

    // 4. relationによる依存関係
    if (account.relation && account.relation.type !== "NONE") {
      // relation.typeに基づいた依存関係を追加
      switch (account.relation.type) {
        case "PPE":
          if (account.relation.subType === "asset") {
            // 資産科目は、関連する投資科目と減価償却科目に依存する
            if (account.relation.investmentAccountId) {
              if (
                !graph[account.id].includes(
                  account.relation.investmentAccountId
                )
              ) {
                graph[account.id].push(account.relation.investmentAccountId);
              }
            }
            if (account.relation.depreciationAccountId) {
              if (
                !graph[account.id].includes(
                  account.relation.depreciationAccountId
                )
              ) {
                graph[account.id].push(account.relation.depreciationAccountId);
              }
            }
          }
          break;

        case "RETAINED_EARNINGS":
          if (account.relation.subType === "asset") {
            // 利益剰余金科目は、関連する利益科目に依存する
            if (account.relation.profitAccountId) {
              if (
                !graph[account.id].includes(account.relation.profitAccountId)
              ) {
                graph[account.id].push(account.relation.profitAccountId);
              }
            }
          }
          break;
      }
    }

    // 5. 明示的な依存関係 (既に2で処理した場合は処理しない)
    if (
      account.calculationType !== "ACCOUNT_CALC" &&
      account.dependencies &&
      account.dependencies.depends_on
    ) {
      account.dependencies.depends_on.forEach((depId) => {
        if (!graph[account.id].includes(depId)) {
          graph[account.id].push(depId);
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
      throw new Error(`循環参照が検出されました: ${nodeId}`);
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
  return topologicalSort(graph);
}
