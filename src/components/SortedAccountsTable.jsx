import React, { useMemo } from "react";
import { HotTable } from "@handsontable/react";
import "handsontable/dist/handsontable.full.min.css";
import { SUMMARY_ACCOUNTS } from "../utils/constants";

/**
 * ソート済みアカウント表示テーブルコンポーネント
 * @param {Object} props
 * @param {Array} props.data - アカウント配列
 * @returns {JSX.Element}
 */
const SortedAccountsTable = ({ data }) => {
  // アカウントIDからアカウント名へのマッピングを作成（SUMMARY_ACCOUNTSも含める）
  const accountMap = useMemo(() => {
    const dataMap = data.reduce((map, account) => {
      map[account.id] = account.accountName;
      return map;
    }, {});

    const summaryMap = Object.values(SUMMARY_ACCOUNTS).reduce(
      (map, account) => {
        map[account.id] = account.accountName;
        return map;
      },
      {}
    );

    return { ...dataMap, ...summaryMap };
  }, [data]);

  const tableSettings = useMemo(() => {
    return {
      data: data.map((account) => [
        account.id,
        account.order,
        account.accountName,
        account.parentAccountId
          ? accountMap[account.parentAccountId] || ""
          : "",
        account.sheet.sheetType || "",
        account.sheet.name || "",
      ]),
      colHeaders: [
        "ID",
        "オーダー",
        "勘定科目",
        "親科目",
        "シートタイプ",
        "シート",
      ],
      columns: [
        { type: "text", readOnly: true },
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
  }, [data, accountMap]);

  return (
    <div className="hot-table-container">
      <HotTable settings={tableSettings} />
    </div>
  );
};

export default SortedAccountsTable;
