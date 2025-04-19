import React, {
  useMemo,
  useCallback,
  useRef,
  useEffect,
  useState,
} from "react";
import { HotTable } from "@handsontable/react";
import { registerAllModules } from "handsontable/registry";
import Handsontable from "handsontable";
import "handsontable/dist/handsontable.full.min.css";
import "handsontable/languages/ja-JP";
import { AccountType, ParameterType, CashflowType } from "../types/models.js";
import { DEFAULT_PARAMETER_VALUES } from "../utils/constants.js";

// Handsontableの全モジュールを登録
registerAllModules();

/**
 * データテーブルコンポーネント
 * @param {Object} props - コンポーネントプロパティ
 * @param {import('../types/models.js').FinancialModel} props.model - 財務モデル
 * @param {Function} props.onCellChange - セル変更ハンドラ
 * @param {Function} props.onAddAccount - 勘定科目追加ハンドラ
 * @param {Function} props.onDeleteAccount - 勘定科目削除ハンドラ
 * @param {Function} props.onAddPeriod - 期間追加ハンドラ
 * @param {Function} props.onDeletePeriod - 期間削除ハンドラ
 * @param {Object} props.hfInstance - HyperFormulaインスタンス
 * @param {Function} props.onUpdateParameter - パラメータ更新ハンドラ
 * @param {boolean} props.isParamGroupCollapsed - パラメータグループの折りたたみ状態
 * @param {Function} props.onToggleParamGroup - パラメータグループのトグル関数
 * @param {Array} props.columnsWithSourceInfo - カラムのソース情報
 * @returns {JSX.Element} データテーブル
 */

function DataTable({
  model,
  onCellChange,
  onAddAccount,
  onDeleteAccount,
  onAddPeriod,
  onDeletePeriod,
  hfInstance,
  onUpdateParameter,
  onTogglePeriodActual,
  isParamGroupCollapsed,
  onToggleParamGroup,
}) {
  // HotTableコンポーネントにref={hotTableRef}として渡され、そのDOM要素とインスタンスへの参照を保持
  // これにより、コンポーネント内の任意の場所からテーブルのメソッドにアクセスできる
  const hotTableRef = useRef(null);

  // 期間の順序でソート
  // model.periodsの更新は頻繁ではない可能性が高く、テーブルの再レンダリングが頻繁に発生するのは非効率なのでuseMemoを使う
  const sortedPeriods = useMemo(() => {
    return [...model.periods].sort((a, b) => a.order - b.order);
  }, [model.periods]);

  // isFromExcelプロパティを持つ列定義を作成
  const columnsWithSourceInfo = useMemo(() => {
    // 期間の要素にisFromExcelプロパティがない場合でも動作するように、
    // デフォルトではfalseとして扱う
    return sortedPeriods.map((period) => ({
      ...period,
      isFromExcel: !!period.isFromExcel, // 値がない場合はfalseに変換
    }));
  }, [sortedPeriods]);

  // 勘定科目の順序でソート
  const sortedAccounts = useMemo(() => {
    return [...model.accounts].sort((a, b) => a.order - b.order);
  }, [model.accounts]);

  // tableDataの作成
  const tableData = useMemo(() => {
    // modelが存在しない（nullまたはundefined）場合、又はmodel.preparedUIプロパティが存在しない場合に空の配列[]を返す
    // ←もしmodelが存在しない状態でその後のコードが実行されると、
    // 「Cannot read property 'preparedUI' of null/undefined」というエラーが発生
    // モデルデータがまだロードされていない初期状態 / API呼び出しが失敗したケース / データ変換中にエラーが発生したケース
    if (!model || !model.preparedUI) {
      return [];
    }

    const result = [];
    // preparedUIからデータを取得
    const { preparedAccounts, preparedValues } = model.preparedUI;

    // 各勘定科目の行データを作成
    sortedAccounts.forEach((account) => {
      // preparedUIから対応するアカウントを探す
      const preparedAccount =
        preparedAccounts.find((a) => a.id === account.id) || account;

      // パラメータタイプを取得
      const paramType = preparedAccount.parameter?.type;

      // 参照科目名を取得
      const refAccountName = preparedAccount.referenceAccountName || null;

      // 通常行の作成
      const row = {
        id: preparedAccount.id,
        code: preparedAccount.code,
        name: preparedAccount.name,
        accountType: preparedAccount.accountType,
        paramType: paramType,
        paramValue: preparedAccount.parameter?.value || null,
        referenceAccount: refAccountName,
        cashflowType: preparedAccount.cashflowType || null,
      };

      // 各期間の値を設定
      sortedPeriods.forEach((period) => {
        // preparedValuesから値を取得
        const cellValue = preparedValues.find(
          (v) => v.accountId === preparedAccount.id && v.periodId === period.id
        );

        // 計算値は元の精度を保持
        row[period.id] = cellValue ? cellValue.value : 0;
        // 表示用の整数値
        row[`${period.id}_display`] = cellValue ? cellValue.displayValue : 0;
      });

      // 行をテーブルデータに追加
      result.push(row);

      // 売上タイプ(REVENUE)のアカウントの場合、前年度比の行を追加
      if (
        preparedAccount.parameter?.type === ParameterType.GROWTH_RATE ||
        preparedAccount.parameter?.type === ParameterType.PROPORTIONATE
      ) {
        // 前年度比の行を作成
        const yoyRow = {
          id: `${preparedAccount.id}-yoy`,
          code: "",
          name: "前年度比 (%)",
          accountType: preparedAccount.accountType,
          paramType: null,
          paramValue: null,
          referenceAccount: null,
          isYoY: true,
          cashflowType: null,
        };

        // 前年度比を計算して各期間のデータを設定
        sortedPeriods.forEach((period, periodIndex) => {
          // 最初の期間は前年比を計算できないのでN/A
          if (periodIndex === 0) {
            yoyRow[period.id] = "N/A";
            return;
          }

          // 前年の期間を取得
          const prevPeriod = sortedPeriods[periodIndex - 1];

          // 今年と前年の値を取得（元の精度の値を使用）
          const currentValue = row[period.id];
          const prevValue = row[prevPeriod.id];

          // 前年の値が0または空の場合はN/A、それ以外は前年度比を計算
          if (
            prevValue === 0 ||
            prevValue === null ||
            prevValue === undefined
          ) {
            yoyRow[period.id] = "N/A";
          } else {
            // 前年度比を計算（小数点以下1桁まで表示）
            const yoyPercentage = (
              (currentValue / prevValue - 1) *
              100
            ).toFixed(1);
            yoyRow[period.id] = `${yoyPercentage}%`;
          }
        });

        // 前年度比の行をテーブルデータに追加
        result.push(yoyRow);
      }

      // パラメータがPERCENTAGEまたはPROPORTIONATEの場合には比率行を追加
      if (
        preparedAccount.parameter?.type === ParameterType.PERCENTAGE &&
        preparedAccount.parameter?.referenceAccountId
      ) {
        // 参照科目名を取得
        const referenceName = preparedAccount.referenceAccountName || "";

        // 比率行を作成
        const ratioRow = {
          id: `${preparedAccount.id}-ratio`,
          code: "",
          name: `比率 - ${referenceName}`,
          accountType: preparedAccount.accountType,
          paramType: null,
          paramValue: null,
          referenceAccount: null,
          isYoY: true, // 前年比行と同じスタイルを適用するため
          cashflowType: null,
        };

        // 各期間の参照科目に対する比率を計算
        sortedPeriods.forEach((period) => {
          // 現在の勘定科目の値を取得
          const currentValue = row[period.id];

          // 参照科目の値を取得
          const referenceValue =
            preparedValues.find(
              (v) =>
                v.accountId === preparedAccount.parameter.referenceAccountId &&
                v.periodId === period.id
            )?.value || 0;

          // 参照値が0または空の場合はN/A、それ以外は比率を計算
          if (
            referenceValue === 0 ||
            referenceValue === null ||
            referenceValue === undefined
          ) {
            ratioRow[period.id] = "N/A";
          } else {
            // 比率を計算（小数点以下1桁まで表示）
            const ratio = ((currentValue / referenceValue) * 100).toFixed(1);
            ratioRow[period.id] = `${ratio}%`;
          }
        });

        // 比率行をテーブルデータに追加
        result.push(ratioRow);
      }
    });

    return result;
  }, [sortedAccounts, sortedPeriods, model]);
  console.log("tableData: ", tableData);

  // 非表示の列のインデックスを計算
  const hiddenColumns = useMemo(() => {
    const hidden = [];

    // "コード"から始まるカラムIDリスト
    if (columnsWithSourceInfo) {
      // パラメータグループが折りたたまれている場合はパラメータ列を非表示にする
      if (isParamGroupCollapsed) {
        const paramColIds = columnsWithSourceInfo
          .map((col, index) =>
            col.data === "paramType" ||
            col.data === "paramValue" ||
            col.data === "referenceAccount"
              ? index
              : null
          )
          .filter((id) => id !== null);
        hidden.push(...paramColIds);
      }
    }

    return hidden;
  }, [columnsWithSourceInfo, isParamGroupCollapsed]);

  // 入れ子ヘッダー定義（期間のグループ化）
  const nestedHeaders = useMemo(() => {
    // 期間ヘッダーを作成
    const periodHeaders = sortedPeriods.map((period) => ({
      label: `${period.year}${period.month ? `/${period.month}` : ""}`,
      className: period.isActual ? "actual-period" : "forecast-period",
    }));

    return [
      [
        { label: "勘定科目", colspan: 2 },
        {
          label: isParamGroupCollapsed ? "パラメータ▶" : "パラメータ▼",
          colspan: 3,
        },
        { label: "CF", colspan: 1 },
        { label: "期間", colspan: sortedPeriods.length },
        { label: "", colspan: 1 },
      ],
      [
        { label: "コード" },
        { label: "勘定科目" },
        { label: "タイプ" },
        { label: "パラ種類" },
        { label: "パラ値" },
        { label: "参照科目" },
        { label: "CFタイプ" },
        ...periodHeaders,
        { label: "操作" },
      ],
    ];
  }, [sortedPeriods, isParamGroupCollapsed]);

  // カラム定義
  const columns = useMemo(() => {
    // YoY行の共通スタイルを設定する関数
    // td: スタイルを適用する対象のテーブルセル要素（DOM要素）
    // rowData: セルが属する行のデータオブジェクト
    const applyYoYRowStyle = (td, rowData) => {
      // if (rowData && rowData.isYoY): 行データが存在し、その行が前年比行であるかチェック
      // isYoYは前年比行を示すフラグプロパティ
      if (rowData && rowData.isYoY) {
        // 条件に一致する場合（前年比行の場合）、以下のスタイルが適用される：
        td.style.backgroundColor = "#f5f5f5";
        td.style.color = "#444444"; // 濃いグレーに変更
        td.style.fontStyle = "italic";
        td.style.fontWeight = "normal";
      }
      // return td: スタイルが適用されたセル要素を返す
      return td;
    };

    // 集計行のスタイルを設定する関数
    const applySummaryStyle = (td, rowData) => {
      if (
        rowData &&
        // PLアカウント
        (rowData.accountType === AccountType.REVENUE_TOTAL ||
          rowData.accountType === AccountType.COGS_TOTAL ||
          rowData.accountType === AccountType.GROSS_MARGIN ||
          rowData.accountType === AccountType.SGA_TOTAL ||
          rowData.accountType === AccountType.OPERATING_PROFIT ||
          // BSアカウント
          rowData.accountType === AccountType.CUR_ASSET_TOTAL ||
          rowData.accountType === AccountType.FIX_ASSET_TOTAL ||
          rowData.accountType === AccountType.ASSET_TOTAL ||
          rowData.accountType === AccountType.CUR_LIABILITY_TOTAL ||
          rowData.accountType === AccountType.FIX_LIABILITY_TOTAL ||
          rowData.accountType === AccountType.LIABILITY_TOTAL ||
          rowData.accountType === AccountType.EQUITY_TOTAL ||
          rowData.accountType === AccountType.LI_EQ_TOTAL ||
          // CAPEXアカウント
          rowData.accountType === AccountType.CAPEX_TOTAL ||
          // CSアカウント
          rowData.accountType === AccountType.OPE_CF_TOTAL ||
          rowData.accountType === AccountType.INV_CF_TOTAL ||
          rowData.accountType === AccountType.CHANGE_CASH)
      ) {
        td.style.fontWeight = "bold";
        td.style.backgroundColor = "#FFFBE6"; // 薄い黄色の背景色
      }
      return td;
    };

    const cols = [
      {
        // dataプロパティは、テーブルの各セルがデータオブジェクトのどのプロパティを表示するかを指定
        // →tableDataの各行（=rowData）が持つプロパティを指定する
        // →レンダラー内でvalueとして渡される値はrowData[data]
        // 例：{id: "1", code: "001", name: "売上高", accountType: "REVENUE", ..., p-2025: 220.03, p-2025_display: 220}
        // →rowData[p-2025_display]で2025年の表示用データが取れる
        data: "code",
        // title: "code", // dataプロパティに合わせたタイトル（nestedHeadersで上書きされるため実質不使用）
        width: 60,
        renderer: (instance, td, row, col, prop, value, cellProperties) => {
          // Handsontableのレンダラー関数内で、現在レンダリング中のセルが属する行のデータオブジェクト全体を取得
          // getSourceDataAtRow(row):Handsontableが提供するメソッド（引数rowは現在レンダリング中のセルの行インデックス）
          // rowData:取得された行データは、その行の全ての情報を含むオブジェクト
          // 例：{id: "1", code: "001", name: "売上高", accountType: "REVENUE", paramType: "GROWTH_RATE", ...}
          const rowData = instance.getSourceDataAtRow(row);
          // 集計行または前年比行に対して、それぞれ専用のスタイルを適用する関数呼び出し
          applyYoYRowStyle(td, rowData);
          applySummaryStyle(td, rowData);
          //value: tableData[row][prop]の値
          // prop: 列のdataプロパティの値（ここでは"code"）
          td.innerHTML = value || "";
          return td;
        },
      },
      {
        data: "name",
        // title: "name", // dataプロパティに合わせたタイトル
        width: 150,
        renderer: (instance, td, row, col, prop, value, cellProperties) => {
          const rowData = instance.getSourceDataAtRow(row);
          applyYoYRowStyle(td, rowData);
          applySummaryStyle(td, rowData);
          td.innerHTML = value || "";
          return td;
        },
      },
      {
        data: "accountType",
        // title: "accountType", // dataプロパティに合わせたタイトル
        width: 120,
        // accountType列は編集不可に変更
        readOnly: true,
        renderer: (instance, td, row, col, prop, value, cellProperties) => {
          const rowData = instance.getSourceDataAtRow(row);
          applyYoYRowStyle(td, rowData);
          applySummaryStyle(td, rowData);
          td.innerHTML = value || "";
          return td;
        },
      },
      {
        data: "paramType",
        // title: "paramType", // dataプロパティに合わせたタイトル
        width: 120,
        type: "dropdown",
        // Handsontableのdropdownタイプのカラムに表示される選択肢を定義
        source: [
          null,
          ParameterType.GROWTH_RATE,
          ParameterType.PERCENTAGE,
          ParameterType.PROPORTIONATE,
          ParameterType.OTHER,
        ],
        editor: "dropdown",
        renderer: (instance, td, row, col, prop, value, cellProperties) => {
          const rowData = instance.getSourceDataAtRow(row);
          if (!rowData) {
            td.innerHTML = "";
            return td;
          }

          // パラメータタイプを直接rowDataから取得
          // rowの定義で、row.paramType = paramType（=preparedAccount.parameter?.type）とされている
          const paramType = rowData.paramType;

          applyYoYRowStyle(td, rowData);
          applySummaryStyle(td, rowData);

          // YoY行の場合は編集不可
          if (rowData.isYoY) {
            cellProperties.readOnly = true;
            td.innerHTML = "";
          }
          // 通常行の場合は常に編集可能
          else {
            cellProperties.readOnly = false;

            // valueを使用して表示
            Handsontable.renderers.DropdownRenderer(
              instance,
              td,
              row,
              col,
              prop,
              value,
              cellProperties
            );
          }
          return td;
        },
      },
      {
        data: "paramValue",
        // title: "paramValue", // dataプロパティに合わせたタイトル
        width: 60,
        type: "numeric",
        numericFormat: {
          pattern: "0.0",
          culture: "ja-JP",
        },
        renderer: (instance, td, row, col, prop, value, cellProperties) => {
          const rowData = instance.getSourceDataAtRow(row);
          applyYoYRowStyle(td, rowData);
          applySummaryStyle(td, rowData);
          // YoY行の場合は編集不可
          if (rowData && rowData.isYoY) {
            cellProperties.readOnly = true;
            td.innerHTML = "";
          } else {
            Handsontable.renderers.NumericRenderer(
              instance,
              td,
              row,
              col,
              prop,
              value,
              cellProperties
            );
          }
          return td;
        },
      },
      {
        data: "referenceAccount",
        // title: "referenceAccount", // dataプロパティに合わせたタイトル
        width: 150,
        type: "dropdown",
        source: ["-"].concat(model.accounts.map((a) => a.name)),
        editor: "dropdown",
        renderer: (instance, td, row, col, prop, value, cellProperties) => {
          const rowData = instance.getSourceDataAtRow(row);
          applyYoYRowStyle(td, rowData);
          applySummaryStyle(td, rowData);
          // YoY行の場合は編集不可
          if (rowData && rowData.isYoY) {
            cellProperties.readOnly = true;
            td.innerHTML = "";
          } else {
            // 参照科目名が既に計算済みで存在する場合はそれを表示
            Handsontable.renderers.DropdownRenderer(
              instance,
              td,
              row,
              col,
              prop,
              value,
              cellProperties
            );
          }
          return td;
        },
      },
      {
        data: "cashflowType",
        width: 120,
        type: "dropdown",
        source: Object.values(CashflowType),
        editor: "dropdown",
        readOnly: true, // 読み取り専用にして、constants.jsからの値を表示するだけにする
        renderer: (instance, td, row, col, prop, value, cellProperties) => {
          const rowData = instance.getSourceDataAtRow(row);
          applyYoYRowStyle(td, rowData);
          applySummaryStyle(td, rowData);
          // YoY行の場合は非表示
          if (rowData && rowData.isYoY) {
            td.innerHTML = "";
          } else {
            td.innerHTML = value || "N/A";
          }
          return td;
        },
      },
    ];

    // 期間カラム
    sortedPeriods.forEach((period) => {
      cols.push({
        // period.idカラムのdata属性に_displayを追加して表示用の値を参照
        data: `${period.id}_display`,
        // title: `${period.year}${period.month ? `/${period.month}` : ""}`, // dataプロパティに合わせたタイトル
        type: "numeric",
        numericFormat: {
          pattern: "0,0",
          culture: "ja-JP",
        },
        width: 90,
        // 実績/計画のクラス名を設定
        className: period.isActual ? "actual-period" : "forecast-period",
        // 読み込みタイプの情報を列データに追加
        isFromExcel: period.isFromExcel || false,
        readOnly: false,
        // 前年度比の行は編集不可に設定
        renderer: (instance, td, row, col, prop, value, cellProperties) => {
          const rowData = instance.getSourceDataAtRow(row);

          // 前年度比の行の場合
          if (rowData && rowData.isYoY) {
            // セルを編集不可に設定
            cellProperties.readOnly = true;

            // 前年度比のセルのスタイルを設定
            td.style.backgroundColor = "#f5f5f5";
            td.style.color = "#444444"; // 濃いグレーに変更
            td.style.fontStyle = "italic";
            td.style.fontWeight = "normal";

            // 値がN/Aまたは数値ではない場合はそのまま表示
            // 前年度比の値は period.id カラムに保存されている
            const yoyValue = rowData[period.id];
            if (yoyValue === "N/A" || typeof yoyValue === "string") {
              // パーセンテージでマイナス値の場合は赤字で表示
              if (yoyValue.startsWith("-")) {
                td.style.color = "#ff4d4f"; // 赤色
              }
              td.innerHTML = yoyValue;
              return td;
            }

            // 数値の場合はHTMLコンテンツを設定
            td.innerHTML = yoyValue;
          } else {
            // 通常のセルは通常のレンダリング
            Handsontable.renderers.NumericRenderer(
              instance,
              td,
              row,
              col,
              prop,
              value,
              cellProperties
            );

            // マイナス値の場合は赤字で表示
            // 実際の値はdisplayではない方の値で比較する必要がある
            const periodId = prop.replace("_display", "");
            const actualValue = rowData[periodId];
            if (typeof actualValue === "number" && actualValue < 0) {
              td.style.color = "#ff4d4f"; // 赤色
            }

            // 集計行のスタイルを適用
            applySummaryStyle(td, rowData);
          }

          return td;
        },
      });
    });

    // 操作カラム
    cols.push({
      data: "actions",
      // title: "actions", // dataプロパティに合わせたタイトル
      width: 100,
      renderer: (instance, td, row, col, prop, value, cellProperties) => {
        const rowData = instance.getSourceDataAtRow(row);

        // 前年度比の行のスタイリングを適用
        applyYoYRowStyle(td, rowData);

        // 集計行のスタイリングを適用
        applySummaryStyle(td, rowData);

        // 前年度比の行には削除ボタンを表示しない
        if (rowData && rowData.isYoY) {
          return td;
        }

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "削除";
        deleteBtn.className = "delete-account-btn";
        deleteBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          onDeleteAccount(instance.getSourceDataAtRow(row).id);
        });

        while (td.firstChild) {
          td.removeChild(td.firstChild);
        }
        td.appendChild(deleteBtn);
        return td;
      },
    });

    return cols;
  }, [sortedPeriods, onDeleteAccount, sortedAccounts, model]);

  // パラメータタイプ変更のハンドラ
  const handleParameterTypeChange = useCallback(
    (rowData, parameterType) => {
      if (!rowData || !rowData.id) return;

      const account = model.accounts.find((a) => a.id === rowData.id);
      if (!account) return;

      // パラメータがnullの場合は削除
      if (!parameterType) {
        onCellChange({
          type: "paramType",
          accountId: rowData.id,
          parameter: null,
        });
        return;
      }

      // 現在のパラメータを取得または新規作成
      const currentParameter = account.parameter || {};

      // デフォルト値を設定
      const defaultValue = DEFAULT_PARAMETER_VALUES[parameterType] || 0;

      // PERCENTAGE タイプの場合、デフォルト参照科目を設定
      let referenceAccountId = currentParameter.referenceAccountId || null;
      if (parameterType === ParameterType.PERCENTAGE) {
        // 既存の参照アカウントIDがあればそれを使用、なければREVENUE_TOTALを探して設定
        if (!referenceAccountId) {
          const revenueTotal = model.accounts.find(
            (a) => a.accountType === AccountType.REVENUE_TOTAL
          );
          referenceAccountId = revenueTotal ? revenueTotal.id : null;
        }
      } else {
        // PERCENTAGE以外のタイプでは参照科目は不要
        referenceAccountId = null;
      }

      // パラメータオブジェクトを更新
      const updatedParameter = {
        ...currentParameter,
        type: parameterType,
        value: currentParameter.value ?? defaultValue,
        referenceAccountId: referenceAccountId,
        periodIds:
          currentParameter.periodIds ||
          model.periods.filter((p) => !p.isActual).map((p) => p.id),
      };

      onCellChange({
        type: "paramType",
        accountId: rowData.id,
        parameter: updatedParameter,
      });
    },
    [model.accounts, model.periods, onCellChange]
  );

  // パラメータ値変更のハンドラ
  const handleParameterValueChange = useCallback(
    (rowData, newValue) => {
      if (!rowData || !rowData.id) return;

      const account = model.accounts.find((a) => a.id === rowData.id);
      if (!account || !account.parameter) return;

      const numValue = Number(newValue);
      if (isNaN(numValue)) return;

      // 親コンポーネントが期待する形式の引数でパラメータ更新を呼び出す
      onCellChange({
        type: "paramType",
        accountId: rowData.id,
        parameter: {
          ...account.parameter,
          value: numValue,
        },
      });
    },
    [model.accounts, onCellChange]
  );

  // 参照科目変更のハンドラ
  const handleReferenceAccountChange = useCallback(
    (rowData, newValue) => {
      if (!rowData || !rowData.id) return;

      const account = model.accounts.find((a) => a.id === rowData.id);
      if (!account || !account.parameter) return;

      // "-" が選択された場合、デフォルトの参照科目（売上高合計）を使用
      let referenceAccountId = null;
      if (newValue === "-") {
        // PERCENTAGEタイプの場合は売上高合計をデフォルト参照に設定
        if (account.parameter.type === ParameterType.PERCENTAGE) {
          const revenueTotal = model.accounts.find(
            (a) => a.accountType === AccountType.REVENUE_TOTAL
          );
          referenceAccountId = revenueTotal ? revenueTotal.id : null;
        }
      } else {
        // 勘定科目名から勘定科目IDを取得
        const referenceAccount = model.accounts.find(
          (a) => a.name === newValue
        );
        referenceAccountId = referenceAccount ? referenceAccount.id : null;
      }

      // 現在のパラメータを更新し変更を通知
      const updatedParameter = {
        ...account.parameter,
        referenceAccountId: referenceAccountId,
      };

      onCellChange({
        type: "paramType",
        accountId: rowData.id,
        parameter: updatedParameter,
      });
    },
    [model.accounts, onCellChange]
  );

  // 期間値変更のハンドラ
  const handlePeriodValueChange = useCallback(
    (rowData, periodId, value) => {
      if (!rowData || !rowData.id || !periodId) return;

      const numValue = Number(value);

      // 親コンポーネントが期待する形式の引数でセル値更新を呼び出す
      onCellChange({
        type: "value",
        accountId: rowData.id,
        periodId: periodId,
        value: numValue,
      });

      // UIの表示を更新するためのローカルな更新
      // これにより、モデルの更新を待たずに表示が即座に反映される
      const rowIndex = tableData.findIndex((row) => row.id === rowData.id);
      if (rowIndex >= 0) {
        tableData[rowIndex][periodId] = numValue;
        tableData[rowIndex][`${periodId}_display`] = Math.round(numValue);
      }
    },
    [onCellChange, tableData]
  );

  // セルが変更された時のハンドラ
  const handleCellChange = useCallback(
    (changes, source) => {
      if (!changes || changes.length === 0 || source === "loadData") {
        return;
      }

      // 各変更を処理
      changes.forEach(([row, prop, oldValue, newValue]) => {
        // 変更がない場合はスキップ
        if (oldValue === newValue) return;

        // 変更された行のデータを取得
        const rowData = tableData[row];
        if (!rowData) return;

        // パラメータタイプの変更を処理
        if (prop === "paramType") {
          handleParameterTypeChange(rowData, newValue);
          return;
        }

        // パラメータ値の変更を処理
        if (prop === "paramValue") {
          const { id, paramType } = changes[row][0].row;

          // パラメータタイプが設定されていない場合や、前年比の行の場合はスキップ
          if (!paramType || changes[row][0].row.isYoY) {
            return;
          }

          // 更新内容を作成
          const parameterUpdates = {
            type: paramType,
            value: newValue !== "" ? parseFloat(newValue) : null,
          };

          // アカウントIDと更新内容をコールバックに渡す
          onUpdateParameter(id, parameterUpdates);
          return;
        }

        // 参照科目の変更を処理
        if (prop === "referenceAccount") {
          handleReferenceAccountChange(rowData, newValue);
          return;
        }

        // 期間の値の変更を処理
        const isPeriodColumn =
          prop.startsWith("p-") && prop.includes("_display");
        if (isPeriodColumn) {
          // 実際の期間IDを取得（_display部分を削除）
          const periodId = prop.replace("_display", "");
          handlePeriodValueChange(rowData, periodId, newValue);
          return;
        }
      });
    },
    [
      tableData,
      handleParameterTypeChange,
      handleParameterValueChange,
      handleReferenceAccountChange,
      handlePeriodValueChange,
      onUpdateParameter,
    ]
  );

  // 計算された高さ - ウィンドウの高さに合わせて調整
  const tableHeight = useMemo(() => {
    return "100%"; // 親コンテナの高さいっぱいに設定
  }, []);

  // 前年比行の高さを低くする設定
  const getRowHeight = (row) => {
    const rowData = tableData[row];
    if (rowData && rowData.isYoY) {
      return 28; // 前年比行は低い高さに設定
    }
    return 38; // 通常の行の高さ
  };

  return (
    <div
      className="data-table-container"
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          flex: "1",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          border: "1px solid #ddd",
        }}
      >
        <HotTable
          data={tableData}
          columns={columns}
          nestedHeaders={nestedHeaders}
          hiddenColumns={{
            columns: hiddenColumns,
            indicators: true,
          }}
          width="100%"
          height="100%"
          licenseKey="non-commercial-and-evaluation"
          afterChange={handleCellChange}
          contextMenu={true}
          formulas={{
            engine: hfInstance,
          }}
          stretchH="all"
          className="financial-table"
          rowHeights={getRowHeight}
          readOnly={false}
          ref={hotTableRef}
          // columnsWithSourceInfoを含める
          columnsWithSourceInfo={columnsWithSourceInfo}
          // セル選択のための設定を追加
          selectionMode="range"
          outsideClickDeselects={false}
          disableVisualSelection={false}
          // Handsontable の列ヘッダー（<th> 要素）描画が完了した直後に呼び出されるコールバック
          // これにより、ヘッダーごとに独自の DOM 操作やイベント登録を行うことができる
          afterGetColHeader={(col, TH) => {
            // パラメータグループヘッダーにクリックイベントを追加
            if (TH.parentElement.rowIndex === 0) {
              const isParamHeader = TH.innerText.includes("パラメータ");
              if (isParamHeader) {
                TH.style.cursor = "pointer";
                TH.addEventListener("click", onToggleParamGroup);
              }
            }

            // 期間列かどうかを判定（7列目以降かつ操作列より前の列のみ）
            const periodsStartIdx = 7;
            const periodsEndIdx = periodsStartIdx + sortedPeriods.length - 1;

            // 既存のコンテナを削除
            const existingContainer = TH.querySelector(
              ".period-header-container"
            );
            if (existingContainer) {
              TH.removeChild(existingContainer);
            }

            // 7列目から期間列が始まり、その後に操作列が来る
            // 期間列の範囲内かつ、最新期間かどうかを判定
            if (col >= periodsStartIdx && col <= periodsEndIdx) {
              // 1行目のヘッダーセルかどうかを判定
              const isFirstRow = TH.parentElement.rowIndex === 0;
              if (isFirstRow) {
                return; // 1行目のヘッダーセルの場合は何もしない
              }

              const period = sortedPeriods[col - periodsStartIdx];
              // 列定義からisFromExcelプロパティを取得
              const columnDef = columns[col];
              // 対応するperiodをcolumnsWithSourceInfoから取得
              const periodWithSource =
                columnsWithSourceInfo[col - periodsStartIdx];
              const isFromExcel = periodWithSource
                ? periodWithSource.isFromExcel
                : false;

              // 年度の降順でソートして最初の要素と一致するかチェック
              const sortedByYear = [...sortedPeriods].sort(
                (a, b) => b.year - a.year
              );
              const isLatestPeriod = period.year === sortedByYear[0].year;

              // 実績と予測で背景色を変える
              if (period.isActual) {
                TH.style.backgroundColor = "#e6ffe6"; // 薄い緑色
              } else {
                TH.style.backgroundColor = "#e6f7ff"; // 薄い青色
              }

              // コンテナを作成
              const container = document.createElement("div");
              container.className = "period-header-container";
              container.style.display = "flex";
              container.style.flexDirection = "column";
              container.style.alignItems = "stretch";
              container.style.gap = "4px";
              container.style.width = "100%";
              container.style.padding = "4px";
              container.style.boxSizing = "border-box";

              // 読込/追加表示
              const sourceLabel = document.createElement("div");
              sourceLabel.textContent = isFromExcel ? "読込" : "追加";
              sourceLabel.className = `period-source-label ${
                isFromExcel ? "excel-source" : "user-added"
              }`;
              sourceLabel.style.padding = "4px";
              sourceLabel.style.borderRadius = "4px";
              sourceLabel.style.border = "1px solid #ccc";
              sourceLabel.style.fontSize = "12px";
              sourceLabel.style.textAlign = "center";
              sourceLabel.style.color = "#fff";
              sourceLabel.style.width = "100%";
              sourceLabel.style.backgroundColor = isFromExcel
                ? "#16a34a" // 濃い緑色（実績の濃い色版）
                : "#0369a1"; // 濃い青色（計画の濃い色版）
              sourceLabel.style.marginBottom = "2px";
              sourceLabel.style.cursor = "default";
              sourceLabel.style.boxSizing = "border-box";
              container.appendChild(sourceLabel);

              // 実績/計画ボタン
              const toggleButton = document.createElement("button");
              toggleButton.textContent = period.isActual ? "実績" : "計画";
              toggleButton.className = `period-toggle-btn ${
                period.isActual ? "actual" : "forecast"
              }`;
              toggleButton.style.padding = "4px";
              toggleButton.style.borderRadius = "4px";
              toggleButton.style.border = "1px solid #ccc";
              toggleButton.style.backgroundColor = period.isActual
                ? "#e6ffe6"
                : "#e6f7ff";
              toggleButton.style.cursor = "pointer";
              toggleButton.style.fontSize = "12px";
              toggleButton.style.width = "100%";
              toggleButton.style.boxSizing = "border-box";
              toggleButton.addEventListener("click", (e) => {
                e.stopPropagation();
                onTogglePeriodActual(period.id);
              });
              container.appendChild(toggleButton);

              // 最新の期間の場合のみ追加/削除ボタンを表示
              if (isLatestPeriod) {
                // 追加/削除ボタンのコンテナ
                const actionContainer = document.createElement("div");
                actionContainer.style.display = "flex";
                actionContainer.style.gap = "4px";
                actionContainer.style.width = "100%";
                actionContainer.style.justifyContent = "space-between";
                actionContainer.style.boxSizing = "border-box";

                // 追加ボタン
                const addBtn = document.createElement("button");
                addBtn.textContent = "＋";
                addBtn.className = "add-period-btn";
                addBtn.style.padding = "2px 6px";
                addBtn.style.borderRadius = "4px";
                addBtn.style.border = "none";
                addBtn.style.backgroundColor = "#1890ff";
                addBtn.style.color = "#fff";
                addBtn.style.cursor = "pointer";
                addBtn.style.width = "calc(50% - 2px)";
                addBtn.style.boxSizing = "border-box";
                addBtn.addEventListener("click", (e) => {
                  e.stopPropagation();
                  onAddPeriod();
                });

                // 削除ボタン
                const deleteBtn = document.createElement("button");
                deleteBtn.textContent = "✕";
                deleteBtn.className = "delete-period-btn";
                deleteBtn.style.padding = "2px 6px";
                deleteBtn.style.borderRadius = "4px";
                deleteBtn.style.border = "none";
                deleteBtn.style.backgroundColor = "#ff4d4f";
                deleteBtn.style.color = "#fff";
                deleteBtn.style.cursor = "pointer";
                deleteBtn.style.width = "calc(50% - 2px)";
                deleteBtn.style.boxSizing = "border-box";
                deleteBtn.addEventListener("click", (e) => {
                  e.stopPropagation();
                  onDeletePeriod(period.id);
                });

                actionContainer.appendChild(addBtn);
                actionContainer.appendChild(deleteBtn);
                container.appendChild(actionContainer);
              }

              // コンテナをTHに追加
              TH.appendChild(container);
            }
          }}
          afterGetRowHeader={(row, TH) => {
            // 行ヘッダーのスタイル調整
            TH.style.width = "50px";
            TH.style.textAlign = "center";
            TH.style.fontWeight = "bold";
          }}
        />
      </div>
    </div>
  );
}

export default DataTable;
