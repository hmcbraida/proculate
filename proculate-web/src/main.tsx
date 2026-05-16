import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { router } from "@/routes/router";
import "@/styles.css";

const container = document.getElementById("root");
if (!container) throw new Error("missing #root container");

createRoot(container).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
