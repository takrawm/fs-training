import { useState, useCallback } from "react";
import { buildModelFromExcel } from "../utils/dataTransform.js";
import * as XLSX from "xlsx";

/**
 * Excelファイルのインポートと処理を管理するカスタムフック
 * @returns {Object} インポート関連の状態と関数
 */
export function useExcelImport() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rawData, setRawData] = useState(null);

  /**
   * ファイルをArrayBufferとして読み込む
   * @param {File} file - ファイル
   * @returns {Promise<ArrayBuffer>} ArrayBuffer
   */
  const readFileAsArrayBuffer = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        resolve(e.target.result);
      };

      reader.onerror = (e) => {
        reject(new Error("ファイルの読み込みに失敗しました"));
      };

      reader.readAsArrayBuffer(file);
    });
  };

  /**
   * Excelファイルを読み込み、財務モデルを構築する
   * @param {File} file - Excelファイル
   * @returns {Promise<import('../types/models.js').FinancialModel>} 財務モデル
   */
  const importExcelFile = useCallback(async (file) => {
    setIsLoading(true);
    setError(null);

    try {
      // ファイルをArrayBufferとして読み込む
      const fileBuffer = await readFileAsArrayBuffer(file);

      // Excelデータから財務モデルを構築
      const model = buildModelFromExcel(fileBuffer);

      setIsLoading(false);
      return model;
    } catch (err) {
      console.error("Excel読み込みエラー:", err);
      setError(err.message || "Excelファイルの読み込みに失敗しました");
      setIsLoading(false);
      throw err;
    }
  }, []);

  /**
   * URLからExcelファイルをインポートする
   * @param {string} url Excelファイルへのパス
   * @returns {Promise<Object>} インポートしたモデル
   */
  const importExcelFromUrl = useCallback(async (url) => {
    if (!url) {
      const error = new Error("URLが指定されていません");
      setError(error.message);
      throw error;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetchでファイルを取得
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`ファイルのダウンロードに失敗: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      // buildModelFromExcelを使用してExcelデータからモデルを構築
      const model = buildModelFromExcel(arrayBuffer);

      return model;
    } catch (err) {
      console.error("Excelインポートエラー:", err);
      setError(err.message);
      throw err; // エラーを再スローして呼び出し元で処理できるようにする
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * ExcelファイルからRawDataを抽出する
   * @param {string} filePath - Excelファイルのパス
   */
  const extractRawData = useCallback(async (filePath) => {
    setIsLoading(true);
    setError(null);
    console.log("extractRawData開始:", filePath);

    try {
      // ファイルを読み込む
      console.log("Excelファイルの読み込み開始");
      const response = await fetch(filePath);

      if (!response.ok) {
        console.error(
          "ファイル読み込みエラー:",
          response.status,
          response.statusText
        );
        throw new Error(
          `ファイルの読み込みに失敗しました: ${response.statusText}`
        );
      }

      console.log("ファイル読み込み成功、ArrayBufferに変換");
      const data = await response.arrayBuffer();

      // エラーチェック
      if (!data) {
        console.error("ArrayBufferが空です");
        throw new Error("Excelデータが取得できませんでした");
      }

      console.log("ArrayBufferサイズ:", data.byteLength);

      // Excelを解析
      console.log("XLSXライブラリでの解析開始");
      const workbook = XLSX.read(data, { type: "array" });
      console.log("シート名一覧:", workbook.SheetNames);

      // すべてのシートを処理する
      const sheetsData = {};

      workbook.SheetNames.forEach((sheetName) => {
        // シート名をスキップする条件
        if (sheetName.startsWith("_") || sheetName === "Settings") {
          return;
        }

        // シートを取得
        const worksheet = workbook.Sheets[sheetName];

        // シートをJSONに変換
        const json = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          blankrows: false,
          defval: null,
        });

        // データが空の場合はスキップ
        if (json.length < 2) return;

        // データを抽出して整形する
        const accounts = [];
        // ヘッダー行を取得
        const headerRow = json[0];

        // ヘッダー行以降を処理
        for (let i = 1; i < json.length; i++) {
          const row = json[i];
          // 空の行や不完全な行はスキップ
          if (!row || row.length < 2 || !row[0]) continue;

          // アカウントIDを生成
          const accountId = `${sheetName}_${row[0].toString().trim()}`;

          // 行データを整形
          const accountData = {
            id: accountId,
            sheetName: sheetName,
            code: row[0].toString().trim(),
            name: row[1]?.toString().trim() || `Account ${row[0]}`,
            values: {},
          };

          // 数値データを抽出(2列目以降)
          for (let j = 2; j < row.length && j < headerRow.length; j++) {
            if (headerRow[j] && row[j] !== null && row[j] !== undefined) {
              // ヘッダー名をキーとして値を保存
              const periodKey = headerRow[j].toString().trim();
              accountData.values[periodKey] =
                typeof row[j] === "number" ? row[j] : null;
            }
          }

          accounts.push(accountData);
        }

        sheetsData[sheetName] = accounts;
      });

      // 期間情報を抽出（最初のシートから取得）
      const firstSheet = workbook.SheetNames.find(
        (name) =>
          !name.startsWith("_") &&
          name !== "Settings" &&
          workbook.Sheets[name] &&
          XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1 })
            .length > 1
      );

      if (!firstSheet) {
        throw new Error("有効なデータシートが見つかりませんでした");
      }

      const worksheet = workbook.Sheets[firstSheet];
      const headerRow = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0];

      // 期間データを抽出（ヘッダー行の3列目以降）
      const periods = [];
      for (let i = 2; i < headerRow.length; i++) {
        if (headerRow[i]) {
          const periodName = headerRow[i].toString().trim();
          // 期間の種類を判定（年度、四半期、月）
          const periodType = determinePeriodType(periodName);

          periods.push({
            id: `period_${i - 2}`,
            name: periodName,
            type: periodType,
            isActual: false, // デフォルトは予測値
          });
        }
      }

      // RawDataを構築
      const rawData = {
        sheets: sheetsData,
        periods: periods,
      };

      setRawData(rawData);
      setIsLoading(false);
      return rawData;
    } catch (err) {
      console.error("Excelデータの抽出エラー:", err);
      setError(err.message);
      setIsLoading(false);
      return null;
    }
  }, []);

  /**
   * RawDataとマッピング情報から財務モデルを構築する
   * @param {Object} rawData - 抽出されたRawData
   * @param {Object} mappings - アカウントマッピング情報
   */
  const buildModelFromRawData = useCallback(async (rawData, mappings) => {
    setIsLoading(true);
    setError(null);

    try {
      if (!rawData || !rawData.sheets || !rawData.periods) {
        throw new Error("RawDataが不完全です");
      }

      // アカウント情報の構築
      const accounts = [];
      const values = [];

      // 各シートのアカウントを処理
      Object.entries(rawData.sheets).forEach(([sheetName, sheetAccounts]) => {
        sheetAccounts.forEach((rawAccount) => {
          // マッピング情報の取得
          const mapping = mappings[rawAccount.id];

          // マッピングがない場合はスキップ
          if (!mapping) return;

          // アカウント情報を構築
          const account = {
            id: rawAccount.id,
            code: rawAccount.code,
            name: rawAccount.name,
            sheetName: sheetName,
            accountType: mapping.category || "unknown",
            accountMapping: mapping,
            parameters: {
              type: mapping.mappingMethod || "manual",
              referenceAccountId: mapping.referenceAccount || null,
            },
          };

          accounts.push(account);

          // 期間ごとの値を処理
          rawData.periods.forEach((period) => {
            const rawValue = rawAccount.values[period.name] || null;

            // 値が存在する場合のみ追加
            if (rawValue !== null) {
              values.push({
                accountId: rawAccount.id,
                periodId: period.id,
                value: rawValue,
              });
            }
          });
        });
      });

      // パラメータグループの構築
      const paramGroups = [
        {
          id: "group_growth",
          name: "成長率",
          params: [
            { id: "param_growth_sales", name: "売上成長率", value: 0.05 },
            { id: "param_growth_cogs", name: "原価成長率", value: 0.04 },
          ],
        },
        {
          id: "group_margins",
          name: "マージン",
          params: [
            { id: "param_margin_gross", name: "粗利率", value: 0.4 },
            { id: "param_margin_operating", name: "営業利益率", value: 0.15 },
          ],
        },
      ];

      // 財務モデルの構築
      const model = {
        id: "model_" + Date.now(),
        name: "インポートされたモデル",
        accounts,
        periods: rawData.periods,
        values,
        paramGroups,
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          source: "excel_import",
        },
      };

      setIsLoading(false);
      return model;
    } catch (err) {
      console.error("モデル構築エラー:", err);
      setError(err.message);
      setIsLoading(false);
      return null;
    }
  }, []);

  /**
   * 期間名から期間タイプを判定する
   * @param {string} periodName - 期間名
   * @returns {string} - 期間タイプ ('year', 'quarter', 'month')
   */
  const determinePeriodType = (periodName) => {
    // 西暦年度の形式（例: 2021, FY2022など）
    if (/^(FY)?20\d{2}$/.test(periodName)) {
      return "year";
    }

    // 四半期の形式（例: Q1 2021, 2021 Q1など）
    if (/Q[1-4]|[1-4]Q/.test(periodName)) {
      return "quarter";
    }

    // 月の形式（例: Jan 2021, 2021/01など）
    if (
      /Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\/\d{2}$/.test(
        periodName
      )
    ) {
      return "month";
    }

    // デフォルトは年度とする
    return "year";
  };

  return {
    isLoading,
    error,
    importExcelFile,
    importExcelFromUrl,
    rawData,
    setRawData,
    extractRawData,
    buildModelFromRawData,
  };
}
