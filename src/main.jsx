import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./index.css";

const VERSION_KEY = "uroutes_admin_build";
const v = import.meta.env.VITE_APP_VERSION ?? "";
const prev =
  typeof window !== "undefined" && typeof localStorage !== "undefined"
    ? localStorage.getItem(VERSION_KEY)
    : null;

const mustResync = Boolean(
  typeof window !== "undefined" && v && prev && prev !== v,
);

if (mustResync) {
  localStorage.setItem(VERSION_KEY, v);
  const reload = () => window.location.reload();
  if ("caches" in window) {
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((name) => caches.delete(name))))
      .catch(() => {})
      .finally(reload);
  } else {
    reload();
  }
} else {
  if (typeof window !== "undefined" && v) {
    localStorage.setItem(VERSION_KEY, v);
  }
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
