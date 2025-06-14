import React, { useMemo } from "react";
import { HotTable } from "@handsontable/react";
import "handsontable/dist/handsontable.full.min.css";
import {
  TARGET_SHEETS,
  SUMMARY_ACCOUNTS,
  SHEET_TYPES,
  FLOW_SHEETS,
  STOCK_SHEETS,
  PARAMETER_TYPES,
} from "../utils/constants";
import { createAccountMap } from "../utils/accountMapping";

/**
 * 親科目設定テーブルコンポーネント
 * @param {Object} props
 * @param {Array} props.data - アカウント配列
 * @param {Function} props.onChange - 変更時のコールバック
 * @returns {JSX.Element}
 */
const ParentAccountSettingTable = ({ data, onChange }) => {
  // アカウントIDからアカウント名へのマッピングを作成（SUMMARY_ACCOUNTSも含める）
  const accountMap = useMemo(() => {
    const dataMap = createAccountMap(data);
    const summaryMap = Object.values(SUMMARY_ACCOUNTS).reduce(
      (map, account) => {
        map[account.id] = account.accountName;
        return map;
      },
      {}
    );
    return { ...dataMap, ...summaryMap };
  }, [data]);

  // 集計科目のみをフィルタリング
  const summaryAccounts = data
    .filter((account) => {
      // 新しい構造での集計科目の判定
      if (account.sheet?.sheetType === SHEET_TYPES.STOCK) {
        return (
          account.stockAttributes?.parameter?.paramType ===
          PARAMETER_TYPES.CHILDREN_SUM
        );
      } else if (account.sheet?.sheetType === SHEET_TYPES.FLOW) {
        return (
          account.flowAttributes?.parameter?.paramType ===
          PARAMETER_TYPES.CHILDREN_SUM
        );
      }
      return account.parameterType === PARAMETER_TYPES.CHILDREN_SUM; // 旧形式との互換性
    })
    .map((account) => ({
      accountName: account.accountName,
      id: account.id,
    }));

  // シートタイプの選択肢
  const sheetTypeOptions = Object.values(SHEET_TYPES);

  // シート名の選択肢（シートタイプに応じて動的に変更される）
  const getSheetNameOptions = (sheetType) => {
    if (sheetType === SHEET_TYPES.STOCK) {
      return Object.values(STOCK_SHEETS);
    } else if (sheetType === SHEET_TYPES.FLOW) {
      return Object.values(FLOW_SHEETS);
    }
    return [];
  };

  const parentAccountSettings = useMemo(() => {
    return {
      data: data.map((account) => [
        account.accountName,
        account.parentAccountId
          ? accountMap[account.parentAccountId] || ""
          : "",
        account.sheet?.sheetType || "",
        account.sheet?.name || "",
      ]),
      colHeaders: ["勘定科目", "親科目", "シートタイプ", "シート名"],
      columns: [
        { type: "text", readOnly: true },
        {
          type: "dropdown",
          source: summaryAccounts.map((account) => account.accountName),
        },
        {
          type: "dropdown",
          source: sheetTypeOptions,
        },
        {
          type: "dropdown",
          source: [
            ...Object.values(STOCK_SHEETS),
            ...Object.values(FLOW_SHEETS),
          ],
        },
      ],
      width: "100%",
      height: "100%",
      stretchH: "all",
      rowHeaders: true,
      licenseKey: "non-commercial-and-evaluation",
    };
  }, [data, summaryAccounts, accountMap]);

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
            const selectedAccount = summaryAccounts.find(
              (acc) => acc.accountName === newValue
            );
            account.parentAccountId = selectedAccount?.id || null;
          } else if (col === 2) {
            // シートタイプの変更
            if (!account.sheet) account.sheet = {};
            account.sheet = { ...account.sheet, sheetType: newValue };
          } else if (col === 3) {
            // シート名の変更
            if (!account.sheet) account.sheet = {};
            account.sheet = { ...account.sheet, name: newValue };
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
