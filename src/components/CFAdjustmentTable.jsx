import React, { useMemo } from "react";
import { HotTable } from "@handsontable/react";
import "handsontable/dist/handsontable.full.min.css";
import {
  CF_ADJUSTMENT_TYPE,
  OPERATIONS,
  CF_CATEGORIES,
  SHEET_TYPES,
  SUMMARY_ACCOUNTS,
} from "../utils/constants";

/**
 * CF調整設定テーブルコンポーネント
 * @param {Object} props
 * @param {Array} props.data - アカウント配列
 * @param {Function} props.onChange - 変更時のコールバック
 * @returns {JSX.Element}
 */
const CFAdjustmentTable = ({ data, onChange }) => {
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

  // ストック型のアカウントのみを抽出（targetAccount用）
  const stockAccounts = useMemo(() => {
    return data.filter(
      (account) => account.sheet?.sheetType === SHEET_TYPES.STOCK
    );
  }, [data]);

  // CF調整タイプを取得するヘルパー関数
  const getCFAdjustmentType = (account) => {
    return account.flowAttributes?.cfAdjustment?.type || "";
  };

  // CF調整設定を取得するヘルパー関数
  const getCFAdjustment = (account) => {
    return account.flowAttributes?.cfAdjustment || {};
  };

  // BS_MAPPING型の科目を抽出
  const bsMappingAccounts = useMemo(() => {
    return data.filter(
      (account) =>
        getCFAdjustmentType(account) === CF_ADJUSTMENT_TYPE.BS_MAPPING
    );
  }, [data]);

  // RECLASSIFICATION型の科目を抽出
  const reclassificationAccounts = useMemo(() => {
    return data.filter(
      (account) =>
        getCFAdjustmentType(account) === CF_ADJUSTMENT_TYPE.RECLASSIFICATION
    );
  }, [data]);

  // BS_MAPPINGテーブルデータの作成
  const bsMappingTableData = useMemo(() => {
    return bsMappingAccounts.map((account) => {
      const cfAdjustment = getCFAdjustment(account);

      return [
        account.accountName,
        cfAdjustment.targetAccountId
          ? accountMap[cfAdjustment.targetAccountId] ||
            cfAdjustment.targetAccountId
          : "",
        cfAdjustment.operation || "",
        cfAdjustment.cfCategory || "",
      ];
    });
  }, [bsMappingAccounts, accountMap]);

  // RECLASSIFICATIONテーブルデータの作成
  const reclassificationTableData = useMemo(() => {
    return reclassificationAccounts.map((account) => {
      const cfAdjustment = getCFAdjustment(account);

      return [
        account.accountName,
        cfAdjustment.targetAccountId
          ? accountMap[cfAdjustment.targetAccountId] ||
            cfAdjustment.targetAccountId
          : "",
        cfAdjustment.operation || "",
        cfAdjustment.cfCategory || "",
      ];
    });
  }, [reclassificationAccounts, accountMap]);

  // 変更ハンドラ
  const createHandleChange = (accounts, adjustmentType) => {
    return (changes) => {
      if (!changes) return;

      const updated = [...data];
      changes.forEach(([rowIdx, colIdx, _old, newVal]) => {
        if (colIdx === 0 || newVal === undefined) return;

        const targetAccount = accounts[rowIdx];
        if (!targetAccount) return;

        const accountIndex = updated.findIndex(
          (acc) => acc.id === targetAccount.id
        );
        if (accountIndex === -1) return;

        const acc = { ...updated[accountIndex] };

        // flowAttributesとcfAdjustmentの構造を確保
        if (!acc.flowAttributes) {
          acc.flowAttributes = { parameter: null, cfAdjustment: null };
        }
        if (!acc.flowAttributes.cfAdjustment) {
          acc.flowAttributes.cfAdjustment = { type: adjustmentType };
        }

        switch (colIdx) {
          case 1: // targetAccount
            const selectedStock = stockAccounts.find(
              (stock) => stock.accountName === newVal
            );
            acc.flowAttributes.cfAdjustment = {
              ...acc.flowAttributes.cfAdjustment,
              targetAccountId: selectedStock?.id || "",
            };
            break;
          case 2: // operation
            acc.flowAttributes.cfAdjustment = {
              ...acc.flowAttributes.cfAdjustment,
              operation: newVal,
            };
            break;
          case 3: // cfCategory
            acc.flowAttributes.cfAdjustment = {
              ...acc.flowAttributes.cfAdjustment,
              cfCategory: newVal,
            };
            break;
        }

        updated[accountIndex] = acc;
      });

      onChange(updated);
    };
  };

  // BS_MAPPINGテーブル設定
  const bsMappingSettings = {
    data: bsMappingTableData,
    colHeaders: ["勘定科目", "対象アカウント", "演算", "CFカテゴリ"],
    columns: [
      { type: "text", readOnly: true },
      {
        type: "dropdown",
        source: stockAccounts.map((account) => account.accountName),
      },
      {
        type: "dropdown",
        source: Object.values(OPERATIONS),
      },
      {
        type: "dropdown",
        source: Object.values(CF_CATEGORIES),
      },
    ],
    width: "100%",
    height: 300,
    stretchH: "all",
    rowHeaders: true,
    licenseKey: "non-commercial-and-evaluation",
    afterChange: createHandleChange(
      bsMappingAccounts,
      CF_ADJUSTMENT_TYPE.BS_MAPPING
    ),
  };

  // RECLASSIFICATIONテーブル設定
  const reclassificationSettings = {
    data: reclassificationTableData,
    colHeaders: ["勘定科目", "対象アカウント", "演算", "CFカテゴリ"],
    columns: [
      { type: "text", readOnly: true },
      {
        type: "dropdown",
        source: data.map((account) => account.accountName),
      },
      {
        type: "dropdown",
        source: Object.values(OPERATIONS),
      },
      {
        type: "dropdown",
        source: Object.values(CF_CATEGORIES),
      },
    ],
    width: "100%",
    height: 300,
    stretchH: "all",
    rowHeaders: true,
    licenseKey: "non-commercial-and-evaluation",
    afterChange: createHandleChange(
      reclassificationAccounts,
      CF_ADJUSTMENT_TYPE.RECLASSIFICATION
    ),
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="table-group">
        <h3>BS_MAPPING型</h3>
        <div className="hot-table-container">
          <HotTable {...bsMappingSettings} />
        </div>
      </div>

      <div className="table-group">
        <h3>RECLASSIFICATION型</h3>
        <div className="hot-table-container">
          <HotTable {...reclassificationSettings} />
        </div>
      </div>
    </div>
  );
};

export default CFAdjustmentTable;
