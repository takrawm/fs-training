import React, { useMemo } from "react";
import { HotTable } from "@handsontable/react";
import "handsontable/dist/handsontable.full.min.css";
import { PARAMETER_TYPES } from "../utils/constants";
import { ParameterUtils } from "../utils/parameterUtils";

/**
 * パラメータ設定テーブルコンポーネント
 * 新しい構造（parameterがトップレベルプロパティ）に対応
 * @param {Object} props
 * @param {Array} props.data - アカウント配列
 * @param {Function} props.onChange - 変更時のコールバック
 * @returns {JSX.Element}
 */
const ParameterSettingTable = ({ data, onChange }) => {
  const settings = useMemo(() => {
    console.log("1. Input data:", data);

    const mappedData = data.map((account) => {
      // 新しい構造に対応：parameterはトップレベルプロパティ
      const paramType = ParameterUtils.getParameterType(account);
      const paramValue = ParameterUtils.getParameterValue(account);
      const paramReferences = ParameterUtils.getParameterReferences(account);

      // paramReferencesの表示用文字列
      const paramReferencesText = paramReferences ? "あり" : "";

      return [account.accountName, paramType, paramValue, paramReferencesText];
    });

    console.log("2. Mapped data for table:", mappedData);

    const settings = {
      data: mappedData,
      colHeaders: [
        "勘定科目",
        "パラメータタイプ",
        "パラメータ値",
        "パラメータ参照",
      ],
      columns: [
        { type: "text", readOnly: true },
        {
          type: "dropdown",
          source: Object.values(PARAMETER_TYPES),
        },
        {
          type: "numeric",
          allowInvalid: false,
        },
        {
          type: "text",
          readOnly: true,
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
  }, [data]);

  const handleChange = (changes) => {
    if (!changes) return;
    console.log("=== ParameterSettingTable - Cell Change ===");
    console.log("1. Changes:", changes);

    const updated = [...data];
    changes.forEach(([rowIdx, colIdx, _old, newVal]) => {
      if (colIdx === 0 || colIdx === 3 || newVal === undefined) return; // 勘定科目とパラメータ参照は編集不可

      const acc = { ...updated[rowIdx] };

      switch (colIdx) {
        case 1: // パラメータタイプ
          // 新しい構造：parameterはトップレベルプロパティ
          if (acc.parameter) {
            acc.parameter = {
              ...acc.parameter,
              paramType: newVal,
            };
          } else {
            // parameterが存在しない場合は新規作成
            acc.parameter = {
              paramType: newVal,
              paramValue: null,
              paramReferences: null,
            };
          }
          break;
        case 2: // パラメータ値
          // 新しい構造：parameterはトップレベルプロパティ
          if (acc.parameter) {
            acc.parameter = {
              ...acc.parameter,
              paramValue: newVal,
            };
          } else {
            // parameterが存在しない場合は新規作成
            acc.parameter = {
              paramType: PARAMETER_TYPES.NONE,
              paramValue: newVal,
              paramReferences: null,
            };
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
