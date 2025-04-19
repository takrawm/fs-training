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
 * ExcelファイルからRawDataを抽出する
 * @param {ArrayBuffer} fileData - Excelファイルのデータ
 * @returns {Object} - シートごとのRawData
 */
export function extractRawDataFromExcel(fileData) {
  const workbook = XLSX.read(fileData, { type: "array" });

  // 必要なシート名の配列
  const requiredSheets = ["PL", "BS", "CAPEX", "CS"];

  // 各シートのデータを格納するオブジェクト
  const sheetDataMap = {};

  // 各シートのデータを読み込む
  requiredSheets.forEach((sheetName) => {
    if (workbook.SheetNames.includes(sheetName)) {
      const sheet = workbook.Sheets[sheetName];

      // sheet["!ref"]は、シートの有効範囲を示す文字列（例："A1:G100"）
      if (sheet["!ref"]) {
        const range = XLSX.utils.decode_range(sheet["!ref"]);

        // 最終行から逆方向に空でない行を探す
        let lastRow = range.e.r;
        let foundNonEmpty = false;

        while (lastRow >= 0 && !foundNonEmpty) {
          for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: lastRow, c: col });
            if (
              sheet[cellAddress] &&
              sheet[cellAddress].v !== undefined &&
              sheet[cellAddress].v !== null &&
              sheet[cellAddress].v !== ""
            ) {
              foundNonEmpty = true;
              break;
            }
          }

          if (!foundNonEmpty) {
            lastRow--;
          }
        }

        if (lastRow >= 0) {
          range.e.r = lastRow;
          sheet["!ref"] = XLSX.utils.encode_range(range);
        }
      }

      // 空行をスキップし、空セルをnullに設定
      const jsonData = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: null,
        blankrows: false,
      });

      if (jsonData && jsonData.length >= 2) {
        sheetDataMap[sheetName] = jsonData;
      }
    }
  });

  // 少なくとも1つのシートが存在することを確認
  if (Object.keys(sheetDataMap).length === 0) {
    throw new Error("有効なデータが見つかりません");
  }

  console.log("Raw sheetDataMap: ", sheetDataMap);

  // 参照用にPLシートのデータを取得（期間情報などを取得するため）
  const plSheetData = sheetDataMap["PL"] || Object.values(sheetDataMap)[0];

  // ヘッダー行（年度）の取得
  const headerRow = plSheetData[0];
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
  Object.entries(sheetDataMap).forEach(([sheetName, jsonData]) => {
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
 * 既存の関数は残しておく（後方互換性のため）
 * @param {ArrayBuffer} fileData
 * @returns {import('../types/models.js').FinancialModel}
 */
export function buildModelFromExcel(fileData) {
  const rawData = extractRawDataFromExcel(fileData);

  // 全てのアカウントにデフォルトのマッピングを設定
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
