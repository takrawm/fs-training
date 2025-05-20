import React, { useMemo } from "react";
import { HotTable } from "@handsontable/react";
import "handsontable/dist/handsontable.full.min.css";
import { PARAMETER_TYPES } from "../utils/constants";
import { ReactSelectEditor, chipRenderer } from "./ReactSelectEditor";
import { createAccountMap } from "../utils/accountMapping";

// すべての勘定科目名を選択肢に使う
const ALL_ACCOUNT_NAMES = (list) => list.map((a) => a.accountName);

// 演算タイプの定義
const OPERATION_TYPES = ["MUL", "DIV", "ADD", "SUB"];

/**
 * パラメータ設定テーブルコンポーネント
 * @param {Object} props
 * @param {Array} props.data - アカウント配列
 * @param {Function} props.onChange - 変更時のコールバック
 * @returns {JSX.Element}
 */
const ParameterSettingTable = ({ data, onChange }) => {
  // 科目IDと科目名のマッピングを作成
  const accountMap = useMemo(() => createAccountMap(data), [data]);

  // 選択肢の作成（IDと名前のペア）
  const accountOptions = useMemo(() => {
    return data.map((account) => ({
      value: account.id,
      label: account.accountName,
    }));
  }, [data]);

  const settings = useMemo(() => {
    console.log("1. Input data:", data);

    const mappedData = data.map((account) => [
      account.accountName,
      account.parameterType || "NONE",
      // 参照科目のID配列を文字列化
      JSON.stringify(
        account.parameterReferenceAccounts
          ? account.parameterReferenceAccounts.map((a) => a.id)
          : []
      ),
    ]);

    console.log("2. Mapped data for table:", mappedData);

    const settings = {
      data: mappedData,
      colHeaders: ["勘定科目", "パラメータタイプ", "参照科目"],
      columns: [
        { type: "text", readOnly: true },
        {
          type: "dropdown",
          source: PARAMETER_TYPES,
        },
        {
          data: 2,
          editor: ReactSelectEditor,
          renderer: (instance, td, row, col, prop, value) => {
            td.innerHTML = "";
            let ids;
            try {
              ids = JSON.parse(value);
            } catch {
              ids = [];
            }

            if (!Array.isArray(ids) || ids.length === 0) {
              td.textContent = "";
              return td;
            }

            const chips = document.createElement("div");
            chips.style.display = "flex";
            chips.style.flexWrap = "wrap";
            chips.style.gap = "4px";

            ids.forEach((id) => {
              const chip = document.createElement("div");
              chip.textContent = accountMap[id] || id;
              chip.style.background = "#e0e0e0";
              chip.style.borderRadius = "12px";
              chip.style.padding = "2px 8px";
              chip.style.fontSize = "12px";
              chips.appendChild(chip);
            });

            td.appendChild(chips);
            return td;
          },
          source: accountOptions,
          width: 120,
        },
      ],
      width: "100%",
      height: "100%",
      stretchH: "all",
      rowHeaders: true,
      licenseKey: "non-commercial-and-evaluation",
    };

    console.log("ParameterSettingTable - settings:", settings);
    return settings;
  }, [data, accountMap, accountOptions]);

  const handleChange = (changes) => {
    if (!changes) return;
    console.log("=== ParameterSettingTable - Cell Change ===");
    console.log("1. Changes:", changes);

    const updated = [...data];
    changes.forEach(([rowIdx, colIdx, _old, newVal]) => {
      if (colIdx === 0 || newVal === undefined) return;
      const acc = { ...updated[rowIdx] };

      switch (colIdx) {
        case 1:
          acc.parameterType = newVal;
          break;
        case 2: // 参照科目（IDの配列のみを扱う）
          try {
            const ids = JSON.parse(newVal); // 文字列 → 配列に戻す
            acc.parameterReferenceAccounts = ids.map((id, idx) => ({
              id,
              operation: null,
            }));
          } catch (error) {
            console.error("JSON parse error:", error);
            acc.parameterReferenceAccounts = [];
          }
          break;
      }
      updated[rowIdx] = acc;
    });

    console.log("2. Updated data:", updated);
    console.log("=== End Cell Change ===");
    onChange(updated);
  };

  return (
    <div className="hot-table-container">
      <HotTable {...settings} afterChange={handleChange} />
    </div>
  );
};

export default ParameterSettingTable;
