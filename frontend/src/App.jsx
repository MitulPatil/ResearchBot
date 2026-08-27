import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import NavBar from "./components/NavBar";
import ResearchPage from "./pages/ResearchPage";
import ReportsPage from "./pages/ReportsPage";
import ReportDetailPage from "./pages/ReportDetailPage";

export default function App() {
  return (
    <BrowserRouter>
      {/* Persistent top navigation — lets the user move between */}
      {/* new research and their saved report history.           */}
      <NavBar />

      <Routes>
        {/* ------------------------------------------ */}
        {/* New research                              */}
        {/* ------------------------------------------ */}

        <Route
          path="/"
          element={<ResearchPage />}
        />

        {/* ------------------------------------------ */}
        {/* Research history                          */}
        {/* ------------------------------------------ */}

        <Route
          path="/reports"
          element={<ReportsPage />}
        />

        {/* ------------------------------------------ */}
        {/* Individual report                         */}
        {/* ------------------------------------------ */}

        <Route
          path="/reports/:id"
          element={<ReportDetailPage />}
        />

        {/* ------------------------------------------ */}
        {/* Unknown route                             */}
        {/* ------------------------------------------ */}

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}