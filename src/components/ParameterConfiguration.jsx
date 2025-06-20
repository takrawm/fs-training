import React, { useMemo, useState, useCallback } from "react";
import { HotTable } from "@handsontable/react";
import "handsontable/dist/handsontable.full.min.css";
import { createAccountMap } from "../utils/accountMapping";
import { OPERATION_SYMBOLS } from "../utils/astTypes";
import { OPERATIONS, SUMMARY_ACCOUNTS } from "../utils/constants";
import { AccountUtils } from "../utils/accountUtils";

/**
 * パラメータ設定確認コンポーネント
 * @param {Object} props
 * @param {Array} props.data - アカウント配列
 * @param {Object} props.financialModel - 財務モデル
 * @param {Function} props.onChange - 変更時のコールバック
 * @returns {JSX.Element}
 */
const ParameterConfiguration = ({ data, financialModel, onChange }) => {
  // 科目IDと科目名のマッピングを作成（SUMMARY_ACCOUNTSも含める）
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

  // 新しいデータ構造に基づくテーブルデータの作成
  const tableData = useMemo(() => {
    return data.map((account) => {
      // baseProfit（flowAttributesから取得）
      const baseProfit = account.flowAttributes?.baseProfit ? "あり" : "";

      // CF調整対象科目ID（flowAttributesから取得）
      const cfAdjustmentTargetId =
        account.flowAttributes?.cfAdjustment?.targetAccountId || "";
      const cfAdjustmentTargetName = cfAdjustmentTargetId
        ? accountMap[cfAdjustmentTargetId] || cfAdjustmentTargetId
        : "";

      // CF調整演算子（flowAttributesから取得）
      const cfAdjustmentOperation =
        account.flowAttributes?.cfAdjustment?.operation || "";
      const cfAdjustmentOperationSymbol = cfAdjustmentOperation
        ? OPERATION_SYMBOLS[cfAdjustmentOperation] || cfAdjustmentOperation
        : "";

      // reclassification（flowAttributesから取得）
      const reclassification = account.flowAttributes?.reclassification || "";

      // CF項目生成フラグ（stockAttributesから取得）
      const generatesCFItem = AccountUtils.shouldGenerateCFItem(account)
        ? "あり"
        : "";

      return [
        account.accountName, // 1列目: 勘定科目
        baseProfit, // 2列目: baseProfit
        cfAdjustmentTargetName, // 3列目: CF調整対象科目
        cfAdjustmentOperationSymbol, // 4列目: CF調整演算子
        reclassification, // 5列目: reclassification
        generatesCFItem, // 6列目: CF項目生成フラグ
      ];
    });
  }, [data, accountMap]);

  // テーブル設定
  const tableSettings = {
    data: tableData,
    colHeaders: [
      "勘定科目",
      "baseProfit",
      "CF調整対象科目",
      "CF調整演算子",
      "reclassification",
      "CF項目生成",
    ],
    columns: [
      { type: "text", readOnly: true }, // 勘定科目
      { type: "text", readOnly: true }, // baseProfit
      { type: "text", readOnly: true }, // CF調整対象科目
      { type: "text", readOnly: true }, // CF調整演算子
      { type: "text", readOnly: true }, // reclassification
      { type: "text", readOnly: true }, // CF項目生成フラグ
    ],
    width: "100%",
    height: 600,
    stretchH: "all",
    rowHeaders: true,
    licenseKey: "non-commercial-and-evaluation",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="hot-table-container">
        <HotTable {...tableSettings} />
      </div>
    </div>
  );
};

export default ParameterConfiguration;
