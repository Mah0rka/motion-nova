import React from "react";
import ReactDOM from "react-dom/client";

import { AppErrorBoundary } from "./app/AppErrorBoundary";
import { AppProviders } from "./app/AppProviders";
import { AppRouter } from "./app/router";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* Error boundary стоїть найвище, щоб перехоплювати помилки з провайдерів,
        роутів і сторінок однаково. Порядок нижче важливий: спочатку провайдери,
        потім роутер, який уже може користуватись Query/Auth-інфраструктурою. */}
    <AppErrorBoundary>
      <AppProviders>
        <AppRouter />
      </AppProviders>
    </AppErrorBoundary>
  </React.StrictMode>
);
