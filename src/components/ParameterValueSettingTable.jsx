import React, { useMemo, useEffect } from "react";
import { HotTable } from "@handsontable/react";
import "handsontable/dist/handsontable.full.min.css";

/**
 * パラメータ値設定テーブルコンポーネント
 * @param {Object} props
 * @param {Array} props.accounts - アカウント配列
 * @param {Array} props.referenceAccounts - 被参照科目の配列
 * @param {Function} props.onChange - 変更時のコールバック
 * @returns {JSX.Element}
 */
const ParameterValueSettingTable = ({
  accounts,
  referenceAccounts,
  onChange,
}) => {
  // パラメータタイプ別にアカウントをグループ化
  const { growthRateAccounts, percentageAccounts, proportionateAccounts } =
    useMemo(() => {
      const growthRateAccounts = accounts.filter(
        (account) => account.parameterType === "GROWTH_RATE"
      );
      const percentageAccounts = accounts.filter(
        (account) => account.parameterType === "PERCENTAGE"
      );
      const proportionateAccounts = accounts.filter(
        (account) => account.parameterType === "PROPORTIONATE"
      );

      return { growthRateAccounts, percentageAccounts, proportionateAccounts };
    }, [accounts]);

  // 被参照科目のリスト（ドロップダウン用）
  const referenceAccountNames = useMemo(() => {
    return referenceAccounts.map((account) => account.accountName);
  }, [referenceAccounts]);

  // コンポーネントマウント時またはアカウント/参照科目の変更時に
  // すべてのパラメータタイプのアカウントにデフォルト値を設定
  useEffect(() => {
    let hasUpdates = false;
    const updatedAccounts = [...accounts].map((account) => {
      // パラメータタイプに応じてデフォルト値を設定
      if (account.parameterType === "GROWTH_RATE") {
        // 既存のパラメータを保持しつつ、必要なプロパティを設定
        const parameter = account.parameter || {};
        if (!parameter.growthRate) {
          hasUpdates = true;
          return {
            ...account,
            parameter: {
              ...parameter,
              growthRate: 0.1, // デフォルト10%成長
              referenceAccountName: parameter.referenceAccountName || null,
              referenceAccountId: parameter.referenceAccountId || null,
            },
          };
        }
      } else if (account.parameterType === "PERCENTAGE") {
        // 被参照科目があれば最初のものを使用
        const defaultRef =
          referenceAccountNames.length > 0 ? referenceAccountNames[0] : null;
        const referenceAccount = referenceAccounts.find(
          (a) => a.accountName === defaultRef
        );

        // 既存のパラメータを保持しつつ、必要なプロパティを設定
        const parameter = account.parameter || {};
        if (!parameter.percentage || !parameter.referenceAccountName) {
          hasUpdates = true;
          return {
            ...account,
            parameter: {
              ...parameter,
              percentage: parameter.percentage || 0.3, // デフォルト30%
              referenceAccountName:
                parameter.referenceAccountName || defaultRef,
              referenceAccountId:
                parameter.referenceAccountId || referenceAccount?.id || null,
            },
          };
        }
      } else if (account.parameterType === "PROPORTIONATE") {
        // 被参照科目があれば最初のものを使用
        const defaultRef =
          referenceAccountNames.length > 0 ? referenceAccountNames[0] : null;
        const referenceAccount = referenceAccounts.find(
          (a) => a.accountName === defaultRef
        );

        // 既存のパラメータを保持しつつ、必要なプロパティを設定
        const parameter = account.parameter || {};
        if (!parameter.referenceAccountName) {
          hasUpdates = true;
          return {
            ...account,
            parameter: {
              ...parameter,
              referenceAccountName: defaultRef,
              referenceAccountId: referenceAccount?.id || null,
            },
          };
        }
      }

      return account;
    });

    // 更新が一つでもあった場合のみコールバックを呼び出す
    if (hasUpdates) {
      console.log("テーブル初期表示時のデフォルト値設定:", updatedAccounts);
      onChange(updatedAccounts);
    }
  }, [accounts, referenceAccounts, referenceAccountNames, onChange]);

  // 成長率設定テーブルの設定
  const growthRateSettings = useMemo(() => {
    if (growthRateAccounts.length === 0) return null;

    const data = growthRateAccounts.map((account) => [
      account.accountName,
      account.parameter?.growthRate
        ? Math.round(account.parameter.growthRate * 100 * 100) / 100
        : 10,
    ]);

    return {
      data,
      colHeaders: ["勘定科目", "成長率 (%)"],
      columns: [
        { type: "text", readOnly: true, width: 200 },
        {
          type: "numeric",
          numericFormat: {
            pattern: "0.00",
          },
          width: 150,
        },
      ],
      width: "100%",
      height: Math.min(400, 50 + data.length * 30),
      stretchH: "all",
      licenseKey: "non-commercial-and-evaluation",
    };
  }, [growthRateAccounts]);

  // パーセンテージ設定テーブルの設定
  const percentageSettings = useMemo(() => {
    if (percentageAccounts.length === 0) return null;

    const data = percentageAccounts.map((account) => [
      account.accountName,
      account.parameter?.referenceAccountName || referenceAccountNames[0] || "",
      account.parameter?.percentage
        ? Math.round(account.parameter.percentage * 100 * 100) / 100
        : 30,
    ]);

    return {
      data,
      colHeaders: ["勘定科目", "参照科目", "比率 (%)"],
      columns: [
        { type: "text", readOnly: true, width: 200 },
        {
          type: "dropdown",
          source: referenceAccountNames,
          width: 200,
        },
        {
          type: "numeric",
          numericFormat: {
            pattern: "0.00",
          },
          width: 150,
        },
      ],
      width: "100%",
      height: Math.min(400, 50 + data.length * 30),
      stretchH: "all",
      licenseKey: "non-commercial-and-evaluation",
    };
  }, [percentageAccounts, referenceAccountNames]);

  // 比例関係設定テーブルの設定
  const proportionateSettings = useMemo(() => {
    if (proportionateAccounts.length === 0) return null;

    const data = proportionateAccounts.map((account) => [
      account.accountName,
      account.parameter?.referenceAccountName || referenceAccountNames[0] || "",
    ]);

    return {
      data,
      colHeaders: ["勘定科目", "連動参照科目"],
      columns: [
        { type: "text", readOnly: true, width: 200 },
        {
          type: "dropdown",
          source: referenceAccountNames,
          width: 200,
        },
      ],
      width: "100%",
      height: Math.min(400, 50 + data.length * 30),
      stretchH: "all",
      licenseKey: "non-commercial-and-evaluation",
    };
  }, [proportionateAccounts, referenceAccountNames]);

  // 成長率設定の変更ハンドラ
  const handleGrowthRateChange = (changes) => {
    if (!changes) return;

    const updatedAccounts = [...accounts];
    changes.forEach(([rowIndex, prop, oldValue, newValue]) => {
      // columnが1の場合は成長率の変更
      if (prop === 1 && newValue !== oldValue) {
        const accountName = growthRateAccounts[rowIndex].accountName;
        const accountIndex = updatedAccounts.findIndex(
          (a) => a.accountName === accountName
        );

        if (accountIndex !== -1) {
          // 既存のparameterプロパティを保持または新規作成
          const parameter = updatedAccounts[accountIndex].parameter || {};
          // パーセントから小数に変換（例: 10% → 0.1）
          const growthRateValue = parseFloat(newValue) / 100;

          console.log(
            `成長率を設定: ${accountName} -> ${growthRateValue} (${newValue}%)`
          );
          console.log(`元のパラメータ:`, parameter);

          // 更新後のパラメータオブジェクト
          const updatedParameter = {
            ...parameter,
            growthRate: growthRateValue,
            // 他のプロパティを初期化
            referenceAccountName: parameter.referenceAccountName || null,
            referenceAccountId: parameter.referenceAccountId || null,
          };

          console.log(`更新後のパラメータ:`, updatedParameter);
          updatedAccounts[accountIndex].parameter = updatedParameter;
        }
      }
    });

    console.log("成長率変更後のアカウント配列:", updatedAccounts);
    onChange(updatedAccounts);
  };

  // パーセンテージ設定の変更ハンドラ
  const handlePercentageChange = (changes) => {
    if (!changes) return;

    const updatedAccounts = [...accounts];
    changes.forEach(([rowIndex, columnIndex, oldValue, newValue]) => {
      if (newValue !== oldValue) {
        const accountName = percentageAccounts[rowIndex].accountName;
        const accountIndex = updatedAccounts.findIndex(
          (a) => a.accountName === accountName
        );

        if (accountIndex !== -1) {
          // 既存のparameterプロパティを保持または新規作成
          const parameter = updatedAccounts[accountIndex].parameter || {};
          console.log(`元のパラメータ (${accountName}):`, parameter);

          let updatedParameter = { ...parameter };

          if (columnIndex === 1) {
            // 参照科目の変更
            const referenceAccount = referenceAccounts.find(
              (a) => a.accountName === newValue
            );

            console.log(
              `参照科目を設定: ${accountName} -> ${newValue} (ID: ${
                referenceAccount?.id || "なし"
              })`
            );

            updatedParameter = {
              ...updatedParameter,
              referenceAccountName: newValue,
              referenceAccountId: referenceAccount?.id,
            };
          } else if (columnIndex === 2) {
            // 比率の変更（パーセントから小数に変換）
            const percentageValue = parseFloat(newValue) / 100;

            console.log(
              `比率を設定: ${accountName} -> ${percentageValue} (${newValue}%)`
            );

            updatedParameter = {
              ...updatedParameter,
              percentage: percentageValue,
            };
          }

          console.log(`更新後のパラメータ (${accountName}):`, updatedParameter);
          updatedAccounts[accountIndex].parameter = updatedParameter;
        }
      }
    });

    console.log("比率変更後のアカウント配列:", updatedAccounts);
    onChange(updatedAccounts);
  };

  // 比例関係設定の変更ハンドラ
  const handleProportionateChange = (changes) => {
    if (!changes) return;

    const updatedAccounts = [...accounts];
    changes.forEach(([rowIndex, columnIndex, oldValue, newValue]) => {
      // columnが1の場合は参照科目の変更
      if (columnIndex === 1 && newValue !== oldValue) {
        const accountName = proportionateAccounts[rowIndex].accountName;
        const accountIndex = updatedAccounts.findIndex(
          (a) => a.accountName === accountName
        );

        if (accountIndex !== -1) {
          // 既存のparameterプロパティを保持または新規作成
          const parameter = updatedAccounts[accountIndex].parameter || {};
          console.log(`元のパラメータ (${accountName}):`, parameter);

          const referenceAccount = referenceAccounts.find(
            (a) => a.accountName === newValue
          );

          console.log(
            `連動参照科目を設定: ${accountName} -> ${newValue} (ID: ${
              referenceAccount?.id || "なし"
            })`
          );

          const updatedParameter = {
            ...parameter,
            referenceAccountName: newValue,
            referenceAccountId: referenceAccount?.id,
          };

          console.log(`更新後のパラメータ (${accountName}):`, updatedParameter);
          updatedAccounts[accountIndex].parameter = updatedParameter;
        }
      }
    });

    console.log("連動設定変更後のアカウント配列:", updatedAccounts);
    onChange(updatedAccounts);
  };

  return (
    <div className="parameter-value-setting-table">
      {growthRateSettings && (
        <>
          <h3>成長率設定</h3>
          <div className="hot-table-container">
            <HotTable
              {...growthRateSettings}
              afterChange={handleGrowthRateChange}
            />
          </div>
        </>
      )}
      {percentageSettings && (
        <>
          <h3>比率設定</h3>
          <div className="hot-table-container">
            <HotTable
              {...percentageSettings}
              afterChange={handlePercentageChange}
            />
          </div>
        </>
      )}
      {proportionateSettings && (
        <>
          <h3>連動設定</h3>
          <div className="hot-table-container">
            <HotTable
              {...proportionateSettings}
              afterChange={handleProportionateChange}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default ParameterValueSettingTable;
