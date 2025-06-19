import React, { useMemo } from "react";
import { HotTable } from "@handsontable/react";
import "handsontable/dist/handsontable.full.min.css";
import { PARAMETER_TYPES, CF_ADJUSTMENT_TYPE } from "../utils/constants";
import { ParameterUtils } from "../utils/parameterUtils";

/**
 * パラメータ設定テーブルコンポーネント
 * @param {Object} props
 * @param {Array} props.data - アカウント配列
 * @param {Function} props.onChange - 変更時のコールバック
 * @returns {JSX.Element}
 */
const ParameterSettingTable = ({ data, onChange }) => {
  const settings = useMemo(() => {
    console.log("1. Input data:", data);

    const mappedData = data.map((account) => {
      // ParameterUtilsを使用してパラメータタイプを取得
      const paramType = ParameterUtils.getParameterType(account);

      // cfAdjustment.typeを取得
      const cfAdjustmentType = account.flowAttributes?.cfAdjustment?.type || "";

      return [account.accountName, paramType, cfAdjustmentType];
    });

    console.log("2. Mapped data for table:", mappedData);

    const settings = {
      data: mappedData,
      colHeaders: ["勘定科目", "パラメータタイプ", "CF調整タイプ"],
      columns: [
        { type: "text", readOnly: true },
        {
          type: "dropdown",
          source: Object.values(PARAMETER_TYPES),
        },
        {
          type: "dropdown",
          source: Object.values(CF_ADJUSTMENT_TYPE),
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
      if (colIdx === 0 || newVal === undefined) return;
      const acc = { ...updated[rowIdx] };

      switch (colIdx) {
        case 1: // パラメータタイプ
          if (acc.stockAttributes?.parameter) {
            acc.stockAttributes = {
              ...acc.stockAttributes,
              parameter: {
                ...acc.stockAttributes.parameter,
                paramType: newVal,
              },
            };
          } else if (acc.flowAttributes?.parameter) {
            acc.flowAttributes = {
              ...acc.flowAttributes,
              parameter: {
                ...acc.flowAttributes.parameter,
                paramType: newVal,
              },
            };
          }
          break;
        case 2: // CF調整タイプ
          if (acc.flowAttributes) {
            acc.flowAttributes = {
              ...acc.flowAttributes,
              cfAdjustment: {
                ...acc.flowAttributes.cfAdjustment,
                type: newVal,
              },
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
