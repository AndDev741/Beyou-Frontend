import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/authentication/login/login";
import Register from "./pages/authentication/register/register";

function App() {
  return (
    <BrowserRouter>
      <div className="font-mainFont">
        <Routes>
          <Route path="/" element={<Login/>}/>
          <Route path="/register" element={<Register/>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
