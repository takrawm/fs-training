import * as XLSX from "xlsx";
import { AccountType, ParameterType } from "../types/models.js";
import {
  ACCOUNT_MAPPING,
  SHEET_ACCOUNT_MAPPING,
  SHEET_CASHFLOW_MAPPING,
  DEFAULT_PARAMETER_VALUES,
  SUMMARY_ACCOUNTS,
  INITIAL_REFERENCE_ACCOUNTS,
} from "./constants.js";
import {
  generateId,
  updatePeriodsActualFlag,
  updateAccountParentIds,
  calculateSummaryValues,
  updateAccountCodesAndOrder,
  calculateValuesWithParameters,
} from "./financialUtils.js";
// import fs from "fs";
// import path from "path";
// import { fileURLToPath } from "url";

/**
 * useExcelImport から取得した excelData を rawData 形式に変換する
 * @param {Object} excelData - useExcelImport から返された Excel データ
 * @returns {Object} - モデル構築用の rawData
 */
export function convertExcelDataToRawData(excelData) {
  console.log("Excel データを rawData 形式に変換開始");

  // PLシートまたは最初のシートからヘッダー行（年度）を取得
  const plSheetData = excelData["PL"] || Object.values(excelData)[0];
  const headerRow = plSheetData[0];

  // 年度情報を抽出
  const years = headerRow.slice(2).map((year) => {
    return typeof year === "number" ? year : parseInt(year, 10);
  });

  // 各シートの行をID付きの配列に変換
  const rawData = {
    periods: years.map((year, index) => ({
      id: `p-${year}`,
      year,
      month: null,
      order: index + 1,
    })),
    sheets: {},
  };

  // 各シートのデータを処理
  Object.entries(excelData).forEach(([sheetName, jsonData]) => {
    const headerRow = jsonData[0];
    const dataRows = jsonData.slice(1);

    // 有効なデータ行を特定
    const filteredDataRows = dataRows.filter((row) => {
      return row && row.some((cell) => cell !== null && cell !== "");
    });

    // シート内のデータを構造化
    rawData.sheets[sheetName] = filteredDataRows.map((row, rowIndex) => {
      const accountId = generateId();
      const name = row[0] || `無名科目_${rowIndex + 1}`;
      const code = row[1] || `${sheetName.charAt(0)}${rowIndex + 1}`;

      // 各期間のデータ
      const periodValues = {};
      row.slice(2).forEach((value, valueIndex) => {
        if (years[valueIndex]) {
          periodValues[`p-${years[valueIndex]}`] =
            typeof value === "number" ? value : 0;
        }
      });

      return {
        id: accountId,
        name: name,
        code: code,
        sheetName: sheetName,
        rowIndex: rowIndex,
        periodValues: periodValues,
      };
    });
  });

  console.log("RawData 変換完了");
  return rawData;
}

/**
 * RawDataとマッピング情報からモデルを構築する
 * @param {Object} rawData - Excelから抽出したRawData
 * @param {Object} accountMappings - 各アカウントのマッピング情報
 * @returns {Object} - 財務モデル
 */
export function buildModelFromRawData(rawData, accountMappings) {
  // モデルの基本構造を作成
  const model = {
    metadata: {
      id: generateId(),
      name: "マッピング済みデータ",
      description: "アカウントマッピングに基づいて作成された財務モデル",
      lastModified: new Date(),
      version: 1,
    },
    accounts: [],
    periods: [],
    values: [],
    sheets: Object.keys(rawData.sheets),
  };

  // 期間の設定と実績/計画フラグの更新
  const periods = rawData.periods.map((period, index) => ({
    id: period.id,
    year: period.year,
    month: period.month,
    isActual: true,
    isFromExcel: true, // Excelから読み込んだデータであることを示すフラグ
    order: index + 1,
  }));
  model.periods = updatePeriodsActualFlag(periods);

  // 集約アカウント用のマップ
  const aggregatedAccounts = {};

  // 各シートのデータを処理
  let accountCount = 0;

  // アカウントとその値を処理
  Object.entries(rawData.sheets).forEach(([sheetName, accounts]) => {
    accounts.forEach((rawAccount) => {
      const mapping = accountMappings[rawAccount.id] || {
        useOriginal: true,
        aggregatedAccount: "",
        financialCategory: "",
        sheetName: sheetName,
      };

      // マッピングタイプによってアカウントの扱いを決定
      if (mapping.useOriginal) {
        // オリジナルアカウントをそのまま使用
        const accountMapping = SHEET_ACCOUNT_MAPPING[sheetName]?.[
          rawAccount.code
        ] ||
          ACCOUNT_MAPPING[rawAccount.code] || {
            accountType: AccountType.OTHER,
            parameter: null,
          };

        const account = {
          id: rawAccount.id,
          code: rawAccount.code,
          name: rawAccount.name,
          parentId: null,
          accountType: mapping.financialCategory || accountMapping.accountType,
          order: accountCount + 1,
          aggregateMethod: accountMapping.aggregateMethod || "NONE",
          parameter: accountMapping.parameter
            ? { ...accountMapping.parameter }
            : null,
          sheetName: mapping.sheetName || sheetName,
          cashflowType:
            SHEET_CASHFLOW_MAPPING[sheetName]?.[rawAccount.name] || "N/A",
          accountMapping: mapping, // マッピング情報を保存
        };

        // パラメータの値がnullの場合、デフォルト値を設定
        if (account.parameter) {
          if (account.parameter.value === null && account.parameter.type) {
            account.parameter.value =
              DEFAULT_PARAMETER_VALUES[account.parameter.type] || 0;
          }
        }

        // アカウントをモデルに追加
        model.accounts.push(account);

        // 値を追加
        Object.entries(rawAccount.periodValues).forEach(([periodId, value]) => {
          model.values.push({
            accountId: account.id,
            periodId: periodId,
            value: value,
            isCalculated: false,
          });
        });

        accountCount++;
      } else if (mapping.aggregatedAccount) {
        // 集約アカウントに値を追加
        if (!aggregatedAccounts[mapping.aggregatedAccount]) {
          // 集約アカウントをまだ作成していない場合は新規作成
          const aggregatedId = `agg-${mapping.aggregatedAccount.replace(
            /\s+/g,
            "-"
          )}`;
          aggregatedAccounts[mapping.aggregatedAccount] = {
            id: aggregatedId,
            code: `AGG-${Object.keys(aggregatedAccounts).length + 1}`,
            name: mapping.aggregatedAccount,
            parentId: null,
            accountType: mapping.financialCategory || AccountType.OTHER,
            order:
              model.accounts.length +
              Object.keys(aggregatedAccounts).length +
              1,
            aggregateMethod: "SUM",
            parameter: null,
            sheetName: mapping.sheetName || sheetName,
            cashflowType: "N/A",
            isAggregated: true,
            accountMapping: {
              useOriginal: true,
              aggregatedAccount: "",
              financialCategory: mapping.financialCategory,
              sheetName: mapping.sheetName || sheetName,
            },
            sourceAccounts: [],
            periodValues: {},
          };

          // 期間ごとの値を初期化
          rawData.periods.forEach((period) => {
            aggregatedAccounts[mapping.aggregatedAccount].periodValues[
              period.id
            ] = 0;
          });
        }

        // ソースアカウントを追加
        aggregatedAccounts[mapping.aggregatedAccount].sourceAccounts.push(
          rawAccount.id
        );

        // 期間ごとの値を加算
        Object.entries(rawAccount.periodValues).forEach(([periodId, value]) => {
          aggregatedAccounts[mapping.aggregatedAccount].periodValues[
            periodId
          ] += value;
        });
      }
    });
  });

  // 集約アカウントをモデルに追加
  Object.values(aggregatedAccounts).forEach((aggregatedAccount) => {
    // 集約アカウントをアカウントリストに追加
    model.accounts.push({
      id: aggregatedAccount.id,
      code: aggregatedAccount.code,
      name: aggregatedAccount.name,
      parentId: null,
      accountType: aggregatedAccount.accountType,
      order: aggregatedAccount.order,
      aggregateMethod: aggregatedAccount.aggregateMethod,
      parameter: aggregatedAccount.parameter,
      sheetName: aggregatedAccount.sheetName,
      cashflowType: aggregatedAccount.cashflowType,
      isAggregated: true,
      accountMapping: aggregatedAccount.accountMapping,
    });

    // 集約アカウントの値をモデルに追加
    Object.entries(aggregatedAccount.periodValues).forEach(
      ([periodId, value]) => {
        model.values.push({
          accountId: aggregatedAccount.id,
          periodId: periodId,
          value: value,
          isCalculated: false,
        });
      }
    );
  });

  // 勘定科目の親子関係を更新
  model.accounts = updateAccountParentIds(model.accounts);

  // 被参照科目のフラグを設定
  model.accounts = model.accounts.map((account) => {
    return {
      ...account,
      isReferenceAccount:
        INITIAL_REFERENCE_ACCOUNTS.includes(account.id) ||
        account.accountType === AccountType.REVENUE_TOTAL,
    };
  });

  // 集計値を計算
  model.values = calculateSummaryValues(model);

  // パラメータから計算された値を適用
  model.values = calculateValuesWithParameters(model);

  // 集計値を再計算
  model.values = calculateSummaryValues(model);

  return model;
}

/**
 * useExcelImport からのデータを使用して財務モデルを構築する
 * @param {Object} excelData - useExcelImport.js から取得した Excel データまたは既存の rawData
 * @param {Object} mappings - アカウントマッピング情報
 * @returns {Object} 財務モデル
 */
export function buildModelFromExcel(excelData, mappings) {
  console.log("buildModelFromExcel処理開始");
  let rawData;

  // useExcelImport からの excelData か確認
  if (
    excelData &&
    typeof excelData === "object" &&
    (excelData["PL"] || excelData["BS"]) &&
    !excelData.hasOwnProperty("sheets")
  ) {
    console.log("useExcelImport からのデータを変換します");
    rawData = convertExcelDataToRawData(excelData);
  } else {
    // すでに rawData 形式の場合はそのまま使用
    console.log("提供されたデータは rawData 形式として処理します");
    rawData = excelData;
  }

  // rawData が適切な形式かチェック
  if (!rawData || !rawData.sheets || !rawData.periods) {
    console.error(
      "無効なデータ形式です。useExcelImport からの excelData または正しい rawData 形式のデータが必要です。"
    );
    throw new Error("無効なデータ形式です");
  }

  // マッピング情報がない場合はデフォルト設定
  if (!mappings) {
    const defaultMappings = {};
    Object.entries(rawData.sheets).forEach(([sheetName, accounts]) => {
      accounts.forEach((account) => {
        defaultMappings[account.id] = {
          useOriginal: true,
          aggregatedAccount: "",
          financialCategory: "",
          sheetName: sheetName,
        };
      });
    });

    return buildModelFromRawData(rawData, defaultMappings);
  }

  return buildModelFromRawData(rawData, mappings);
}
