import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Controle de Faturamento — Grupo Fcamara" },
      { name: "description", content: "Controle de faturamento por analista, empresa e PEP." },
    ],
  }),
  component: App,
});

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const APP_VERSION = "v1.0";
const LS_KEY = "fcamara_billing_v1";

const EMPRESAS = [
  { cod: "BR02", nome: "Fcamara" },
  { cod: "BR04", nome: "Nação Digital" },
  { cod: "BR05", nome: "SGA" },
  { cod: "BR07", nome: "FC Hyperautomation" },
  { cod: "BR08", nome: "Dojo" },
  { cod: "BR09", nome: "Nextgeneration" },
];

const TIPOS_PROJETO = ["Time & Expenses", "Fee", "WIP", "Usage Based"];

const STEPS = [
  { id: "p1_extrair",       group: 1, label: "Passo 1",  name: "Extrair dados (FC Team)",     type: "check" },
  { id: "p2_racional",      group: 2, label: "Passo 2",  name: "Montar Racional",             type: "check" },
  { id: "p3_envio_com",     group: 3, label: "Passo 3a", name: "Envio ao Comercial",          type: "check" },
  { id: "p3_retorno_com",   group: 3, label: "Passo 3b", name: "Retorno do Comercial",        type: "check" },
  { id: "p3_data_retorno",  group: 3, label: "Passo 3c", name: "Data Retorno",                type: "date"  },
  { id: "p4_envio_cli",     group: 4, label: "Passo 4a", name: "Envio ao Cliente",            type: "check" },
  { id: "p4_aprovacao",     group: 4, label: "Passo 4b", name: "Aprovação do Cliente",        type: "check" },
  { id: "p4_data_aprov",    group: 4, label: "Passo 4c", name: "Data Aprovação",              type: "date"  },
  { id: "p5_nf",            group: 5, label: "Passo 5a", name: "NF Emitida?",                 type: "check" },
  { id: "p5_data_nf",       group: 5, label: "Passo 5b", name: "Data Emissão NF",             type: "date"  },
  { id: "p5_no_corte",      group: 5, label: "Passo 5c", name: "Dentro do Corte?",            type: "check" },
];

const SAMPLE_RECORDS = [
  { responsavel:"Fernanda", empresa:"BR02", tipo:"Time & Expenses", codCliente:"1002351", cliente:"Banco ABC Brasil S.A.", pep:"BR02CLP00005.1.1", inicio:"01/05/2026", fim:"31/05/2026", profissional:"Bruna Paz Amorim", valorVenda:192.5, hrsAprovadas:160, valorTotal:30800, valorLiquido:11774.70, competencia:"05/2026" },
  { responsavel:"Fernanda", empresa:"BR02", tipo:"Time & Expenses", codCliente:"1002351", cliente:"Banco ABC Brasil S.A.", pep:"BR02CLP00005.1.1", inicio:"01/05/2026", fim:"31/05/2026", profissional:"Gilliard Costa Santos", valorVenda:145.2, hrsAprovadas:156, valorTotal:22651.20, valorLiquido:21167.55, competencia:"05/2026" },
  { responsavel:"Fernanda", empresa:"BR02", tipo:"Time & Expenses", codCliente:"1002840", cliente:"Banco BS2 S.A.", pep:"BR02CLP00100.1.1", inicio:"01/05/2026", fim:"31/05/2026", profissional:"Emerson França", valorVenda:217, hrsAprovadas:160, valorTotal:34720, valorLiquido:32445.84, competencia:"05/2026" },
  { responsavel:"Fernanda", empresa:"BR02", tipo:"Time & Expenses", codCliente:"1002342", cliente:"Banco Digio S.A.", pep:"BR02CLP00007.1.1", inicio:"01/05/2026", fim:"31/05/2026", profissional:"Tamiris Ferreira", valorVenda:202.14, hrsAprovadas:168, valorTotal:33959.52, valorLiquido:31735.17, competencia:"05/2026" },
  { responsavel:"Layza Arruda", empresa:"BR02", tipo:"Time & Expenses", codCliente:"1002100", cliente:"Diagnósticos da América S.A.", pep:"BR02CLP00041", inicio:"01/05/2026", fim:"31/05/2026", profissional:"Adriano Silva Gama", valorVenda:135, hrsAprovadas:168, valorTotal:22680, valorLiquido:21194.46, competencia:"05/2026" },
  { responsavel:"Layza Arruda", empresa:"BR02", tipo:"Time & Expenses", codCliente:"1002100", cliente:"Diagnósticos da América S.A.", pep:"BR02CLP00041", inicio:"01/05/2026", fim:"31/05/2026", profissional:"Bruno Eduardo Ferreira", valorVenda:100, hrsAprovadas:168, valorTotal:16800, valorLiquido:15699.60, competencia:"05/2026" },
  { responsavel:"Layza Arruda", empresa:"BR02", tipo:"Time & Expenses", codCliente:"1002214", cliente:"Dr. Consulta Centro Médico", pep:"BR02CLP00022.1.1", inicio:"01/05/2026", fim:"31/05/2026", profissional:"Adriano Costa Andrade", valorVenda:142, hrsAprovadas:168, valorTotal:23856, valorLiquido:22293.43, competencia:"05/2026" },
  { responsavel:"Layza Arruda", empresa:"BR02", tipo:"Time & Expenses", codCliente:"1002418", cliente:"Grupo Casas Bahia S.A.", pep:"BR02CLP00042.0.3", inicio:"01/05/2026", fim:"31/05/2026", profissional:"Abel de Meira Junior", valorVenda:172.29, hrsAprovadas:168, valorTotal:28944.72, valorLiquido:27048.84, competencia:"05/2026" },
];

const fmt = (n: any) => n == null ? "—" : "R$ " + Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtShort = (n: any) => n == null ? "—" : "R$ " + Math.round(n).toLocaleString("pt-BR");

function genId() { return "r" + Date.now() + Math.random().toString(36).slice(2, 7); }

function makeProgress(): any {
  return Object.fromEntries(STEPS.map(s => [s.id, s.type === "date" ? "" : false]));
}

function calcStatus(prog: any) {
  if (!prog) return "Não iniciado";
  if (prog.p5_no_corte) return "✅ Faturado dentro do corte";
  if (prog.p5_nf) return "🧾 NF emitida";
  if (prog.p4_aprovacao) return "✅ Cliente aprovou";
  if (prog.p4_envio_cli) return "📤 Aguardando aprovação cliente";
  if (prog.p3_retorno_com) return "💼 Retorno comercial recebido";
  if (prog.p3_envio_com) return "💼 Aguardando retorno comercial";
  if (prog.p2_racional) return "🔄 Racional montado";
  if (prog.p1_extrair) return "🔄 Dados extraídos";
  return "⏳ Não iniciado";
}

function calcStatusColor(prog: any): keyof typeof C {
  if (!prog) return "gray";
  if (prog.p5_no_corte) return "green";
  if (prog.p5_nf) return "blue";
  if (prog.p4_aprovacao) return "teal";
  if (prog.p3_retorno_com || prog.p3_envio_com || prog.p4_envio_cli) return "yellow";
  if (prog.p1_extrair || prog.p2_racional) return "orange";
  return "gray";
}

// ─── STORAGE ─────────────────────────────────────────────────────────────────
function loadState(): any {
  try {
    if (typeof localStorage === "undefined") throw new Error("no ls");
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    records: SAMPLE_RECORDS.map(r => ({ ...r, id: genId(), progress: makeProgress(), nfFile: null, obs: "" })),
    analistas: ["Fernanda", "Layza Arruda"],
    competenciaAtual: "05/2026",
  };
}

function saveState(state: any) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
}

// ─── COLORS ──────────────────────────────────────────────────────────────────
const C = {
  green:  { bg: "#dcfce7", text: "#166534", border: "#86efac" },
  blue:   { bg: "#dbeafe", text: "#1e40af", border: "#93c5fd" },
  teal:   { bg: "#ccfbf1", text: "#134e4a", border: "#5eead4" },
  yellow: { bg: "#fef9c3", text: "#854d0e", border: "#fde047" },
  orange: { bg: "#ffedd5", text: "#9a3412", border: "#fdba74" },
  gray:   { bg: "#f3f4f6", text: "#374151", border: "#d1d5db" },
  red:    { bg: "#fee2e2", text: "#991b1b", border: "#fca5a5" },
};

const inputCls: React.CSSProperties = {
  padding: "7px 10px", borderRadius: 8, border: "1px solid #d1d5db",
  fontSize: 13, fontFamily: "inherit", background: "#fff", color: "#111827",
  width: "100%", boxSizing: "border-box",
};

// ─── SMALL COMPONENTS ────────────────────────────────────────────────────────
function Badge({ label, color = "gray", small }: any) {
  const c = (C as any)[color] || C.gray;
  return (
    <span style={{
      fontSize: small ? 10 : 11, padding: small ? "1px 7px" : "3px 10px",
      borderRadius: 20, background: c.bg, color: c.text,
      border: `1px solid ${c.border}`, fontWeight: 500, whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

function Btn({ children, onClick, primary, danger, small, style = {} }: any) {
  const base: React.CSSProperties = {
    padding: small ? "5px 12px" : "8px 18px", borderRadius: 8, fontSize: small ? 12 : 13,
    fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center",
    gap: 6, border: "none", transition: "opacity .15s", ...style,
  };
  const variant: React.CSSProperties = primary
    ? { background: "#1d4ed8", color: "#fff" }
    : danger
    ? { background: "#dc2626", color: "#fff" }
    : { background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db" };
  return (
    <button onClick={onClick} style={{ ...base, ...variant }}
      onMouseEnter={e => (e.currentTarget.style.opacity = ".85")}
      onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
      {children}
    </button>
  );
}

function Modal({ title, onClose, children, wide }: any) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.5)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300,
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: 14, padding: "24px 28px",
        width: wide ? 760 : 520, maxWidth: "95vw", maxHeight: "90vh",
        overflowY: "auto", boxShadow: "0 12px 40px rgba(0,0,0,.18)",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, flex: 1 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#9ca3af" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── IMPORT MODAL ────────────────────────────────────────────────────────────
function ImportModal({ onImport, onClose }: any) {
  const [text, setText] = useState("");
  const [competencia, setCompetencia] = useState("");
  const [empresa, setEmpresa] = useState("BR02");
  const [tipo, setTipo] = useState("Time & Expenses");
  const [msg, setMsg] = useState("");

  function process() {
    if (!competencia.match(/^\d{2}\/\d{4}$/)) { setMsg("Informe a competência no formato MM/AAAA (ex: 05/2026)."); return; }
    if (!text.trim()) { setMsg("Cole os dados antes de processar."); return; }
    const lines = text.trim().split("\n").filter(l => l.trim());
    const records: any[] = [];
    lines.slice(1).forEach(line => {
      const c = line.split("\t");
      if (c.length < 14) return;
      const responsavel = (c[0] || "").trim();
      const cliente = (c[4] || "").trim();
      const pep = (c[5] || "").trim();
      const inicio = (c[6] || "").trim();
      const fim = (c[7] || "").trim();
      const profissional = (c[10] || "").trim();
      const valorVenda = parseFloat((c[11] || "0").replace(",", ".")) || 0;
      const hrsAprovadas = parseFloat((c[12] || "0").replace(",", ".")) || 0;
      const valorTotal = parseFloat((c[13] || "0").replace(",", ".")) || 0;
      const valorLiquido = parseFloat((c[14] || "0").replace(",", ".")) || 0;
      const codCliente = (c[3] || "").trim();
      if (!cliente || !pep) return;
      records.push({
        id: genId(), responsavel, empresa, tipo, codCliente, cliente, pep,
        inicio, fim, profissional, valorVenda, hrsAprovadas, valorTotal, valorLiquido,
        competencia, progress: makeProgress(), nfFile: null, obs: "",
      });
    });
    if (records.length === 0) { setMsg("Nenhum registro válido encontrado. Verifique o formato."); return; }
    onImport(records, competencia);
    setMsg(`✓ ${records.length} registros importados.`);
  }

  return (
    <Modal title="Importar base de dados" onClose={onClose} wide>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div>
          <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Competência *</label>
          <input style={inputCls} placeholder="05/2026" value={competencia} onChange={e => setCompetencia(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Empresa</label>
          <select style={inputCls} value={empresa} onChange={e => setEmpresa(e.target.value)}>
            {EMPRESAS.map(e => <option key={e.cod} value={e.cod}>{e.cod} — {e.nome}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Tipo de projeto</label>
          <select style={inputCls} value={tipo} onChange={e => setTipo(e.target.value)}>
            {TIPOS_PROJETO.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
        Cole os dados copiados do Excel (aba Time & Expenses). Colunas esperadas: RESPONSÁVEL, TIPO, EMPRESA, COD CLIENTE, NOME CLIENTE, PEP, INICIO, FIM, NUM PESSOAL, BRCPF, PROFISSIONAL, VALOR DE VENDA, HRS APROVADAS, VALOR TOTAL, Valor Liquido
      </p>
      <textarea
        value={text} onChange={e => setText(e.target.value)}
        placeholder="Cole aqui os dados copiados do Excel..."
        style={{ ...inputCls, minHeight: 180, resize: "vertical", fontFamily: "monospace", fontSize: 11 }}
      />
      {msg && <div style={{ marginTop: 10, fontSize: 13, padding: "8px 12px", borderRadius: 8, background: msg.startsWith("✓") ? "#f0fdf4" : "#fef2f2", color: msg.startsWith("✓") ? "#166534" : "#991b1b" }}>{msg}</div>}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
        <Btn onClick={onClose}>Cancelar</Btn>
        <Btn primary onClick={process}>Processar importação</Btn>
      </div>
    </Modal>
  );
}

// ─── TIMELINE MODAL ──────────────────────────────────────────────────────────
function TimelineModal({ record, onSave, onClose }: any) {
  const [prog, setProg] = useState<any>({ ...record.progress });
  const [obs, setObs] = useState(record.obs || "");
  const [nfName, setNfName] = useState(record.nfFile || "");
  const fileRef = useRef<HTMLInputElement>(null);

  function setVal(id: string, val: any) { setProg((p: any) => ({ ...p, [id]: val })); }

  const status = calcStatus(prog);
  const statusColor = calcStatusColor(prog);

  const groups = [
    { num: 1, title: "Extração de dados", steps: STEPS.filter(s => s.group === 1) },
    { num: 2, title: "Racional", steps: STEPS.filter(s => s.group === 2) },
    { num: 3, title: "Validação comercial", steps: STEPS.filter(s => s.group === 3) },
    { num: 4, title: "Aprovação do cliente", steps: STEPS.filter(s => s.group === 4) },
    { num: 5, title: "Faturamento", steps: STEPS.filter(s => s.group === 5) },
  ];

  return (
    <Modal title={`Linha do tempo — ${record.cliente}`} onClose={onClose} wide>
      <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, background: C[statusColor].bg, border: `1px solid ${C[statusColor].border}` }}>
        <span style={{ fontSize: 12, color: C[statusColor].text, fontWeight: 600 }}>Status atual: {status}</span>
      </div>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>
        {record.profissional} · {record.pep} · {record.inicio} a {record.fim} · {fmt(record.valorTotal)}
      </div>
      {groups.map(g => (
        <div key={g.num} style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#1d4ed8", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{g.num}</div>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{g.title}</span>
          </div>
          {g.steps.map(s => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", borderRadius: 8, background: "#f9fafb", marginBottom: 6, marginLeft: 32 }}>
              <span style={{ flex: 1, fontSize: 13, color: "#374151" }}>{s.name}</span>
              {s.type === "check" ? (
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
                  <input type="checkbox" checked={!!prog[s.id]} onChange={e => setVal(s.id, e.target.checked)}
                    style={{ width: 16, height: 16, cursor: "pointer" }} />
                  <span style={{ color: prog[s.id] ? "#166534" : "#6b7280" }}>{prog[s.id] ? "Feito" : "Pendente"}</span>
                </label>
              ) : (
                <input type="date" value={prog[s.id] || ""} onChange={e => setVal(s.id, e.target.value)}
                  style={{ ...inputCls, width: 160 }} />
              )}
            </div>
          ))}
        </div>
      ))}
      <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 16, marginBottom: 16 }}>
        <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>📎 Nota fiscal</label>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="text" value={nfName} onChange={e => setNfName(e.target.value)}
            placeholder="Nome ou número da NF" style={{ ...inputCls, flex: 1 }} />
          <input type="file" ref={fileRef} style={{ display: "none" }} accept=".pdf,.xml,.png,.jpg"
            onChange={e => { if (e.target.files && e.target.files[0]) setNfName(e.target.files[0].name); }} />
          <Btn small onClick={() => fileRef.current?.click()}>📁 Anexar</Btn>
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Observações</label>
        <textarea value={obs} onChange={e => setObs(e.target.value)} placeholder="Observações livres..."
          style={{ ...inputCls, minHeight: 70, resize: "vertical" }} />
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Btn onClick={onClose}>Cancelar</Btn>
        <Btn primary onClick={() => { onSave({ ...record, progress: prog, obs, nfFile: nfName }); onClose(); }}>Salvar progresso</Btn>
      </div>
    </Modal>
  );
}

// ─── EXPORT CSV ──────────────────────────────────────────────────────────────
function exportCSV(records: any[], filename: string) {
  const headers = ["Analista","Empresa","Tipo","Cliente","PEP","Competência","Profissional","Valor Total","Valor Líquido","Status","P1 Extrair","P2 Racional","P3 Envio Com.","P3 Retorno Com.","P3 Data Retorno","P4 Envio Cliente","P4 Aprovação","P4 Data Aprov.","P5 NF Emitida","P5 Data NF","P5 No Corte","NF","Obs"];
  const rows = records.map(r => {
    const p = r.progress || {};
    return [
      r.responsavel, r.empresa, r.tipo, r.cliente, r.pep, r.competencia,
      r.profissional, r.valorTotal, r.valorLiquido, calcStatus(p),
      p.p1_extrair ? "Sim" : "Não", p.p2_racional ? "Sim" : "Não",
      p.p3_envio_com ? "Sim" : "Não", p.p3_retorno_com ? "Sim" : "Não",
      p.p3_data_retorno || "", p.p4_envio_cli ? "Sim" : "Não",
      p.p4_aprovacao ? "Sim" : "Não", p.p4_data_aprov || "",
      p.p5_nf ? "Sim" : "Não", p.p5_data_nf || "", p.p5_no_corte ? "Sim" : "Não",
      r.nfFile || "", r.obs || "",
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
  });
  const csv = "\uFEFF" + [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename + ".csv"; a.click();
  URL.revokeObjectURL(url);
}

// ─── COMPETÊNCIA PICKER ──────────────────────────────────────────────────────
function CompetenciaModal({ current, onConfirm, onClose }: any) {
  const [val, setVal] = useState(current || "");
  const [err, setErr] = useState("");
  function confirm() {
    if (!val.match(/^\d{2}\/\d{4}$/)) { setErr("Use o formato MM/AAAA — ex: 05/2026"); return; }
    onConfirm(val);
  }
  return (
    <Modal title="Selecionar competência" onClose={onClose}>
      <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
        Qual é a competência (mês de referência do serviço prestado)?
      </p>
      <input style={inputCls} placeholder="MM/AAAA — ex: 05/2026" value={val}
        onChange={e => { setVal(e.target.value); setErr(""); }}
        onKeyDown={e => e.key === "Enter" && confirm()} autoFocus />
      {err && <p style={{ color: "#dc2626", fontSize: 12, marginTop: 6 }}>{err}</p>}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
        <Btn onClick={onClose}>Cancelar</Btn>
        <Btn primary onClick={confirm}>Confirmar</Btn>
      </div>
    </Modal>
  );
}

// ─── EXPORT MODAL ────────────────────────────────────────────────────────────
function ExportModal({ records, onClose }: any) {
  const [empresa, setEmpresa] = useState("todas");
  const [analista, setAnalista] = useState("todos");
  const [competencia, setCompetencia] = useState("todas");
  const [soNaoFaturado, setSoNaoFaturado] = useState(false);

  const analistas = [...new Set(records.map((r: any) => r.responsavel))].sort();
  const competencias = [...new Set(records.map((r: any) => r.competencia))].sort();

  function doExport() {
    let filtered = records;
    if (empresa !== "todas") filtered = filtered.filter((r: any) => r.empresa === empresa);
    if (analista !== "todos") filtered = filtered.filter((r: any) => r.responsavel === analista);
    if (competencia !== "todas") filtered = filtered.filter((r: any) => r.competencia === competencia);
    if (soNaoFaturado) filtered = filtered.filter((r: any) => !r.progress?.p5_nf);
    const label = [empresa !== "todas" ? empresa : "TodasEmpresas", analista !== "todos" ? analista : "TodosAnalistas", competencia !== "todas" ? competencia.replace("/", "-") : "TodasCompetencias", soNaoFaturado ? "NaoFaturado" : ""].filter(Boolean).join("_");
    exportCSV(filtered, `FCamara_Billing_${label}`);
    onClose();
  }

  return (
    <Modal title="Exportar para Excel / CSV" onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div>
          <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Empresa</label>
          <select style={inputCls} value={empresa} onChange={e => setEmpresa(e.target.value)}>
            <option value="todas">Todas</option>
            {EMPRESAS.map(e => <option key={e.cod} value={e.cod}>{e.cod} — {e.nome}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Analista</label>
          <select style={inputCls} value={analista} onChange={e => setAnalista(e.target.value)}>
            <option value="todos">Todos</option>
            {analistas.map((a: any) => <option key={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Competência</label>
          <select style={inputCls} value={competencia} onChange={e => setCompetencia(e.target.value)}>
            <option value="todas">Todas</option>
            {competencias.map((c: any) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 2 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={soNaoFaturado} onChange={e => setSoNaoFaturado(e.target.checked)} style={{ width: 16, height: 16 }} />
            Somente não faturado
          </label>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
        <Btn onClick={onClose}>Cancelar</Btn>
        <Btn primary onClick={doExport}>⬇ Exportar CSV</Btn>
      </div>
    </Modal>
  );
}

// ─── TEAM VIEW ───────────────────────────────────────────────────────────────
function TeamView({ records, analista, onUpdate, onCompetenciaChange, competenciaAtual }: any) {
  const [empresa, setEmpresa] = useState("");
  const [tipo, setTipo] = useState("");
  const [competencia, setCompetencia] = useState("todas");
  const [openRecord, setOpenRecord] = useState<any>(null);
  const [showCompModal, setShowCompModal] = useState(false);

  const myRecords = records.filter((r: any) => r.responsavel === analista);
  const empresasUsed = [...new Set(myRecords.map((r: any) => r.empresa))];
  const tiposUsed = empresa ? [...new Set(myRecords.filter((r: any) => r.empresa === empresa).map((r: any) => r.tipo))] : [];
  const competenciasUsed = [...new Set(myRecords.map((r: any) => r.competencia))].sort();

  let filtered = myRecords;
  if (empresa) filtered = filtered.filter((r: any) => r.empresa === empresa);
  if (tipo) filtered = filtered.filter((r: any) => r.tipo === tipo);
  if (competencia !== "todas") filtered = filtered.filter((r: any) => r.competencia === competencia);

  const grouped: Record<string, any> = {};
  filtered.forEach((r: any) => {
    const key = r.cliente + "|" + r.pep;
    if (!grouped[key]) grouped[key] = { cliente: r.cliente, pep: r.pep, records: [] };
    grouped[key].records.push(r);
  });

  return (
    <div>
      {showCompModal && (
        <CompetenciaModal current={competenciaAtual} onClose={() => setShowCompModal(false)}
          onConfirm={(v: string) => { onCompetenciaChange(v); setShowCompModal(false); }} />
      )}
      {openRecord && (
        <TimelineModal record={openRecord} onClose={() => setOpenRecord(null)}
          onSave={(updated: any) => { onUpdate(updated); setOpenRecord(null); }} />
      )}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, fontSize: 16, fontWeight: 700 }}>Olá, {analista}</div>
        <button onClick={() => setShowCompModal(true)} style={{ fontSize: 12, color: "#1d4ed8", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 20, padding: "4px 12px", cursor: "pointer" }}>
          📅 Competência: {competenciaAtual}
        </button>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <select style={{ ...inputCls, width: "auto", flex: 1 }} value={empresa} onChange={e => { setEmpresa(e.target.value); setTipo(""); }}>
          <option value="">Selecione a empresa</option>
          {empresasUsed.map((cod: any) => { const e = EMPRESAS.find(x => x.cod === cod); return <option key={cod} value={cod}>{cod} — {e?.nome}</option>; })}
        </select>
        {empresa && (
          <select style={{ ...inputCls, width: "auto", flex: 1 }} value={tipo} onChange={e => setTipo(e.target.value)}>
            <option value="">Todos os tipos</option>
            {tiposUsed.map((t: any) => <option key={t}>{t}</option>)}
          </select>
        )}
        {competenciasUsed.length > 1 && (
          <select style={{ ...inputCls, width: "auto" }} value={competencia} onChange={e => setCompetencia(e.target.value)}>
            <option value="todas">Todas as competências</option>
            {competenciasUsed.map((c: any) => <option key={c}>{c}</option>)}
          </select>
        )}
      </div>
      {!empresa && (
        <div style={{ textAlign: "center", padding: "3rem", color: "#9ca3af" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏢</div>
          <div style={{ fontSize: 14 }}>Selecione a empresa para ver seus clientes</div>
        </div>
      )}
      {empresa && Object.values(grouped).length === 0 && (
        <div style={{ textAlign: "center", padding: "3rem", color: "#9ca3af" }}>
          <div>Nenhum cliente encontrado para os filtros selecionados.</div>
        </div>
      )}
      {empresa && Object.values(grouped).map((g: any) => (
        <div key={g.cliente + g.pep} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
            🏦 {g.cliente}
            <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 400 }}>{g.pep}</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Profissional","Período","Val. Venda","Hrs","Val. Total","Val. Líquido","Status","Ações"].map(h => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: "left", borderBottom: "1px solid #e5e7eb", fontWeight: 600, color: "#6b7280", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {g.records.map((r: any) => {
                  const sc = calcStatusColor(r.progress);
                  const sl = calcStatus(r.progress);
                  return (
                    <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "8px 10px", fontWeight: 500 }}>{r.profissional}</td>
                      <td style={{ padding: "8px 10px", color: "#6b7280", whiteSpace: "nowrap" }}>{r.inicio} — {r.fim}</td>
                      <td style={{ padding: "8px 10px" }}>{fmtShort(r.valorVenda)}</td>
                      <td style={{ padding: "8px 10px" }}>{r.hrsAprovadas}h</td>
                      <td style={{ padding: "8px 10px", fontWeight: 500 }}>{fmtShort(r.valorTotal)}</td>
                      <td style={{ padding: "8px 10px" }}>{fmtShort(r.valorLiquido)}</td>
                      <td style={{ padding: "8px 10px" }}><Badge label={sl} color={sc} small /></td>
                      <td style={{ padding: "8px 10px" }}>
                        <Btn small onClick={() => setOpenRecord(r)}>Ver timeline</Btn>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
function Dashboard({ records }: any) {
  const [filterEmpresa, setFilterEmpresa] = useState("todas");
  const [filterComp, setFilterComp] = useState("todas");

  const competencias = [...new Set(records.map((r: any) => r.competencia))].sort();

  let filtered = records;
  if (filterEmpresa !== "todas") filtered = filtered.filter((r: any) => r.empresa === filterEmpresa);
  if (filterComp !== "todas") filtered = filtered.filter((r: any) => r.competencia === filterComp);

  const totalValor = filtered.reduce((a: number, r: any) => a + (r.valorTotal || 0), 0);
  const faturados = filtered.filter((r: any) => r.progress?.p5_nf);
  const naoFaturados = filtered.filter((r: any) => !r.progress?.p5_nf);
  const bloqueados = filtered.filter((r: any) => {
    const p = r.progress || {};
    return (p.p3_envio_com && !p.p3_retorno_com) || (p.p4_envio_cli && !p.p4_aprovacao);
  });
  const valorFat = faturados.reduce((a: number, r: any) => a + (r.valorTotal || 0), 0);
  const valorRep = naoFaturados.reduce((a: number, r: any) => a + (r.valorTotal || 0), 0);

  const byAnalista: Record<string, any> = {};
  filtered.forEach((r: any) => {
    if (!byAnalista[r.responsavel]) byAnalista[r.responsavel] = { total: 0, faturado: 0, represado: 0, count: 0, fat: 0 };
    byAnalista[r.responsavel].total += r.valorTotal || 0;
    byAnalista[r.responsavel].count += 1;
    if (r.progress?.p5_nf) { byAnalista[r.responsavel].faturado += r.valorTotal || 0; byAnalista[r.responsavel].fat += 1; }
    else byAnalista[r.responsavel].represado += r.valorTotal || 0;
  });

  const byEmpresa: Record<string, any> = {};
  filtered.forEach((r: any) => {
    if (!byEmpresa[r.empresa]) byEmpresa[r.empresa] = { total: 0, faturado: 0 };
    byEmpresa[r.empresa].total += r.valorTotal || 0;
    if (r.progress?.p5_nf) byEmpresa[r.empresa].faturado += r.valorTotal || 0;
  });

  const MetCard = ({ label, value, color, sub }: any) => (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "14px 16px" }}>
      <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 19, fontWeight: 700, color: color || "#111827" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{sub}</div>}
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <select style={{ ...inputCls, width: "auto" }} value={filterEmpresa} onChange={e => setFilterEmpresa(e.target.value)}>
          <option value="todas">Todas as empresas</option>
          {EMPRESAS.map(e => <option key={e.cod} value={e.cod}>{e.cod} — {e.nome}</option>)}
        </select>
        <select style={{ ...inputCls, width: "auto" }} value={filterComp} onChange={e => setFilterComp(e.target.value)}>
          <option value="todas">Todas as competências</option>
          {competencias.map((c: any) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 24 }}>
        <MetCard label="Total registros" value={filtered.length} />
        <MetCard label="Valor total" value={fmtShort(totalValor)} color="#1d4ed8" />
        <MetCard label="Faturado" value={fmtShort(valorFat)} color="#166534" sub={`${faturados.length} registros`} />
        <MetCard label="Represado" value={fmtShort(valorRep)} color="#854d0e" sub={`${naoFaturados.length} registros`} />
        <MetCard label="Aguardando resp." value={bloqueados.length} color={bloqueados.length > 0 ? "#991b1b" : "#374151"} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "16px" }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Por analista</div>
          {Object.entries(byAnalista).map(([a, d]: any) => {
            const pct = d.total > 0 ? Math.round((d.faturado / d.total) * 100) : 0;
            return (
              <div key={a} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{a}</span>
                  <span style={{ color: "#6b7280" }}>{pct}% faturado</span>
                </div>
                <div style={{ height: 6, background: "#f3f4f6", borderRadius: 3 }}>
                  <div style={{ height: 6, borderRadius: 3, width: `${pct}%`, background: pct === 100 ? "#16a34a" : pct > 50 ? "#2563eb" : "#d97706" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9ca3af", marginTop: 3 }}>
                  <span>Faturado: {fmtShort(d.faturado)}</span>
                  <span>Represado: {fmtShort(d.represado)}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "16px" }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Por empresa</div>
          {Object.entries(byEmpresa).map(([cod, d]: any) => {
            const emp = EMPRESAS.find(e => e.cod === cod);
            const pct = d.total > 0 ? Math.round((d.faturado / d.total) * 100) : 0;
            return (
              <div key={cod} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{cod} — {emp?.nome}</span>
                  <span style={{ color: "#6b7280" }}>{fmtShort(d.total)}</span>
                </div>
                <div style={{ height: 6, background: "#f3f4f6", borderRadius: 3 }}>
                  <div style={{ height: 6, borderRadius: 3, width: `${pct}%`, background: "#1d4ed8" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "16px" }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Registros não faturados</div>
        {naoFaturados.length === 0 ? (
          <div style={{ textAlign: "center", padding: "1rem", color: "#9ca3af", fontSize: 13 }}>🎉 Tudo faturado!</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Analista","Empresa","Competência","Cliente","Profissional","Valor Total","Status"].map(h => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: "left", borderBottom: "1px solid #e5e7eb", fontWeight: 600, color: "#6b7280", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {naoFaturados.slice(0, 50).map((r: any) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "7px 10px" }}>{r.responsavel}</td>
                    <td style={{ padding: "7px 10px" }}>{r.empresa}</td>
                    <td style={{ padding: "7px 10px" }}>{r.competencia}</td>
                    <td style={{ padding: "7px 10px", fontWeight: 500 }}>{r.cliente}</td>
                    <td style={{ padding: "7px 10px", color: "#6b7280" }}>{r.profissional}</td>
                    <td style={{ padding: "7px 10px" }}>{fmtShort(r.valorTotal)}</td>
                    <td style={{ padding: "7px 10px" }}><Badge label={calcStatus(r.progress)} color={calcStatusColor(r.progress)} small /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {naoFaturados.length > 50 && <div style={{ fontSize: 11, color: "#9ca3af", padding: "8px 10px" }}>Exibindo 50 de {naoFaturados.length} registros. Use a exportação para ver todos.</div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── APP ROOT ────────────────────────────────────────────────────────────────
function App() {
  const [state, setState] = useState<any>(() => loadState());
  const [view, setView] = useState("login");
  const [analista, setAnalista] = useState("");
  const [novoAnalista, setNovoAnalista] = useState("");
  const [activeTab, setActiveTab] = useState("time");
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showCompModal, setShowCompModal] = useState(false);

  useEffect(() => { saveState(state); }, [state]);

  function handleLogin(nome: string) {
    setAnalista(nome);
    setView("app");
    setShowCompModal(true);
  }

  function handleAddAnalista() {
    const n = novoAnalista.trim();
    if (!n) return;
    setState((s: any) => ({ ...s, analistas: [...new Set([...s.analistas, n])] }));
    handleLogin(n);
    setNovoAnalista("");
  }

  function handleUpdate(updated: any) {
    setState((s: any) => ({ ...s, records: s.records.map((r: any) => r.id === updated.id ? updated : r) }));
  }

  function handleImport(newRecords: any[], competencia: string) {
    setState((s: any) => ({
      ...s,
      records: [...s.records, ...newRecords],
      competenciaAtual: competencia,
    }));
  }

  function handleCompetencia(val: string) {
    setState((s: any) => ({ ...s, competenciaAtual: val }));
    setShowCompModal(false);
  }

  if (view === "login") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f4ff", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: "36px 40px", width: 400, maxWidth: "92vw", boxShadow: "0 8px 32px rgba(29,78,216,.12)" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: "#1d4ed8", lineHeight: 1.3 }}>Controle de Faturamento<br />Grupo Fcamara</h1>
            <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>{APP_VERSION}</p>
          </div>
          <p style={{ fontSize: 13, color: "#374151", marginBottom: 12, fontWeight: 600 }}>Quem é você?</p>
          {state.analistas.map((a: string) => (
            <button key={a} onClick={() => handleLogin(a)} style={{
              display: "block", width: "100%", textAlign: "left", padding: "10px 14px",
              marginBottom: 6, borderRadius: 8, border: "1px solid #e5e7eb",
              background: "#f8fafc", cursor: "pointer", fontSize: 14, fontWeight: 500,
              color: "#111827", transition: "background .15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#eff6ff")}
            onMouseLeave={e => (e.currentTarget.style.background = "#f8fafc")}>
              👤 {a}
            </button>
          ))}
          <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 14, marginTop: 8 }}>
            <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>Primeiro acesso?</p>
            <div style={{ display: "flex", gap: 6 }}>
              <input value={novoAnalista} onChange={e => setNovoAnalista(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddAnalista()}
                placeholder="Seu nome completo" style={{ ...inputCls, flex: 1 }} />
              <Btn primary onClick={handleAddAnalista}>Entrar</Btn>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", color: "#111827", minHeight: "100vh", background: "#f8fafc" }}>
      {showImport && <ImportModal onImport={handleImport} onClose={() => setShowImport(false)} />}
      {showExport && <ExportModal records={state.records} onClose={() => setShowExport(false)} />}
      {showCompModal && <CompetenciaModal current={state.competenciaAtual} onConfirm={handleCompetencia} onClose={() => setShowCompModal(false)} />}

      <div style={{ background: "#1d4ed8", color: "#fff", padding: "0 20px", display: "flex", alignItems: "center", gap: 12, height: 52, flexWrap: "wrap" }}>
        <span style={{ fontSize: 15, fontWeight: 800, flex: 1 }}>📊 Faturamento Grupo Fcamara</span>
        <span style={{ fontSize: 12, opacity: .8 }}>Competência: {state.competenciaAtual}</span>
        <button onClick={() => setShowCompModal(true)} style={{ background: "rgba(255,255,255,.15)", border: "none", color: "#fff", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>Alterar</button>
        <button onClick={() => setShowImport(true)} style={{ background: "rgba(255,255,255,.15)", border: "none", color: "#fff", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>⬆ Importar</button>
        <button onClick={() => setShowExport(true)} style={{ background: "rgba(255,255,255,.15)", border: "none", color: "#fff", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>⬇ Exportar</button>
        <button onClick={() => setView("login")} style={{ background: "rgba(255,255,255,.15)", border: "none", color: "#fff", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>Sair</button>
      </div>

      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 20px", display: "flex", gap: 4 }}>
        {[{ id: "time", label: "Minha visão" }, { id: "dash", label: "Dashboard" }].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: "14px 18px", border: "none", background: "transparent", cursor: "pointer",
            fontSize: 13, fontWeight: activeTab === t.id ? 700 : 400,
            color: activeTab === t.id ? "#1d4ed8" : "#6b7280",
            borderBottom: activeTab === t.id ? "2px solid #1d4ed8" : "2px solid transparent",
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px" }}>
        {activeTab === "time" && (
          <TeamView records={state.records} analista={analista} onUpdate={handleUpdate}
            competenciaAtual={state.competenciaAtual} onCompetenciaChange={handleCompetencia} />
        )}
        {activeTab === "dash" && <Dashboard records={state.records} />}
      </div>
    </div>
  );
}
