import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css"; // 스타일 파일이 있다면 유지

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);