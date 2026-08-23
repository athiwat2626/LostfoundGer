import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import Loading from "./page/Loading";
import FoundItem from "./page/FoundItem";
import LostItem from "./page/LostItem";
import LostPage from "./page/LostPage";
import FoundPage from "./page/foundPage";
import Login from "./page/Login";
import ProtectedRoute from "./page/ProtectedRoute";

const protectedElement = (element) => (
  <ProtectedRoute>{element}</ProtectedRoute>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Loading />} />
        <Route path="/foundItem" element={protectedElement(<FoundItem />)} />
        <Route path="/lostItem" element={protectedElement(<LostItem />)} />
        <Route path="/foundPage" element={protectedElement(<FoundPage />)} />
        <Route path="/lostPage" element={protectedElement(<LostPage />)} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
