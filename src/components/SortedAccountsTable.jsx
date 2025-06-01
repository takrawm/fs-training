import React, { useMemo } from "react";
import { HotTable } from "@handsontable/react";
import "handsontable/dist/handsontable.full.min.css";

/**
 * ソート済みアカウント表示テーブルコンポーネント
 * @param {Object} props
 * @param {Array} props.data - アカウント配列
 * @returns {JSX.Element}
 */
const SortedAccountsTable = ({ data }) => {
  const tableSettings = useMemo(() => {
    return {
      data: data.map((account) => [
        account.id,
        account.order,
        account.accountName,
        account.parentAccount || "",
        account.sheetType.sheet || "",
      ]),
      colHeaders: ["ID", "オーダー", "勘定科目", "親科目", "シート"],
      columns: [
        { type: "text", readOnly: true },
        { type: "text", readOnly: true },
        { type: "text", readOnly: true },
        { type: "text", readOnly: true },
        { type: "text", readOnly: true },
      ],
      width: "100%",
      height: "100%",
      stretchH: "all",
      rowHeaders: true,
      licenseKey: "non-commercial-and-evaluation",
    };
  }, [data]);

  return (
    <div className="hot-table-container">
      <HotTable settings={tableSettings} />
    </div>
  );
};

export default SortedAccountsTable;
