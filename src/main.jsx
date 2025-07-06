import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { AdminAuthProvider } from "./contexts/AdminAuthContext.jsx";
import "./index.css";
import "./admin.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AdminAuthProvider>
      <App />
    </AdminAuthProvider>
  </React.StrictMode>
);
