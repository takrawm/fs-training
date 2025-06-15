import React, { useMemo, useState, useCallback } from "react";
import { HotTable } from "@handsontable/react";
import "handsontable/dist/handsontable.full.min.css";
import { createAccountMap } from "../utils/accountMapping";
import { OPERATION_SYMBOLS } from "../utils/astTypes";
import {
  PARAM_OP_MAPPING,
  PARAMETER_TYPES,
  DEFAULT_PARAMETER_VALUES,
  DEFAULT_PARAMETER_REFERENCE,
  SUMMARY_ACCOUNTS,
} from "../utils/constants";
import { ParameterUtils } from "../utils/parameterUtils";

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

  // ParameterUtilsを使用してヘルパー関数を統一
  const getParameterType = (account) =>
    ParameterUtils.getParameterType(account);
  const getParameterValue = (account) =>
    ParameterUtils.getParameterValue(account);
  const getParameterReferences = (account) =>
    ParameterUtils.getParameterReferences(account);

  // 成長率科目の設定を抽出
  const growthRateAccounts = useMemo(() => {
    return data.filter(
      (account) => getParameterType(account) === PARAMETER_TYPES.GROWTH_RATE
    );
  }, [data]);

  // 他科目割合科目の設定を抽出
  const percentageAccounts = useMemo(() => {
    return data.filter(
      (account) => getParameterType(account) === PARAMETER_TYPES.PERCENTAGE
    );
  }, [data]);

  // 他科目連動科目の設定を抽出
  const proportionateAccounts = useMemo(() => {
    return data.filter(
      (account) => getParameterType(account) === PARAMETER_TYPES.PROPORTIONATE
    );
  }, [data]);

  // 個別計算科目の設定を抽出
  const calculationAccounts = useMemo(() => {
    return data.filter(
      (account) => getParameterType(account) === PARAMETER_TYPES.CALCULATION
    );
  }, [data]);

  // CF調整計算科目の設定を抽出
  const cfAdjustmentAccounts = useMemo(() => {
    return data.filter(
      (account) =>
        getParameterType(account) === PARAMETER_TYPES.CF_ADJUSTMENT_CALC
    );
  }, [data]);

  // BS変動科目の設定を抽出
  const bsChangeAccounts = useMemo(() => {
    return data.filter(
      (account) => getParameterType(account) === PARAMETER_TYPES.BS_CHANGE
    );
  }, [data]);

  // 成長率科目のテーブルデータの作成
  const growthRateTableData = useMemo(() => {
    return growthRateAccounts.map((account) => {
      const paramValue = getParameterValue(account);
      const displayValue =
        paramValue !== null ? paramValue : DEFAULT_PARAMETER_VALUES.GROWTH_RATE;

      return [account.accountName, getParameterType(account), displayValue];
    });
  }, [growthRateAccounts]);

  // 他科目割合科目のテーブルデータの作成
  const percentageTableData = useMemo(() => {
    return percentageAccounts.map((account) => {
      const paramValue = getParameterValue(account);
      const displayValue =
        paramValue !== null ? paramValue : DEFAULT_PARAMETER_VALUES.PERCENTAGE;

      const paramReferences = getParameterReferences(account);
      const referenceAccount = paramReferences
        ? paramReferences
        : { accountId: DEFAULT_PARAMETER_REFERENCE, operation: null, lag: 0 };

      return [
        account.accountName,
        getParameterType(account),
        displayValue,
        accountMap[referenceAccount.accountId] || referenceAccount.accountId,
      ];
    });
  }, [percentageAccounts, accountMap]);

  // 他科目連動科目のテーブルデータの作成
  const proportionateTableData = useMemo(() => {
    return proportionateAccounts.map((account) => {
      const paramReferences = getParameterReferences(account);
      const referenceAccount = paramReferences
        ? paramReferences
        : { accountId: DEFAULT_PARAMETER_REFERENCE, operation: null, lag: 0 };

      return [
        account.accountName,
        getParameterType(account),
        accountMap[referenceAccount.accountId] || referenceAccount.accountId,
      ];
    });
  }, [proportionateAccounts, accountMap]);

  // 個別計算科目のテーブルデータの作成
  const calculationTableData = useMemo(() => {
    return calculationAccounts.map((account) => {
      const paramReferences = getParameterReferences(account);
      const row = [account.accountName, getParameterType(account)];

      // CALCULATIONの場合は配列として扱う
      const referencesArray = Array.isArray(paramReferences)
        ? paramReferences
        : [];

      // 最大2つの参照科目を表示
      for (let i = 0; i < 2; i++) {
        const ref = referencesArray[i];
        if (ref) {
          row.push(
            OPERATION_SYMBOLS[ref.operation] || ref.operation || "",
            accountMap[ref.accountId] || ref.accountId
          );
        } else {
          row.push("", "");
        }
      }

      return row;
    });
  }, [calculationAccounts, accountMap]);

  // CF調整計算科目のテーブルデータの作成
  const cfAdjustmentTableData = useMemo(() => {
    return cfAdjustmentAccounts.map((account) => {
      const paramReferences = getParameterReferences(account);
      const referenceAccount = paramReferences
        ? paramReferences
        : { accountId: "", operation: "ADD", lag: 0 };

      return [
        account.accountName,
        getParameterType(account),
        OPERATION_SYMBOLS[referenceAccount.operation] ||
          referenceAccount.operation ||
          "",
        accountMap[referenceAccount.accountId] || referenceAccount.accountId,
      ];
    });
  }, [cfAdjustmentAccounts, accountMap]);

  // BS変動科目のテーブルデータの作成
  const bsChangeTableData = useMemo(() => {
    return bsChangeAccounts.map((account) => {
      const paramReferences = getParameterReferences(account);
      const referenceAccount = paramReferences
        ? paramReferences
        : { accountId: "", operation: "SUB", lag: 0 };

      return [
        account.accountName,
        getParameterType(account),
        OPERATION_SYMBOLS[referenceAccount.operation] ||
          referenceAccount.operation ||
          "",
        accountMap[referenceAccount.accountId] || referenceAccount.accountId,
      ];
    });
  }, [bsChangeAccounts, accountMap]);

  // 成長率科目のテーブル設定
  const growthRateSettings = {
    data: growthRateTableData,
    colHeaders: ["勘定科目", "パラメータタイプ", "設定値"],
    columns: [
      { type: "text", readOnly: true },
      { type: "text", readOnly: true },
      {
        type: "numeric",
        numericFormat: {
          pattern: "0.00%",
          culture: "ja-JP",
        },
        readOnly: false,
      },
    ],
    width: "100%",
    height: 300,
    stretchH: "all",
    rowHeaders: true,
    licenseKey: "non-commercial-and-evaluation",
  };

  // 他科目割合科目のテーブル設定
  const percentageSettings = {
    data: percentageTableData,
    colHeaders: ["勘定科目", "パラメータタイプ", "設定値", "参照科目"],
    columns: [
      { type: "text", readOnly: true },
      { type: "text", readOnly: true },
      {
        type: "numeric",
        numericFormat: {
          pattern: "0.00%",
          culture: "ja-JP",
        },
        readOnly: false,
      },
      { type: "text", readOnly: true },
    ],
    width: "100%",
    height: 300,
    stretchH: "all",
    rowHeaders: true,
    licenseKey: "non-commercial-and-evaluation",
  };

  // 他科目連動科目のテーブル設定
  const proportionateSettings = {
    data: proportionateTableData,
    colHeaders: ["勘定科目", "パラメータタイプ", "参照科目"],
    columns: [
      { type: "text", readOnly: true },
      { type: "text", readOnly: true },
      { type: "text", readOnly: true },
    ],
    width: "100%",
    height: 300,
    stretchH: "all",
    rowHeaders: true,
    licenseKey: "non-commercial-and-evaluation",
  };

  // 個別計算科目のテーブル設定
  const calculationSettings = {
    data: calculationTableData,
    colHeaders: [
      "勘定科目",
      "パラメータタイプ",
      "式1",
      "科目1",
      "式2",
      "科目2",
    ],
    nestedHeaders: [
      [
        { label: "勘定科目", rowspan: 2 },
        { label: "パラメータタイプ", rowspan: 2 },
        { label: "参照科目1", colspan: 2 },
        { label: "参照科目2", colspan: 2 },
      ],
      [null, null, "式", "科目名", "式", "科目名"],
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
    height: 300,
    stretchH: "all",
    rowHeaders: true,
    licenseKey: "non-commercial-and-evaluation",
  };

  // CF調整計算科目のテーブル設定
  const cfAdjustmentSettings = {
    data: cfAdjustmentTableData,
    colHeaders: ["勘定科目", "パラメータタイプ", "演算子", "参照科目"],
    columns: [
      { type: "text", readOnly: true },
      { type: "text", readOnly: true },
      { type: "text", readOnly: true },
      { type: "text", readOnly: true },
    ],
    width: "100%",
    height: 300,
    stretchH: "all",
    rowHeaders: true,
    licenseKey: "non-commercial-and-evaluation",
  };

  // BS変動科目のテーブル設定
  const bsChangeSettings = {
    data: bsChangeTableData,
    colHeaders: ["勘定科目", "パラメータタイプ", "演算子", "参照科目"],
    columns: [
      { type: "text", readOnly: true },
      { type: "text", readOnly: true },
      { type: "text", readOnly: true },
      { type: "text", readOnly: true },
    ],
    width: "100%",
    height: 300,
    stretchH: "all",
    rowHeaders: true,
    licenseKey: "non-commercial-and-evaluation",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="table-group">
        <h3>成長率型</h3>
        <div className="hot-table-container">
          <HotTable {...growthRateSettings} />
        </div>
      </div>

      <div className="table-group">
        <h3>他科目割合型</h3>
        <div className="hot-table-container">
          <HotTable {...percentageSettings} />
        </div>
      </div>

      <div className="table-group">
        <h3>他科目連動型</h3>
        <div className="hot-table-container">
          <HotTable {...proportionateSettings} />
        </div>
      </div>

      <div className="table-group">
        <h3>個別計算型</h3>
        <div className="hot-table-container">
          <HotTable {...calculationSettings} />
        </div>
      </div>

      <div className="table-group">
        <h3>CF調整計算型</h3>
        <div className="hot-table-container">
          <HotTable {...cfAdjustmentSettings} />
        </div>
      </div>

      <div className="table-group">
        <h3>BS変動型</h3>
        <div className="hot-table-container">
          <HotTable {...bsChangeSettings} />
        </div>
      </div>
    </div>
  );
};

export default ParameterConfiguration;
