import React, { useState, useRef } from "react";
import "../styles/SampleAst.css"; // 親ディレクトリのstylesフォルダを参照

// Mock Handsontable Component (for demonstration)
const MockHotTable = ({ data, columns, onCellChange, onAddRow }) => {
  const [tableData, setTableData] = useState(data);

  const handleCellChange = (rowIndex, columnKey, value) => {
    const newData = [...tableData];
    newData[rowIndex] = { ...newData[rowIndex], [columnKey]: value };
    setTableData(newData);
    onCellChange?.(newData);
  };

  const addRow = () => {
    const newRow = { id: "", kind: "", baseId: "", ratio: "", args: "" };
    const newData = [...tableData, newRow];
    setTableData(newData);
    onAddRow?.(newData);
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-auto">
      <div className="bg-gray-100 border-b">
        <div className="grid grid-cols-5 gap-0">
          {columns.map((col, index) => (
            <div
              key={index}
              className="p-3 font-medium text-sm border-r border-gray-200 last:border-r-0"
            >
              {col.title}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white">
        {tableData.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="grid grid-cols-5 gap-0 border-b border-gray-100 hover:bg-gray-50"
          >
            {columns.map((col, colIndex) => (
              <div
                key={colIndex}
                className="border-r border-gray-200 last:border-r-0"
              >
                {col.type === "dropdown" ? (
                  <select
                    value={row[col.data] || ""}
                    onChange={(e) =>
                      handleCellChange(rowIndex, col.data, e.target.value)
                    }
                    className="w-full p-2 text-sm border-0 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">選択してください</option>
                    {col.source?.map((option, optIndex) => (
                      <option key={optIndex} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={col.type === "numeric" ? "number" : "text"}
                    value={row[col.data] || ""}
                    onChange={(e) =>
                      handleCellChange(rowIndex, col.data, e.target.value)
                    }
                    className="w-full p-2 text-sm border-0 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    step={col.type === "numeric" ? "0.01" : undefined}
                  />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="bg-gray-50 p-2">
        <button
          onClick={addRow}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          + 行を追加
        </button>
      </div>
    </div>
  );
};

// メイン財務モデル構築UI
const SampleAst = () => {
  // 勘定科目メタデータ
  const meta = [
    { id: "SALES", name: "売上高" },
    { id: "COGS", name: "売上原価" },
    { id: "ADV", name: "広告宣伝費" },
    { id: "GP", name: "売上総利益" },
    { id: "SGA", name: "販管費合計" },
    { id: "OP", name: "営業利益" },
    { id: "RENT", name: "賃借料" },
    { id: "DEV", name: "開発費" },
  ];

  // 初期入力データ
  const input0 = { SALES: 1000000, COGS: 600000 };

  // Handsontableの初期行
  const [tableRows, setTableRows] = useState([
    { id: "ADV", kind: "RATIO", baseId: "SALES", ratio: 0.05, args: "" },
    { id: "GP", kind: "SUB", args: "SALES,COGS", baseId: "", ratio: "" },
  ]);

  const [calculationResult, setCalculationResult] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculatedItems, setCalculatedItems] = useState(["ADV", "GP"]);

  // 列定義
  const columns = [
    { data: "id", type: "text", title: "科目ID" },
    {
      data: "kind",
      type: "dropdown",
      source: ["RATIO", "SUB", "ADD", "MUL", "DIV"],
      title: "計算種類",
    },
    {
      data: "baseId",
      type: "dropdown",
      source: meta.map((m) => m.id),
      title: "基準科目",
    },
    { data: "ratio", type: "numeric", title: "係数" },
    { data: "args", type: "text", title: "引数(カンマ区切り)" },
  ];

  // 計算ロジック構築
  const buildLogic = (rows) => {
    return rows
      .filter((r) => r.id)
      .map((r) => {
        switch (r.kind) {
          case "RATIO":
            return {
              id: r.id,
              formula: {
                op: "MUL",
                args: [
                  { op: "REF", id: r.baseId },
                  { op: "CONST", value: Number(r.ratio) },
                ],
              },
            };
          case "SUB":
          case "ADD":
            return {
              id: r.id,
              formula: {
                op: r.kind,
                args: String(r.args)
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((id) => ({ op: "REF", id })),
              },
            };
          case "MUL":
            return {
              id: r.id,
              formula: {
                op: "MUL",
                args: String(r.args)
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((id) => ({ op: "REF", id })),
              },
            };
          case "DIV":
            const divArgs = String(r.args)
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            return {
              id: r.id,
              formula: {
                op: "DIV",
                args: divArgs.map((id) => ({ op: "REF", id })),
              },
            };
          default:
            return { id: r.id, formula: { op: "CONST", value: 0 } };
        }
      });
  };

  // 簡易計算関数（模擬的な実装）
  const calculateValue = (id, logic, values) => {
    const rule = logic.find((l) => l.id === id);
    if (!rule) return 0;

    if (rule.formula.op === "MUL") {
      // ratio型
      if (rule.formula.args[1].op === "CONST") {
        const baseValue = values[rule.formula.args[0].id] || 0;
        const ratio = rule.formula.args[1].value || 0;
        return baseValue * ratio;
      }
      // MUL型
      return rule.formula.args.reduce((product, arg) => {
        if (arg.op === "REF") {
          return product * (values[arg.id] || 0);
        }
        return product;
      }, 1);
    } else if (rule.formula.op === "SUB") {
      const args = rule.formula.args;
      if (args.length === 0) return 0;

      const firstValue = values[args[0].id] || 0;
      return args.slice(1).reduce((result, arg) => {
        return result - (values[arg.id] || 0);
      }, firstValue);
    } else if (rule.formula.op === "ADD") {
      return rule.formula.args.reduce((sum, arg) => {
        if (arg.op === "REF") {
          return sum + (values[arg.id] || 0);
        }
        return sum;
      }, 0);
    } else if (rule.formula.op === "DIV") {
      if (rule.formula.args.length < 2) return 0;
      const numerator = values[rule.formula.args[0].id] || 0;
      const denominator = values[rule.formula.args[1].id] || 1;
      return denominator === 0 ? 0 : numerator / denominator;
    }

    return 0;
  };

  // 計算実行
  const handleCalculate = () => {
    setIsCalculating(true);

    // 有効な行のみを対象に
    const validRows = tableRows.filter(
      (row) =>
        row.id &&
        ((row.kind === "RATIO" && row.baseId && row.ratio) ||
          ((row.kind === "SUB" ||
            row.kind === "ADD" ||
            row.kind === "MUL" ||
            row.kind === "DIV") &&
            row.args))
    );

    // 計算対象のIDリスト更新
    const newCalculatedItems = validRows.map((row) => row.id);
    setCalculatedItems(newCalculatedItems);

    setTimeout(() => {
      const logic = buildLogic(validRows);
      const results = { ...input0 };

      // トポロジカルソート的な実装を模擬
      // 実際のシステムではより複雑な依存関係解決が必要
      let changed = true;
      const maxIterations = 5; // 依存関係の最大深度に応じて調整
      let iteration = 0;

      while (changed && iteration < maxIterations) {
        changed = false;
        iteration++;

        for (const item of validRows) {
          const oldValue = results[item.id] || 0;
          const newValue = calculateValue(item.id, logic, results);

          if (newValue !== oldValue) {
            results[item.id] = newValue;
            changed = true;
          }
        }
      }

      setCalculationResult(results);
      setIsCalculating(false);
    }, 500);
  };

  // 計算されたすべての値を表示
  const renderCalculatedValues = () => {
    if (!calculationResult) return null;

    // 入力値と計算値を結合して表示
    const allResults = { ...calculationResult };

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(allResults).map(([key, value]) => {
          const metaItem = meta.find((m) => m.id === key);
          const isInput = key in input0;
          const isCalculated = calculatedItems.includes(key);

          if (!isInput && !isCalculated) return null;

          return (
            <div
              key={key}
              className={`p-4 rounded-lg border ${
                isInput
                  ? "bg-blue-50 border-blue-200"
                  : "bg-green-50 border-green-200"
              }`}
            >
              <div className="text-sm text-gray-600">
                {metaItem?.name || key}
              </div>
              <div
                className={`text-xl font-bold ${
                  isInput ? "text-blue-700" : "text-green-700"
                }`}
              >
                {value.toLocaleString()} 千円
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {isInput ? "入力値" : "計算値"}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="sample-ast-container">
      <div className="sample-ast-content">
        <h1 className="sample-ast-title">動的財務モデル構築システム</h1>

        {/* 入力データ表示 */}
        <div className="section">
          <h2 className="section-title">基礎データ</h2>
          <div className="input-grid">
            {Object.entries(input0).map(([key, value]) => {
              const metaItem = meta.find((m) => m.id === key);
              return (
                <div key={key} className="input-item">
                  <div className="input-label">{metaItem?.name || key}</div>
                  <div className="input-value">
                    {value.toLocaleString()} 千円
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 計算ロジック設定テーブル */}
        <div className="section">
          <h2 className="section-title">計算ロジック設定</h2>
          <div className="table-container">
            <MockHotTable
              data={tableRows}
              columns={columns}
              onCellChange={setTableRows}
              onAddRow={setTableRows}
            />
          </div>

          {/* 計算種類の説明 */}
          <div className="calculation-types">
            <div className="calc-type-item ratio">
              <div className="calc-type-title">RATIO</div>
              <div className="calc-type-desc">基準科目 × 係数</div>
            </div>
            <div className="calc-type-item sub">
              <div className="calc-type-title">SUB</div>
              <div className="calc-type-desc">引数を順番に減算</div>
            </div>
            <div className="calc-type-item add">
              <div className="calc-type-title">ADD</div>
              <div className="calc-type-desc">引数を順番に加算</div>
            </div>
            <div className="calc-type-item mul-div">
              <div className="calc-type-title">MUL/DIV</div>
              <div className="calc-type-desc">掛け算/割り算</div>
            </div>
          </div>
        </div>

        {/* 計算ボタン */}
        <div className="section">
          <button
            onClick={handleCalculate}
            disabled={isCalculating}
            className="calculate-button"
          >
            {isCalculating ? (
              <>
                <div className="loading-spinner"></div>
                計算中...
              </>
            ) : (
              "財務モデルを計算"
            )}
          </button>
        </div>

        {/* 計算結果表示 */}
        {calculationResult && (
          <div className="result-container">
            <h2 className="result-title">計算結果</h2>
            {renderCalculatedValues()}

            {/* AST表示 */}
            <div className="ast-container">
              <div className="ast-title">生成されたAST</div>
              <pre className="ast-content">
                {JSON.stringify(
                  buildLogic(
                    tableRows.filter(
                      (row) =>
                        row.id &&
                        ((row.kind === "RATIO" && row.baseId && row.ratio) ||
                          ((row.kind === "SUB" ||
                            row.kind === "ADD" ||
                            row.kind === "MUL" ||
                            row.kind === "DIV") &&
                            row.args))
                    )
                  ),
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        )}

        {/* 使用方法ガイド */}
        <div className="guide-container">
          <h3 className="guide-title">使用方法</h3>
          <div className="guide-content">
            <p>
              1. <strong>科目ID</strong>: 計算対象の科目を入力（例：SGA, OP,
              RENT）
            </p>
            <p>
              2. <strong>計算種類</strong>:
              RATIO（比率計算）、SUB（減算）、ADD（加算）、MUL（乗算）、DIV（除算）から選択
            </p>
            <p>
              3. <strong>基準科目</strong>:
              RATIO時の基準となる科目を選択（例：RATIO時のみ必須）
            </p>
            <p>
              4. <strong>係数</strong>: RATIO時の掛け算係数を入力（例：0.05 =
              5%）
            </p>
            <p>
              5. <strong>引数</strong>:
              各種演算時の計算対象科目をカンマ区切りで入力（例：SALES,COGS）
            </p>
            <p>6. 「財務モデルを計算」ボタンで実行</p>
          </div>
          <div className="guide-examples">
            <strong>追加できる計算例：</strong>
            <ul>
              <li>SGA = ADV + RENT + DEV (ADD)</li>
              <li>OP = GP - SGA (SUB)</li>
              <li>RENT = RATIO × SALES (RATIO、係数0.03)</li>
              <li>DEV = RATIO × SALES (RATIO、係数0.07)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SampleAst;
