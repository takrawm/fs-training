import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { HotTable } from "@handsontable/react";
import { registerAllModules } from "handsontable/registry";
import "handsontable/dist/handsontable.full.min.css";

import {
  DEFAULT_SHEET_TYPES,
  MODEL_ACCOUNTS,
  SUMMARY_ACCOUNTS,
} from "../utils/constants";
import PeriodSelector from "./PeriodSelector";

// Handsontableのすべてのモジュールを登録
registerAllModules();

// シートタイプの選択肢
const SHEET_TYPES = ["PL", "BS", "CF", "CAPEX", "集約科目"];

// 親科目（集計科目）の選択肢
const PARENT_ACCOUNTS = [
  "",
  "売上高合計",
  "売上原価合計",
  "販管費合計",
  "流動資産合計",
  "有形固定資産合計",
  "無形固定資産合計",
  "流動負債合計",
  "固定負債合計",
  "設備投資合計",
];

// パラメータタイプの選択肢
const PARAMETER_TYPES = ["NONE", "GROWTH_RATE", "PERCENTAGE", "PROPORTIONATE"];
// パラメータタイプの選択肢

// リレーションタイプの定義
const RELATIONS = {
  NONE: null,
  PPE: {
    asset: "fixedAsset",
    investment: "investment",
    depreciation: "depreciation",
  },
  RETAINED_EARNINGS: {
    asset: "retained",
    profit: "profit_loss",
    dividend: "dividend",
  },
};

const AccountMappingSettings = ({
  model,
  flattenedData,
  onUpdateMapping,
  onClose,
  isInitialMapping = false,
}) => {
  // マッピングデータ
  const [mappingData, setMappingData] = useState([]);
  // 3段階の表示モード (0: モデル勘定科目設定, 1: パラメータ設定, 2: 集計結果確認)
  const [step, setStep] = useState(0);
  // フラット化済みデータをもとにした行情報
  const flattenedRows = flattenedData?.dataRows || [];

  // 財務モデルを構成するアカウント
  const [accounts, setAccounts] = useState([]);

  // 集約マップを保持する状態を追加
  const [aggregatedMap, setAggregatedMap] = useState({});

  // パラメータデータの準備
  const [paramData, setParamData] = useState([]);

  // 表示用のaggregatedValue
  const [aggregatedValue, setAggregatedValue] = useState([]);

  // 開発中画面の表示フラグ
  const [showDevelopmentMessage, setShowDevelopmentMessage] = useState(false);

  // 期間情報をstateで保持
  const [periods, setPeriods] = useState([]);

  // 初期マッピングデータをデフォルトのシートタイプでセット
  useEffect(() => {
    if (mappingData.length === 0 && flattenedRows.length > 0) {
      const initial = flattenedRows.map((row, idx) => {
        const name = row[0]?.toString().trim();
        return {
          id: `row-${idx}`,
          originalAccount: name,
          modelAccount: name,
        };
      });
      setMappingData(initial);
    }
    console.log("flattenedRows: ", flattenedRows);
  }, [flattenedRows]);

  // テーブル再描画
  const hotTableRef = useRef(null);
  useEffect(() => {
    if (hotTableRef.current?.hotInstance) {
      requestAnimationFrame(() => {
        if (hotTableRef.current?.hotInstance) {
          hotTableRef.current.hotInstance.render();
          hotTableRef.current.hotInstance.refreshDimensions();
        }
      });
    }
  }, [mappingData, step, aggregatedValue]);

  // 列定義 - モデル勘定科目設定用（ステップ0用）
  const columns = useMemo(
    () => [
      {
        data: "originalAccount",
        title: "元の勘定科目",
        readOnly: true,
        width: 200,
      },
      {
        data: "modelAccount",
        title: "モデル勘定科目",
        type: "dropdown",
        width: 200,
        source(query, process) {
          const rowIdx = this.row;
          const original = mappingData[rowIdx]?.originalAccount;
          const options = [original, ...MODEL_ACCOUNTS].filter(
            (v, i, a) => v && a.indexOf(v) === i
          );
          process(options);
        },
      },
    ],
    [mappingData]
  );

  // 列定義 - パラメータ設定用（ステップ1用）
  const paramColumns = useMemo(
    () => [
      {
        data: "accountName",
        title: "モデル勘定科目",
        readOnly: true,
        width: 150,
      },
      {
        data: "parentAccount",
        title: "親科目",
        type: "dropdown",
        source: PARENT_ACCOUNTS,
        width: 150,
      },
      {
        data: "parameterType",
        title: "パラメータタイプ",
        type: "dropdown",
        source: PARAMETER_TYPES,
        width: 150,
      },
      {
        data: "isParameterReference",
        title: "被参照科目",
        type: "dropdown",
        source: [true, false],
        width: 150,
      },
      {
        data: "relation.type",
        title: "リレーションタイプ",
        type: "dropdown",
        source: Object.keys(RELATIONS),
        width: 150,
      },
      {
        data: "relation.subType",
        title: "リレーション詳細",
        type: "dropdown",
        source: function (query, process) {
          const row = this.row;
          const relationType = this.instance.getDataAtRowProp(
            row,
            "relation.type"
          );

          if (!relationType || relationType === "NONE") {
            process([]);
            return;
          }

          // 選択された関連タイプに基づいてサブタイプのリストを生成
          const relation = RELATIONS[relationType];
          if (relation && typeof relation === "object") {
            process(Object.keys(relation));
          } else {
            process([]);
          }
        },
        width: 150,
      },
    ],
    []
  );

  // table データ変更ハンドラ
  const handleChange = useCallback(
    (changes) => {
      if (!changes) return;
      const newData = [...mappingData];
      changes.forEach(([r, prop, , newVal]) => {
        if (newVal != null) newData[r][prop] = newVal;
      });
      setMappingData(newData);
    },
    [mappingData]
  );

  // パラメータ変更ハンドラ
  const handleParamChange = useCallback(
    (changes) => {
      if (!changes) return;
      const newParamData = [...paramData];
      changes.forEach(([r, prop, , newVal]) => {
        if (newVal != null) {
          newParamData[r] = { ...newParamData[r], [prop]: newVal };

          // relation.typeまたはrelation.subTypeが変更された場合、relation全体を更新
          if (prop === "relation.type" || prop === "relation.subType") {
            const currentData = newParamData[r];
            // relationがまだない場合は初期化
            if (!currentData.relation) {
              currentData.relation = { type: "NONE", subType: null };
            }

            // 値を設定
            if (prop === "relation.type") {
              currentData.relation.type = newVal || "NONE";
              // typeがNONEの場合はsubTypeをnullにリセット
              if (newVal === "NONE" || !newVal) {
                currentData.relation.subType = null;
              }
            } else if (prop === "relation.subType") {
              currentData.relation.subType = newVal;
            }
          }
        }
      });
      setParamData(newParamData);

      // aggregatedAccountsを更新
      const updatedAccounts = accounts.map((account, index) => {
        const paramData = newParamData[index] || {};
        return {
          ...account,
          parentAccount: paramData.parentAccount || account.parentAccount,
          parameterType: paramData.parameterType || account.parameterType,
          isParameterReference:
            paramData.isParameterReference ?? account.isParameterReference,
          relation: paramData.relation || account.relation,
        };
      });
      setAccounts(updatedAccounts);

      // 変更後のaggregatedAccountsをコンソールに表示
      console.log("Updated aggregatedAccounts:", updatedAccounts);
    },
    [accounts, paramData]
  );

  // 確定ボタンハンドラ
  const handleSave = () => {
    if (step === 0) {
      // モデル勘定科目設定完了：第一段階ではidとaccountNameのみを設定
      // 同じモデル勘定科目を持つ項目を集約し、数値も合算する

      // 集計用のマップを作成
      const newAggregatedMap = {};

      flattenedRows.forEach((row, idx) => {
        // 各行のモデル勘定科目を取得（設定されていない場合は元の科目名を使用）
        const key = mappingData[idx]?.modelAccount || row[0];
        if (!key) return; // キーが空の場合はスキップ

        // 先頭要素（科目名）を除いた数値部分を抜き出し、文字列や null を数値にキャスト、空値は 0 に変換
        const values = row.slice(1).map((v) => Number(v) || 0);

        if (!newAggregatedMap[key]) {
          // 初めて出現した科目の場合
          // DEFAULT_SHEET_TYPESから該当科目のマッピング情報を取得
          const defaultMapping = DEFAULT_SHEET_TYPES[key] || {
            sheetType: "",
            parentAccount: "",
            parameterType: "NONE",
            relation: { type: "NONE", subType: null },
          };

          newAggregatedMap[key] = {
            id: `account-${Object.keys(newAggregatedMap).length}`,
            accountName: key,
            // DEFAULT_SHEET_TYPESの情報を反映
            sheetType: defaultMapping.sheetType || "",
            parentAccount: defaultMapping.parentAccount || "",
            parameterType: defaultMapping.parameterType || "",
            isParameterReference: false,
            relation: {
              type: defaultMapping.relation.type,
              subType: defaultMapping.relation.subType,
            },
            values: [...values],
          };
        } else {
          // 既に同じ科目が存在する場合、値を合算
          newAggregatedMap[key].values = newAggregatedMap[key].values.map(
            (sum, i) => sum + (values[i] || 0)
          );
        }
      });

      // aggregatedMapを状態として保存
      setAggregatedMap(newAggregatedMap);

      console.log("aggregatedMap:", newAggregatedMap);

      // 集計結果を配列に変換
      const aggregatedAccounts = Object.values(newAggregatedMap).map(
        ({ values, ...rest }) => {
          const account = { ...rest };

          // relationの値がない場合は初期化
          if (!account.relation) {
            account.relation = { type: "NONE", subType: null };
          } else if (typeof account.relation !== "object") {
            // 古い形式から新しい形式に変換
            account.relation = { type: "NONE", subType: null };
          }

          return account;
        }
      );

      // 集計結果を表示用に変換
      const aggregatedValue = aggregatedAccounts.map((item) => [
        item.accountName,
        ...(newAggregatedMap[item.accountName]?.values || []),
      ]);

      setAccounts(aggregatedAccounts);

      setStep(1);
    } else if (step === 1) {
      // パラメータ設定完了：集計確認へ
      // 1. 最新のaccountsをベースにfinalAccountsを生成

      // 2. parentAccountが""のaccountを除外し、残りのcalculationTypeをnullに設定
      const filteredAccounts = accounts
        .filter((account) => account.parentAccount !== "")
        .map((account) => ({
          ...account,
          calculationType: null,
        }));

      // 親科目ごとのプレフィックスマップを作成
      const prefixMap = {};
      Object.entries(SUMMARY_ACCOUNTS).forEach(([key, account]) => {
        // prefixプロパティを使用
        prefixMap[account.accountName] = account.prefix;
      });

      // 親科目ごとのカウンタを初期化
      const counterMap = {};

      // 親科目別に子アカウントにプレフィックス + カウンタのorderを設定
      const accountsWithOrder = filteredAccounts.map((account) => {
        const parentAccount = account.parentAccount;
        if (!parentAccount) return account; // 親科目がない場合はそのまま

        // 親科目のプレフィックスを取得
        const prefix = prefixMap[parentAccount];
        if (!prefix) return account; // プレフィックスがない場合はそのまま

        // 親科目ごとのカウンタを更新
        counterMap[parentAccount] = (counterMap[parentAccount] || 0) + 1;

        // orderを設定: プレフィックス + カウンタ (例: A1, A2, ...)
        return {
          ...account,
          order: `${prefix}${counterMap[parentAccount]}`,
        };
      });

      // 3. SUMMARY_ACCOUNTSを追加し、orderでソート
      const finalAccounts = [...accountsWithOrder];
      Object.values(SUMMARY_ACCOUNTS).forEach((summaryAccount) => {
        finalAccounts.push({
          ...summaryAccount,
          order: summaryAccount.order,
        });
      });

      // orderでソート
      finalAccounts.sort((a, b) => {
        if (!a.order) return 1;
        if (!b.order) return -1;
        if (a.order < b.order) return -1;
        if (a.order > b.order) return 1;
        return 0;
      });

      // periodの作成 (state更新用にnewPeriodsを使用)
      const newPeriods = [];
      if (flattenedData?.headerRow && flattenedData.headerRow.length > 0) {
        flattenedData.headerRow.forEach((year, index) => {
          const currentYear = new Date().getFullYear();
          const isActual = Number(year) <= currentYear;
          newPeriods.push({
            id: `p-${year}`,
            year,
            isActual,
            isFromExcel: true,
            order: index + 1,
          });
        });
      }
      // periods state に保存
      setPeriods(newPeriods);
      console.log("Periods:", newPeriods);
      // 状態を更新
      setAccounts(finalAccounts);

      // 勘定科目と年度に紐づくvaluesを作成
      const accountValues = [];

      // 通常アカウントのvalueを追加（保存されているaggregatedMapを使用）
      Object.entries(aggregatedMap).forEach(([accountName, account]) => {
        // 列ごとの値を処理
        account.values.forEach((value, index) => {
          if (index >= newPeriods.length) return; // 期間数を超える場合はスキップ

          accountValues.push({
            accountId: account.id,
            periodId: newPeriods[index].id,
            value: value,
            isCalculated: false,
          });
        });
      });

      // SUMMARY_ACCOUNTSのvalueを作成
      // 親子関係のマップを作成
      const parentChildMap = {};
      finalAccounts.forEach((account) => {
        if (account.parentAccount) {
          parentChildMap[account.parentAccount] =
            parentChildMap[account.parentAccount] || [];
          parentChildMap[account.parentAccount].push(account.id);
        }
      });

      // SUMMARY_ACCOUNTSの各科目について計算
      Object.values(SUMMARY_ACCOUNTS).forEach((summaryAccount) => {
        // 各期間についてSUMMARY_ACCOUNTの値を計算
        newPeriods.forEach((period, periodIndex) => {
          let sumValue = 0;
          const childAccounts =
            parentChildMap[summaryAccount.accountName] || [];

          // 子アカウントの値を合計
          childAccounts.forEach((childId) => {
            const childValue = accountValues.find(
              (v) => v.accountId === childId && v.periodId === period.id
            );
            if (childValue) {
              sumValue += childValue.value;
            }
          });

          // SUMMARY_ACCOUNTの値を追加
          accountValues.push({
            accountId: summaryAccount.id,
            periodId: period.id,
            value: sumValue,
            isCalculated: true,
          });
        });
      });

      console.log("Final accounts:", finalAccounts);
      console.log("Periods:", newPeriods);
      console.log("Account Values:", accountValues);

      // 集計結果を表示用に変換（整数部分のみ表示）
      const aggregatedValueForDisplay = finalAccounts.map((account) => {
        const valuesRow = newPeriods.map((p) => {
          const v = accountValues.find(
            (av) => av.accountId === account.id && av.periodId === p.id
          );
          const raw = v ? v.value : 0;
          return Math.trunc(raw);
        });
        return [account.accountName, ...valuesRow];
      });

      setAggregatedValue(aggregatedValueForDisplay);
      setShowDevelopmentMessage(false);
      setStep(2);
    } else {
      // 完了ボタンが押された時は開発中の画面を表示
      setShowDevelopmentMessage(true);
    }
  };

  // 集計結果表示用の列定義を periods state で生成
  const resultColumns = useMemo(() => {
    if (periods.length === 0) return [];

    // 最初の列は科目名として設定し、残りを期間(year)として設定
    return [
      { data: 0, title: "勘定科目", readOnly: true, width: 200 },
      ...periods.map((p, idx) => ({
        data: idx + 1,
        title: p.year.toString(),
        readOnly: true,
        width: 100,
        type: "numeric",
        numericFormat: { pattern: "0,0", culture: "ja-JP" },
      })),
    ];
  }, [periods]);

  return (
    <div className="account-mapping-settings">
      <h2>
        {step === 0
          ? "勘定科目マッピング設定"
          : step === 1
          ? "パラメータ・関連設定"
          : showDevelopmentMessage
          ? "開発情報"
          : "集計結果確認"}
      </h2>
      {step === 0 ? (
        <>
          <div
            className="mapping-table-container"
            style={{ height: "60vh", width: "100%", overflow: "auto" }}
          >
            <HotTable
              ref={hotTableRef}
              data={mappingData}
              columns={columns}
              rowHeaders
              colHeaders
              width="100%"
              height="100%"
              manualColumnResize
              autoColumnSize
              stretchH="all"
              licenseKey="non-commercial-and-evaluation"
              afterChange={(changes, source) => {
                if (source === "edit") handleChange(changes);
              }}
            />
          </div>
        </>
      ) : step === 1 ? (
        <div className="dual-table-container">
          {/* パラメータ設定テーブル */}
          <div
            className="mapping-table-container"
            style={{
              height: "60vh",
              width: "100%",
              overflow: "auto",
              marginBottom: 15,
            }}
          >
            <h3>パラメータ設定</h3>
            <HotTable
              ref={hotTableRef}
              data={accounts}
              columns={paramColumns}
              rowHeaders={true}
              colHeaders={true}
              width="100%"
              height="100%"
              manualColumnResize
              autoColumnSize
              stretchH="all"
              licenseKey="non-commercial-and-evaluation"
              afterChange={(changes, source) => {
                if (source === "edit") handleParamChange(changes);
              }}
            />
          </div>
        </div>
      ) : showDevelopmentMessage ? (
        <>
          <div
            className="mapping-table-container"
            style={{
              height: "60vh",
              width: "100%",
              overflow: "auto",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <h3>開発中です</h3>
          </div>
        </>
      ) : (
        <>
          <div
            className="mapping-table-container"
            style={{ height: "60vh", width: "100%", overflow: "auto" }}
          >
            <h3>集計結果</h3>
            <HotTable
              ref={hotTableRef}
              data={aggregatedValue}
              columns={resultColumns}
              rowHeaders={true}
              colHeaders={true}
              width="100%"
              height="100%"
              manualColumnResize
              autoColumnSize
              stretchH="all"
              licenseKey="non-commercial-and-evaluation"
              readOnly={true}
            />
          </div>
        </>
      )}
      <div className="mapping-buttons" style={{ marginTop: 20 }}>
        <button
          onClick={handleSave}
          className="btn-primary"
          style={{ marginRight: 10 }}
        >
          {step === 2 && !showDevelopmentMessage
            ? "完了"
            : step === 2 && showDevelopmentMessage
            ? "閉じる"
            : "次へ"}
        </button>
        <button
          onClick={() => {
            if (step === 0) onClose();
            else if (showDevelopmentMessage) {
              setShowDevelopmentMessage(false);
            } else setStep(step - 1);
          }}
          className="btn-secondary"
        >
          {step === 0 ? "キャンセル" : "戻る"}
        </button>
      </div>
    </div>
  );
};

export default AccountMappingSettings;
