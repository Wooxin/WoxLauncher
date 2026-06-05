import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";

const SidebarLayout = lazy(() => import("./layouts/SidebarLayout"));
const Home = lazy(() => import("./pages/Home"));
const Instances = lazy(() => import("./pages/Instances"));
const InstanceDetail = lazy(() => import("./pages/InstanceDetail"));
const Accounts = lazy(() => import("./pages/Accounts"));
const ModBrowser = lazy(() => import("./pages/ModBrowser"));
const ModDetail = lazy(() => import("./pages/ModDetail"));
const JavaManager = lazy(() => import("./pages/JavaManager"));
const Settings = lazy(() => import("./pages/Settings"));

function PageLoading() {
  return (
    <div className="page-loading" aria-label="Loading" />
  );
}

function App() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route element={<SidebarLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/instances" element={<Instances />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/instances/:id" element={<InstanceDetail />} />
          <Route path="/mods" element={<ModBrowser />} />
          <Route path="/mods/:id" element={<ModDetail />} />
          <Route path="/java" element={<JavaManager />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
