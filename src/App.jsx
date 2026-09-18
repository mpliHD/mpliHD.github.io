// EXPORTAÇÕES
// Bibliotecas que usamos neste arquivo:
// React (hooks: useState, useEffect, useMemo, useRef) para montar as telas.
// Recharts para o gráfico de barras do Painel de Monitoramento.
// lucide-react para os ícones usados em toda a interface.
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  Wifi, WifiOff, ScanLine, Nfc, RadioTower, Package, MapPin,
  AlertTriangle, ClipboardList, LayoutDashboard, RefreshCw, Lock, ShieldCheck,
  Clock, ChevronRight, CheckCircle2, Server, Bell, LogOut,
  KeyRound, ArrowRightLeft, Boxes, Table2, X, Plug, Copy, Loader2,
  Menu, Users, ShieldAlert, LifeBuoy, Plus, Trash2, Send, Image as ImageIcon, Camera,
  Eye, EyeOff, Mail, Link2,
} from "lucide-react";

// APIS pra INTEGRAÇÃO
// Guarda a URL base e a chave de API num Context do React, em vez de cada
// aba guardar sua própria cópia. Assim, a aba "Usuários" (convite por
// e-mail) e a aba "APIs & Integrações" sempre enxergam a MESMA configuração
// Quando o backend for plugado de verdade (ver com o Caio), só precisa configurar uma vez.
const IntegrationContext = React.createContext({
  baseUrl: "", apiKey: "", setBaseUrl: () => {}, setApiKey: () => {},
});

// PALETA DE CORES
// Objeto único com todas as cores do sistema, trocar um valor aqui muda a
// cor (#) em todas as telas de uma vez, sem precisar procurar cada lugar que a
// usa. Vermelho é a cor de marca (CPTM); âmbar/verde/vermelho também são
// usados como "sinal de status" (aviso / sucesso / crítico) nas telas.
const COLOR = {
  bg: "#F3F4F6",
  panel: "#FFFFFF",
  panelAlt: "#F7F7F9",
  line: "#E3E5E9",
  red: "#E30613",       // vermelho CPTM (marca / crítico)
  redTint: "#FCE4E6",
  amber: "#C2760A",     // aviso (offline, pendências)
  amberTint: "#FBF0DD",
  green: "#1E8E5A",     // ok / sucesso
  greenTint: "#E4F4EC",
  blue: "#2E5C8A",      // informativo neutro
  blueTint: "#E7EEF5",
  text: "#1B1D22",
  textDim: "#63676F",
  textFaint: "#9AA0A8",
};

const FONT_DISPLAY = "'Space Grotesk', sans-serif";
const FONT_MONO = "'IBM Plex Mono', monospace";
const FONT_BODY = "'IBM Plex Sans', sans-serif";

// FONTES E ESTILOS GLOBAIS
// Este componente só existe para injetar um bloco <style> com: a importação
// das 3 fontes usadas (Google Fonts), um reset básico, e as @keyframes das
// animações usadas em vários lugares (pulso do indicador de status, entrada
// suave de painéis, giro do ícone de carregamento, etc.). É renderizado uma
// vez em cada tela principal (Login e App). Depois se quisermos deixar mais sofisticado
// podemos mexer aqui
const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
    * { box-sizing: border-box; }
    html, body, #root { margin: 0; height: 100%; }
    ::selection { background: ${COLOR.red}; color: #fff; }
    input::placeholder, select { color: inherit; }
    table { border-collapse: collapse; width: 100%; }
    .app-shell { min-height: 100vh; }
    @supports (height: 100dvh) { .app-shell { min-height: 100dvh; } }
    @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:.35} }
    @keyframes slide-in { from{opacity:0; transform:translateY(6px)} to{opacity:1; transform:translateY(0)} }
    @keyframes fade-in { from{opacity:0} to{opacity:1} }
    @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
    @keyframes rail-sweep { 0%{background-position: 0 0} 100%{background-position: 120px 0} }
    @keyframes drift { 0%,100%{transform: translateY(0)} 50%{transform: translateY(-8px)} }
    .spin { animation: spin 0.9s linear infinite; }
  `}</style>
);

// LOGOTIPO (MARCA)
// SVG desenhado à mão, inspirado em sinalização ferroviária (setas + trilho
// tracejado). NÃO é o logotipo oficial da CPTM (não queremos copyright) que é marca registrada
function BrandMark({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="6" fill={COLOR.red} />
      <path d="M7 20 L14 12 L18 16 L25 8" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 8 H25 V13" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="6" y1="24" x2="26" y2="24" stroke="#fff" strokeWidth="1.6" strokeDasharray="2.5 3" />
    </svg>
  );
}

// DADOS FICTÍCIOS (MOCK)
// Tudo nesta seção é dado de exemplo, guardado só na memória do navegador
// nada aqui vem de um banco de dados real ainda (precisaríamos ajudar na aba "APIs &
// Integrações" para a conexão futura com o Caio)
// ITENS: os itens de almoxarifado que aparecem nos formulários e tabelas.
// TAG_TYPES: os tipos de leitura por hardware (RFID/NFC); o QR Code é
//   tratado à parte, na aba Operação de Campo, porque usa imagem em vez de
//   leitor.
// OPERACOES: os 4 tipos de registro que o técnico pode lançar em campo.
// TECNICO: representa a pessoa atualmente logada (nome, matrícula, papel)
//  hoje é fixo, mas seria substituído pelos dados devolvidos pelo login.
// LOGIN_DEMO: usuário e senha aceitos na tela de login deste protótipo.
const ITENS = [
  { id: "BAT-01", nome: "Batente", setor: "Via Permanente" },
  { id: "DOR-02", nome: "Dormente", setor: "Via Permanente" },
  { id: "RFI-03", nome: "RFID", setor: "Identificação" },
  { id: "IDE-04", nome: "Identificação", setor: "Identificação" },
  { id: "EEF-05", nome: "Equipamento Elétrico (Fiação)", setor: "Setor Elétrico" },
  { id: "OUT-06", nome: "Outros", setor: "Almoxarifado Central" },
];

const TAG_TYPES = [
  { key: "rfid", label: "RFID", icon: RadioTower },
  { key: "nfc", label: "NFC", icon: Nfc },
];

const OPERACOES = [
  { key: "movimentacao", label: "Movimentação de Estoque", icon: ArrowRightLeft },
  { key: "inventario", label: "Inventário", icon: Boxes },
  { key: "localizacao", label: "Localização", icon: MapPin },
  { key: "ocorrencia", label: "Ocorrência", icon: AlertTriangle },
];

const TECNICO = { nome: "Ana Giulia", matricula: "CPTM-4471", turno: "Tarde · Pátio Barra Funda", papel: "Admin" };
const LOGIN_DEMO = { usuario: "Admin", senha: "Senha123" };

// FUNÇÕES UTILITÁRIAS
// Pequenas funções puras (sem tela) usadas em vários componentes:
// fmtTime / fmtShort: formatam datas no padrão brasileiro (a "curta" só
//  mostra hora:minuto:segundo, usada em listas onde o dia é óbvio).
// uid: gera um código curto e aleatório, usado como identificador de
// registros mockados (não é um UUID de verdade, só serve para o `key` do
//  React e para exibir um "código" plausível na tela).
// seedHistorico: cria os 7 dias de dados fictícios usados no gráfico de
// barras do Painel de Monitoramento, com um número aleatório de
// movimentações por dia.
function fmtTime(d) {
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function fmtShort(d) {
  return d.toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function uid() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }

function seedHistorico() {
  const now = Date.now();
  const out = [];
  for (let i = 6; i >= 0; i--) {
    out.push({
      dia: new Date(now - i * 86400000).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
      movimentacoes: Math.round(8 + Math.random() * 20),
    });
  }
  return out;
}

// COMPONENTES BÁSICOS DE INTERFACE
// Peças pequenas e reaproveitadas em quase toda tela:
// SignalDot: a bolinha pulsante de status (verde=ok, âmbar=aviso,
//  vermelho=crítico). A cor é escolhida por um encadeamento de condições:
//   se(if) status for == "ok" usa verde; senão (else), se for "warn" usa âmbar; para
//   qualquer outro valor (ex.: "erro"), usa vermelho. --PRECISAMOS TESTAR SE A REGRA DA EXCEÇÃO É BOA
// Panel: o "cartão" branco com borda usado para agrupar conteúdo. Se
//   receber `accent`, pinta uma borda colorida mais grossa do lado esquerdo
//   (usado para destacar o estado de um cartão, como erro ou sucesso).
// Label: rótulo pequeno em fonte monoespaçada, usado acima de campos de
//   formulário e em métricas.
function SignalDot({ status }) {
  const c = status === "ok" ? COLOR.green : status === "warn" ? COLOR.amber : COLOR.red;
  return (
    <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8 }}>
      <span style={{ position: "absolute", inset: 0, borderRadius: 99, background: c, animation: "pulse-dot 1.8s ease-in-out infinite" }} />
    </span>
  );
}

function Panel({ children, style, accent }) {
  return (
    <div
      style={{
        background: COLOR.panel,
        border: `1px solid ${COLOR.line}`,
        borderLeft: accent ? `3px solid ${accent}` : `1px solid ${COLOR.line}`,
        borderRadius: 6,
        padding: 18,
        boxShadow: "0 1px 2px rgba(20,20,30,.03)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Label({ children, tone }) {
  return (
    <span style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 0.4, color: tone || COLOR.textDim }}>
      {children}
    </span>
  );
}

// LOGIN
// Tela de autenticação em duas etapas: 1) usuário/senha, 2) código MFA.
// LOGIN_TIPS são as dicas que giram sozinhas no painel vermelho da esquerda (PODEMOS AJUSTAR)
const LOGIN_TIPS = [
  { icon: WifiOff, text: "Perdeu a conexão em campo? O sistema continua registrando tudo localmente e sincroniza sozinho quando a rede voltar." },
  { icon: ScanLine, text: "RFID, NFC ou uma foto do QR Code — qualquer um dos três identifica o item na hora." },
  { icon: ShieldAlert, text: "Cada pessoa entra com um nível de acesso: Operador, Analista ou Admin." },
  { icon: RefreshCw, text: "Credenciais offline ficam válidas por 48h, tempo suficiente para um turno inteiro em campo." },
];

function LoginScreen({ online, onSuccess }) {
  const [stage, setStage] = useState("credentials"); // "credentials" = etapa 1, "mfa" = etapa 2
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [tipIndex, setTipIndex] = useState(0);
  const width = useViewport();
  // Condição: só mostra o painel visual vermelho (com as dicas) se a tela
  // tiver pelo menos 860px de largura. Em telas estreitas (celular), ele
  // fica escondido e só o formulário aparece, fiz isso pra evitar que o painel decorativo
  // "coma" o espaço do formulário num celular, mas podemos testar via celular depois perto do final.
  const showVisualPanel = width >= 860;

  useEffect(() => {
    // Troca a dica exibida a cada 4,2 segundos, voltando para a primeira
    // depois da última (por isso o "% LOGIN_TIPS.length").
    const t = setInterval(() => setTipIndex((i) => (i + 1) % LOGIN_TIPS.length), 4200);
    return () => clearInterval(t);
  }, []);

  const submitCreds = (e) => {
    e.preventDefault();
    // Condição: usuário (sem diferenciar maiúsculas/minúsculas) e senha
    // precisam bater exatamente com LOGIN_DEMO. Se qualquer um dos dois
    // estiver errado, mostra erro e não avança de etapa.
    if (user.trim().toLowerCase() !== LOGIN_DEMO.usuario.toLowerCase() || pass.trim() !== LOGIN_DEMO.senha) {
      setError(`Usuário ou senha inválidos. Use ${LOGIN_DEMO.usuario} / ${LOGIN_DEMO.senha}.`);
      return;
    }
    setError("");
    setStage("mfa"); // credenciais corretas → avança para a etapa de MFA
  };

  const submitMfa = (e) => {
    e.preventDefault();
    // Condição: neste protótipo, qualquer código com 4 ou mais dígitos é
    // aceito (não existe um servidor de verdade validando o código... ainda).
    if (code.trim().length < 4) { setError("Código inválido — informe pelo menos 4 dígitos."); return; }
    onSuccess();
  };

  const TipIcon = LOGIN_TIPS[tipIndex].icon;

  return (
    <div className="app-shell" style={{
      background: COLOR.bg, display: "flex", fontFamily: FONT_BODY, color: COLOR.text,
    }}>
      <FontLoader />

      {showVisualPanel && (
        <div style={{
          flex: "0 0 42%", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column",
          justifyContent: "space-between", padding: 40, color: "#fff",
          background: `linear-gradient(155deg, ${COLOR.red} 0%, #a3040f 65%, #6e0209 100%)`,
        }}>
          <div style={{
            position: "absolute", inset: 0, opacity: 0.16, pointerEvents: "none",
            backgroundImage: "repeating-linear-gradient(90deg, #fff 0 10px, transparent 10px 34px)",
            backgroundSize: "120px 100%", animation: "rail-sweep 6s linear infinite",
          }} />

          <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BrandMark size={26} />
            </div>
            <div>
              <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 18, lineHeight: 1.1 }}>CPTM · ARMAZÉM</div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: 0.6, opacity: 0.85 }}>MONITORAMENTO LOGÍSTICO</div>
            </div>
          </div>

          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 26, lineHeight: 1.25, marginBottom: 14, maxWidth: 380 }}>
              Rastreabilidade de ponta a ponta, online ou offline.
            </div>
            <div key={tipIndex} style={{
              display: "flex", gap: 10, alignItems: "flex-start", animation: "fade-in .4s ease",
              background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.22)", borderRadius: 8, padding: "12px 14px", maxWidth: 380,
            }}>
              <TipIcon size={16} style={{ marginTop: 2, flexShrink: 0, animation: "drift 3s ease-in-out infinite" }} />
              <span style={{ fontSize: 12.5, lineHeight: 1.6, opacity: 0.95 }}>{LOGIN_TIPS[tipIndex].text}</span>
            </div>
            <div style={{ display: "flex", gap: 5, marginTop: 12 }}>
              {LOGIN_TIPS.map((_, i) => (
                <span key={i} style={{ width: i === tipIndex ? 16 : 5, height: 5, borderRadius: 99, background: i === tipIndex ? "#fff" : "rgba(255,255,255,.4)", transition: "width .3s" }} />
              ))}
            </div>
          </div>

          <div style={{ position: "relative", zIndex: 1, fontFamily: FONT_MONO, fontSize: 10, opacity: 0.7 }}>
            Protótipo acadêmico · dados fictícios
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          {!showVisualPanel && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
              <BrandMark />
              <div>
                <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 16, lineHeight: 1.1 }}>CPTM · ARMAZÉM</div>
                <div style={{ fontFamily: FONT_MONO, fontSize: 10.5, color: COLOR.textDim, letterSpacing: 0.5 }}>MONITORAMENTO LOGÍSTICO</div>
              </div>
            </div>
          )}

          <Panel style={{ padding: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <StepDot active={stage === "credentials"} done={stage === "mfa"} label="1" />
              <div style={{ flex: 1, height: 2, background: stage === "mfa" ? COLOR.red : COLOR.line, borderRadius: 99, transition: "background .3s" }} />
              <StepDot active={stage === "mfa"} done={false} label="2" />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: FONT_MONO, fontSize: 9.5, color: COLOR.textFaint, marginBottom: 20 }}>
              <span>CREDENCIAIS</span><span>MFA</span>
            </div>

            <div key={stage} style={{ animation: "slide-in .25s ease" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                {/* Ícone e título mudam conforme a etapa atual */}
                {stage === "credentials"
                  ? <Lock size={15} color={COLOR.red} />
                  : <ShieldCheck size={15} color={COLOR.red} />}
                <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 15 }}>
                  {stage === "credentials" ? "Acesso do técnico" : "Autenticação de dois fatores"}
                </span>
              </div>

              {/* Condição principal da tela: mostra o formulário de usuário/
                  senha OU o de MFA, nunca os dois juntos. */}
              {stage === "credentials" ? (
                <div onKeyDown={(e) => e.key === "Enter" && submitCreds(e)} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <Field label="Usuário" value={user} onChange={setUser} placeholder="Admin" />
                  <Field label="Senha" value={pass} onChange={setPass} placeholder="Senha123" type="password" />
                  {error && <div style={{ color: COLOR.red, fontSize: 12.5 }}>{error}</div>}
                  <Btn onClick={submitCreds} full>Entrar<ChevronRight size={15} /></Btn>
                </div>
              ) : (
                <div onKeyDown={(e) => e.key === "Enter" && submitMfa(e)} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{
                    display: "flex", gap: 8, alignItems: "flex-start", background: online ? COLOR.greenTint : COLOR.amberTint,
                    border: `1px solid ${online ? "#bfe4d1" : "#f0ddb8"}`, borderRadius: 4, padding: "10px 12px",
                  }}>
                    {online ? <Wifi size={14} color={COLOR.green} style={{ marginTop: 2 }} /> : <WifiOff size={14} color={COLOR.amber} style={{ marginTop: 2 }} />}
                    <div style={{ fontSize: 12, lineHeight: 1.5, color: COLOR.textDim }}>
                      {/* Condição: explica pro técnico QUAL caminho de MFA está
                          sendo usado. Online = o código veio de um servidor.
                          Offline = está validando com as credenciais que
                          ficaram salvas no dispositivo nas últimas 48h. */}
                      {online
                        ? <>MFA via <b style={{ color: COLOR.text }}>servidor/API</b>. Um código foi enviado ao seu dispositivo cadastrado.</>
                        : <>Sem conexão — validando com <b style={{ color: COLOR.text }}>Client ID / Client Secret</b> salvos localmente (cache de 48h).</>}
                    </div>
                  </div>
                  <Field label="Código de verificação" value={code} onChange={setCode} placeholder="000000" mono />
                  {error && <div style={{ color: COLOR.red, fontSize: 12.5 }}>{error}</div>}
                  <Btn onClick={submitMfa} full>Confirmar e entrar<ChevronRight size={15} /></Btn>
                </div>
              )}
            </div>
          </Panel>
          <div style={{ textAlign: "center", marginTop: 14, fontFamily: FONT_MONO, fontSize: 10.5, color: COLOR.textFaint }}>
            login de teste: <b style={{ color: COLOR.textDim }}>{LOGIN_DEMO.usuario} / {LOGIN_DEMO.senha}</b> · qualquer código de 4+ dígitos no MFA
          </div>
        </div>
      </div>
    </div>
  );
}

// Bolinha numerada do indicador de progresso do login (1 = credenciais,
// 2 = MFA). active = etapa atual; done = etapa já concluída (mostra um
// check em vez do número). Se estiver ativa OU concluída, pinta de vermelho;
// caso contrário, fica cinza (etapa ainda não alcançada).
function StepDot({ active, done, label }) {
  return (
    <div style={{
      width: 22, height: 22, borderRadius: 99, display: "flex", alignItems: "center", justifyContent: "center",
      background: active || done ? COLOR.red : COLOR.panelAlt, color: active || done ? "#fff" : COLOR.textFaint,
      border: `1px solid ${active || done ? COLOR.red : COLOR.line}`, fontFamily: FONT_MONO, fontSize: 11, flexShrink: 0,
      transition: "all .2s",
    }}>
      {done ? <CheckCircle2 size={13} /> : label}
    </div>
  );
}

// COMPONENTES DE FORMULÁRIO
// Field: um par label+input padronizado (usado no login).
// Btn: botão com 3 variantes visuais (primary = vermelho sólido, ghost =
//   contorno, subtle = cinza claro), e um estado `small` para versões
//   compactas usadas dentro de tabelas/listas.
function Field({ label, value, onChange, placeholder, type = "text", mono }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontFamily: FONT_MONO, fontSize: 10.5, color: COLOR.textDim, letterSpacing: 0.4 }}>{label.toUpperCase()}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          background: COLOR.panelAlt, border: `1px solid ${COLOR.line}`, borderRadius: 4,
          padding: "10px 12px", color: COLOR.text, fontSize: 14, fontFamily: mono ? FONT_MONO : FONT_BODY, outline: "none",
        }}
        onFocus={(e) => (e.target.style.borderColor = COLOR.red)}
        onBlur={(e) => (e.target.style.borderColor = COLOR.line)}
      />
    </label>
  );
}

function Btn({ children, onClick, full, variant = "primary", type = "button", small }) {
  const styles = {
    primary: { background: COLOR.red, color: "#fff", border: `1px solid ${COLOR.red}` },
    ghost: { background: "transparent", color: COLOR.text, border: `1px solid ${COLOR.line}` },
    subtle: { background: COLOR.panelAlt, color: COLOR.textDim, border: `1px solid ${COLOR.line}` },
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      style={{
        ...styles, width: full ? "100%" : "auto", display: "inline-flex", alignItems: "center",
        justifyContent: "center", gap: 6, padding: small ? "7px 12px" : "10px 16px",
        borderRadius: 4, fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: small ? 12.5 : 13.5,
        cursor: "pointer", transition: "opacity .15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = 0.85)}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = 1)}
    >
      {children}
    </button>
  );
}

// MENU LATERAL pra configuração de navegação
// useViewport devolve a largura atual da janela e se atualiza sozinho
// quando o usuário redimensiona (usado para decidir quando o menu vira uma
// gaveta de celular em vez de uma barra fixa, permite ver dentro do componente App).
// NAV é a lista de itens do menu lateral, na ordem em que aparecem.
// ENDPOINTS é usado só na aba "APIs & Integrações", para montar a tabela de
// rotas que o backend real vai precisar implementar.
function useViewport() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1280);
  useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return w;
}

const NAV = [
  { key: "operacao", label: "Operação de Campo", icon: ScanLine },
  { key: "dashboard", label: "Painel de Monitoramento", icon: LayoutDashboard },
  { key: "sync", label: "Sincronização & Credenciais", icon: RefreshCw },
  { key: "api", label: "APIs & Integrações", icon: Plug },
  { key: "usuarios", label: "Usuários & Permissões", icon: Users },
  { key: "chamados", label: "Suporte / Chamados", icon: LifeBuoy },
  { key: "logs", label: "Logs e Auditoria", icon: ClipboardList },
];

// APIs = lista de rotas exibidas na aba "APIs & Integrações"
// Isso é só a TABELA mostrada na tela (documentação visual das rotas que o
// backend real precisa ter) nenhuma dessas chamadas é feita de verdade
// ainda, OBVIAMENTE VAMOS PRECISAR AJUSTAR. 
// Cada linha vira uma linha da tabela em ApiTab, mais abaixo.
const ENDPOINTS = [
  { method: "POST", path: "/auth/login", desc: "Passo 1 do login (usuário/senha) — devolve tempToken" },
  { method: "POST", path: "/auth/mfa", desc: "Passo 2 online do MFA — devolve token + credenciais offline (48h)" },
  { method: "POST", path: "/auth/mfa-offline", desc: "Passo 2 offline, usando client id/secret salvos localmente" },
  { method: "GET", path: "/usuarios", desc: "Lista usuários e seus papéis" },
  { method: "POST", path: "/usuarios", desc: "Cria usuário (Admin)" },
  { method: "PATCH", path: "/usuarios/:id/papel", desc: "Eleva/altera o papel do usuário (Admin)" },
  { method: "POST", path: "/usuarios/convite", desc: "Gera convite por e-mail (Admin/Analista)" },
  { method: "POST", path: "/estoque/movimentacao", desc: "Registrar entrada / saída / transferência de itens" },
  { method: "POST", path: "/estoque/inventario", desc: "Registrar contagem / conferência de inventário" },
  { method: "POST", path: "/estoque/localizacao", desc: "Registrar posicionamento de itens no armazém" },
  { method: "POST", path: "/estoque/ocorrencias", desc: "Registrar falhas, danos ou observações" },
  { method: "POST", path: "/sincronizacao/replicar", desc: "Enviar dados pendentes do cache offline" },
  { method: "GET", path: "/sincronizacao/status", desc: "Status da última sincronização (atualizado/desatualizado)" },
  { method: "GET", path: "/monitoramento/status", desc: "Saúde do backend e se banco/e-mail reais estão configurados" },
  { method: "GET", path: "/logs", desc: "Logs e auditoria de ações do sistema" },
];

// COMPONENTE PRINCIPAL (APP)
// É quem guarda TODO o estado importante do sistema depois do login: se
// está online/offline, qual aba está aberta, os registros criados, a fila
// de pendências offline, os logs, etc. Também decide o que renderizar:
// enquanto screen === "login", mostra só a tela de login (SIMPLES MAS FUNCIONA); depois que o
// login dá certo, mostra o layout com menu lateral + conteúdo da aba ativa.
export default function App() {
  const [screen, setScreen] = useState("login");
  const [online, setOnline] = useState(true);
  const [tab, setTab] = useState("operacao");

  const width = useViewport();
  // Condição: abaixo de 860px consideramos "celular" — nessa largura o menu
  // lateral vira uma gaveta que desliza por cima do conteúdo, em vez de
  // ficar sempre fixo do lado.
  const isMobile = width < 860;
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const wasMobile = useRef(isMobile);
  useEffect(() => {
    // Só reage quando o dispositivo MUDA de categoria (de celular para
    // desktop ou vice-versa) — por exemplo, ao girar a tela ou redimensionar
    // a janela cruzando os 860px. Isso evita fechar/abrir o menu à toa a
    // cada pixel de redimensionamento.
    if (wasMobile.current !== isMobile) {
      setSidebarOpen(!isMobile);
      wasMobile.current = isMobile;
    }
  }, [isMobile]);

  const [records, setRecords] = useState([]);
  const [pending, setPending] = useState([]);
  const [logs, setLogs] = useState([]);
  const [baseUrl, setBaseUrl] = useState("http://localhost:4000");
  const [apiKey, setApiKey] = useState("");
  const integrationValue = useMemo(() => ({ baseUrl, setBaseUrl, apiKey, setApiKey }), [baseUrl, apiKey]);
  const [alerts] = useState([
    { id: uid(), level: "warn", text: "Estoque de Rolamento NSK-6205 abaixo do mínimo", time: new Date(Date.now() - 40 * 60000) },
    { id: uid(), level: "ok", text: "Sincronização automática concluída com sucesso", time: new Date(Date.now() - 95 * 60000) },
  ]);
  const [lastSync, setLastSync] = useState(new Date(Date.now() - 12 * 60000));
  const credIssuedAt = useRef(new Date(Date.now() - 3 * 3600000));
  const [now, setNow] = useState(new Date());
  const historico = useMemo(seedHistorico, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const credExpiresAt = new Date(credIssuedAt.current.getTime() + 48 * 3600000);
  const credMsLeft = credExpiresAt - now;
  const credHoursLeft = Math.max(0, credMsLeft / 3600000);

  function pushLog(acao, status = "ok") {
    setLogs((l) => [{ id: uid(), acao, status, ator: TECNICO.nome, time: new Date() }, ...l].slice(0, 60));
  }

  function handleLoginSuccess() {
    pushLog("Login + MFA validado (" + (online ? "online via servidor" : "offline via credenciais locais") + ")");
    setScreen("app");
  }

  function handleNovoRegistro(reg) {
    const withMeta = { ...reg, id: uid(), time: new Date() };
    setRecords((r) => [withMeta, ...r]);
    // Condição central do modo offline: se está online, finge que enviou
    // direto pro servidor (atualiza a hora da última sincronização). Se
    // está offline, o registro some por igual da tela, mas vai também para
    // a fila pending que fica visível em Sincronização até o usuário
    // voltar a ficar online.
    if (online) {
      setLastSync(new Date());
      pushLog(`Registro enviado via API: ${reg.tipoLabel} — ${reg.itemNome}`);
    } else {
      setPending((p) => [withMeta, ...p]);
      pushLog(`Registro salvo em cache local (offline): ${reg.tipoLabel} — ${reg.itemNome}`, "warn");
    }
  }

  function handleSincronizarAgora() {
    // Condição: não faz nada se estiver offline (não tem como sincronizar
    // sem conexão) ou se não houver nada pendente evita um log vazio de
    // "sincronizei 0 registros".
    if (!online || pending.length === 0) return;
    pushLog(`Sincronização: ${pending.length} registro(s) pendente(s) replicado(s) para o servidor`);
    setPending([]);
    setLastSync(new Date());
  }

  function toggleOnline() {
    const next = !online;
    setOnline(next);
    pushLog(next ? "Conexão restabelecida" : "Conexão perdida — entrando em modo offline", next ? "ok" : "warn");
    // Condição: se a conexão VOLTOU (next === true) e havia registros na
    // fila offline, simula a sincronização automática depois de um pequeno
    // atraso (900ms), como aconteceria de verdade ao reconectar.
    if (next && pending.length > 0) {
      setTimeout(() => {
        pushLog(`Sincronização automática: ${pending.length} registro(s) replicado(s)`);
        setPending([]);
        setLastSync(new Date());
      }, 900);
    }
  }

  // Enquanto não fez login, a tela inteira é só o LoginScreen, nada do
  // layout com menu lateral é montado.
  if (screen === "login") return <LoginScreen online={online} onSuccess={handleLoginSuccess} />;

  // MENU LATERAL: cálculo de largura e se mostra o texto ao lado dos ícones
  // Em celular, a gaveta sempre tem a largura cheia (236px) quando aberta.
  // No desktop, a largura varia entre 236px (expandido) e 64px (recolhido,
  // só ícones) conforme sidebarOpen. showLabels decide se os textos ao
  // lado dos ícones aparecem, no celular sempre aparecem mas no desktop só aparecem quando expandido.
  const sidebarWidth = isMobile ? 236 : (sidebarOpen ? 236 : 64);
  const showLabels = isMobile || sidebarOpen;

  // MENU LATERAL: conteúdo (logotipo, itens de navegação e rodapé com o
  // usuário logado). É montado uma vez aqui e reaproveitado nas versões mobile e desktop pra
  // evitar duplicar o JSX das duas versões.
  const sidebarContent = (
    <>
      <div style={{ padding: showLabels ? "20px 18px" : "20px 0", display: "flex", alignItems: "center", justifyContent: showLabels ? "flex-start" : "center", gap: 10, borderBottom: `1px solid ${COLOR.line}` }}>
        <BrandMark size={30} />
        {showLabels && (
          <div>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 13.5, lineHeight: 1.1, whiteSpace: "nowrap" }}>CPTM · ARMAZÉM</div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 9.5, color: COLOR.textDim, whiteSpace: "nowrap" }}>MONITORAMENTO</div>
          </div>
        )}
      </div>

      <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 2, flex: 1, minHeight: 0, overflowY: "auto" }}>
        {NAV.map((n) => {
          const Icon = n.icon;
          const activeSel = tab === n.key;
          return (
            <button
              key={n.key}
              onClick={() => { setTab(n.key); if (isMobile) setSidebarOpen(false); }}
              title={n.label}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: showLabels ? "9px 10px" : "9px 0",
                justifyContent: showLabels ? "flex-start" : "center", borderRadius: 4,
                border: "none", background: activeSel ? COLOR.redTint : "transparent",
                borderLeft: activeSel ? `2px solid ${COLOR.red}` : "2px solid transparent",
                color: activeSel ? COLOR.red : COLOR.textDim, cursor: "pointer", textAlign: "left", fontSize: 12.5, fontFamily: FONT_BODY,
              }}
            >
              <Icon size={15} style={{ flexShrink: 0 }} />
              {showLabels && <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.label}</span>}
              {showLabels && n.key === "sync" && pending.length > 0 && (
                <span style={{ marginLeft: "auto", background: COLOR.red, color: "#fff", borderRadius: 99, fontSize: 10, padding: "1px 6px", fontFamily: FONT_MONO }}>
                  {pending.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ padding: showLabels ? 14 : "14px 4px", borderTop: `1px solid ${COLOR.line}` }}>
        {showLabels ? (
          <>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{TECNICO.nome}</div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: COLOR.textDim, marginBottom: 3 }}>{TECNICO.matricula}</div>
            <div style={{ marginBottom: 10 }}>
              <span style={{ fontFamily: FONT_MONO, fontSize: 9.5, padding: "1px 7px", borderRadius: 99, background: roleColor(TECNICO.papel).bg, color: roleColor(TECNICO.papel).fg }}>{TECNICO.papel.toUpperCase()}</span>
            </div>
            <Btn variant="ghost" small full onClick={() => setScreen("login")}><LogOut size={13} />Sair</Btn>
          </>
        ) : (
          <button onClick={() => setScreen("login")} title="Sair" style={{ width: "100%", display: "flex", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: COLOR.textDim, padding: "8px 0" }}>
            <LogOut size={15} />
          </button>
        )}
      </div>
    </>
  );

  return (
    <IntegrationContext.Provider value={integrationValue}>
    <div className="app-shell" style={{ background: COLOR.bg, color: COLOR.text, fontFamily: FONT_BODY, display: "flex", overflow: "hidden" }}>
      <FontLoader />

      {/* MENU LATERAL: no celular vira uma gaveta (posição fixa, desliza por
          cima do conteúdo, com um fundo escurecido atrás pra fechar ao
          tocar fora); no desktop fica sempre visível, só mudando de largura
          (236px expandido / 64px recolhido, só ícones) */}
      {isMobile ? (
        <>
          {/* Fundo escurecido atrás da gaveta, clicar nele fecha o menu */}
          {sidebarOpen && (
            <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,15,20,.45)", zIndex: 55 }} />
          )}
          <div style={{
            position: "fixed", top: 0, bottom: 0, left: 0, width: sidebarWidth, zIndex: 60,
            background: COLOR.panel, borderRight: `1px solid ${COLOR.line}`, display: "flex", flexDirection: "column",
            transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)", transition: "transform .22s ease",
          }}>
            {sidebarContent}
          </div>
        </>
      ) : (
        <div style={{
          width: sidebarWidth, borderRight: `1px solid ${COLOR.line}`, display: "flex", flexDirection: "column",
          flexShrink: 0, background: COLOR.panel, transition: "width .18s ease", overflow: "hidden",
        }}>
          {sidebarContent}
        </div>
      )}

      {/* Main column */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 }}>
        {/* Top status bar */}
        <div style={{
          minHeight: 52, borderBottom: `1px solid ${COLOR.line}`, display: "flex", alignItems: "center", flexWrap: "wrap",
          justifyContent: "space-between", gap: 8, padding: "10px 16px", flexShrink: 0, background: COLOR.panel,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              title="Mostrar/ocultar menu"
              style={{ background: COLOR.panelAlt, border: `1px solid ${COLOR.line}`, borderRadius: 4, padding: 6, cursor: "pointer", color: COLOR.textDim, display: "flex" }}
            >
              <Menu size={16} />
            </button>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {NAV.find((n) => n.key === tab)?.label}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: FONT_MONO, fontSize: 11, color: COLOR.textDim, whiteSpace: "nowrap" }}>
              <Clock size={12} /> Sinc.: {fmtShort(lastSync)}
            </div>
            <button
              onClick={toggleOnline}
              title="Simular perda/retorno de conexão"
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 99,
                border: `1px solid ${online ? "#bfe4d1" : "#f0ddb8"}`,
                background: online ? COLOR.greenTint : COLOR.amberTint,
                color: online ? COLOR.green : COLOR.amber, fontFamily: FONT_MONO, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              {online ? <Wifi size={12} /> : <WifiOff size={12} />}
              {online ? "ONLINE" : "OFFLINE"}
            </button>
          </div>
        </div>

        {/* Content roteador simples de abas: só renderiza o componente da
            aba atual (`tab`); as outras nem chegam a ser montadas. */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: isMobile ? 14 : 22 }}>
          {tab === "operacao" && (
            <OperacaoTab online={online} onNovoRegistro={handleNovoRegistro} records={records} />
          )}
          {tab === "dashboard" && (
            <DashboardTab records={records} pending={pending} logs={logs} alerts={alerts} historico={historico} online={online} />
          )}
          {tab === "sync" && (
            <SyncTab online={online} pending={pending} lastSync={lastSync} onSync={handleSincronizarAgora}
              credExpiresAt={credExpiresAt} credHoursLeft={credHoursLeft} />
          )}
          {tab === "api" && <ApiTab online={online} />}
          {tab === "usuarios" && <UsersTab />}
          {tab === "chamados" && <ChamadosTab />}
          {tab === "logs" && <LogsTab logs={logs} />}
        </div>
      </div>
    </div>
    </IntegrationContext.Provider>
  );
}

// OPERAÇÃO DE CAMPO
// Tela onde o técnico registra o trabalho do dia: lê uma "tag" (RFID/NFC via
// botão simulado, ou QR Code por foto/galeria) e preenche um formulário
// simples (tipo de operação, item, quantidade, observação). Ao confirmar,
// chama `onNovoRegistro` (vindo do App). Deixei pro App decidir se o registro
// vai direto "pro servidor" ou pra fila offline, dependendo de `online`.
function OperacaoTab({ online, onNovoRegistro, records }) {
  const [tagLida, setTagLida] = useState(null);
  const [tipo, setTipo] = useState("movimentacao");
  const [itemId, setItemId] = useState(ITENS[0].id);
  const [quantidade, setQuantidade] = useState(1);
  const [obs, setObs] = useState("");
  const [scanning, setScanning] = useState(null);
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  function lerTag(tipoTag) {
    // Simula a leitura de um leitor RFID/NFC de verdade: mostra "LENDO…" por
    // 650ms e depois "encontra" um item aleatório da lista ITENS. Num
    // sistema real, isso seria substituído pela chamada ao hardware/SDK do
    // leitor, sem o setTimeout.
    setScanning(tipoTag);
    setTimeout(() => {
      const item = ITENS[Math.floor(Math.random() * ITENS.length)];
      setTagLida({ tipo: tipoTag, codigo: `${item.id}-${uid()}`, item, imagemUrl: null });
      setItemId(item.id);
      setScanning(null);
    }, 650);
  }

  function lerQrDeImagem(e, origem) {
    // Disparada pelos dois <input type="file"> escondidos (um de galeria,
    // outro de câmera). `origem` diz qual dos dois foi
    // usado, só para exibir na confirmação. Se o usuário cancelar a seleção
    // de arquivo, `file` vem undefined e a função não faz nada.
    const file = e.target.files?.[0];
    e.target.value = ""; // permite escolher o mesmo arquivo de novo depois
    if (!file) return;
    const imagemUrl = URL.createObjectURL(file); // gera uma prévia local da imagem
    setScanning("qr");
    setTimeout(() => {
      // Simulação: em vez de realmente decodificar o QR Code da imagem,
      // sorteia um item, precisaremos trocar por uma biblioteca de leitura de QR
      // (ex.: jsQR) quando for usar de verdade.
      const item = ITENS[Math.floor(Math.random() * ITENS.length)];
      setTagLida({ tipo: "qr", codigo: `${item.id}-${uid()}`, item, imagemUrl, origem, arquivo: file.name });
      setItemId(item.id);
      setScanning(null);
    }, 750);
  }

  function registrar() {
    const item = ITENS.find((i) => i.id === itemId);
    const opLabel = OPERACOES.find((o) => o.key === tipo).label;
    onNovoRegistro({
      tipo, tipoLabel: opLabel, itemId, itemNome: item.nome, setor: item.setor,
      quantidade, obs, tag: tagLida?.codigo || "manual", // "manual" se nenhuma tag foi lida
    });
    setObs(""); setTagLida(null); setQuantidade(1);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18, alignItems: "start" }}>
      <Panel accent={COLOR.red}>
        <SectionTitle icon={ScanLine} title="Leitura de identificação" sub="RFID / NFC no leitor, ou QR Code por imagem" />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          {TAG_TYPES.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => lerTag(t.key)} style={{
                flex: "1 1 90px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 8px",
                borderRadius: 4, border: `1px solid ${COLOR.line}`, background: COLOR.panelAlt, color: COLOR.text, cursor: "pointer",
              }}>
                <Icon size={18} color={scanning === t.key ? COLOR.red : COLOR.textDim} />
                <span style={{ fontFamily: FONT_MONO, fontSize: 10.5 }}>{scanning === t.key ? "LENDO…" : t.label}</span>
              </button>
            );
          })}
          <button onClick={() => galleryInputRef.current?.click()} style={{
            flex: "1 1 90px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 8px",
            borderRadius: 4, border: `1px solid ${COLOR.line}`, background: COLOR.panelAlt, color: COLOR.text, cursor: "pointer",
          }}>
            <ImageIcon size={18} color={scanning === "qr" ? COLOR.red : COLOR.textDim} />
            <span style={{ fontFamily: FONT_MONO, fontSize: 10.5, textAlign: "center" }}>{scanning === "qr" ? "LENDO…" : "QR · Galeria/Upload"}</span>
          </button>
          <button onClick={() => cameraInputRef.current?.click()} style={{
            flex: "1 1 90px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 8px",
            borderRadius: 4, border: `1px solid ${COLOR.line}`, background: COLOR.panelAlt, color: COLOR.text, cursor: "pointer",
          }}>
            <Camera size={18} color={scanning === "qr" ? COLOR.red : COLOR.textDim} />
            <span style={{ fontFamily: FONT_MONO, fontSize: 10.5, textAlign: "center" }}>{scanning === "qr" ? "LENDO…" : "QR · Câmera"}</span>
          </button>
          <input ref={galleryInputRef} type="file" accept="image/*" onChange={(e) => lerQrDeImagem(e, "galeria")} style={{ display: "none" }} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={(e) => lerQrDeImagem(e, "camera")} style={{ display: "none" }} />
        </div>
        <div style={{ fontSize: 10.5, color: COLOR.textFaint, marginBottom: 16 }}>
          "QR · Câmera" abre a câmera direto no celular; no computador, ambos os botões abrem o seletor de arquivos.
        </div>

        {tagLida ? (
          <div style={{ animation: "slide-in .2s ease", background: COLOR.greenTint, border: "1px solid #bfe4d1", borderRadius: 4, padding: "10px 12px", marginBottom: 16, display: "flex", gap: 10, alignItems: "center" }}>
            {tagLida.imagemUrl && (
              <img src={tagLida.imagemUrl} alt="Imagem do QR lido" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4, border: `1px solid ${COLOR.line}`, flexShrink: 0 }} />
            )}
            {!tagLida.imagemUrl && <CheckCircle2 size={15} color={COLOR.green} style={{ flexShrink: 0 }} />}
            <div style={{ fontSize: 12.5 }}>
              Tag <span style={{ fontFamily: FONT_MONO, color: COLOR.green }}>{tagLida.codigo}</span> lida — {tagLida.item.nome}
              {tagLida.arquivo && <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: COLOR.textFaint, marginTop: 2 }}>via {tagLida.origem === "camera" ? "câmera" : "galeria/upload"} · {tagLida.arquivo}</div>}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: COLOR.textFaint, marginBottom: 16 }}>Nenhuma tag lida ainda — pode preencher manualmente abaixo.</div>
        )}

        <SectionTitle icon={ClipboardList} title="Registro do setor logístico" style={{ marginTop: 4 }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          {OPERACOES.map((o) => {
            const Icon = o.icon;
            const sel = tipo === o.key;
            return (
              <button key={o.key} onClick={() => setTipo(o.key)} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "7px 11px", borderRadius: 99,
                border: `1px solid ${sel ? COLOR.red : COLOR.line}`, background: sel ? COLOR.redTint : "transparent",
                color: sel ? COLOR.red : COLOR.textDim, fontSize: 12, cursor: "pointer",
              }}>
                <Icon size={13} />{o.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 10, marginBottom: 10 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Label>ITEM</Label>
            <select value={itemId} onChange={(e) => setItemId(e.target.value)} style={selectStyle}>
              {ITENS.map((i) => <option key={i.id} value={i.id}>{i.nome} · {i.id}</option>)}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Label>QTD.</Label>
            <input type="number" min={1} value={quantidade} onChange={(e) => setQuantidade(e.target.value)} style={{ ...selectStyle, fontFamily: FONT_MONO }} />
          </label>
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
          <Label>OBSERVAÇÃO {tipo === "ocorrencia" ? "(descreva a falha/dano)" : "(opcional)"}</Label>
          <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} style={{ ...selectStyle, resize: "vertical", fontFamily: FONT_BODY }} />
        </label>

        <Btn onClick={registrar} full>
          {online ? <Wifi size={14} /> : <WifiOff size={14} />}
          {online ? "Enviar registro para o servidor" : "Salvar em cache local (modo offline)"}
        </Btn>
      </Panel>

      <Panel>
        <SectionTitle icon={Package} title="Últimos registros desta sessão" />
        {records.length === 0 ? (
          <EmptyState text="Nenhum registro nesta sessão ainda. Leia uma tag e registre a primeira movimentação." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 520, overflowY: "auto" }}>
            {records.map((r) => (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "9px 11px", background: COLOR.panelAlt, borderRadius: 4, border: `1px solid ${COLOR.line}` }}>
                <div>
                  <div style={{ fontSize: 12.5 }}>{r.tipoLabel} · {r.itemNome}</div>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: COLOR.textDim }}>{r.setor} · qtd {r.quantidade} · {fmtShort(r.time)}</div>
                </div>
                <span style={{ fontFamily: FONT_MONO, fontSize: 9.5, color: COLOR.textFaint, alignSelf: "center" }}>{r.tag}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

// COMPONENTES AUXILIARES REUTILIZÁVEIS
// Usados em quase todas as abas a partir daqui: `selectStyle` é o estilo
// compartilhado de inputs/selects/textareas; SectionTitle é o
// título com ícone que abre cada bloco dentro de um Panel; EmptyState é a
// mensagem cinza mostrada quando uma lista/tabela ainda não tem nada.
const selectStyle = {
  background: COLOR.panelAlt, border: `1px solid ${COLOR.line}`, borderRadius: 4,
  padding: "8px 10px", color: COLOR.text, fontSize: 13, outline: "none",
};

function SectionTitle({ icon: Icon, title, sub, style }) {
  return (
    <div style={{ marginBottom: 12, ...style }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Icon size={15} color={COLOR.red} />
        <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 13.5 }}>{title}</span>
      </div>
      {sub && <div style={{ fontSize: 11.5, color: COLOR.textFaint, marginTop: 3, marginLeft: 23 }}>{sub}</div>}
    </div>
  );
}

function EmptyState({ text }) {
  return <div style={{ fontSize: 12.5, color: COLOR.textFaint, padding: "18px 4px" }}>{text}</div>;
}

// PAINEL DE MONITORAMENTO (DASHBOARD)
// Tela com os números-resumo (KPIs), o gráfico de movimentações dos últimos
// 7 dias, o status simulado dos serviços (front-end/back-end/banco/fila) e
// os alertas. `showData` controla se o modal com as tabelas de dados
// mockados (DataModal, mais abaixo) está aberto.
function DashboardTab({ records, pending, logs, alerts, historico, online }) {
  const [showData, setShowData] = useState(false);
  const ocorrencias = records.filter((r) => r.tipo === "ocorrencia").length;
  // Cada KPI usa uma cor de destaque diferente; nos dois últimos, a cor só
  // fica "chamativa" (vermelho/âmbar) quando o valor é maior que zero, se
  // não houver ocorrências ou pendências, fica cinza neutro.
  const kpis = [
    { label: "Movimentações (sessão)", value: records.filter((r) => r.tipo === "movimentacao").length, icon: ArrowRightLeft, accent: COLOR.blue },
    { label: "Registros de inventário", value: records.filter((r) => r.tipo === "inventario").length, icon: Boxes, accent: COLOR.green },
    { label: "Ocorrências abertas", value: ocorrencias, icon: AlertTriangle, accent: ocorrencias ? COLOR.red : COLOR.textFaint },
    { label: "Pendentes de sincronização", value: pending.length, icon: RefreshCw, accent: pending.length ? COLOR.amber : COLOR.textFaint },
  ];

  // Status simulado dos "serviços" do sistema. Só o Back-end/API e a Fila de
  // sincronização reagem de verdade ao estado do app (online/offline e
  // quantidade pendente); Front-end e Banco de dados ficam sempre "ok" neste
  // protótipo, porque não há como checá-los de verdade sem um backend.
  const services = [
    { label: "Front-end (App / Site)", status: "ok", detail: "PWA + Android respondendo" },
    { label: "Back-end / API", status: online ? "ok" : "warn", detail: online ? "Latência normal" : "Sem contato — usando cache local" },
    { label: "Banco de dados (Firebase)", status: "ok", detail: "Replicação em dia" },
    { label: "Fila de sincronização", status: pending.length > 0 ? "warn" : "ok", detail: `${pending.length} registro(s) na fila` },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Btn variant="ghost" small onClick={() => setShowData(true)}>
          <Table2 size={14} /> Ver tabelas de dados mockados
        </Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Panel key={k.label} accent={k.accent}>
              <Icon size={16} color={k.accent} />
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 700, marginTop: 10 }}>{k.value}</div>
              <div style={{ fontSize: 11.5, color: COLOR.textDim, marginTop: 2 }}>{k.label}</div>
            </Panel>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18, alignItems: "start" }}>
        <Panel>
          <SectionTitle icon={LayoutDashboard} title="Movimentações · últimos 7 dias" sub="Passe o mouse nas barras para ver o valor, ou abra a base completa acima" />
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={historico} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={COLOR.line} vertical={false} />
                <XAxis dataKey="dia" stroke={COLOR.textFaint} fontSize={11} tickLine={false} axisLine={{ stroke: COLOR.line }} />
                <YAxis stroke={COLOR.textFaint} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: COLOR.panel, border: `1px solid ${COLOR.line}`, borderRadius: 4, fontSize: 12 }} labelStyle={{ color: COLOR.text }} />
                <Bar dataKey="movimentacoes" radius={[2, 2, 0, 0]}>
                  {historico.map((_, i) => <Cell key={i} fill={COLOR.red} fillOpacity={0.5 + (i / historico.length) * 0.5} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <SectionTitle icon={Server} title="Status dos serviços" />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {services.map((s) => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <SignalDot status={s.status} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5 }}>{s.label}</div>
                  <div style={{ fontSize: 10.5, color: COLOR.textFaint }}>{s.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel>
        <SectionTitle icon={Bell} title="Alertas e notificações" />
        {alerts.length === 0 ? <EmptyState text="Sem alertas no momento." /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {alerts.map((a) => (
              <div key={a.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "9px 11px", background: COLOR.panelAlt, borderRadius: 4, border: `1px solid ${COLOR.line}` }}>
                {a.level === "warn" ? <AlertTriangle size={14} color={COLOR.amber} style={{ marginTop: 1 }} /> : <CheckCircle2 size={14} color={COLOR.green} style={{ marginTop: 1 }} />}
                <div style={{ flex: 1, fontSize: 12.5 }}>{a.text}</div>
                <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: COLOR.textFaint }}>{fmtShort(a.time)}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {showData && <DataModal onClose={() => setShowData(false)} records={records} pending={pending} logs={logs} historico={historico} />}
    </div>
  );
}

// MODAL DE DADOS MOCKADOS
// Janela sobreposta (fundo escurecido + caixa branca) que mostra, em forma
// de tabela, os dados fictícios que alimentam o Dashboard: a base do
// gráfico, os itens de estoque cadastrados, os registros já lançados, a
// fila pendente e os logs. `tab` controla qual dessas tabelas está visível.
function DataModal({ onClose, records, pending, logs, historico }) {
  const [tab, setTab] = useState("grafico");
  const tabs = [
    { key: "grafico", label: "Base do gráfico" },
    { key: "itens", label: "Itens de estoque" },
    { key: "registros", label: `Registros (${records.length})` },
    { key: "pendencias", label: `Pendências (${pending.length})` },
    { key: "logs", label: `Logs (${logs.length})` },
  ];

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(20,20,25,.55)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 50, animation: "fade-in .15s ease", padding: 20,
    }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: COLOR.panel, borderRadius: 6, width: "min(880px, 100%)", maxHeight: "82vh", display: "flex", flexDirection: "column", overflow: "hidden", border: `1px solid ${COLOR.line}` }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${COLOR.line}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Table2 size={15} color={COLOR.red} />
            <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 14 }}>Dados mockados desta sessão</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: COLOR.textDim }}><X size={18} /></button>
        </div>

        <div style={{ display: "flex", gap: 6, padding: "10px 18px 0" }}>
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: "7px 12px", borderRadius: "4px 4px 0 0", border: "none", cursor: "pointer",
              background: tab === t.key ? COLOR.panelAlt : "transparent",
              borderBottom: tab === t.key ? `2px solid ${COLOR.red}` : "2px solid transparent",
              color: tab === t.key ? COLOR.red : COLOR.textDim, fontSize: 12, fontFamily: FONT_MONO,
            }}>{t.label}</button>
          ))}
        </div>

        <div style={{ padding: 18, overflowY: "auto" }}>
          {tab === "grafico" && (
            <DataTable
              cols={["Dia", "Movimentações"]}
              rows={historico.map((h) => [h.dia, h.movimentacoes])}
              empty="Sem dados gerados para o gráfico."
            />
          )}
          {tab === "itens" && (
            <DataTable
              cols={["ID", "Item", "Setor"]}
              rows={ITENS.map((i) => [i.id, i.nome, i.setor])}
              empty="Sem itens cadastrados."
            />
          )}
          {tab === "registros" && (
            <DataTable
              cols={["Tipo", "Item", "Setor", "Qtd.", "Tag", "Horário"]}
              rows={records.map((r) => [r.tipoLabel, r.itemNome, r.setor, r.quantidade, r.tag, fmtTime(r.time)])}
              empty="Nenhum registro criado ainda — vá em Operação de Campo."
            />
          )}
          {tab === "pendencias" && (
            <DataTable
              cols={["Tipo", "Item", "Setor", "Qtd.", "Horário"]}
              rows={pending.map((r) => [r.tipoLabel, r.itemNome, r.setor, r.quantidade, fmtTime(r.time)])}
              empty="Nenhum registro pendente de sincronização."
            />
          )}
          {tab === "logs" && (
            <DataTable
              cols={["Ação", "Ator", "Status", "Horário"]}
              rows={logs.map((l) => [l.acao, l.ator, l.status, fmtTime(l.time)])}
              empty="Nenhum log registrado ainda."
            />
          )}
        </div>
      </div>
    </div>
  );
}

function DataTable({ cols, rows, empty }) {
  if (rows.length === 0) return <EmptyState text={empty} />;
  return (
    <div style={{ overflowX: "auto" }}>
      <table>
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c} style={{ textAlign: "left", fontFamily: FONT_MONO, fontSize: 10.5, color: COLOR.textDim, padding: "6px 10px", borderBottom: `1px solid ${COLOR.line}`, whiteSpace: "nowrap" }}>{c.toUpperCase()}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 ? COLOR.panelAlt : "transparent" }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: "7px 10px", fontSize: 12.5, borderBottom: `1px solid ${COLOR.line}`, whiteSpace: "nowrap" }}>{String(cell)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// APIs
// Aba de configuração da conexão com o backend real: URL base, ambiente e
// a chave de API (mascarada por padrão, com opção de revelar). Os valores
// vêm do IntegrationContext (lá no topo do arquivo), então ficam
// disponíveis também para a aba de Usuários (convite por e-mail). O botão
// "Testar conexão" é só uma simulação, reflete o indicador
// online/offline do topo da tela, não faz nenhuma chamada de rede de verdade.
function ApiTab({ online }) {
  const { baseUrl, setBaseUrl, apiKey, setApiKey } = React.useContext(IntegrationContext);
  const [ambiente, setAmbiente] = useState("homologacao");
  const [testando, setTestando] = useState(false);
  const [resultado, setResultado] = useState(null); // null | "ok" | "erro"
  const [copiado, setCopiado] = useState(false);
  const [mostrarChave, setMostrarChave] = useState(false);

  function testarConexao() {
    setTestando(true);
    setResultado(null);
    setTimeout(() => {
      setTestando(false);
      // Simulação: usa o mesmo indicador online/offline do topo da tela
      // como se fosse o resultado de um teste de rede de verdade.
      setResultado(online ? "ok" : "erro");
    }, 900);
  }

  function copiarUrl() {
    navigator.clipboard?.writeText(baseUrl).catch(() => {});
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18, alignItems: "start" }}>
        <Panel accent={resultado === "erro" ? COLOR.red : resultado === "ok" ? COLOR.green : COLOR.blue}>
          <SectionTitle icon={Plug} title="Configuração da conexão" sub="Estes campos ainda não estão ligados a nenhum backend real — são o ponto onde a integração entra depois" />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label>URL BASE DA API</Label>
              <div style={{ display: "flex", gap: 6 }}>
                <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} style={{ ...selectStyle, flex: 1, fontFamily: FONT_MONO, fontSize: 12 }} />
                <button onClick={copiarUrl} title="Copiar" style={{ background: COLOR.panelAlt, border: `1px solid ${COLOR.line}`, borderRadius: 4, padding: "0 10px", cursor: "pointer", color: COLOR.textDim }}>
                  <Copy size={14} />
                </button>
              </div>
              {copiado && <span style={{ fontSize: 10.5, color: COLOR.green }}>copiado</span>}
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label>AMBIENTE</Label>
              <select value={ambiente} onChange={(e) => setAmbiente(e.target.value)} style={selectStyle}>
                <option value="local">Local (desenvolvimento)</option>
                <option value="homologacao">Homologação</option>
                <option value="producao">Produção</option>
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label>CLIENT ID / API KEY</Label>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type={mostrarChave ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="cole aqui a chave gerada pelo backend"
                  style={{ ...selectStyle, flex: 1, fontFamily: FONT_MONO, fontSize: 12 }}
                  autoComplete="off"
                />
                <button onClick={() => setMostrarChave((v) => !v)} title={mostrarChave ? "Ocultar" : "Mostrar"} style={{ background: COLOR.panelAlt, border: `1px solid ${COLOR.line}`, borderRadius: 4, padding: "0 10px", cursor: "pointer", color: COLOR.textDim }}>
                  {mostrarChave ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <span style={{ fontSize: 10.5, color: COLOR.textFaint }}>
                Fica só na memória desta aba (não é salva em lugar nenhum). Nunca cole aqui uma chave real de produção antes de o backend existir — e nunca a comite no GitHub.
              </span>
            </label>

            <Btn onClick={testarConexao}>
              {testando ? <Loader2 size={14} className="spin" /> : <Plug size={14} />}
              {testando ? "Testando…" : "Testar conexão"}
            </Btn>

            {resultado === "ok" && (
              <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: COLOR.green }}>
                <CheckCircle2 size={14} /> Conexão simulada com sucesso — pronta para receber o backend real.
              </div>
            )}
            {resultado === "erro" && (
              <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: COLOR.red }}>
                <AlertTriangle size={14} /> Sem conexão (modo offline ativo) — desative o offline no topo para simular sucesso.
              </div>
            )}
          </div>
        </Panel>

        <Panel>
          <SectionTitle icon={Server} title="Como plugar o backend" />
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: COLOR.textDim, lineHeight: 1.9 }}>
            <li>Suba a API (Firebase Functions, Node, Python/Flask ou Java/Spring) — nunca sirva segredos direto do front-end.</li>
            <li>Preencha a URL base e a chave acima só para testes locais.</li>
            <li>Troque as funções <code style={{ fontFamily: FONT_MONO, background: COLOR.panelAlt, padding: "1px 5px", borderRadius: 3 }}>handleNovoRegistro</code> e <code style={{ fontFamily: FONT_MONO, background: COLOR.panelAlt, padding: "1px 5px", borderRadius: 3 }}>handleSincronizarAgora</code>, em <code style={{ fontFamily: FONT_MONO, background: COLOR.panelAlt, padding: "1px 5px", borderRadius: 3 }}>App.jsx</code>, por chamadas <code style={{ fontFamily: FONT_MONO, background: COLOR.panelAlt, padding: "1px 5px", borderRadius: 3 }}>fetch</code> para os endpoints ao lado.</li>
            <li>O restante da interface (telas, estados de loading, fila offline) já está pronto e não precisa mudar.</li>
          </ol>
        </Panel>
      </div>

      <Panel>
        <SectionTitle icon={ClipboardList} title="Endpoints previstos" sub="Mapeados a partir do fluxograma do projeto (bloco API / Regras de Negócio)" />
        <DataTable
          cols={["Método", "Rota", "Descrição"]}
          rows={ENDPOINTS.map((e) => [e.method, baseUrl.replace(/\/$/, "") + e.path, e.desc])}
          empty="Nenhum endpoint definido."
        />
      </Panel>
    </div>
  );
}

// USUÁRIOS
// Tudo relacionado à governança de acesso: os 3 papéis do sistema
// (ROLES), a cor de cada papel (roleColor), o convite por e-mail
// (InviteSection) e a tela de cadastro/lista de usuários (UsersTab).
//
// roleColor: encadeamento de condições, Admin é vermelho, Analista é
// azul, e qualquer outro papel (hoje só "Operador") cai no verde do
// `return´ final.
const ROLES = ["Operador", "Analista", "Admin"];

function roleColor(papel) {
  if (papel === "Admin") return { bg: COLOR.redTint, fg: COLOR.red };
  if (papel === "Analista") return { bg: COLOR.blueTint, fg: COLOR.blue };
  return { bg: COLOR.greenTint, fg: COLOR.green };
}

// Expressão regular simples para validar formato de e-mail (algo@algo.algo)
// antes de tentar enviar o convite — não garante que o e-mail existe de
// verdade, só que tem o formato básico esperado.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// USUÁRIOS — convite por e-mail
// Formulário isolado (não é o cadastro direto, coloquei UsersTab abaixo) para
// convidar alguém que ainda não tem conta. `enviarConvite` tenta, nesta
// ordem: 1) mandar pro backend real, se `baseUrl` estiver preenchida;
// 2) se não tiver backend (ou a chamada falhar), abre o e-mail padrão do
// usuário já com o texto pronto, funciona por enquanto sem precisar de domínio
// nem de servidor de e-mail configurado, porém SERIA LEGAL RESULARIZARMOS ISSO
function InviteSection() {
  const { baseUrl } = React.useContext(IntegrationContext);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [papel, setPapel] = useState("Operador");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [convites, setConvites] = useState([]);
  const [copiadoId, setCopiadoId] = useState(null);

  function gerarLinkConvite(token) {
    // Sem domínio definido ainda: cai no endereço atual do navegador.
    // ATENÇÃO Quando o domínio final existir, troque por ele (ou pela URL base da API):
    const origem = typeof window !== "undefined" ? window.location.origin : baseUrl || "https://seu-dominio.exemplo.com";
    return `${origem}/convite/${token}?papel=${encodeURIComponent(papel)}`;
  }

  async function enviarConvite() {
    setErro("");
    if (!nome.trim()) { setErro("Informe o nome da pessoa convidada."); return; }
    if (!EMAIL_RE.test(email.trim())) { setErro("Informe um e-mail válido."); return; }

    const token = uid() + uid();
    const link = gerarLinkConvite(token);
    setEnviando(true);

    // 1) Se um backend real já estiver configurado (aba APIs & Integrações),
    //    tenta enviar por lá. Hoje isso vai falhar (não existe backend ainda)
    //    e cai direto no passo 2, o que é o comportamento esperado por enquanto.
    let enviadoPelaApi = false;
    if (baseUrl) {
      try {
        await fetch(`${baseUrl.replace(/\/$/, "")}/usuarios/convite`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome, email, papel, link }),
        });
        enviadoPelaApi = true;
      } catch {
        enviadoPelaApi = false;
      }
    }

    // 2) Sem backend (ou falhou): abre o cliente de e-mail padrão do usuário
    //    com o convite pronto. Não depende de domínio, servidor de e-mail
    //    ou chave de API nenhuma, por isso funciona hoje, de verdade.
    if (!enviadoPelaApi) {
      const assunto = encodeURIComponent("Convite de acesso — CPTM · Monitoramento Logístico de Armazém");
      const corpo = encodeURIComponent(
        `Olá, ${nome}!\n\nVocê foi convidado(a) a acessar o sistema de Monitoramento Logístico de Armazém da CPTM, com o perfil de ${papel}.\n\nAcesse pelo link abaixo para confirmar seu cadastro:\n${link}\n\nSe você não esperava este convite, pode ignorar esta mensagem.`
      );
      window.open(`mailto:${email.trim()}?subject=${assunto}&body=${corpo}`, "_self");
    }

    setConvites((c) => [{ id: token, nome, email, papel, link, via: enviadoPelaApi ? "api" : "mailto", time: new Date() }, ...c]);
    setEnviando(false);
    setNome(""); setEmail("");
  }

  function copiarLink(id, link) {
    navigator.clipboard?.writeText(link).catch(() => {});
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 1500);
  }

  return (
    <Panel accent={COLOR.blue}>
      <SectionTitle icon={Mail} title="Convidar por e-mail" sub="Sem domínio final definido ainda? Sem problema — o convite abre no seu cliente de e-mail com tudo pronto" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 10 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Label>NOME</Label>
          <input value={nome} onChange={(e) => setNome(e.target.value)} style={selectStyle} placeholder="Nome completo" />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Label>E-MAIL</Label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} style={selectStyle} placeholder="nome@empresa.com" type="email" />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Label>PAPEL</Label>
          <select value={papel} onChange={(e) => setPapel(e.target.value)} style={selectStyle}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
      </div>
      {erro && <div style={{ color: COLOR.red, fontSize: 12, marginBottom: 10 }}>{erro}</div>}
      <Btn onClick={enviarConvite}>
        {enviando ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
        {enviando ? "Preparando…" : "Enviar convite"}
      </Btn>
      <div style={{ fontSize: 10.5, color: COLOR.textFaint, marginTop: 8 }}>
        Hoje o envio abre o e-mail no seu programa padrão (Outlook, Gmail etc.) — funciona em qualquer domínio.
        Quando o backend estiver no ar, preencha a URL na aba <b>APIs & Integrações</b> e o envio passa a ser tentado automaticamente por lá primeiro.
      </div>

      {convites.length > 0 && (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {convites.map((c) => {
            const rc = roleColor(c.papel);
            return (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "9px 11px", background: COLOR.panelAlt, borderRadius: 4, border: `1px solid ${COLOR.line}`, flexWrap: "wrap" }}>
                <div style={{ fontSize: 12.5 }}>
                  {c.nome} <span style={{ color: COLOR.textFaint }}>· {c.email}</span>{" "}
                  <span style={{ fontFamily: FONT_MONO, fontSize: 9.5, padding: "1px 6px", borderRadius: 99, background: rc.bg, color: rc.fg }}>{c.papel.toUpperCase()}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 9.5, color: COLOR.textFaint }}>{c.via === "api" ? "enviado via API" : "aberto no e-mail"} · {fmtShort(c.time)}</span>
                  <button onClick={() => copiarLink(c.id, c.link)} title="Copiar link do convite" style={{ background: "none", border: `1px solid ${COLOR.line}`, borderRadius: 4, padding: "4px 8px", cursor: "pointer", color: COLOR.textDim, display: "flex", alignItems: "center", gap: 4, fontSize: 10.5 }}>
                    <Link2 size={12} /> {copiadoId === c.id ? "copiado" : "copiar link"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

// GOVERNANÇA DE PERFIS: cadastro e lista de usuários
// UsersTab reúne: o formulário de "Adicionar usuário" (cadastro direto, com
// papel já definido na criação), o InviteSection (convite por e-mail) e a
// tabela de usuários existentes, onde o papel de cada um pode ser trocado
// direto no `<select>` da linha, quando a elevação de cargo acontece.
function UsersTab() {
  const [users, setUsers] = useState([
    { id: uid(), nome: "Ana Giulia", usuario: "ana.giulia", papel: "Admin" },
    { id: uid(), nome: "Fernanda Rocha", usuario: "fernanda.rocha", papel: "Operador" },
    { id: uid(), nome: "Marcos Vinícius", usuario: "marcos.vinicius", papel: "Analista" },
  ]);
  const [nome, setNome] = useState("");
  const [usuario, setUsuario] = useState("");
  const [papel, setPapel] = useState("Operador");

  function adicionar() {
    // Condição: exige nome e usuário preenchidos; se qualquer um estiver
    // vazio (só espaços conta como vazio, por causa do `.trim()`), não faz
    // nada não existe validação de usuário duplicado aqui (isso é feito
    // de verdade no backend, ver POST /usuarios).
    if (!nome.trim() || !usuario.trim()) return;
    setUsers((u) => [...u, { id: uid(), nome, usuario, papel }]);
    setNome(""); setUsuario(""); setPapel("Operador");
  }
  // GOVERNANÇA DE PERFIS — troca de papel
  // Percorre a lista de usuários e substitui o `papel` só do usuário com o
  // `id` correspondente, mantendo os demais campos iguais (`...x`) e os
  // outros usuários intocados.
  function mudarPapel(id, novoPapel) {
    setUsers((u) => u.map((x) => (x.id === id ? { ...x, papel: novoPapel } : x)));
  }
  function remover(id) {
    setUsers((u) => u.filter((x) => x.id !== id));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Panel accent={COLOR.red}>
        <SectionTitle icon={Users} title="Adicionar usuário" sub="Cadastro e definição do nível de acesso" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Label>NOME</Label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} style={selectStyle} placeholder="Nome completo" />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Label>USUÁRIO</Label>
            <input value={usuario} onChange={(e) => setUsuario(e.target.value)} style={selectStyle} placeholder="usuario.sobrenome" />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Label>PAPEL</Label>
            <select value={papel} onChange={(e) => setPapel(e.target.value)} style={selectStyle}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
        </div>
        <Btn onClick={adicionar}><Plus size={14} /> Adicionar usuário</Btn>
      </Panel>

      <InviteSection />

      <Panel>
        <SectionTitle icon={ShieldAlert} title="Usuários e níveis de acesso" sub="Operador · Analista · Admin — a elevação de cargo é feita direto na tabela" />
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                {["Nome", "Usuário", "Papel", "Ações"].map((c) => (
                  <th key={c} style={{ textAlign: "left", fontFamily: FONT_MONO, fontSize: 10.5, color: COLOR.textDim, padding: "6px 10px", borderBottom: `1px solid ${COLOR.line}`, whiteSpace: "nowrap" }}>{c.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => {
                const rc = roleColor(u.papel);
                return (
                  <tr key={u.id} style={{ background: i % 2 ? COLOR.panelAlt : "transparent" }}>
                    <td style={{ padding: "7px 10px", fontSize: 12.5, borderBottom: `1px solid ${COLOR.line}`, whiteSpace: "nowrap" }}>{u.nome}</td>
                    <td style={{ padding: "7px 10px", fontSize: 12.5, borderBottom: `1px solid ${COLOR.line}`, fontFamily: FONT_MONO, whiteSpace: "nowrap" }}>{u.usuario}</td>
                    <td style={{ padding: "7px 10px", borderBottom: `1px solid ${COLOR.line}` }}>
                      <select value={u.papel} onChange={(e) => mudarPapel(u.id, e.target.value)} style={{ ...selectStyle, padding: "4px 8px", fontSize: 11.5, background: rc.bg, color: rc.fg, border: `1px solid ${rc.fg}33` }}>
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: "7px 10px", borderBottom: `1px solid ${COLOR.line}` }}>
                      <button onClick={() => remover(u.id)} title="Remover usuário" style={{ background: "none", border: "none", cursor: "pointer", color: COLOR.textFaint, display: "flex" }}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

// CHAMADOS (SUPORTE)
// Tela para abrir e acompanhar chamados de suporte/bug, separada da
// governança de usuários. `priorityColor` é outro encadeamento de
// condições: Alta = vermelho, Média = âmbar, qualquer outra (hoje só
// "Baixa") cai no verde do `return` final.
const PRIORIDADES = ["Baixa", "Média", "Alta"];
const CATEGORIAS = ["Bug / Erro", "Dúvida", "Solicitação de melhoria"];

function priorityColor(p) {
  if (p === "Alta") return COLOR.red;
  if (p === "Média") return COLOR.amber;
  return COLOR.green;
}

function ChamadosTab() {
  const [tickets, setTickets] = useState([
    { id: uid(), titulo: "App trava ao ler QR Code duas vezes seguidas", descricao: "", categoria: "Bug / Erro", prioridade: "Alta", status: "Aberto", autor: TECNICO.nome, time: new Date(Date.now() - 2 * 3600000) },
  ]);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [prioridade, setPrioridade] = useState("Média");

  function abrirChamado() {
    // Condição: exige um título preenchido, descrição, categoria e
    // prioridade têm valores padrão, então não bloqueiam o envio.
    if (!titulo.trim()) return;
    setTickets((t) => [{ id: uid(), titulo, descricao, categoria, prioridade, status: "Aberto", autor: TECNICO.nome, time: new Date() }, ...t]);
    setTitulo(""); setDescricao(""); setCategoria(CATEGORIAS[0]); setPrioridade("Média");
  }
  function resolver(id) {
    // Troca só o `status` do chamado com esse id para "Resolvido"
    // mesmo padrão de atualização usado em mudarPapel (Usuários).
    setTickets((t) => t.map((x) => (x.id === id ? { ...x, status: "Resolvido" } : x)));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Panel accent={COLOR.red}>
        <SectionTitle icon={LifeBuoy} title="Abrir chamado" sub="Encontrou um erro ou tem uma dúvida sobre o sistema? Registre aqui" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 10 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: "1 / -1" }}>
            <Label>TÍTULO</Label>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} style={selectStyle} placeholder="Resuma o problema em uma frase" />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Label>CATEGORIA</Label>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)} style={selectStyle}>
              {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Label>PRIORIDADE</Label>
            <select value={prioridade} onChange={(e) => setPrioridade(e.target.value)} style={selectStyle}>
              {PRIORIDADES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
          <Label>DESCRIÇÃO</Label>
          <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} style={{ ...selectStyle, resize: "vertical", fontFamily: FONT_BODY }} placeholder="O que aconteceu, em que tela, e o que você esperava que acontecesse" />
        </label>
        <Btn onClick={abrirChamado}><Send size={14} /> Abrir chamado</Btn>
      </Panel>

      <Panel>
        <SectionTitle icon={ClipboardList} title="Chamados" />
        {tickets.length === 0 ? <EmptyState text="Nenhum chamado registrado." /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {tickets.map((t) => (
              <div key={t.id} style={{ padding: "10px 12px", background: COLOR.panelAlt, borderRadius: 4, border: `1px solid ${COLOR.line}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{t.titulo}</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                    <span style={{ fontFamily: FONT_MONO, fontSize: 9.5, padding: "2px 7px", borderRadius: 99, background: `${priorityColor(t.prioridade)}22`, color: priorityColor(t.prioridade) }}>{t.prioridade.toUpperCase()}</span>
                    <span style={{ fontFamily: FONT_MONO, fontSize: 9.5, padding: "2px 7px", borderRadius: 99, background: t.status === "Resolvido" ? COLOR.greenTint : COLOR.amberTint, color: t.status === "Resolvido" ? COLOR.green : COLOR.amber }}>{t.status.toUpperCase()}</span>
                  </div>
                </div>
                {t.descricao && <div style={{ fontSize: 12, color: COLOR.textDim, marginTop: 6 }}>{t.descricao}</div>}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, flexWrap: "wrap", gap: 6 }}>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: COLOR.textFaint }}>{t.categoria} · {t.autor} · {fmtShort(t.time)}</span>
                  {t.status !== "Resolvido" && <Btn small variant="ghost" onClick={() => resolver(t.id)}>Marcar como resolvido</Btn>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

// SINCRONIZAÇÃO
// Tela com 3 blocos: 1) status online/desatualizado e o botão de
// sincronizar manualmente; 2) o "cronômetro" de validade das credenciais
// offline (48h, com barra de progresso que fica vermelha faltando pouco);
// 3) a lista de registros ainda não sincronizados. `credWarn` fica `true`
// quando faltam menos de 6 horas para expirar, é o que muda a cor de
// aviso para vermelho em vez de azul.
function SyncTab({ online, pending, lastSync, onSync, credExpiresAt, credHoursLeft }) {
  const credWarn = credHoursLeft < 6;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18, alignItems: "start" }}>
      <Panel accent={online ? COLOR.green : COLOR.amber}>
        <SectionTitle icon={online ? Wifi : WifiOff} title={online ? "Conexão restabelecida" : "Modo offline ativo"}
          sub={online ? "Envio direto via API para o banco de dados" : "Dados armazenados localmente com credenciais em cache (48h)"} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 8 }}>
          <span style={{ color: COLOR.textDim }}>Última atualização</span>
          <span style={{ fontFamily: FONT_MONO }}>{fmtTime(lastSync)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 16 }}>
          <span style={{ color: COLOR.textDim }}>Status</span>
          <span style={{ fontFamily: FONT_MONO, color: pending.length ? COLOR.amber : COLOR.green }}>
            {pending.length ? "DESATUALIZADO" : "ATUALIZADO"}
          </span>
        </div>
        <Btn full onClick={onSync}>
          <RefreshCw size={14} /> Sincronizar agora {pending.length > 0 && `(${pending.length})`}
        </Btn>
        {!online && <div style={{ fontSize: 11, color: COLOR.textFaint, marginTop: 8 }}>Disponível assim que a conexão for restabelecida — use o indicador ONLINE/OFFLINE no topo para simular.</div>}
      </Panel>

      <Panel accent={credWarn ? COLOR.red : COLOR.blue}>
        <SectionTitle icon={KeyRound} title="Credenciais de sessão" sub="Client ID + Client Secret · validade 48h" />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 8 }}>
          <span style={{ color: COLOR.textDim }}>Expira em</span>
          <span style={{ fontFamily: FONT_MONO, color: credWarn ? COLOR.red : COLOR.text }}>{credExpiresAt.toLocaleString("pt-BR")}</span>
        </div>
        <div style={{ height: 6, background: COLOR.panelAlt, borderRadius: 99, overflow: "hidden", marginBottom: 10 }}>
          <div style={{ height: "100%", width: `${Math.min(100, (credHoursLeft / 48) * 100)}%`, background: credWarn ? COLOR.red : COLOR.blue, transition: "width .4s" }} />
        </div>
        <div style={{ fontSize: 11, color: COLOR.textFaint }}>
          {credWarn ? "Credenciais próximas do vencimento — reautentique-se em breve." : "Válidas para uso contínuo em modo offline."}
        </div>
      </Panel>

      <Panel style={{ gridColumn: "1 / -1" }}>
        <SectionTitle icon={ClipboardList} title="Fila de sincronização pendente" />
        {pending.length === 0 ? <EmptyState text="Nenhum registro pendente — tudo sincronizado." /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {pending.map((p) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "9px 11px", background: COLOR.panelAlt, borderRadius: 4, border: `1px solid ${COLOR.line}` }}>
                <span style={{ fontSize: 12.5 }}>{p.tipoLabel} · {p.itemNome}</span>
                <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: COLOR.amber }}>aguardando envio</span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

// LOGS
// Lista simples de auditoria: cada ação relevante do app (login, registro
// criado, sincronização, convite, troca de papel...) é empilhada em `logs`
// (guardado no App) e exibida aqui, mais recente primeiro. O ícone muda
// conforme `status` do log ("warn" = alerta âmbar, qualquer outro = check
// verde) e a última linha da lista não recebe borda inferior (o
// `i < logs.length - 1` evita a borda "sobrando" depois do último item).
function LogsTab({ logs }) {
  return (
    <Panel>
      <SectionTitle icon={ClipboardList} title="Logs e auditoria" sub="Ações registradas nesta sessão, mais recentes primeiro" />
      {logs.length === 0 ? <EmptyState text="Nenhum evento registrado ainda." /> : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {logs.map((l, i) => (
            <div key={l.id} style={{ display: "flex", gap: 12, padding: "9px 4px", borderBottom: i < logs.length - 1 ? `1px solid ${COLOR.line}` : "none", alignItems: "flex-start" }}>
              {l.status === "warn" ? <AlertTriangle size={13} color={COLOR.amber} style={{ marginTop: 2 }} /> : <CheckCircle2 size={13} color={COLOR.green} style={{ marginTop: 2 }} />}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5 }}>{l.acao}</div>
                <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: COLOR.textFaint }}>{l.ator}</div>
              </div>
              <span style={{ fontFamily: FONT_MONO, fontSize: 10.5, color: COLOR.textDim }}>{fmtTime(l.time)}</span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
