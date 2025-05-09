import React, { useMemo, useEffect, useState } from "react";
import { HotTable } from "@handsontable/react";
import "handsontable/dist/handsontable.full.min.css";
import "../styles/RelationSettingTable.css";

/**
 * リレーション設定テーブルコンポーネント
 * @param {Object} props
 * @param {Array} props.accounts - アカウント配列
 * @param {Function} props.onChange - 変更時のコールバック
 * @returns {JSX.Element}
 */
const RelationSettingTable = ({ accounts, onChange }) => {
  // リレーションタイプ別にアカウントをグループ化
  const { ppeAccounts, retainedEarningsAccounts } = useMemo(() => {
    // PP&E（有形固定資産）関連のアカウント
    const ppeAccounts = accounts.filter(
      (account) => account.relation && account.relation.type === "PPE"
    );

    // 利益剰余金関連のアカウント
    const retainedEarningsAccounts = accounts.filter(
      (account) =>
        account.relation && account.relation.type === "RETAINED_EARNINGS"
    );

    return { ppeAccounts, retainedEarningsAccounts };
  }, [accounts]);

  // アセット(資産)科目のオブジェクトリスト作成
  const assetAccounts = useMemo(() => {
    return ppeAccounts.filter(
      (account) => account.relation && account.relation.subType === "asset"
    );
  }, [ppeAccounts]);

  // 投資・資本的支出(investment)科目のオブジェクトリスト
  const investmentAccounts = useMemo(() => {
    return ppeAccounts.filter(
      (account) => account.relation && account.relation.subType === "investment"
    );
  }, [ppeAccounts]);

  // 減価償却(depreciation)科目のオブジェクトリスト
  const depreciationAccounts = useMemo(() => {
    return ppeAccounts.filter(
      (account) =>
        account.relation && account.relation.subType === "depreciation"
    );
  }, [ppeAccounts]);

  // 利益剰余金資産科目のオブジェクトリスト
  const retainedEarningsAssetAccounts = useMemo(() => {
    return retainedEarningsAccounts.filter(
      (account) => account.relation && account.relation.subType === "asset"
    );
  }, [retainedEarningsAccounts]);

  // 利益(profit)科目のオブジェクトリスト
  const profitAccounts = useMemo(() => {
    return accounts.filter(
      (account) =>
        account.relation &&
        account.relation.type === "RETAINED_EARNINGS" &&
        account.relation.subType === "profit"
    );
  }, [accounts]);

  // ドロップダウン表示用の名前リスト
  const investmentOptions = useMemo(
    () => investmentAccounts.map((account) => account.accountName),
    [investmentAccounts]
  );

  const depreciationOptions = useMemo(
    () => depreciationAccounts.map((account) => account.accountName),
    [depreciationAccounts]
  );

  const profitOptions = useMemo(
    () => profitAccounts.map((account) => account.accountName),
    [profitAccounts]
  );

  // 名前からIDを取得する関数
  const getAccountIdByName = (accountName, accountsList) => {
    const account = accountsList.find((acc) => acc.accountName === accountName);
    return account ? account.id : null;
  };

  // IDから名前を取得する関数
  const getAccountNameById = (accountId, accountsList) => {
    const account = accountsList.find((acc) => acc.id === accountId);
    return account ? account.accountName : "";
  };

  // PP&E設定テーブルの設定
  const ppeSettings = useMemo(() => {
    if (assetAccounts.length === 0) return null;

    const data = assetAccounts.map((account) => [
      account.accountName,
      account.relation?.investmentAccount || "",
      account.relation?.depreciationAccount || "",
    ]);

    return {
      data,
      colHeaders: ["資産科目", "投資科目", "減価償却科目"],
      columns: [
        { type: "text", readOnly: true },
        {
          type: "dropdown",
          source: investmentOptions,
        },
        {
          type: "dropdown",
          source: depreciationOptions,
        },
      ],
      width: "100%",
      height: Math.min(400, 50 + data.length * 50),
      stretchH: "all",
      licenseKey: "non-commercial-and-evaluation",
    };
  }, [assetAccounts, investmentOptions, depreciationOptions]);

  // 利益剰余金設定テーブルの設定
  const retainedEarningsSettings = useMemo(() => {
    if (retainedEarningsAssetAccounts.length === 0) return null;

    const data = retainedEarningsAssetAccounts.map((account) => [
      account.accountName,
      account.relation?.profitAccount || "",
    ]);

    return {
      data,
      colHeaders: ["利益剰余金科目", "利益科目"],
      columns: [
        { type: "text", readOnly: true },
        {
          type: "dropdown",
          source: profitOptions,
        },
      ],
      width: "100%",
      height: Math.min(400, 50 + data.length * 50),
      stretchH: "all",
      licenseKey: "non-commercial-and-evaluation",
    };
  }, [retainedEarningsAssetAccounts, profitOptions]);

  // PP&E設定の変更ハンドラ
  const handlePpeChange = (changes, source) => {
    if (!changes || !Array.isArray(changes) || source === "loadData") return;

    try {
      // アカウントデータを更新
      const updatedAccounts = [...accounts];

      changes.forEach(([rowIndex, columnIndex, oldValue, newValue]) => {
        // 無効な行インデックスや値のチェック
        if (
          rowIndex < 0 ||
          rowIndex >= assetAccounts.length ||
          newValue === oldValue
        )
          return;

        const assetAccount = assetAccounts[rowIndex];
        if (!assetAccount) return;

        const accountIndex = updatedAccounts.findIndex(
          (a) => a && a.id === assetAccount.id
        );

        if (accountIndex === -1 || accountIndex >= updatedAccounts.length)
          return;

        // 既存のrelationプロパティを保持
        const relation = updatedAccounts[accountIndex].relation || {};

        if (columnIndex === 1) {
          // 投資科目設定 - 名前からIDを取得
          const investmentAccountId = getAccountIdByName(
            newValue,
            investmentAccounts
          );
          console.log(
            `投資科目設定: ${assetAccount.accountName} -> ${
              newValue || "未設定"
            } (ID: ${investmentAccountId})`
          );

          // 関連投資科目IDの設定
          relation.investmentAccountId = investmentAccountId;
          relation.investmentAccount = newValue || null; // 下位互換性のために名前も保存
        } else if (columnIndex === 2) {
          // 減価償却科目設定 - 名前からIDを取得
          const depreciationAccountId = getAccountIdByName(
            newValue,
            depreciationAccounts
          );
          console.log(
            `減価償却科目設定: ${assetAccount.accountName} -> ${
              newValue || "未設定"
            } (ID: ${depreciationAccountId})`
          );

          // 関連減価償却科目IDの設定
          relation.depreciationAccountId = depreciationAccountId;
          relation.depreciationAccount = newValue || null; // 下位互換性のために名前も保存
        }

        updatedAccounts[accountIndex].relation = relation;
      });

      console.log("PP&E設定変更後のアカウント:", updatedAccounts);
      onChange(updatedAccounts);
    } catch (error) {
      console.error("PP&E設定の変更中にエラーが発生しました:", error);
    }
  };

  // 利益剰余金設定の変更ハンドラ
  const handleRetainedEarningsChange = (changes, source) => {
    if (!changes || !Array.isArray(changes) || source === "loadData") return;

    try {
      // アカウントデータを更新
      const updatedAccounts = [...accounts];

      changes.forEach(([rowIndex, columnIndex, oldValue, newValue]) => {
        // 無効な行インデックスや値のチェック
        if (
          rowIndex < 0 ||
          rowIndex >= retainedEarningsAssetAccounts.length ||
          columnIndex !== 1 ||
          newValue === oldValue
        )
          return;

        const assetAccount = retainedEarningsAssetAccounts[rowIndex];
        if (!assetAccount) return;

        const accountIndex = updatedAccounts.findIndex(
          (a) => a && a.id === assetAccount.id
        );

        if (accountIndex === -1 || accountIndex >= updatedAccounts.length)
          return;

        // 既存のrelationプロパティを保持
        const relation = updatedAccounts[accountIndex].relation || {};

        // 利益科目設定 - 名前からIDを取得
        const profitAccountId = getAccountIdByName(newValue, profitAccounts);
        console.log(
          `利益科目設定: ${assetAccount.accountName} -> ${
            newValue || "未設定"
          } (ID: ${profitAccountId})`
        );

        // 関連利益科目IDの設定
        relation.profitAccountId = profitAccountId;
        relation.profitAccount = newValue || null; // 下位互換性のために名前も保存

        updatedAccounts[accountIndex].relation = relation;
      });

      console.log("利益剰余金設定変更後のアカウント:", updatedAccounts);
      onChange(updatedAccounts);
    } catch (error) {
      console.error("利益剰余金設定の変更中にエラーが発生しました:", error);
    }
  };

  // スタイルを定義
  const styles = {
    relationDescription: {
      marginBottom: "15px",
      color: "#666",
    },
    noRelationMessage: {
      margin: "20px 0",
      padding: "20px",
      background: "#f8f9fa",
      borderRadius: "4px",
      textAlign: "center",
    },
  };

  return (
    <div className="relation-setting-table">
      {ppeSettings && (
        <>
          <h3>有形固定資産(PPE)設定</h3>
          <p
            className="relation-description"
            style={styles.relationDescription}
          >
            資産科目に対して、関連する投資科目と減価償却科目を設定します。
          </p>
          <div className="hot-table-container">
            <HotTable {...ppeSettings} afterChange={handlePpeChange} />
          </div>
        </>
      )}

      {retainedEarningsSettings && (
        <>
          <h3>利益剰余金設定</h3>
          <p
            className="relation-description"
            style={styles.relationDescription}
          >
            利益剰余金科目に対して、関連する利益科目を設定します。
          </p>
          <div className="hot-table-container">
            <HotTable
              {...retainedEarningsSettings}
              afterChange={handleRetainedEarningsChange}
            />
          </div>
        </>
      )}

      {!ppeSettings && !retainedEarningsSettings && (
        <div className="no-relation-message" style={styles.noRelationMessage}>
          <p>設定可能なリレーションがありません。</p>
          <p>
            リレーションを設定するには、有形固定資産や利益剰余金に関連する科目が必要です。
          </p>
        </div>
      )}
    </div>
  );
};

export default RelationSettingTable;
