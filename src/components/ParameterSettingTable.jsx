import React, { useMemo } from "react";
import { HotTable } from "@handsontable/react";
import "handsontable/dist/handsontable.full.min.css";

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
        account.isParameterReference || false,
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
          source: ["NONE", "GROWTH_RATE", "PERCENTAGE", "PROPORTIONATE"],
        },
        { type: "checkbox" },
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

    const updatedAccounts = [...data];
    changes.forEach(([rowIndex, columnIndex, oldValue, newValue]) => {
      if (newValue !== oldValue) {
        const account = { ...updatedAccounts[rowIndex] };

        switch (columnIndex) {
          case 1: // パラメータタイプ
            account.parameterType = newValue;
            break;
          case 2: // 被参照科目
            account.isParameterReference = newValue;
            break;
          case 3: // リレーションタイプ
            if (!account.relation)
              account.relation = { type: "NONE", subType: null };
            account.relation.type = newValue;
            if (newValue === "NONE") account.relation.subType = null;
            break;
          case 4: // リレーションサブタイプ
            if (!account.relation)
              account.relation = { type: "NONE", subType: null };
            account.relation.subType = newValue;
            break;
        }

        updatedAccounts[rowIndex] = account;
      }
    });

    onChange(updatedAccounts);
  };

  return (
    <div className="hot-table-container">
      <HotTable {...settings} afterChange={handleChange} />
    </div>
  );
};

export default ParameterSettingTable;
