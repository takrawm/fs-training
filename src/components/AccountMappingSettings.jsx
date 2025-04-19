import React, { useState, useEffect, useMemo } from "react";
import { HotTable } from "@handsontable/react";
import { registerAllModules } from "handsontable/registry";
import "handsontable/dist/handsontable.full.min.css";

// Handsontableのすべてのモジュールを登録
registerAllModules();

// 集約科目リスト
const AGGREGATED_ACCOUNTS = [
  "売上高1",
  "売上高2",
  "売上原価1",
  "売上原価2",
  "人件費",
  "広告宣伝費",
  "物件費",
  "償却費1",
  "償却費2",
  "その他販管費",
  "現預金",
  "売掛金",
  "棚卸資産",
  "その他流動資産",
  "償却資産1",
  "償却資産2",
  "その他固定資産",
  "買掛金",
  "支払手形",
  "その他流動負債",
  "長期借入金",
  "その他固定負債",
  "資本金等",
  "利益剰余金等",
];

// 財務カテゴリーリスト（表示用とDB用の値を分けて管理）
const FINANCIAL_CATEGORIES = {
  PL: [
    { value: "sales", label: "売上高" },
    { value: "cogs", label: "売上原価" },
    { value: "sga", label: "販管費" },
  ],
  BS: [
    { value: "current_assets", label: "流動資産" },
    { value: "fixed_assets", label: "固定資産" },
    { value: "current_liabilities", label: "流動負債" },
    { value: "fixed_liabilities", label: "固定負債" },
    { value: "equity", label: "純資産" },
  ],
};

// 表示用のラベルから値を取得するヘルパー関数
const getCategoryValueFromLabel = (sheetName, label) => {
  const category = FINANCIAL_CATEGORIES[sheetName]?.find(
    (c) => c.label === label
  );
  return category ? category.value : "";
};

// 値からラベルを取得するヘルパー関数
const getCategoryLabelFromValue = (sheetName, value) => {
  const category = FINANCIAL_CATEGORIES[sheetName]?.find(
    (c) => c.value === value
  );
  return category ? category.label : "";
};

const AccountMappingSettings = ({
  model,
  rawData,
  onUpdateMapping,
  onClose,
  isInitialMapping = false,
}) => {
  // 現在のステップ（1: 科目マッピング、2: 財務区分設定）
  const [currentStep, setCurrentStep] = useState(1);

  // マッピングデータ
  const [mappingData, setMappingData] = useState([]);

  // 集約済みのアカウントデータ（ステップ2用）
  const [aggregatedAccounts, setAggregatedAccounts] = useState([]);

  // データからマッピングデータを初期化
  useEffect(() => {
    if (!model) return;

    // rawDataから直接初期化する場合（初期マッピングフロー）
    if (isInitialMapping && rawData) {
      const initialMappingData = [];
      // 全シートのアカウントを結合
      Object.entries(rawData.sheets).forEach(([sheetName, accounts]) => {
        accounts.forEach((account) => {
          initialMappingData.push({
            id: account.id,
            code: account.code,
            name: account.name,
            accountType: "",
            sheetName: sheetName,
            useOriginal: true,
            aggregatedAccount: "",
            financialCategory: "",
            // 期間ごとの値も保持
            periodValues: account.periodValues,
          });
        });
      });
      setMappingData(initialMappingData);
    }
    // modelから初期化する場合（既存のモデルからのマッピング編集）
    else if (model.accounts) {
      const initialMappingData = model.accounts.map((account) => {
        return {
          id: account.id,
          code: account.code,
          name: account.name,
          accountType: account.accountType,
          sheetName: account.sheetName || "PL",
          useOriginal: account.accountMapping?.useOriginal ?? true,
          aggregatedAccount: account.accountMapping?.aggregatedAccount || "",
          financialCategory: account.accountMapping?.financialCategory || "",
        };
      });
      setMappingData(initialMappingData);
    }
  }, [model, rawData, isInitialMapping]);

  // 集約済みアカウントを計算
  useEffect(() => {
    if (mappingData.length === 0) return;

    // そのまま使用するアカウントと、集約科目のリストを作成
    const originalAccounts = mappingData
      .filter((acc) => acc.useOriginal)
      .map((acc) => ({
        id: acc.id,
        name: acc.name,
        code: acc.code,
        sheetName: acc.sheetName,
        financialCategory: acc.financialCategory,
        // 表示用のラベルを計算
        financialCategoryLabel: getCategoryLabelFromValue(
          acc.sheetName,
          acc.financialCategory
        ),
      }));

    // 集約科目のリストを作成 (重複を削除)
    const uniqueAggregatedAccounts = [
      ...new Set(
        mappingData
          .filter((acc) => !acc.useOriginal && acc.aggregatedAccount)
          .map((acc) => acc.aggregatedAccount)
      ),
    ].map((name) => {
      const sourceAccount = mappingData.find(
        (acc) => !acc.useOriginal && acc.aggregatedAccount === name
      );
      const sheetName = sourceAccount?.sheetName || "PL";
      return {
        id: `agg-${name.replace(/\s+/g, "-")}`,
        name,
        code: `AGG-${name}`,
        sheetName,
        financialCategory: sourceAccount?.financialCategory || "",
        // 表示用のラベルを計算
        financialCategoryLabel: getCategoryLabelFromValue(
          sheetName,
          sourceAccount?.financialCategory
        ),
      };
    });

    // 両方を結合して表示順に並べ替え
    setAggregatedAccounts([...originalAccounts, ...uniqueAggregatedAccounts]);
  }, [mappingData]);

  // ステップ1のテーブルカラム定義
  const mappingColumns = useMemo(
    () => [
      { data: "code", title: "コード", readOnly: true, width: 80 },
      { data: "name", title: "元の勘定科目", readOnly: true, width: 180 },
      {
        data: "useOriginal",
        title: "マッピング方法",
        type: "dropdown",
        source: ["そのまま使用", "集約科目に変換"],
        width: 150,
        // ドロップダウンの値を変換
        renderer: function (
          instance,
          td,
          row,
          col,
          prop,
          value,
          cellProperties
        ) {
          td.innerHTML = value ? "そのまま使用" : "集約科目に変換";
          return td;
        },
      },
      {
        data: "aggregatedAccount",
        title: "集約科目",
        type: "dropdown",
        source: AGGREGATED_ACCOUNTS,
        width: 150,
        // useOriginalがfalseの場合のみ編集可能
        readOnly: function (source, row, col, prop) {
          return mappingData[row]?.useOriginal === true;
        },
      },
    ],
    [mappingData]
  );

  // ステップ2のテーブルカラム定義
  const categoryColumns = useMemo(
    () => [
      { data: "code", title: "コード", readOnly: true, width: 80 },
      { data: "name", title: "勘定科目", readOnly: true, width: 180 },
      {
        data: "sheetName",
        title: "シート区分",
        type: "dropdown",
        source: ["PL", "BS"],
        width: 100,
      },
      {
        data: "financialCategoryLabel",
        title: "財務区分",
        type: "dropdown",
        source: function (query, process) {
          const row = this.row;
          const sheetName = aggregatedAccounts[row]?.sheetName || "PL";
          return process(
            FINANCIAL_CATEGORIES[sheetName].map((cat) => cat.label)
          );
        },
        width: 150,
      },
    ],
    [aggregatedAccounts]
  );

  // マッピング変更時の処理関数
  const handleMappingChange = (changes, source) => {
    if (source === "edit" && changes) {
      // 変更を適用
      changes.forEach(([row, prop, oldValue, newValue]) => {
        // 値が実際に変更された場合のみ処理
        if (oldValue !== newValue) {
          const updatedMappingData = [...mappingData];

          // useOriginalの値を適切に変換
          if (prop === "useOriginal") {
            newValue = newValue === "そのまま使用";
          }

          updatedMappingData[row][prop] = newValue;

          // マッピング方法が「そのまま使用」に変更された場合、集約科目をクリア
          if (prop === "useOriginal" && newValue === true) {
            updatedMappingData[row].aggregatedAccount = "";
          }

          setMappingData(updatedMappingData);

          // 親コンポーネントに変更を通知（初期マッピング時のみ）
          if (isInitialMapping) {
            const account = updatedMappingData[row];
            const mappingInfo = {
              useOriginal: account.useOriginal,
              aggregatedAccount: account.aggregatedAccount,
              financialCategory: account.financialCategory,
              sheetName: account.sheetName,
            };

            onUpdateMapping(account.id, mappingInfo);
          }
        }
      });
    }
  };

  // 財務区分変更時の処理関数
  const handleCategoryChange = (changes, source) => {
    if (source === "edit" && changes) {
      // 変更を適用
      changes.forEach(([row, prop, oldValue, newValue]) => {
        if (oldValue !== newValue) {
          const updatedAggregatedAccounts = [...aggregatedAccounts];

          // 財務区分のラベルが変更された場合、内部値も更新
          if (prop === "financialCategoryLabel") {
            const sheetName = updatedAggregatedAccounts[row].sheetName;
            const categoryValue = getCategoryValueFromLabel(
              sheetName,
              newValue
            );
            updatedAggregatedAccounts[row].financialCategory = categoryValue;
            updatedAggregatedAccounts[row].financialCategoryLabel = newValue;
          } else {
            updatedAggregatedAccounts[row][prop] = newValue;

            // シート区分が変更された場合、財務区分をリセット
            if (prop === "sheetName") {
              updatedAggregatedAccounts[row].financialCategory = "";
              updatedAggregatedAccounts[row].financialCategoryLabel = "";
            }
          }

          setAggregatedAccounts(updatedAggregatedAccounts);

          // 変更をmappingDataに反映
          if (prop === "financialCategoryLabel" || prop === "sheetName") {
            const accountName = updatedAggregatedAccounts[row].name;
            const newCategory =
              updatedAggregatedAccounts[row].financialCategory;
            const newSheetName = updatedAggregatedAccounts[row].sheetName;

            // 通常の科目の場合
            if (!accountName.startsWith("AGG-")) {
              // 元の科目の場合
              const targetIndex = mappingData.findIndex(
                (item) => item.id === updatedAggregatedAccounts[row].id
              );

              if (targetIndex !== -1) {
                const newMappingData = [...mappingData];
                newMappingData[targetIndex].financialCategory = newCategory;
                newMappingData[targetIndex].sheetName = newSheetName;
                setMappingData(newMappingData);

                // 親コンポーネントに変更を通知（初期マッピング時のみ）
                if (isInitialMapping) {
                  const account = newMappingData[targetIndex];
                  const mappingInfo = {
                    useOriginal: account.useOriginal,
                    aggregatedAccount: account.aggregatedAccount,
                    financialCategory: account.financialCategory,
                    sheetName: account.sheetName,
                  };

                  onUpdateMapping(account.id, mappingInfo);
                }
              }
            } else {
              // 集約科目の場合
              // 関連するすべてのマッピングを更新
              const updatedMappingData = mappingData.map((item) => {
                if (
                  !item.useOriginal &&
                  item.aggregatedAccount === accountName.replace("AGG-", "")
                ) {
                  const updatedItem = {
                    ...item,
                    financialCategory: newCategory,
                    sheetName: newSheetName,
                  };

                  // 親コンポーネントに変更を通知（初期マッピング時のみ）
                  if (isInitialMapping) {
                    const mappingInfo = {
                      useOriginal: updatedItem.useOriginal,
                      aggregatedAccount: updatedItem.aggregatedAccount,
                      financialCategory: updatedItem.financialCategory,
                      sheetName: updatedItem.sheetName,
                    };

                    onUpdateMapping(updatedItem.id, mappingInfo);
                  }

                  return updatedItem;
                }
                return item;
              });
              setMappingData(updatedMappingData);
            }
          }
        }
      });
    }
  };

  // 次のステップへ進む
  const handleNextStep = () => {
    setCurrentStep(2);
  };

  // 前のステップに戻る
  const handlePrevStep = () => {
    setCurrentStep(1);
  };

  // 保存ボタンのハンドラ
  const handleSave = () => {
    // 全てのマッピング情報を保存（初期マッピング時は既に更新済み）
    if (!isInitialMapping) {
      mappingData.forEach((account) => {
        const mappingInfo = {
          useOriginal: account.useOriginal,
          aggregatedAccount: account.aggregatedAccount,
          financialCategory: account.financialCategory,
          sheetName: account.sheetName,
        };

        onUpdateMapping(account.id, mappingInfo);
      });
    }

    // 閉じる
    onClose();
  };

  return (
    <div className="account-mapping-settings">
      <h2>勘定科目マッピング設定</h2>

      {currentStep === 1 ? (
        <>
          <div
            className="step-indicator"
            style={{
              display: "flex",
              marginBottom: "20px",
              marginTop: "20px",
              borderBottom: "2px solid #eee",
              paddingBottom: "10px",
            }}
          >
            <span
              className="step active"
              style={{
                padding: "10px 20px",
                backgroundColor: "#1890ff",
                color: "white",
                borderRadius: "5px",
                marginRight: "20px",
                fontWeight: "bold",
              }}
            >
              ステップ1: 勘定科目マッピング
            </span>
            <span
              className="step"
              style={{
                padding: "10px 20px",
                backgroundColor: "#f0f0f0",
                borderRadius: "5px",
                color: "#666",
              }}
            >
              ステップ2: 財務区分設定
            </span>
          </div>

          <p
            className="step-description"
            style={{
              fontSize: "16px",
              marginBottom: "20px",
              backgroundColor: "#f9f9f9",
              padding: "15px",
              borderRadius: "5px",
              borderLeft: "4px solid #1890ff",
            }}
          >
            個々の勘定科目について、そのまま使用するか集約科目にマッピングするかを選択してください。
          </p>

          <div
            className="mapping-table-container"
            style={{ height: "450px", width: "100%" }}
          >
            <HotTable
              data={mappingData}
              columns={mappingColumns}
              rowHeaders={true}
              colHeaders={true}
              height="100%"
              width="100%"
              licenseKey="non-commercial-and-evaluation"
              afterChange={handleMappingChange}
              stretchH="all"
              contextMenu={false}
            />
          </div>

          <div className="mapping-buttons" style={{ marginTop: "20px" }}>
            <button
              onClick={handleNextStep}
              className="btn-primary"
              style={{
                backgroundColor: "#1890ff",
                color: "white",
                border: "none",
                padding: "10px 20px",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "16px",
              }}
            >
              次へ
            </button>
            <button
              onClick={onClose}
              className="btn-secondary"
              style={{
                marginLeft: "10px",
                backgroundColor: "#f0f0f0",
                border: "1px solid #d9d9d9",
                padding: "10px 20px",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "16px",
              }}
            >
              キャンセル
            </button>
          </div>
        </>
      ) : (
        <>
          <div
            className="step-indicator"
            style={{
              display: "flex",
              marginBottom: "20px",
              marginTop: "20px",
              borderBottom: "2px solid #eee",
              paddingBottom: "10px",
            }}
          >
            <span
              className="step"
              style={{
                padding: "10px 20px",
                backgroundColor: "#f0f0f0",
                borderRadius: "5px",
                marginRight: "20px",
                color: "#666",
              }}
            >
              ステップ1: 勘定科目マッピング
            </span>
            <span
              className="step active"
              style={{
                padding: "10px 20px",
                backgroundColor: "#1890ff",
                color: "white",
                borderRadius: "5px",
                fontWeight: "bold",
              }}
            >
              ステップ2: 財務区分設定
            </span>
          </div>

          <p
            className="step-description"
            style={{
              fontSize: "16px",
              marginBottom: "20px",
              backgroundColor: "#f9f9f9",
              padding: "15px",
              borderRadius: "5px",
              borderLeft: "4px solid #1890ff",
            }}
          >
            各勘定科目が財務諸表のどの項目に該当するかを指定してください。
          </p>

          <div
            className="mapping-table-container"
            style={{ height: "450px", width: "100%" }}
          >
            <HotTable
              data={aggregatedAccounts}
              columns={categoryColumns}
              rowHeaders={true}
              colHeaders={true}
              height="100%"
              width="100%"
              licenseKey="non-commercial-and-evaluation"
              afterChange={handleCategoryChange}
              stretchH="all"
              contextMenu={false}
            />
          </div>

          <div className="mapping-buttons" style={{ marginTop: "20px" }}>
            <button
              onClick={handlePrevStep}
              className="btn-secondary"
              style={{
                backgroundColor: "#f0f0f0",
                border: "1px solid #d9d9d9",
                padding: "10px 20px",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "16px",
              }}
            >
              戻る
            </button>
            <button
              onClick={handleSave}
              className="btn-primary"
              style={{
                marginLeft: "10px",
                backgroundColor: "#1890ff",
                color: "white",
                border: "none",
                padding: "10px 20px",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "16px",
              }}
            >
              {isInitialMapping ? "財務諸表を生成" : "保存"}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AccountMappingSettings;
