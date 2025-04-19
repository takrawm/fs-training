import React from "react";
import FinancialModelEditor from "./components/FinancialModelEditor.jsx";
import "./App.css";

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>FS Sample</h1>
      </header>
      <main className="App-main">
        <FinancialModelEditor excelUrl="/sample_sales2.xlsx" />
      </main>
      <footer className="App-footer">
        <p>財務モデリングプロトタイプ © 2025</p>
      </footer>
    </div>
  );
}

export default App;
