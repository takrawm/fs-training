import React, { useMemo } from "react";
import { HotTable } from "@handsontable/react";
import "handsontable/dist/handsontable.full.min.css";
import { PARAMETER_TYPES } from "../utils/constants";
import { ReactSelectEditor, chipRenderer } from "./ReactSelectEditor";

// すべての勘定科目名を選択肢に使う
const ALL_ACCOUNT_NAMES = (list) => list.map((a) => a.accountName);

/**
 * パラメータ設定テーブルコンポーネント
 * @param {Object} props
 * @param {Array} props.data - アカウント配列
 * @param {Function} props.onChange - 変更時のコールバック
 * @returns {JSX.Element}
 */
const ParameterSettingTable = ({ data, onChange }) => {
  const settings = useMemo(() => {
    return {
      data: data.map((account) => [
        account.accountName,
        account.parameterType || "NONE",
        account.parameterReferenceAccounts ||
          account.isParameterReference ||
          [],
        account.relation?.type || "NONE",
        account.relation?.subType || null,
      ]),
      colHeaders: [
        "勘定科目",
        "パラメータタイプ",
        "被参照科目",
        "リレーションタイプ",
        "リレーションサブタイプ",
      ],
      columns: [
        { type: "text", readOnly: true },
        {
          type: "dropdown",
          source: PARAMETER_TYPES,
        },
        {
          data: 2,
          editor: ReactSelectEditor,
          renderer: chipRenderer,
          source: ALL_ACCOUNT_NAMES(data),
          width: 120,
        },
        {
          type: "dropdown",
          source: ["NONE", "ADDITION", "SUBTRACTION", "MULTIPLICATION"],
        },
        {
          type: "dropdown",
          source: ["NONE", "DIRECT", "INVERSE"],
        },
      ],
      width: "100%",
      height: "100%",
      stretchH: "all",
      rowHeaders: true,
      licenseKey: "non-commercial-and-evaluation",
    };
  }, [data]);

  const handleChange = (changes) => {
    if (!changes) return;
    const updated = [...data];

    changes.forEach(([rowIdx, colIdx, _old, newVal]) => {
      if (colIdx === 0 || newVal === undefined) return;
      const acc = { ...updated[rowIdx] };

      switch (colIdx) {
        case 1:
          acc.parameterType = newVal;
          break;
        case 2: // 被参照科目（配列）
          acc.parameterReferenceAccounts = newVal; // 配列をそのまま保持
          // 互換性のため、isParameterReferenceも更新
          acc.isParameterReference = Array.isArray(newVal) && newVal.length > 0;
          break;
        case 3:
          acc.relation ??= { type: "NONE", subType: null };
          acc.relation.type = newVal;
          if (newVal === "NONE") acc.relation.subType = null;
          break;
        case 4:
          acc.relation ??= { type: "NONE", subType: null };
          acc.relation.subType = newVal;
          break;
      }
      updated[rowIdx] = acc;
    });

    onChange(updated);
  };

  return (
    <div className="hot-table-container">
      <HotTable {...settings} afterChange={handleChange} />
    </div>
  );
};

export default ParameterSettingTable;
