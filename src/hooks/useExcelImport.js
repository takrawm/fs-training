import { useState, useCallback } from "react";
import * as XLSX from "xlsx";
import { TARGET_SHEETS } from "../utils/constants";

/**
 * Excelファイルのインポートと処理を管理するシンプルなカスタムフック
 * Excelデータを単純にJavaScriptオブジェクトの配列として取り出すことに特化
 * @returns {Object} Excel処理関連の状態と関数
 */
export function useExcelImport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [flattenedData, setFlattenedData] = useState(null);

  /**
   * Excelファイルを読み込み、シンプルなデータ構造で返す
   * @param {string} filePath - Excelファイルのパス
   */
  const readRawData = useCallback(async (filePath) => {
    setLoading(true);
    setError(null);

    console.log("readRawDataを呼び出し:", filePath);

    try {
      // ファイルを読み込む
      const response = await fetch(filePath);
      const data = await response.arrayBuffer();

      console.log(
        "Excelファイル読み込み成功 (サイズ:",
        data.byteLength,
        "bytes)"
      );

      // シンプルなデータ構造でExcelデータを読み込む
      const excelData = parseExcelData(data);

      // シートデータをフラットな2次元配列に変換
      const flattened = flattenSheetDataToArray(excelData);
      console.log("flattened:", flattened);
      setFlattenedData(flattened);

      setLoading(false);
    } catch (err) {
      console.error("Excelデータの抽出エラー:", err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, []);

  /**
   * Excelデータをシンプルな構造でパースする内部関数
   * @param {ArrayBuffer} fileData - Excelファイルのデータ
   * @returns {Object} パースしたExcelデータ
   */
  function parseExcelData(fileData) {
    try {
      const workbook = XLSX.read(fileData, { type: "array" });
      console.log("利用可能なシート一覧:", workbook.SheetNames);
      // →['PL', 'BS', 'CAPEX', 'CS', 'Sheet1']が出力される

      // シートデータを格納するオブジェクト
      const excelData = {};

      // 対象シートのみ処理
      const targetSheets = TARGET_SHEETS;

      // 各シートのデータを読み込む
      workbook.SheetNames.forEach((sheetName) => {
        // 対象外のシートはスキップ
        if (!targetSheets.includes(sheetName)) {
          console.log(
            `シート「${sheetName}」は対象外のため処理をスキップします`
          );
          return;
        }

        const sheet = workbook.Sheets[sheetName];

        // シートデータをJSONに変換（ヘッダー行含む）
        const jsonData = XLSX.utils.sheet_to_json(sheet, {
          header: 1, // 1行目をヘッダーとして扱わず、配列としてデータを取得
          defval: null,
          blankrows: false,
        });

        // 空でないシートのみ追加
        if (jsonData && jsonData.length > 0) {
          excelData[sheetName] = jsonData;
        }
      });

      console.log("excelData: ", excelData);

      // 期間情報の抽出はdataTransform.jsに任せ、
      // ここではシンプルにExcelデータを返すだけにする

      console.log("Excelデータ解析結果:", {
        シート数: Object.keys(excelData).length,
      });

      return excelData;
    } catch (error) {
      console.error("Excelデータのパースエラー:", error);
      throw new Error("Excelデータの解析に失敗しました: " + error.message);
    }
  }

  /**
   * シートデータをフラットな2次元配列に変換する
   * @param {Object} excelData - シートごとのExcelデータ
   * @returns {Array} フラットな2次元配列 [["科目名", 値1, 値2, ...], ...]
   */
  function flattenSheetDataToArray(excelData) {
    console.log("シートデータをフラットな2次元配列に変換開始");

    if (!excelData || Object.keys(excelData).length === 0) {
      console.warn("変換するExcelデータがありません");
      return {
        headerRow: [],
        dataRows: [],
      };
    }

    // 期間情報（ヘッダー行）を抽出 - PLシートか最初のシートから
    const referenceSheet = excelData["PL"] || Object.values(excelData)[0];
    const headerRow = referenceSheet[0].slice(1); // 最初の2列（科目名とコード）を除く

    // フラットな2次元配列
    const dataRows = [];

    // 各シートのデータを処理
    Object.entries(excelData).forEach(([sheetName, sheetData]) => {
      // ヘッダー行をスキップしてデータ行を処理
      const rows = sheetData.slice(1);

      // 空行を除外して処理
      rows.forEach((row) => {
        // 空行のチェック（nullや空文字のみの行はスキップ）
        if (!row || !row.some((cell) => cell !== null && cell !== "")) {
          return;
        }

        // 科目名を取得（1列目）
        const accountName = row[0];
        if (!accountName) return; // 科目名がない行はスキップ

        // 新しい行データを作成 - [科目名, 値1, 値2, ...]
        const flatRow = [accountName];

        // 3列目以降の数値データを追加
        row.slice(1).forEach((value) => {
          flatRow.push(typeof value === "number" ? value : 0);
        });

        // 配列に追加
        dataRows.push(flatRow);
      });
    });

    console.log(`${dataRows.length}行のフラットデータに変換完了`);

    return {
      headerRow,
      dataRows,
    };
  }

  return {
    loading,
    error,
    flattenedData,
    readRawData,
  };
}
