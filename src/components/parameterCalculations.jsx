import { buildFormula } from "../utils/astBuilder";
import { evalNode } from "../utils/astEvaluator";

// 計算テスト用の状態
const [testAccountId, setTestAccountId] = useState("");
const [testPeriod, setTestPeriod] = useState("");
const [testResult, setTestResult] = useState(null);

const runTest = () => {
  try {
    // 入力値の検証
    if (!testAccountId || !testPeriod) {
      setTestResult("勘定科目と期間を入力してください");
      return;
    }

    // 勘定科目を取得
    const account = data.find((acc) => acc.id === testAccountId);
    if (!account) {
      setTestResult("勘定科目が見つかりません");
      return;
    }

    console.log("選択された勘定科目:", account);
    console.log("財務モデル:", financialModel);

    // ASTを構築
    const ast = buildFormula(account);
    console.log("構築されたAST:", ast);

    // 値を取得する関数
    const getValue = (id, period) => {
      // 期間IDを正しい形式に変換（"p-YYYY"形式）
      const periodId = `p-${period}`;

      // デバッグ情報の出力
      console.log("検索条件:", {
        accountId: id,
        periodId: periodId,
        型情報: {
          id型: typeof id,
          period型: typeof periodId,
        },
      });

      // financialModel.valuesから値を検索（文字列比較）
      const foundValue = financialModel?.values?.find((v) => {
        const isAccountMatch = v.accountId === id;
        const isPeriodMatch = v.periodId === periodId;

        // 両方の条件が一致した場合のみログを出力
        if (isAccountMatch && isPeriodMatch) {
          console.log("条件一致した値:", {
            value: v,
            accountId: v.accountId,
            periodId: v.periodId,
            計算値: v.value,
          });
        }

        return isAccountMatch && isPeriodMatch;
      });

      const value = foundValue?.value;
      console.log(`最終的な値:`, value ?? 0);
      return value ?? 0;
    };

    // ASTを評価
    const result = evalNode(ast, testPeriod, getValue);
    console.log("計算結果:", result);
    setTestResult(result);
  } catch (error) {
    console.error("計算エラー:", error);
    setTestResult(`エラー: ${error.message}`);
  }
};

<div
  style={{
    flex: "0 0 120px",
    padding: "10px",
    borderTop: "1px solid #ccc",
    backgroundColor: "white",
    boxSizing: "border-box",
  }}
>
  <h3 style={{ margin: "0 0 10px 0", fontSize: "14px" }}>計算テスト</h3>
  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
    <div>
      <label>勘定科目：</label>
      <select
        value={testAccountId}
        onChange={(e) => setTestAccountId(e.target.value)}
        style={{ marginLeft: "5px" }}
      >
        <option value="">選択してください</option>
        {data.map((account) => (
          <option key={account.id} value={account.id}>
            {account.accountName}
          </option>
        ))}
      </select>
    </div>
    <div>
      <label>期間：</label>
      <input
        type="number"
        value={testPeriod}
        onChange={(e) => setTestPeriod(e.target.value)}
        style={{ marginLeft: "5px", width: "100px" }}
      />
    </div>
    <button
      onClick={runTest}
      style={{
        padding: "5px 15px",
        backgroundColor: "#4CAF50",
        color: "white",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
      }}
    >
      計算実行
    </button>
    {testResult !== null && (
      <div style={{ marginLeft: "20px" }}>
        <label>計算結果：</label>
        <span style={{ marginLeft: "5px", fontWeight: "bold" }}>
          {typeof testResult === "number"
            ? testResult.toLocaleString()
            : testResult}
        </span>
      </div>
    )}
    <p>{testAccountId}</p>
    <p>{testPeriod}</p>
  </div>
</div>;
