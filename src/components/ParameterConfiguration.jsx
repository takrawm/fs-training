import React, { useMemo, useState, useCallback } from "react";
import { HotTable } from "@handsontable/react";
import "handsontable/dist/handsontable.full.min.css";
import { createAccountMap } from "../utils/accountMapping";
import { OPERATION_SYMBOLS } from "../utils/astTypes";
import {
  PARAM_OP_MAPPING,
  PARAMETER_TYPES,
  DEFAULT_PARAMETER_VALUES,
} from "../utils/constants";

/**
 * パラメータ設定確認コンポーネント
 * @param {Object} props
 * @param {Array} props.data - アカウント配列
 * @param {Object} props.financialModel - 財務モデル
 * @param {Function} props.onChange - 変更時のコールバック
 * @returns {JSX.Element}
 */
const ParameterConfiguration = ({ data, financialModel, onChange }) => {
  // 科目IDと科目名のマッピングを作成
  const accountMap = useMemo(() => createAccountMap(data), [data]);

  // 参照科目の設定を抽出
  const referenceAccounts = useMemo(() => {
    return data.filter(
      (account) => account.parameterType === PARAMETER_TYPES.REFERENCE
    );
  }, [data]);

  // 期末残高+/-変動科目の設定を抽出
  const balanceAndChangeAccounts = useMemo(() => {
    return data.filter(
      (account) => account.parameterType === PARAMETER_TYPES.BALANCE_AND_CHANGE
    );
  }, [data]);

  // 成長率科目の設定を抽出
  const growthRateAccounts = useMemo(() => {
    return data.filter(
      (account) => account.parameterType === PARAMETER_TYPES.GROWTH_RATE
    );
  }, [data]);

  // 他科目割合科目の設定を抽出
  const percentageAccounts = useMemo(() => {
    return data.filter(
      (account) => account.parameterType === PARAMETER_TYPES.PERCENTAGE
    );
  }, [data]);

  // 他科目連動科目の設定を抽出
  const proportionateAccounts = useMemo(() => {
    return data.filter(
      (account) => account.parameterType === PARAMETER_TYPES.PROPORTIONATE
    );
  }, [data]);

  // 共通のテーブルデータ生成関数
  const createTableData = useCallback((accounts, maxRefCount, accountMap) => {
    return accounts.map((account) => {
      const row = [account.accountName, account.parameterType];
      const refAccounts = account.parameterReferenceAccounts || [];

      // 参照科目の数だけ列を追加（式と科目名の2列ずつ）
      for (let i = 0; i < maxRefCount; i++) {
        const refAccount = refAccounts[i];
        row.push(
          refAccount
            ? OPERATION_SYMBOLS[refAccount.operation] || refAccount.operation
            : ""
        ); // 式
        row.push(refAccount ? accountMap[refAccount.id] || refAccount.id : ""); // 科目名
      }

      return row;
    });
  }, []);

  // 共通の列設定生成関数
  const createColumns = useCallback((accounts, maxRefCount) => {
    const cols = [
      { type: "text", readOnly: true },
      { type: "text", readOnly: true },
    ];

    // 参照科目の数だけ列を追加（式と科目名の2列ずつ）
    for (let i = 0; i < maxRefCount; i++) {
      cols.push(
        {
          type: "dropdown",
          source(query, process) {
            const rowIndex = this.row;
            const account = accounts[rowIndex];
            if (!account) {
              process([]);
              return;
            }

            // パラメータタイプに応じた演算子の選択肢を返す
            const operations = PARAM_OP_MAPPING[account.parameterType] || [];
            console.log("Operations for", account.accountName, ":", operations);
            const symbols = operations.map((op) => OPERATION_SYMBOLS[op]);
            console.log("Symbols for", account.accountName, ":", symbols);

            process(symbols);
          },
          readOnly: false,
          strict: true,
          allowInvalid: false,
          className: "htDropdown",
          title: "式", // 列のタイトルを設定
        },
        {
          type: "text",
          readOnly: true,
          title: "科目名", // 列のタイトルを設定
        }
      );
    }

    return cols;
  }, []);

  // 共通のヘッダー生成関数
  const createHeaders = useCallback((maxRefCount) => {
    const headers = ["勘定科目", "パラメータタイプ"];
    for (let i = 0; i < maxRefCount; i++) {
      headers.push("式", "科目名");
    }
    return headers;
  }, []);

  // 共通のネストヘッダー生成関数
  const createNestedHeaders = useCallback((maxRefCount) => {
    // 1行目
    const firstRow = [
      { label: "勘定科目", rowspan: 2 },
      { label: "パラメータタイプ", rowspan: 2 },
    ];

    // 参照科目ブロックを追加（colspan=2）
    for (let i = 0; i < maxRefCount; i++) {
      firstRow.push({ label: `参照科目${i + 1}`, colspan: 2 });
    }

    // 2行目
    const secondRow = [
      null, // 勘定科目のrowspan分
      null, // パラメータタイプのrowspan分
    ];
    for (let i = 0; i < maxRefCount; i++) {
      secondRow.push("式", "科目名");
    }

    return [firstRow, secondRow];
  }, []);

  // 参照科目の最大参照数を取得
  const maxReferenceCount = useMemo(() => {
    return Math.max(
      ...referenceAccounts.map(
        (account) => account.parameterReferenceAccounts?.length || 0
      )
    );
  }, [referenceAccounts]);

  // 期末残高+/-変動科目の最大参照数を取得
  const maxBalanceAndChangeCount = useMemo(() => {
    return Math.max(
      ...balanceAndChangeAccounts.map(
        (account) => account.parameterReferenceAccounts?.length || 0
      )
    );
  }, [balanceAndChangeAccounts]);

  // 参照科目のテーブルデータの作成
  const referenceTableData = useMemo(() => {
    return createTableData(referenceAccounts, maxReferenceCount, accountMap);
  }, [referenceAccounts, maxReferenceCount, accountMap, createTableData]);

  // 期末残高+/-変動科目のテーブルデータの作成
  const balanceAndChangeTableData = useMemo(() => {
    return createTableData(
      balanceAndChangeAccounts,
      maxBalanceAndChangeCount,
      accountMap
    );
  }, [
    balanceAndChangeAccounts,
    maxBalanceAndChangeCount,
    accountMap,
    createTableData,
  ]);

  // 参照科目の列の設定を動的に生成
  const referenceColumns = useMemo(() => {
    return createColumns(referenceAccounts, maxReferenceCount);
  }, [maxReferenceCount, referenceAccounts, createColumns]);

  // 期末残高+/-変動科目の列の設定を動的に生成
  const balanceAndChangeColumns = useMemo(() => {
    return createColumns(balanceAndChangeAccounts, maxBalanceAndChangeCount);
  }, [maxBalanceAndChangeCount, balanceAndChangeAccounts, createColumns]);

  // 参照科目の列ヘッダーを動的に生成
  const referenceColHeaders = useMemo(() => {
    return createHeaders(maxReferenceCount);
  }, [maxReferenceCount, createHeaders]);

  // 期末残高+/-変動科目の列ヘッダーを動的に生成
  const balanceAndChangeColHeaders = useMemo(() => {
    return createHeaders(maxBalanceAndChangeCount);
  }, [maxBalanceAndChangeCount, createHeaders]);

  // 参照科目のネストされたヘッダーの設定
  const referenceNestedHeaders = useMemo(() => {
    return createNestedHeaders(maxReferenceCount);
  }, [maxReferenceCount, createNestedHeaders]);

  // 期末残高+/-変動科目のネストされたヘッダーの設定
  const balanceAndChangeNestedHeaders = useMemo(() => {
    return createNestedHeaders(maxBalanceAndChangeCount);
  }, [maxBalanceAndChangeCount, createNestedHeaders]);

  // セル変更時の処理（共通化）
  const createHandleChange = useCallback(
    (accounts, parameterType) => {
      return (changes) => {
        if (!changes || typeof onChange !== "function") return;

        // 元のデータをディープコピー
        const updated = data.map((account) => ({
          ...account,
          parameterReferenceAccounts:
            account.parameterReferenceAccounts?.map((ref) => ({ ...ref })) ||
            [],
        }));

        // 対象科目の設定を抽出（更新されたデータから）
        const updatedTargetAccounts = updated.filter(
          (account) => account.parameterType === parameterType
        );

        changes.forEach(([rowIdx, colIdx, oldValue, newValue]) => {
          // 列の設定を取得
          const columns =
            parameterType === PARAMETER_TYPES.REFERENCE
              ? referenceColumns
              : balanceAndChangeColumns;
          const column = columns[colIdx];

          // 式の列の場合のみ処理
          if (column?.title === "式") {
            const account = updatedTargetAccounts[rowIdx];
            if (!account) return;

            const refAccounts = account.parameterReferenceAccounts || [];
            // 式の列のインデックスから参照科目のインデックスを計算
            const refIndex = Math.floor((colIdx - 2) / 2);
            const refAccount = refAccounts[refIndex];

            if (refAccount) {
              // 記号から演算子に変換
              const operation = Object.entries(OPERATION_SYMBOLS).find(
                ([_, symbol]) => symbol === newValue
              )?.[0];

              if (operation) {
                // 参照科目の演算子を更新
                refAccount.operation = operation;
              }
            }
          }
        });

        // 変更があった場合のみonChangeを呼び出す
        if (JSON.stringify(updated) !== JSON.stringify(data)) {
          console.log("更新前:", data);
          console.log("更新後:", updated);
          onChange(updated);
        }
      };
    },
    [data, onChange, referenceColumns, balanceAndChangeColumns]
  );

  // 参照科目用の変更ハンドラ
  const handleReferenceChange = useMemo(() => {
    return createHandleChange(referenceAccounts, PARAMETER_TYPES.REFERENCE);
  }, [createHandleChange, referenceAccounts]);

  // 期末残高+/-変動科目用の変更ハンドラ
  const handleBalanceAndChangeChange = useMemo(() => {
    return createHandleChange(
      balanceAndChangeAccounts,
      PARAMETER_TYPES.BALANCE_AND_CHANGE
    );
  }, [createHandleChange, balanceAndChangeAccounts]);

  // 参照科目のテーブル設定
  const referenceSettings = {
    data: referenceTableData,
    colHeaders: referenceColHeaders,
    columns: referenceColumns,
    nestedHeaders: referenceNestedHeaders,
    width: "100%",
    height: 300,
    stretchH: "all",
    rowHeaders: true,
    licenseKey: "non-commercial-and-evaluation",
    afterChange: handleReferenceChange,
  };

  // 期末残高+/-変動科目のテーブル設定
  const balanceAndChangeSettings = {
    data: balanceAndChangeTableData,
    colHeaders: balanceAndChangeColHeaders,
    columns: balanceAndChangeColumns,
    nestedHeaders: balanceAndChangeNestedHeaders,
    width: "100%",
    height: 300,
    stretchH: "all",
    rowHeaders: true,
    licenseKey: "non-commercial-and-evaluation",
    afterChange: handleBalanceAndChangeChange,
  };

  // 単一値パラメータ用のテーブルデータ生成関数
  const createSingleValueTableData = useCallback((accounts, parameterType) => {
    return accounts.map((account) => {
      const row = [account.accountName, account.parameterType];

      // PROPORTIONATEタイプの場合はparameterValueを追加しない
      if (parameterType !== PARAMETER_TYPES.PROPORTIONATE) {
        // パラメータタイプから定数キーを取得
        const paramKey = Object.entries(PARAMETER_TYPES).find(
          ([_, value]) => value === account.parameterType
        )?.[0];

        // デフォルト値の取得
        const defaultValue = paramKey ? DEFAULT_PARAMETER_VALUES[paramKey] : 0;
        row.push(account.parameterValue ?? defaultValue);
      }

      return row;
    });
  }, []);

  // 単一値パラメータ用の列設定生成関数
  const createSingleValueColumns = useCallback((parameterType) => {
    const cols = [
      { type: "text", readOnly: true },
      { type: "text", readOnly: true },
    ];

    // PROPORTIONATEタイプの場合はparameterValueの列を追加しない
    if (parameterType !== PARAMETER_TYPES.PROPORTIONATE) {
      cols.push({
        type: "numeric",
        numericFormat: {
          pattern: "0.00%",
          culture: "ja-JP",
        },
        readOnly: false,
      });
    }

    return cols;
  }, []);

  // 単一値パラメータ用のヘッダー生成関数
  const createSingleValueHeaders = useCallback((parameterType) => {
    const headers = ["勘定科目", "パラメータタイプ"];

    // PROPORTIONATEタイプの場合はparameterValueのヘッダーを追加しない
    if (parameterType !== PARAMETER_TYPES.PROPORTIONATE) {
      headers.push("設定値");
    }

    return headers;
  }, []);

  // 成長率科目のテーブルデータの作成
  const growthRateTableData = useMemo(() => {
    return createSingleValueTableData(
      growthRateAccounts,
      PARAMETER_TYPES.GROWTH_RATE
    );
  }, [growthRateAccounts, createSingleValueTableData]);

  // 他科目割合科目のテーブルデータの作成
  const percentageTableData = useMemo(() => {
    return createSingleValueTableData(
      percentageAccounts,
      PARAMETER_TYPES.PERCENTAGE
    );
  }, [percentageAccounts, createSingleValueTableData]);

  // 他科目連動科目のテーブルデータの作成
  const proportionateTableData = useMemo(() => {
    return createSingleValueTableData(
      proportionateAccounts,
      PARAMETER_TYPES.PROPORTIONATE
    );
  }, [proportionateAccounts, createSingleValueTableData]);

  // 単一値パラメータ用の変更ハンドラ
  const createSingleValueHandleChange = useCallback(
    (accounts, parameterType) => {
      return (changes) => {
        if (!changes || typeof onChange !== "function") return;

        // 元のデータをディープコピー
        const updated = data.map((account) => ({ ...account }));

        // 対象科目の設定を抽出（更新されたデータから）
        const updatedTargetAccounts = updated.filter(
          (account) => account.parameterType === parameterType
        );

        changes.forEach(([rowIdx, colIdx, oldValue, newValue]) => {
          // 設定値の列の場合のみ処理
          if (colIdx === 2) {
            const account = updatedTargetAccounts[rowIdx];
            if (!account) return;

            // パーセント値を小数に変換
            const numericValue =
              typeof newValue === "string"
                ? parseFloat(newValue.replace("%", "")) / 100
                : newValue;

            // 参照科目の演算子を更新
            account.parameterValue = numericValue;
          }
        });

        // 変更があった場合のみonChangeを呼び出す
        if (JSON.stringify(updated) !== JSON.stringify(data)) {
          console.log("更新前:", data);
          console.log("更新後:", updated);
          onChange(updated);
        }
      };
    },
    [data, onChange]
  );

  // 成長率科目用の変更ハンドラ
  const handleGrowthRateChange = useMemo(() => {
    return createSingleValueHandleChange(
      growthRateAccounts,
      PARAMETER_TYPES.GROWTH_RATE
    );
  }, [createSingleValueHandleChange, growthRateAccounts]);

  // 他科目割合科目用の変更ハンドラ
  const handlePercentageChange = useMemo(() => {
    return createSingleValueHandleChange(
      percentageAccounts,
      PARAMETER_TYPES.PERCENTAGE
    );
  }, [createSingleValueHandleChange, percentageAccounts]);

  // 他科目連動科目用の変更ハンドラ
  const handleProportionateChange = useMemo(() => {
    return createSingleValueHandleChange(
      proportionateAccounts,
      PARAMETER_TYPES.PROPORTIONATE
    );
  }, [createSingleValueHandleChange, proportionateAccounts]);

  // 成長率科目のテーブル設定
  const growthRateSettings = {
    data: growthRateTableData,
    colHeaders: createSingleValueHeaders(PARAMETER_TYPES.GROWTH_RATE),
    columns: createSingleValueColumns(PARAMETER_TYPES.GROWTH_RATE),
    width: "100%",
    height: 300,
    stretchH: "all",
    rowHeaders: true,
    licenseKey: "non-commercial-and-evaluation",
    afterChange: handleGrowthRateChange,
  };

  // 他科目割合科目のテーブル設定
  const percentageSettings = {
    data: percentageTableData,
    colHeaders: createSingleValueHeaders(PARAMETER_TYPES.PERCENTAGE),
    columns: createSingleValueColumns(PARAMETER_TYPES.PERCENTAGE),
    width: "100%",
    height: 300,
    stretchH: "all",
    rowHeaders: true,
    licenseKey: "non-commercial-and-evaluation",
    afterChange: handlePercentageChange,
  };

  // 他科目連動科目のテーブル設定
  const proportionateSettings = {
    data: proportionateTableData,
    colHeaders: createSingleValueHeaders(PARAMETER_TYPES.PROPORTIONATE),
    columns: createSingleValueColumns(PARAMETER_TYPES.PROPORTIONATE),
    width: "100%",
    height: 300,
    stretchH: "all",
    rowHeaders: true,
    licenseKey: "non-commercial-and-evaluation",
    afterChange: handleProportionateChange,
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
        <h3>個別参照型</h3>
        <div className="hot-table-container">
          <HotTable {...referenceSettings} />
        </div>
      </div>

      <div className="table-group">
        <h3>期末残高+/-変動型</h3>
        <div className="hot-table-container">
          <HotTable {...balanceAndChangeSettings} />
        </div>
      </div>
    </div>
  );
};

export default ParameterConfiguration;
