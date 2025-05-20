import React, { useMemo, useState } from "react";
import { HotTable } from "@handsontable/react";
import "handsontable/dist/handsontable.full.min.css";
import { createAccountMap } from "../utils/accountMapping";
import { OPERATION_SYMBOLS } from "../utils/astTypes";
import { PARAM_OP_MAPPING } from "../utils/constants";
import { buildFormula } from "../utils/astBuilder";
import { evalNode } from "../utils/astEvaluator";

/**
 * パラメータ設定確認コンポーネント
 * @param {Object} props
 * @param {Array} props.data - アカウント配列
 * @param {Function} props.onChange - 変更時のコールバック
 * @returns {JSX.Element}
 */
const ParameterConfiguration = ({ data, onChange }) => {
  // 計算テスト用の状態
  const [testAccountId, setTestAccountId] = useState("");
  const [testPeriod, setTestPeriod] = useState("");
  const [testResult, setTestResult] = useState(null);

  // 科目IDと科目名のマッピングを作成
  const accountMap = useMemo(() => createAccountMap(data), [data]);

  // 計算テストを実行
  const runTest = () => {
    try {
      // 入力値の検証
      if (!testAccountId || !testPeriod) {
        setTestResult("勘定科目と期間を入力してください");
        return;
      }

      // 勘定科目を取得
      const account = data.find((acc) => acc.id === testAccountId);
      if (!account) {
        setTestResult("勘定科目が見つかりません");
        return;
      }

      console.log("選択された勘定科目:", account);
      console.log("全データ:", data);

      // ASTを構築
      const ast = buildFormula(account);
      console.log("構築されたAST:", ast);

      // 値を取得する関数
      const getValue = (id, period) => {
        // 期間を数値に変換
        const periodNum = parseInt(period, 10);

        // 勘定科目を検索
        const targetAccount = data.find((acc) => acc.id === id);
        if (!targetAccount) {
          console.log(`勘定科目が見つかりません: ${id}`);
          return 0;
        }

        // 値の配列を確認
        console.log(`勘定科目 ${id} の値:`, targetAccount.values);
        console.log(`勘定科目 ${id} の全データ:`, targetAccount);

        // 期間に一致する値を検索
        // valuesが配列でない場合は、accountValuesから取得を試みる
        let value;
        if (Array.isArray(targetAccount.values)) {
          value = targetAccount.values.find(
            (v) => parseInt(v.periodId, 10) === periodNum
          )?.value;
        } else if (targetAccount.accountValues) {
          value = targetAccount.accountValues.find(
            (v) => parseInt(v.periodId, 10) === periodNum
          )?.value;
        }

        console.log(`期間 ${periodNum} の値:`, value);
        return value ?? 0;
      };

      // ASTを評価
      const result = evalNode(ast, testPeriod, getValue);
      console.log("計算結果:", result);
      setTestResult(result);
    } catch (error) {
      console.error("計算エラー:", error);
      setTestResult(`エラー: ${error.message}`);
    }
  };

  // 参照科目の設定を抽出
  const referenceAccounts = useMemo(() => {
    return data.filter((account) => account.parameterType === "REFERENCE");
  }, [data]);

  // 最大の参照科目数を取得
  const maxReferenceCount = useMemo(() => {
    return Math.max(
      ...referenceAccounts.map(
        (account) => account.parameterReferenceAccounts?.length || 0
      )
    );
  }, [referenceAccounts]);

  // テーブルデータの作成
  const tableData = useMemo(() => {
    return referenceAccounts.map((account) => {
      const row = [account.accountName, account.parameterType];
      const refAccounts = account.parameterReferenceAccounts || [];

      // 参照科目の数だけ列を追加（式と科目名の2列ずつ）
      for (let i = 0; i < maxReferenceCount; i++) {
        const refAccount = refAccounts[i];
        row.push(
          refAccount
            ? OPERATION_SYMBOLS[refAccount.operation] || refAccount.operation
            : ""
        ); // 式
        row.push(refAccount ? accountMap[refAccount.id] || refAccount.id : ""); // 科目名
      }

      return row;
    });
  }, [referenceAccounts, maxReferenceCount, accountMap]);

  // 列の設定を動的に生成
  const columns = useMemo(() => {
    const cols = [
      { type: "text", readOnly: true },
      { type: "text", readOnly: true },
    ];

    // 参照科目の数だけ列を追加（式と科目名の2列ずつ）
    for (let i = 0; i < maxReferenceCount; i++) {
      cols.push(
        {
          type: "dropdown",
          source(query, process) {
            const rowIndex = this.row;
            const account = referenceAccounts[rowIndex];
            if (!account) {
              process([]);
              return;
            }

            // パラメータタイプに応じた演算子の選択肢を返す
            const operations = PARAM_OP_MAPPING[account.parameterType] || [];
            console.log("Operations for", account.accountName, ":", operations);
            const symbols = operations.map((op) => OPERATION_SYMBOLS[op]);
            console.log("Symbols for", account.accountName, ":", symbols);

            process(symbols);
          },
          readOnly: false,
          strict: true,
          allowInvalid: false,
          className: "htDropdown",
          title: "式", // 列のタイトルを設定
        },
        {
          type: "text",
          readOnly: true,
          title: "科目名", // 列のタイトルを設定
        }
      );
    }

    return cols;
  }, [maxReferenceCount, referenceAccounts]);

  // 列ヘッダーを動的に生成
  const colHeaders = useMemo(() => {
    const headers = ["勘定科目", "パラメータタイプ"];
    for (let i = 0; i < maxReferenceCount; i++) {
      headers.push("式", "科目名");
    }
    return headers;
  }, [maxReferenceCount]);

  // ネストされたヘッダーの設定
  const nestedHeaders = useMemo(() => {
    // 1行目
    const firstRow = [
      { label: "勘定科目", rowspan: 2 },
      { label: "パラメータタイプ", rowspan: 2 },
    ];

    // 参照科目ブロックを追加（colspan=2）
    for (let i = 0; i < maxReferenceCount; i++) {
      firstRow.push({ label: `参照科目${i + 1}`, colspan: 2 });
    }

    // 2行目
    const secondRow = [
      null, // 勘定科目のrowspan分
      null, // パラメータタイプのrowspan分
    ];
    for (let i = 0; i < maxReferenceCount; i++) {
      secondRow.push("式", "科目名");
    }

    return [firstRow, secondRow];
  }, [maxReferenceCount]);

  // セル変更時の処理
  const handleChange = (changes) => {
    if (!changes || typeof onChange !== "function") return;

    // 元のデータをディープコピー
    const updated = data.map((account) => ({
      ...account,
      parameterReferenceAccounts:
        account.parameterReferenceAccounts?.map((ref) => ({ ...ref })) || [],
    }));

    // 参照科目の設定を抽出（更新されたデータから）
    const updatedReferenceAccounts = updated.filter(
      (account) => account.parameterType === "REFERENCE"
    );

    changes.forEach(([rowIdx, colIdx, oldValue, newValue]) => {
      // 列の設定を取得
      const column = columns[colIdx];

      // 式の列の場合のみ処理
      if (column?.title === "式") {
        const account = updatedReferenceAccounts[rowIdx];
        if (!account) return;

        const refAccounts = account.parameterReferenceAccounts || [];
        // 式の列のインデックスから参照科目のインデックスを計算
        const refIndex = Math.floor((colIdx - 2) / 2);
        const refAccount = refAccounts[refIndex];

        if (refAccount) {
          // 記号から演算子に変換
          const operation = Object.entries(OPERATION_SYMBOLS).find(
            ([_, symbol]) => symbol === newValue
          )?.[0];

          if (operation) {
            // 参照科目の演算子を更新
            refAccount.operation = operation;
          }
        }
      }
    });

    // 変更があった場合のみonChangeを呼び出す
    if (JSON.stringify(updated) !== JSON.stringify(data)) {
      console.log("更新前:", data);
      console.log("更新後:", updated);
      onChange(updated);
    }
  };

  const settings = {
    data: tableData,
    colHeaders,
    columns,
    nestedHeaders,
    width: "100%",
    height: "calc(100% - 120px)", // 計算ブロックの高さ分を引く
    stretchH: "all",
    rowHeaders: true,
    licenseKey: "non-commercial-and-evaluation",
    afterChange: handleChange,
  };

  return (
    <div
      className="hot-table-container"
      style={{ display: "flex", flexDirection: "column" }}
    >
      <div style={{ flex: "1 1 auto", minHeight: 0 }}>
        <HotTable {...settings} />
      </div>

      {/* 計算テストブロック */}
      <div
        style={{
          flex: "0 0 120px",
          padding: "10px",
          borderTop: "1px solid #ccc",
          backgroundColor: "white",
          boxSizing: "border-box",
        }}
      >
        <h3 style={{ margin: "0 0 10px 0", fontSize: "14px" }}>計算テスト</h3>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <div>
            <label>勘定科目：</label>
            <select
              value={testAccountId}
              onChange={(e) => setTestAccountId(e.target.value)}
              style={{ marginLeft: "5px" }}
            >
              <option value="">選択してください</option>
              {data.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.accountName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>期間：</label>
            <input
              type="number"
              value={testPeriod}
              onChange={(e) => setTestPeriod(e.target.value)}
              style={{ marginLeft: "5px", width: "100px" }}
            />
          </div>
          <button
            onClick={runTest}
            style={{
              padding: "5px 15px",
              backgroundColor: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            計算実行
          </button>
          {testResult !== null && (
            <div style={{ marginLeft: "20px" }}>
              <label>計算結果：</label>
              <span style={{ marginLeft: "5px", fontWeight: "bold" }}>
                {typeof testResult === "number"
                  ? testResult.toLocaleString()
                  : testResult}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParameterConfiguration;
