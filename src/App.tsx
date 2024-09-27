import { HashRouter as Router, Routes, Route } from "react-router-dom";
import { Index } from "./screens/index";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Index />} />
      </Routes>
    </Router>
  );
}

export default App;
