import React, { useMemo } from "react";
import { HotTable } from "@handsontable/react";
import "handsontable/dist/handsontable.full.min.css";
import { TARGET_SHEETS, SUMMARY_ACCOUNTS } from "../utils/constants";

/**
 * 親科目設定テーブルコンポーネント
 * @param {Object} props
 * @param {Array} props.data - アカウント配列
 * @param {Function} props.onChange - 変更時のコールバック
 * @returns {JSX.Element}
 */
const ParentAccountSettingTable = ({ data, onChange }) => {
  // 集計科目のみをフィルタリング
  const summaryAccounts = data
    .filter((account) => account.parameterType === "CHILDREN_SUM")
    .map((account) => ({
      accountName: account.accountName,
      parentAccount: account.parentAccount || "",
    }));

  const parentAccountSettings = useMemo(() => {
    return {
      data: data.map((account) => [
        account.accountName,
        account.parentAccount || "",
        account.sheetType || "",
      ]),
      colHeaders: ["勘定科目", "親科目", "シート"],
      columns: [
        { type: "text", readOnly: true },
        {
          type: "dropdown",
          source: summaryAccounts.map((account) => account.accountName),
        },
        {
          type: "dropdown",
          source: TARGET_SHEETS,
        },
      ],
      width: "100%",
      height: "100%",
      stretchH: "all",
      rowHeaders: true,
      licenseKey: "non-commercial-and-evaluation",
    };
  }, [data, summaryAccounts]);

  const handleChange = (changes, source) => {
    // changesがnullまたは編集以外のソースの場合は何もしない
    if (!changes || source !== "edit") return;

    // FinancialModelBuilderのhandleParamChangeと同様の形式で変更を適用
    const updatedAccounts = [...data];

    // 変更を適用
    if (Array.isArray(changes)) {
      changes.forEach(([row, col, oldValue, newValue]) => {
        if (row >= 0 && row < data.length) {
          const account = { ...data[row] };

          if (col === 1) {
            // 親科目の変更
            account.parentAccount = newValue;
          } else if (col === 2) {
            // シートの変更
            account.sheetType = newValue;
          }

          updatedAccounts[row] = account;
        }
      });

      // 一度に全てのアカウントを更新
      onChange(updatedAccounts);
    }
  };

  return (
    <div className="hot-table-container">
      <HotTable settings={parentAccountSettings} afterChange={handleChange} />
    </div>
  );
};

export default ParentAccountSettingTable;
