# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Development**: `npm run dev` - Start development server with hot reload
- **Build**: `npm run build` - Build for production
- **Preview**: `npm run preview` - Preview production build locally

## Architecture

This is a React-based financial modeling application built with Vite. The application uses a multi-step workflow for processing Excel data into financial models.

### Core Data Flow
1. **Excel Import** → Raw data loaded via xlsx library
2. **Account Mapping** → Users map Excel accounts to model accounts  
3. **Parameter Configuration** → Set calculation parameters (growth rates, percentages, etc.)
4. **AST-based Calculations** → Formula engine builds Abstract Syntax Trees for financial calculations
5. **Results Display** → Multi-tab view showing calculated financial statements

### Key Architectural Components

**AST Formula Engine** (`src/utils/astBuilder.js`, `src/utils/astEvaluator.js`):
- Builds Abstract Syntax Trees for financial calculations
- Supports operations: multiplication, addition, references, constants
- Handles parameter types: GROWTH_RATE, PERCENTAGE, DEPENDENCY, FIXED_VALUE, NONE

**Financial Models** (`src/models/`):
- `account.js` - Account mapping and aggregation logic
- `accountValue.js` - Account value calculations across periods
- `period.js` - Time period management for financial models
- `cashflowAccount.js` - Cash flow specific calculations

**HyperFormula Integration** (`src/utils/formulaEngine.js`):
- Uses HyperFormula for spreadsheet-like calculations
- Creates separate sheets: actual, params, forecast, calc, indicators
- Loads financial models into structured sheet format

**Handsontable Integration**:
- Uses Handsontable React wrapper for spreadsheet UI
- Registered modules via `registerAllModules()`
- Custom cell editors with React Select integration

### Parameter Types
- `GROWTH_RATE` - Year-over-year growth calculations
- `PERCENTAGE` - Percentage of reference accounts
- `DEPENDENCY` - Sum of multiple reference accounts  
- `FIXED_VALUE` - Static values across periods
- `NONE` - No calculation required

### Component Hierarchy
`App.jsx` → `FinancialModelWorkspace.jsx` → `FinancialModelBuilder.jsx` → Multi-step components (AccountMappingTable, ParameterSettingTable, ResultTableWithTabs)

### Excel File Processing
Sample files in `/public/` directory are processed through the multi-step workflow starting with account mapping and ending with financial statement generation.