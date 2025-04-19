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
 * @param {ArrayBuffer} fileData
 * @returns {import('../types/models.js').FinancialModel}
 */

export function buildModelFromExcel(fileData) {
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
        // range.e.rには、シートの最終行のインデックス（0ベース）が格納される
        // 但し、let lastRow = range.e.r;で得られる値は「Excelファイルに記録された範囲の最終行」であり、
        // 必ずしも「実際にデータが存在する最終行」ではない
        let lastRow = range.e.r;
        let foundNonEmpty = false;

        while (lastRow >= 0 && !foundNonEmpty) {
          for (let col = range.s.c; col <= range.e.c; col++) {
            // encode_cell：座標を「A1」形式のExcelセル参照に変換する関数
            const cellAddress = XLSX.utils.encode_cell({ r: lastRow, c: col });
            // sheet[cellAddress]：そもそもセルオブジェクトが存在するか
            // ※Excelシートでは、データが一度も入力されていないセルはsheetオブジェクト内に存在しない←falseなら、そのセルはデータが一度も入力されていない
            // sheet[cellAddress].v !== undefined：セルオブジェクトは存在するが、値が定義されているか←SheetJSでは、セルの値は.vプロパティに格納される
            // // sheet[cellAddress].v !== ''：セルの値が空文字でないか
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
            // lastRowを減少させる
            lastRow--;
          }
        }

        if (lastRow >= 0) {
          // 最終行までの範囲に制限
          range.e.r = lastRow;
          sheet["!ref"] = XLSX.utils.encode_range(range);
        }
      }

      // 空行をスキップし、空セルをnullに設定
      const jsonData = XLSX.utils.sheet_to_json(sheet, {
        //  header: 1は全行を同じ形式（配列）で返すため、データ処理が一貫している
        // この処理パターンはheader: 1と相性が良い
        header: 1,
        defval: null,
        // 「空行をスキップする」
        // true（デフォルト）：空行も結果に含める（すべての値がnullまたはdefvalの配列として）
        // 重要なポイントとして、この空行判定が表示上の見た目ではなく、実際のセルデータの有無に基づいて行われる
        blankrows: false,
      });

      if (jsonData && jsonData.length >= 2) {
        // sheetDataMap = {PL: [[],  ], }
        // sheetDataMapは、各シート名（"PL"、"BS"、"CAPEX"、"CS"など）をキーとし、それぞれの値が2次元配列になっているオブジェクト
        sheetDataMap[sheetName] = jsonData;
      }
    }
  });

  // 少なくとも1つのシートが存在することを確認
  if (Object.keys(sheetDataMap).length === 0) {
    throw new Error("有効なデータが見つかりません");
  }

  console.log("sheetDataMap: ", sheetDataMap);
  console.log("PL: ", sheetDataMap["PL"]);

  // 参照用にPLシートのデータを取得（期間情報などを取得するため）
  // PLシートがあればそれを使用し、なければ最初のシートを使用
  // Object.values(sheetDataMap)[0]は、最初のシート（PLシートがある場合はPL、なければ別のシート）の2次元配列データ
  const plSheetData = sheetDataMap["PL"] || Object.values(sheetDataMap)[0];

  // ヘッダー行（年度）の取得
  const headerRow = plSheetData[0];
  const years = headerRow.slice(2).map((year) => {
    // エクセルから読み込んだ年度データ(JSON)数値として処理
    return typeof year === "number" ? year : parseInt(year, 10);
  });

  // モデルの基本構造を作成
  const model = {
    metadata: {
      id: generateId(),
      name: "インポートしたExcelデータ",
      description: "インポートしたExcelファイルから作成された財務モデル",
      lastModified: new Date(),
      version: 1,
    },
    accounts: [],
    periods: [],
    values: [],
    sheets: Object.keys(sheetDataMap), // 読み込んだシート名を保存
  };

  // 期間の設定と実績/計画フラグの更新
  const periods = years.map((year, index) => ({
    id: `p-${year}`,
    year,
    month: null,
    isActual: true,
    isFromExcel: true, // Excelから読み込んだデータであることを示すフラグ
    order: index + 1,
  }));
  model.periods = updatePeriodsActualFlag(periods);

  // 各シートのデータを処理
  let accountCount = 0;
  // Object.entries(sheetDataMap)は、オブジェクトのキーと値のペアを配列として返す。
  // [
  //   ["PL", [["年度", "属性", 2019, 2020, ...], ["売上", "SALES", 100, 120, ...], ...]],
  //   ["BS", [["科目", "属性", 2019, 2020, ...], ["現金", "CASH", 50, 60, ...], ...]],
  //   ["CAPEX", [...]],
  //   ["CS", [...]]
  // ]

  // sheetDataMapはキーにシート名（文字列）、値にシートデータ（2次元配列）を持つオブジェクト
  // これを配列の次元で分析すると：
  // 最外殻の配列：[ ... ] - 1次元目
  // 各シートのエントリー：["PL", [ ... ]] - 2次元目
  // 各シートのデータ（行の配列）：[ ["年度", ...], ["売上", ...] ] - 3次元目
  // 各行のデータ：["年度", "属性", 2019, 2020] - 4次元目
  Object.entries(sheetDataMap).forEach(([sheetName, jsonData]) => {
    // Object.entries(sheetDataMap).forEach((entry) => { })
    // entryは常に2つの要素を持つ配列で、entry = [キー, 値]の形をとる
    // 例えば、初回のループは、entry[0]="PL", entry[1]=sheetDataMap["PL"]
    // →配列の分割代入で、sheetNameに各シート名を、jsonDataの各シートデータ（2次元配列）を格納
    const dataRows = jsonData.slice(1);

    // 有効なデータ行を特定
    // blankrows: falseが設定されているので、完全な空行はスキップ済み
    // 残りの行は、すべての列が空かどうかをチェック
    const filteredDataRows = dataRows.filter((row) => {
      // 行内に少なくとも1つの非nullの値があるかチェック
      return row && row.some((cell) => cell !== null && cell !== "");
    });

    // シート内の勘定科目とデータの設定
    filteredDataRows.forEach((row, rowIndex) => {
      const attributeCode = row[1]; // エクセルの2列目にある属性コード（"売上高"、"流動資産"、"営業CF"など）
      const mapping = SHEET_ACCOUNT_MAPPING[sheetName]?.[attributeCode] ||
        ACCOUNT_MAPPING[attributeCode] || {
          accountType: AccountType.OTHER,
          parameter: null,
        };

      // シートごとのマッピングを優先的に使用し、なければデフォルトのACCOUNT_MAPPINGを使用
      // 例として、SHEET_ACCOUNT_MAPPING["PL"]["売上高"]のとき、
      // mapping = {
      //   type: AccountType.REVENUE,
      //   parameter: {
      //     type: ParameterType.GROWTH_RATE,
      //     value: 10,
      //     referenceAccountId: null,
      //   },
      //   aggregateMethod: "NONE"
      // }

      const account = {
        id: generateId(),
        code: `${sheetName.charAt(0)}${accountCount + 1}`,
        name: row[0] || `無名科目_${accountCount + 1}`, // 名前がない場合のフォールバック
        parentId: null,
        accountType: mapping.accountType,
        order: accountCount + 1,
        aggregateMethod: mapping.aggregateMethod || "NONE",
        parameter: mapping.parameter ? { ...mapping.parameter } : null,
        sheetName: sheetName, // シート名を追加
        cashflowType: SHEET_CASHFLOW_MAPPING[sheetName]?.[row[0]] || "N/A", // キャッシュフローのタイプを追加
      };

      // パラメータの値がnullの場合、デフォルト値を設定
      if (account.parameter) {
        if (account.parameter.value === null && account.parameter.type) {
          account.parameter.value =
            DEFAULT_PARAMETER_VALUES[account.parameter.type] || 0;
        }

        // PERCENTAGEとPROPORTIONATEタイプの場合で参照科目IDが設定されていない場合は、売上高合計のIDを設定
        if (
          // PERCENTAGE or PROPORTIONATEタイプの場合
          (account.parameter.type === ParameterType.PERCENTAGE ||
            account.parameter.type === ParameterType.PROPORTIONATE) &&
          // 参照科目IDが設定されていない場合
          !account.parameter.referenceAccountId
        ) {
          // REVENUE_TOTALタイプのアカウントを探す
          // すでに追加された勘定科目の中から探す
          const existingRevenueTotal = model.accounts.find(
            (a) => a.accountType === AccountType.REVENUE_TOTAL
          );

          if (existingRevenueTotal) {
            account.parameter.referenceAccountId = existingRevenueTotal.id;
          } else {
            // まだ売上高合計が追加されていない場合は、SUMMARY_ACCOUNTSから探す
            // SUMMARY_ACCOUNTSはオブジェクトなので、Object.valuesで配列に変換してから検索
            const summaryRevenueTotal = Object.values(SUMMARY_ACCOUNTS).find(
              (a) => a.accountType === AccountType.REVENUE_TOTAL
            );
            if (summaryRevenueTotal) {
              account.parameter.referenceAccountId = summaryRevenueTotal.id;
            }
          }
        }
      }

      // アカウントをモデルに追加
      model.accounts.push(account);

      // 値の設定→rowの各行の2列を除いた配列
      const values = row.slice(2);
      values.forEach((value, valueIndex) => {
        // valueのN列目は、periods配列のN番目と紐づける
        if (periods[valueIndex]) {
          // model.valuesに要素を追加して更新していく
          model.values.push({
            accountId: account.id,
            periodId: periods[valueIndex].id, //periods配列のN番目の要素のID
            value: typeof value === "number" ? value : 0, // 数値でない場合は0に変換
            isCalculated: false,
          });
        }
      });

      accountCount++;
    });
  });

  // 勘定科目の親子関係を更新
  model.accounts = updateAccountParentIds(model.accounts);

  // 被参照科目のフラグを設定
  model.accounts = model.accounts.map((account) => {
    return {
      ...account,
      isReferenceAccount:
        INITIAL_REFERENCE_ACCOUNTS.includes(account.id) ||
        account.accountType === AccountType.REVENUE_TOTAL, // デフォルトで売上高合計は常に被参照科目
    };
  });

  // 集計値を計算（パラメータ値が設定されていない場合に）
  model.values = calculateSummaryValues(model);

  // パラメータから計算された値を適用
  model.values = calculateValuesWithParameters(model);

  model.values = calculateSummaryValues(model);

  return model;
}
