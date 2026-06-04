import { Routes, Route } from "react-router-dom";
import SidebarLayout from "./layouts/SidebarLayout";
import Home from "./pages/Home";
import Instances from "./pages/Instances";
import InstanceDetail from "./pages/InstanceDetail";
import ModBrowser from "./pages/ModBrowser";
import ModDetail from "./pages/ModDetail";
import JavaManager from "./pages/JavaManager";
import Settings from "./pages/Settings";

function App() {
  return (
    <Routes>
      <Route element={<SidebarLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/instances" element={<Instances />} />
        <Route path="/instances/:id" element={<InstanceDetail />} />
        <Route path="/mods" element={<ModBrowser />} />
        <Route path="/mods/:id" element={<ModDetail />} />
        <Route path="/java" element={<JavaManager />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;
