import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import JobDetail from "./pages/JobDetail.jsx";
import Applications from "./pages/Applications.jsx";
import SearchHistory from "./pages/SearchHistory.jsx";
import Insights from "./pages/Insights.jsx";
import Settings from "./pages/Settings.jsx";

export default function App() {
  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar />
      <main className="flex-1 px-8 py-7">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/applications" element={<Applications />} />
          <Route path="/history" element={<SearchHistory />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}
