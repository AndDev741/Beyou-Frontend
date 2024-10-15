import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/authentication/login/login";
import Register from "./pages/authentication/register/register";
import Dashboard from "./pages/dashboard/dashboard";
import Categories from "./pages/categories/categories";

function App() {
  return (
    <BrowserRouter>
      <div className="font-mainFont">
        <Routes>
          <Route path="/" element={<Login/>}/>
          <Route path="/register" element={<Register/>} />
          <Route path="/dashboard" element={<Dashboard/>} />
          <Route path="/categories" element={<Categories/>}/>
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
