import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/authentication/login/login";
import Register from "./pages/authentication/register/register";
import Dashboard from "./pages/dashboard/dashboard";
import Categories from "./pages/categories/categories";
import Habits from "./pages/habits/habits";
import Goals from "./pages/goals/goals";
import Tasks from "./pages/tasks/Tasks";
import Routine from "./pages/routines/routine";
import Configuration from "./pages/configuration/Configuration";

function App() {
  return (
    <BrowserRouter>
      <div className="font-mainFont">
        <Routes>
          <Route path="/" element={<Login/>}/>
          <Route path="/register" element={<Register/>} />
          <Route path="/dashboard" element={<Dashboard/>} />
          <Route path="/categories" element={<Categories/>}/>
          <Route path="/habits" element={<Habits/>} />
          <Route path="/goals" element={<Goals/>} />
          <Route path="/tasks" element={<Tasks/>} />
          <Route path="/routines" element={<Routine/>} />
          <Route path="/configuration" element={<Configuration/>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
