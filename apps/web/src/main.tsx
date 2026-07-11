import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import "@fontsource-variable/inter";
import "@fontsource-variable/oswald";
import App from "./App";
import { AuthProvider } from "./lib/auth";
import { validarAmbiente } from "./lib/config";
import { ErroConfiguracao } from "./components/ErroConfiguracao";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 10_000 } },
});

// Gate de ambiente ANTES de montar o app: sem VITE_DEMO=1 e sem as variáveis
// do modo live, nada além da tela de erro fatal é renderizado — nenhum
// provider, nenhuma sessão fake, nenhum fallback silencioso.
const variaveisAusentes = validarAmbiente();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {variaveisAusentes.length > 0 ? (
      <ErroConfiguracao faltando={variaveisAusentes} />
    ) : (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    )}
  </React.StrictMode>,
);
