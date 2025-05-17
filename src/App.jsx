import React from "react";
import FinancialModelWorkspace from "./components/FinancialModelWorkspace.jsx";
import "./App.css";
import SampleAst from "./components/SampleAst.jsx";

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>FS Sample</h1>
      </header>
      <main className="App-main">
        <FinancialModelWorkspace excelFilePath="/sample_sales2.xlsx" />
        {/* <SampleAst /> */}
      </main>
      <footer className="App-footer">
        <p>財務モデリングプロトタイプ © 2025</p>
      </footer>
    </div>
  );
}

export default App;
