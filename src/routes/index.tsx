// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";

import { useState, useEffect, useRef, useCallback } from "react";
import * as XLSX from "xlsx";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const APP_VERSION = "v2.0";
const LS_KEY = "fcamara_billing_v2";
const ADMIN_NAME = "Daniela";

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
  { id: "p1_extrair",      group: 1, label: "Passo 1",  name: "Extrair dados (FC Team)",  type: "check" },
  { id: "p2_racional",     group: 2, label: "Passo 2",  name: "Montar Racional",          type: "check" },
  { id: "p3_envio_com",    group: 3, label: "Passo 3a", name: "Envio ao Comercial",       type: "check" },
  { id: "p3_retorno_com",  group: 3, label: "Passo 3b", name: "Retorno do Comercial",     type: "check" },
  { id: "p3_data_retorno", group: 3, label: "Passo 3c", name: "Data Retorno",             type: "date"  },
  { id: "p4_envio_cli",    group: 4, label: "Passo 4a", name: "Envio ao Cliente",         type: "check" },
  { id: "p4_aprovacao",    group: 4, label: "Passo 4b", name: "Aprovação do Cliente",     type: "check" },
  { id: "p4_data_aprov",   group: 4, label: "Passo 4c", name: "Data Aprovação",           type: "date"  },
  { id: "p5_nf",           group: 5, label: "Passo 5a", name: "NF Emitida?",              type: "check" },
  { id: "p5_data_nf",      group: 5, label: "Passo 5b", name: "Data Emissão NF",          type: "date"  },
  { id: "p5_no_corte",     group: 5, label: "Passo 5c", name: "Dentro do Corte?",         type: "check" },
];

const SAMPLE_RECORDS = [
  { responsavel:"Fernanda", empresa:"BR02", tipo:"Time & Expenses", codCliente:"1002351", cliente:"Banco ABC Brasil S.A.", pep:"BR02CLP00005.1.1", inicio:"01/05/2026", fim:"31/05/2026", profissional:"Bruna Paz Amorim",        valorVenda:192.5,  hrsAprovadas:160, valorTotal:30800,    valorLiquido:11774.70, competencia:"05/2026" },
  { responsavel:"Fernanda", empresa:"BR02", tipo:"Time & Expenses", codCliente:"1002351", cliente:"Banco ABC Brasil S.A.", pep:"BR02CLP00005.1.1", inicio:"01/05/2026", fim:"31/05/2026", profissional:"Gilliard Costa Santos",   valorVenda:145.2,  hrsAprovadas:156, valorTotal:22651.20, valorLiquido:21167.55, competencia:"05/2026" },
  { responsavel:"Fernanda", empresa:"BR02", tipo:"Time & Expenses", codCliente:"1002840", cliente:"Banco BS2 S.A.",         pep:"BR02CLP00100.1.1", inicio:"01/05/2026", fim:"31/05/2026", profissional:"Emerson França",          valorVenda:217,    hrsAprovadas:160, valorTotal:34720,    valorLiquido:32445.84, competencia:"05/2026" },
  { responsavel:"Fernanda", empresa:"BR02", tipo:"Time & Expenses", codCliente:"1002342", cliente:"Banco Digio S.A.",        pep:"BR02CLP00007.1.1", inicio:"01/05/2026", fim:"31/05/2026", profissional:"Tamiris Ferreira",        valorVenda:202.14, hrsAprovadas:168, valorTotal:33959.52, valorLiquido:31735.17, competencia:"05/2026" },
  { responsavel:"Layza Arruda", empresa:"BR02", tipo:"Time & Expenses", codCliente:"1002100", cliente:"Diagnósticos da América S.A.", pep:"BR02CLP00041", inicio:"01/05/2026", fim:"31/05/2026", profissional:"Adriano Silva Gama",  valorVenda:135, hrsAprovadas:168, valorTotal:22680, valorLiquido:21194.46, competencia:"05/2026" },
  { responsavel:"Layza Arruda", empresa:"BR02", tipo:"Time & Expenses", codCliente:"1002100", cliente:"Diagnósticos da América S.A.", pep:"BR02CLP00041", inicio:"01/05/2026", fim:"31/05/2026", profissional:"Bruno Eduardo Ferreira", valorVenda:100, hrsAprovadas:168, valorTotal:16800, valorLiquido:15699.60, competencia:"05/2026" },
  { responsavel:"Layza Arruda", empresa:"BR02", tipo:"Time & Expenses", codCliente:"1002214", cliente:"Dr. Consulta Centro Médico",    pep:"BR02CLP00022.1.1", inicio:"01/05/2026", fim:"31/05/2026", profissional:"Adriano Costa Andrade", valorVenda:142, hrsAprovadas:168, valorTotal:23856, valorLiquido:22293.43, competencia:"05/2026" },
  { responsavel:"Layza Arruda", empresa:"BR02", tipo:"Time & Expenses", codCliente:"1002418", cliente:"Grupo Casas Bahia S.A.",         pep:"BR02CLP00042.0.3", inicio:"01/05/2026", fim:"31/05/2026", profissional:"Abel de Meira Junior", valorVenda:172.29, hrsAprovadas:168, valorTotal:28944.72, valorLiquido:27048.84, competencia:"05/2026" },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const fmt      = (n) => n == null ? "—" : "R$ " + Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtShort = (n) => n == null ? "—" : "R$ " + Math.round(n).toLocaleString("pt-BR");
const nowISO   = ()  => new Date().toISOString();
const fmtDT    = (iso) => { if (!iso) return "—"; const d = new Date(iso); return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); };
const genId    = ()  => "r" + Date.now() + Math.random().toString(36).slice(2, 7);

function makeProgress() {
  return Object.fromEntries(STEPS.map(s => [s.id, s.type === "date" ? "" : false]));
}

function calcStatus(prog) {
  if (!prog) return "Não iniciado";
  if (prog.p5_no_corte)     return "Faturado no corte";
  if (prog.p5_nf)           return "NF emitida";
  if (prog.p4_aprovacao)    return "Cliente aprovou";
  if (prog.p4_envio_cli)    return "Aguard. aprovação cliente";
  if (prog.p3_retorno_com)  return "Retorno comercial recebido";
  if (prog.p3_envio_com)    return "Aguard. retorno comercial";
  if (prog.p2_racional)     return "Racional montado";
  if (prog.p1_extrair)      return "Dados extraídos";
  return "Não iniciado";
}

function calcStatusColor(prog) {
  if (!prog) return "gray";
  if (prog.p5_no_corte)     return "green";
  if (prog.p5_nf)           return "teal";
  if (prog.p4_aprovacao)    return "blue";
  if (prog.p4_envio_cli || prog.p3_retorno_com || prog.p3_envio_com) return "yellow";
  if (prog.p1_extrair || prog.p2_racional) return "orange";
  return "gray";
}

// ─── STORAGE ─────────────────────────────────────────────────────────────────

function initState() {
  const now = nowISO();
  const records = SAMPLE_RECORDS.map(r => ({ ...r, id: genId(), progress: makeProgress(), nfFile: null, obs: "", updatedAt: now }));
  return {
    records,
    analistas: ["Fernanda", "Layza Arruda"],
    competenciaAtual: "05/2026",
    importHistory: [{
      id: genId(),
      date: now,
      competencia: "05/2026",
      empresa: "BR02",
      tipo: "Time & Expenses",
      mode: "add",
      count: records.length,
      user: ADMIN_NAME,
      note: "Carga inicial de exemplo",
    }],
  };
}

function loadState() {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) return JSON.parse(raw); } catch {}
  return initState();
}

function saveState(s) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {}
}

// ─── STYLES / COLORS ─────────────────────────────────────────────────────────

const C = {
  green:  { bg: "#dcfce7", text: "#166534", border: "#86efac" },
  teal:   { bg: "#ccfbf1", text: "#134e4a", border: "#5eead4" },
  blue:   { bg: "#dbeafe", text: "#1e40af", border: "#93c5fd" },
  yellow: { bg: "#fef9c3", text: "#854d0e", border: "#fde047" },
  orange: { bg: "#ffedd5", text: "#9a3412", border: "#fdba74" },
  gray:   { bg: "#f3f4f6", text: "#374151", border: "#d1d5db" },
  red:    { bg: "#fee2e2", text: "#991b1b", border: "#fca5a5" },
  purple: { bg: "#f3e8ff", text: "#6b21a8", border: "#d8b4fe" },
};

const inp = { padding: "7px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, fontFamily: "inherit", background: "#fff", color: "#111827", width: "100%", boxSizing: "border-box" };

// ─── UI ATOMS ────────────────────────────────────────────────────────────────

function Badge({ label, color = "gray", small }) {
  const c = C[color] || C.gray;
  return <span style={{ fontSize: small ? 10 : 11, padding: small ? "2px 7px" : "3px 10px", borderRadius: 20, background: c.bg, color: c.text, border: `1px solid ${c.border}`, fontWeight: 500, whiteSpace: "nowrap" }}>{label}</span>;
}

function Btn({ children, onClick, primary, danger, small, disabled, style: s = {} }) {
  const base = { padding: small ? "5px 12px" : "8px 18px", borderRadius: 8, fontSize: small ? 12 : 13, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: 6, border: "none", opacity: disabled ? .5 : 1, ...s };
  const v = primary ? { background: "#1d4ed8", color: "#fff" } : danger ? { background: "#dc2626", color: "#fff" } : { background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db" };
  return <button onClick={disabled ? undefined : onClick} style={{ ...base, ...v }}>{children}</button>;
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 14, padding: "24px 28px", width: wide ? 800 : 520, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 12px 40px rgba(0,0,0,.2)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, flex: 1 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#9ca3af", lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CompetenciaModal({ current, onConfirm, onClose }) {
  const [val, setVal] = useState(current || "");
  const [err, setErr] = useState("");
  function confirm() {
    if (!val.match(/^\d{2}\/\d{4}$/)) { setErr("Use o formato MM/AAAA — ex: 05/2026"); return; }
    onConfirm(val);
  }
  return (
    <Modal title="Selecionar competência" onClose={onClose}>
      <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 14 }}>Qual a competência (mês de referência do serviço prestado)?</p>
      <input style={inp} placeholder="MM/AAAA — ex: 05/2026" value={val} onChange={e => { setVal(e.target.value); setErr(""); }} onKeyDown={e => e.key === "Enter" && confirm()} autoFocus />
      {err && <p style={{ color: "#dc2626", fontSize: 12, marginTop: 6 }}>{err}</p>}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
        <Btn onClick={onClose}>Cancelar</Btn>
        <Btn primary onClick={confirm}>Confirmar</Btn>
      </div>
    </Modal>
  );
}

// ─── TIMELINE MODAL ──────────────────────────────────────────────────────────

function TimelineModal({ record, onSave, onClose }) {
  const [prog, setProg] = useState({ ...record.progress });
  const [obs, setObs]   = useState(record.obs || "");
  const [nfFile, setNfFile] = useState(record.nfFile || "");
  const fileRef = useRef();
  const setVal  = (id, val) => setProg(p => ({ ...p, [id]: val }));
  const status  = calcStatus(prog);
  const sColor  = calcStatusColor(prog);
  const groups  = [1,2,3,4,5].map(n => ({ num: n, steps: STEPS.filter(s => s.group === n), title: ["","Extração de dados","Racional","Validação comercial","Aprovação do cliente","Faturamento"][n] }));

  return (
    <Modal title={`Timeline — ${record.cliente}`} onClose={onClose} wide>
      <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 8, background: C[sColor].bg, border: `1px solid ${C[sColor].border}` }}>
        <span style={{ fontSize: 12, color: C[sColor].text, fontWeight: 700 }}>Status: {status}</span>
        {record.updatedAt && <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 12 }}>Última atualização: {fmtDT(record.updatedAt)}</span>}
      </div>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>{record.profissional} · {record.pep} · {record.inicio} → {record.fim} · {fmt(record.valorTotal)}</div>

      {groups.map(g => (
        <div key={g.num} style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#1d4ed8", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{g.num}</div>
            <span style={{ fontWeight: 700, fontSize: 13 }}>{g.title}</span>
          </div>
          {g.steps.map(s => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", borderRadius: 8, background: "#f9fafb", marginBottom: 5, marginLeft: 32 }}>
              <span style={{ flex: 1, fontSize: 13 }}>{s.name}</span>
              {s.type === "check"
                ? <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
                    <input type="checkbox" checked={!!prog[s.id]} onChange={e => setVal(s.id, e.target.checked)} style={{ width: 16, height: 16 }} />
                    <span style={{ color: prog[s.id] ? "#166534" : "#9ca3af" }}>{prog[s.id] ? "✓ Feito" : "Pendente"}</span>
                  </label>
                : <input type="date" value={prog[s.id] || ""} onChange={e => setVal(s.id, e.target.value)} style={{ ...inp, width: 160 }} />
              }
            </div>
          ))}
        </div>
      ))}

      <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 14, marginBottom: 14 }}>
        <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 8 }}>📎 Nota fiscal</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="text" value={nfFile} onChange={e => setNfFile(e.target.value)} placeholder="Número ou nome da NF" style={{ ...inp, flex: 1 }} />
          <input type="file" ref={fileRef} style={{ display: "none" }} accept=".pdf,.xml,.png,.jpg" onChange={e => { if (e.target.files[0]) setNfFile(e.target.files[0].name); }} />
          <Btn small onClick={() => fileRef.current.click()}>📁 Anexar</Btn>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 6 }}>Observações</label>
        <textarea value={obs} onChange={e => setObs(e.target.value)} placeholder="Observações livres..." style={{ ...inp, minHeight: 70, resize: "vertical" }} />
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Btn onClick={onClose}>Cancelar</Btn>
        <Btn primary onClick={() => { onSave({ ...record, progress: prog, obs, nfFile, updatedAt: nowISO() }); onClose(); }}>Salvar progresso</Btn>
      </div>
    </Modal>
  );
}

// ─── IMPORT MODAL (admin only) ───────────────────────────────────────────────

// Cabeçalhos exatos da aba "📥 Time & Expenses" da planilha BASE_MESTRA_FATURAMENTO
// Mapeamento: chave interna → nome da coluna no Excel (case-insensitive, trim)
const TE_COL_MAP = {
  responsavel:  ["RESPONSÁVEL", "RESPONSAVEL"],
  codCliente:   ["COD CLIENTE"],
  cliente:      ["NOME CLIENTE"],
  pep:          ["PEP"],
  inicio:       ["INICIO", "INÍCIO"],
  fim:          ["FIM"],
  profissional: ["PROFISSIONAL"],
  valorVenda:   ["VALOR DE VENDA"],
  hrsAprovadas: ["HRS APROVADAS"],
  valorTotal:   ["VALOR TOTAL"],
  valorLiquido: ["Valor Liquido :)", "VALOR LIQUIDO", "Valor Liquido"],
};

function excelDateToStr(val) {
  // SheetJS retorna datas numéricas do Excel como número serial
  if (typeof val === "number") {
    const date = XLSX.SSF.parse_date_code(val);
    if (date) {
      const d = String(date.d).padStart(2, "0");
      const m = String(date.m).padStart(2, "0");
      return `${d}/${m}/${date.y}`;
    }
  }
  if (typeof val === "string" && val.trim()) return val.trim();
  return "";
}

function findCol(headers, candidates) {
  const norm = h => (h || "").toString().trim().toUpperCase().replace(/\s+/g, " ");
  for (const c of candidates) {
    const idx = headers.findIndex(h => norm(h) === norm(c));
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseSheetRows(rows, empresa, tipo, competencia) {
  if (rows.length < 2) return { records: [], errors: ["Planilha vazia ou sem dados."] };

  // Linha 0 pode ser título decorativo — procura a linha com os cabeçalhos reais
  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i];
    if (row.some(c => (c || "").toString().toUpperCase().includes("RESPONSÁVEL") || (c || "").toString().toUpperCase().includes("RESPONSAVEL"))) {
      headerRowIdx = i;
      break;
    }
  }

  const headers = rows[headerRowIdx].map(h => (h || "").toString());
  const colIdx  = {};
  const missing = [];

  for (const [key, candidates] of Object.entries(TE_COL_MAP)) {
    const idx = findCol(headers, candidates);
    if (idx === -1) missing.push(candidates[0]);
    else colIdx[key] = idx;
  }

  if (missing.length > 3) {
    return { records: [], errors: [`Cabeçalhos não encontrados: ${missing.join(", ")}. Verifique se está usando a aba "📥 Time & Expenses".`] };
  }

  const records = [];
  const skipped = [];

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every(c => c == null || c === "")) continue;

    const get    = (key) => colIdx[key] != null ? (row[colIdx[key]] ?? "") : "";
    const getNum = (key) => { const v = get(key); return parseFloat(String(v).replace(",", ".")) || 0; };
    const getStr = (key) => String(get(key)).trim();

    const cliente      = getStr("cliente");
    const pep          = getStr("pep");
    const responsavel  = getStr("responsavel");

    if (!cliente || !pep || !responsavel) { skipped.push(i + 1); continue; }

    records.push({
      id:           genId(),
      responsavel,
      empresa,
      tipo,
      codCliente:   getStr("codCliente"),
      cliente,
      pep,
      inicio:       excelDateToStr(get("inicio")),
      fim:          excelDateToStr(get("fim")),
      profissional: getStr("profissional"),
      valorVenda:   getNum("valorVenda"),
      hrsAprovadas: getNum("hrsAprovadas"),
      valorTotal:   getNum("valorTotal"),
      valorLiquido: getNum("valorLiquido"),
      competencia,
      progress:     makeProgress(),
      nfFile:       null,
      obs:          "",
      updatedAt:    nowISO(),
    });
  }

  const errors = [];
  if (skipped.length > 0) errors.push(`${skipped.length} linhas ignoradas por falta de cliente/PEP/responsável (linhas: ${skipped.slice(0, 5).join(", ")}${skipped.length > 5 ? "..." : ""}).`);

  return { records, errors };
}

function ImportModal({ onImport, onClose }) {
  const [competencia, setComp]  = useState("");
  const [empresa, setEmpresa]   = useState("BR02");
  const [tipo, setTipo]         = useState("Time & Expenses");
  const [mode, setMode]         = useState("add");
  const [note, setNote]         = useState("");
  const [preview, setPreview]   = useState(null);
  const [fileName, setFileName] = useState("");
  const [msgs, setMsgs]         = useState([]);
  const [loading, setLoading]   = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  function reset() { setPreview(null); setFileName(""); setMsgs([]); }

  function readFile(file) {
    if (!competencia.match(/^\d{2}\/\d{4}$/)) { setMsgs([{ type: "error", text: "Informe a competência no formato MM/AAAA antes de selecionar o arquivo." }]); return; }
    if (!file) return;
    const allowed = [".xlsx", ".xlsm", ".xls", ".csv"];
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!allowed.includes(ext)) { setMsgs([{ type: "error", text: `Formato não suportado: ${ext}. Use .xlsx, .xlsm ou .xls.` }]); return; }

    setLoading(true);
    setFileName(file.name);
    setPreview(null);
    setMsgs([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb   = XLSX.read(data, { type: "array", cellDates: false });

        // Procura aba Time & Expenses (aceita nomes com ou sem emoji)
        const sheetName = wb.SheetNames.find(n =>
          n.toLowerCase().includes("time") && n.toLowerCase().includes("expense")
        ) || wb.SheetNames.find(n => n.toLowerCase().includes("time")) || wb.SheetNames[0];

        const ws   = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        const { records, errors } = parseSheetRows(rows, empresa, tipo, competencia);

        const newMsgs = [];
        if (errors.length) errors.forEach(e => newMsgs.push({ type: "warn", text: e }));
        if (records.length === 0) {
          newMsgs.push({ type: "error", text: "Nenhum registro válido encontrado. Verifique se o arquivo contém a aba '📥 Time & Expenses' com os cabeçalhos corretos." });
          setMsgs(newMsgs);
        } else {
          newMsgs.push({ type: "ok", text: `${records.length} registros encontrados na aba "${sheetName}".` });
          setMsgs(newMsgs);
          setPreview(records);
        }
      } catch (err) {
        setMsgs([{ type: "error", text: "Erro ao ler o arquivo: " + err.message }]);
      }
      setLoading(false);
    };
    reader.readAsArrayBuffer(file);
  }

  const onDrop = useCallback(e => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) readFile(file);
  }, [competencia, empresa, tipo]);

  function confirm() {
    if (!preview) return;
    onImport({ records: preview, competencia, empresa, tipo, mode, note: note || (mode === "replace" ? "Substituição completa" : "Adição de registros") });
    onClose();
  }

  const msgColors = { ok: { bg: "#f0fdf4", text: "#166534", border: "#86efac" }, warn: { bg: "#fffbeb", text: "#92400e", border: "#fde68a" }, error: { bg: "#fef2f2", text: "#991b1b", border: "#fca5a5" } };

  return (
    <Modal title="Importar base — Time & Expenses" onClose={onClose} wide>
      <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#92400e" }}>
        🔒 Apenas a Daniela pode importar. Aceita o arquivo <strong>.xlsm / .xlsx</strong> exatamente como exportado — lê a aba <strong>📥 Time & Expenses</strong> com os cabeçalhos originais.
      </div>

      {/* Campos de contexto */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
        <div>
          <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Competência * <span style={{ color: "#dc2626" }}>(preencha antes de carregar)</span></label>
          <input style={inp} placeholder="05/2026" value={competencia} onChange={e => { setComp(e.target.value); reset(); }} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Empresa</label>
          <select style={inp} value={empresa} onChange={e => { setEmpresa(e.target.value); reset(); }}>
            {EMPRESAS.map(e => <option key={e.cod} value={e.cod}>{e.cod} — {e.nome}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Tipo de projeto</label>
          <select style={inp} value={tipo} onChange={e => { setTipo(e.target.value); reset(); }}>
            {TIPOS_PROJETO.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Modo */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 6 }}>Modo de importação</label>
        <div style={{ display: "flex", gap: 10 }}>
          {[
            { v: "add",     l: "➕ Incluir novos",       d: "Adiciona sem apagar registros existentes desta competência." },
            { v: "replace", l: "🔄 Substituir completo", d: "Remove TODOS desta competência/empresa/tipo e reimporta." },
          ].map(opt => (
            <label key={opt.v} style={{ flex: 1, display: "flex", gap: 8, padding: "10px 12px", borderRadius: 8, border: `2px solid ${mode === opt.v ? "#1d4ed8" : "#e5e7eb"}`, cursor: "pointer", background: mode === opt.v ? "#eff6ff" : "#fff" }}>
              <input type="radio" name="mode" value={opt.v} checked={mode === opt.v} onChange={() => setMode(opt.v)} style={{ marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: mode === opt.v ? "#1d4ed8" : "#374151" }}>{opt.l}</div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{opt.d}</div>
              </div>
            </label>
          ))}
        </div>
        {mode === "replace" && <div style={{ marginTop: 8, fontSize: 12, color: "#dc2626", fontWeight: 600 }}>⚠ O progresso dos passos já registrado para esta competência será perdido.</div>}
      </div>

      {/* Nota */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Nota da importação (opcional)</label>
        <input style={inp} placeholder="Ex: Ajuste de valores de maio" value={note} onChange={e => setNote(e.target.value)} />
      </div>

      {/* Drop zone */}
      <input type="file" ref={fileRef} style={{ display: "none" }} accept=".xlsx,.xlsm,.xls,.csv"
        onChange={e => { if (e.target.files[0]) readFile(e.target.files[0]); e.target.value = ""; }} />

      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current.click()}
        style={{
          border: `2px dashed ${dragOver ? "#1d4ed8" : fileName ? "#86efac" : "#d1d5db"}`,
          borderRadius: 10, padding: "28px 20px", textAlign: "center",
          cursor: "pointer", background: dragOver ? "#eff6ff" : fileName ? "#f0fdf4" : "#fafafa",
          transition: "all .2s", marginBottom: 14,
        }}
      >
        {loading ? (
          <div style={{ color: "#6b7280", fontSize: 13 }}>⏳ Lendo arquivo...</div>
        ) : fileName ? (
          <>
            <div style={{ fontSize: 24, marginBottom: 6 }}>✅</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#166534" }}>{fileName}</div>
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>Clique para trocar o arquivo</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>Clique ou arraste o arquivo aqui</div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>Aceita .xlsm e .xlsx — lê automaticamente a aba <strong>📥 Time & Expenses</strong></div>
          </>
        )}
      </div>

      {/* Cabeçalhos esperados */}
      <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 8, background: "#f8fafc", border: "1px solid #e5e7eb" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 6 }}>CABEÇALHOS LIDOS DA ABA TIME & EXPENSES:</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {["RESPONSÁVEL","COD CLIENTE","NOME CLIENTE","PEP","INICIO","FIM","PROFISSIONAL","VALOR DE VENDA","HRS APROVADAS","VALOR TOTAL","Valor Liquido :)"].map(h => (
            <span key={h} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "#e0f2fe", color: "#0369a1", fontFamily: "monospace" }}>{h}</span>
          ))}
        </div>
      </div>

      {/* Mensagens */}
      {msgs.map((m, i) => (
        <div key={i} style={{ marginBottom: 6, fontSize: 12, padding: "8px 12px", borderRadius: 8, background: msgColors[m.type].bg, color: msgColors[m.type].text, border: `1px solid ${msgColors[m.type].border}` }}>
          {m.text}
        </div>
      ))}

      {/* Preview */}
      {preview && (
        <div style={{ marginBottom: 14, padding: "12px 14px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #86efac" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#166534", marginBottom: 6 }}>✓ {preview.length} registros prontos para importar</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead><tr style={{ background: "#dcfce7" }}>
                {["Responsável","Cliente","PEP","Profissional","Val. Total"].map(h =>
                  <th key={h} style={{ padding: "4px 8px", textAlign: "left", color: "#166534", fontWeight: 700 }}>{h}</th>
                )}
              </tr></thead>
              <tbody>
                {preview.slice(0, 5).map(r => (
                  <tr key={r.id}>
                    <td style={{ padding: "4px 8px" }}>{r.responsavel}</td>
                    <td style={{ padding: "4px 8px" }}>{r.cliente}</td>
                    <td style={{ padding: "4px 8px", fontFamily: "monospace" }}>{r.pep}</td>
                    <td style={{ padding: "4px 8px" }}>{r.profissional}</td>
                    <td style={{ padding: "4px 8px" }}>{fmtShort(r.valorTotal)}</td>
                  </tr>
                ))}
                {preview.length > 5 && <tr><td colSpan={5} style={{ padding: "4px 8px", color: "#9ca3af", fontStyle: "italic" }}>... e mais {preview.length - 5} registros</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Btn onClick={onClose}>Cancelar</Btn>
        <Btn primary onClick={confirm} disabled={!preview}>
          {mode === "replace" ? "⚠ Confirmar substituição" : "✓ Confirmar importação"}
        </Btn>
      </div>
    </Modal>
  );
}

// ─── EXPORT MODAL (admin only) ────────────────────────────────────────────────

function ExportModal({ records, onClose }) {
  const [empresa, setEmpresa]       = useState("todas");
  const [analista, setAnalista]     = useState("todos");
  const [competencia, setComp]      = useState("todas");
  const [soNaoFat, setSoNaoFat]     = useState(false);
  const analistas    = [...new Set(records.map(r => r.responsavel))].sort();
  const competencias = [...new Set(records.map(r => r.competencia))].sort();

  function doExport() {
    let f = records;
    if (empresa     !== "todas") f = f.filter(r => r.empresa      === empresa);
    if (analista    !== "todos") f = f.filter(r => r.responsavel  === analista);
    if (competencia !== "todas") f = f.filter(r => r.competencia  === competencia);
    if (soNaoFat)                f = f.filter(r => !r.progress?.p5_nf);
    const headers = ["Analista","Empresa","Tipo","Competência","Cliente","PEP","Profissional","Val. Venda","Hrs","Val. Total","Val. Líquido","Status","P1 Extrair","P2 Racional","P3 Envio Com.","P3 Retorno Com.","P3 Data Retorno","P4 Envio Cliente","P4 Aprovação","P4 Data Aprov.","P5 NF Emitida","P5 Data NF","P5 No Corte","NF","Obs","Atualizado em"];
    const rows = f.map(r => {
      const p = r.progress || {};
      return [r.responsavel,r.empresa,r.tipo,r.competencia,r.cliente,r.pep,r.profissional,r.valorVenda,r.hrsAprovadas,r.valorTotal,r.valorLiquido,calcStatus(p),p.p1_extrair?"Sim":"Não",p.p2_racional?"Sim":"Não",p.p3_envio_com?"Sim":"Não",p.p3_retorno_com?"Sim":"Não",p.p3_data_retorno||"",p.p4_envio_cli?"Sim":"Não",p.p4_aprovacao?"Sim":"Não",p.p4_data_aprov||"",p.p5_nf?"Sim":"Não",p.p5_data_nf||"",p.p5_no_corte?"Sim":"Não",r.nfFile||"",r.obs||"",fmtDT(r.updatedAt)].map(v => `"${String(v).replace(/"/g,'""')}"`).join(",");
    });
    const csv  = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    const label = [empresa !== "todas" ? empresa : "TodasEmpresas", analista !== "todos" ? analista : "TodosAnalistas", competencia !== "todas" ? competencia.replace("/","-") : "TodasComp", soNaoFat ? "NaoFaturado" : ""].filter(Boolean).join("_");
    a.href = url; a.download = `FCamara_Billing_${label}.csv`; a.click();
    URL.revokeObjectURL(url);
    onClose();
  }

  return (
    <Modal title="Exportar para Excel / CSV" onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div><label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Empresa</label>
          <select style={inp} value={empresa} onChange={e => setEmpresa(e.target.value)}>
            <option value="todas">Todas</option>
            {EMPRESAS.map(e => <option key={e.cod} value={e.cod}>{e.cod} — {e.nome}</option>)}
          </select></div>
        <div><label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Analista</label>
          <select style={inp} value={analista} onChange={e => setAnalista(e.target.value)}>
            <option value="todos">Todos</option>
            {analistas.map(a => <option key={a}>{a}</option>)}
          </select></div>
        <div><label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Competência</label>
          <select style={inp} value={competencia} onChange={e => setComp(e.target.value)}>
            <option value="todas">Todas</option>
            {competencias.map(c => <option key={c}>{c}</option>)}
          </select></div>
        <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 2 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={soNaoFat} onChange={e => setSoNaoFat(e.target.checked)} style={{ width: 16, height: 16 }} />
            Somente não faturado
          </label>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Btn onClick={onClose}>Cancelar</Btn>
        <Btn primary onClick={doExport}>⬇ Exportar CSV</Btn>
      </div>
    </Modal>
  );
}

// ─── HISTORY MODAL ────────────────────────────────────────────────────────────

function HistoryModal({ history, onClose }) {
  return (
    <Modal title="Histórico de importações" onClose={onClose} wide>
      {history.length === 0
        ? <p style={{ fontSize: 13, color: "#9ca3af" }}>Nenhuma importação registrada.</p>
        : <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Data / Hora","Usuário","Competência","Empresa","Tipo","Modo","Registros","Nota"].map(h =>
                    <th key={h} style={{ padding: "8px 10px", textAlign: "left", borderBottom: "1px solid #e5e7eb", fontWeight: 600, color: "#6b7280", whiteSpace: "nowrap" }}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {[...history].reverse().map(h => (
                  <tr key={h.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{fmtDT(h.date)}</td>
                    <td style={{ padding: "8px 10px" }}><Badge label={h.user} color="purple" small /></td>
                    <td style={{ padding: "8px 10px" }}>{h.competencia}</td>
                    <td style={{ padding: "8px 10px" }}>{h.empresa}</td>
                    <td style={{ padding: "8px 10px" }}>{h.tipo}</td>
                    <td style={{ padding: "8px 10px" }}><Badge label={h.mode === "replace" ? "Substituição" : "Adição"} color={h.mode === "replace" ? "red" : "green"} small /></td>
                    <td style={{ padding: "8px 10px", fontWeight: 700 }}>{h.count}</td>
                    <td style={{ padding: "8px 10px", color: "#6b7280" }}>{h.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      }
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <Btn onClick={onClose}>Fechar</Btn>
      </div>
    </Modal>
  );
}

// ─── TEAM VIEW ────────────────────────────────────────────────────────────────

function TeamView({ records, analista, isAdmin, onUpdate, competenciaAtual, onCompetenciaChange }) {
  const [empresa, setEmpresa]         = useState("");
  const [tipo, setTipo]               = useState("");
  const [filterAnalista, setFiltAnal] = useState("todos");
  const [filterComp, setFiltComp]     = useState("todas");
  const [openRecord, setOpenRecord]   = useState(null);
  const [showComp, setShowComp]       = useState(false);

  const baseRecords   = isAdmin ? records : records.filter(r => r.responsavel === analista);
  const empresasUsed  = [...new Set(baseRecords.map(r => r.empresa))];
  const tiposUsed     = empresa ? [...new Set(baseRecords.filter(r => r.empresa === empresa).map(r => r.tipo))] : [];
  const analistas     = [...new Set(records.map(r => r.responsavel))].sort();
  const competencias  = [...new Set(records.map(r => r.competencia))].sort();

  let filtered = baseRecords;
  if (empresa)              filtered = filtered.filter(r => r.empresa      === empresa);
  if (tipo)                 filtered = filtered.filter(r => r.tipo         === tipo);
  if (isAdmin && filterAnalista !== "todos") filtered = filtered.filter(r => r.responsavel === filterAnalista);
  if (filterComp !== "todas")                filtered = filtered.filter(r => r.competencia  === filterComp);

  const grouped = {};
  filtered.forEach(r => {
    const key = r.cliente + "|" + r.pep;
    if (!grouped[key]) grouped[key] = { cliente: r.cliente, pep: r.pep, records: [] };
    grouped[key].records.push(r);
  });

  return (
    <div>
      {showComp  && <CompetenciaModal current={competenciaAtual} onClose={() => setShowComp(false)}  onConfirm={v => { onCompetenciaChange(v); setShowComp(false); }} />}
      {openRecord && <TimelineModal record={openRecord} onClose={() => setOpenRecord(null)} onSave={updated => { onUpdate(updated); setOpenRecord(null); }} />}

      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: 1, fontSize: 16, fontWeight: 700 }}>{isAdmin ? "Visão completa — todos os analistas" : `Olá, ${analista}`}</div>
        <button onClick={() => setShowComp(true)} style={{ fontSize: 12, color: "#1d4ed8", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 20, padding: "4px 14px", cursor: "pointer" }}>
          📅 {competenciaAtual}
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <select style={{ ...inp, width: "auto", flex: 1 }} value={empresa} onChange={e => { setEmpresa(e.target.value); setTipo(""); }}>
          <option value="">Selecione a empresa</option>
          {(isAdmin ? EMPRESAS : EMPRESAS.filter(e => empresasUsed.includes(e.cod))).map(e => <option key={e.cod} value={e.cod}>{e.cod} — {e.nome}</option>)}
        </select>
        {empresa && <select style={{ ...inp, width: "auto", flex: 1 }} value={tipo} onChange={e => setTipo(e.target.value)}>
          <option value="">Todos os tipos</option>
          {tiposUsed.map(t => <option key={t}>{t}</option>)}
        </select>}
        {isAdmin && <select style={{ ...inp, width: "auto" }} value={filterAnalista} onChange={e => setFiltAnal(e.target.value)}>
          <option value="todos">Todos os analistas</option>
          {analistas.map(a => <option key={a}>{a}</option>)}
        </select>}
        {competencias.length > 1 && <select style={{ ...inp, width: "auto" }} value={filterComp} onChange={e => setFiltComp(e.target.value)}>
          <option value="todas">Todas as competências</option>
          {competencias.map(c => <option key={c}>{c}</option>)}
        </select>}
      </div>

      {!empresa && <div style={{ textAlign: "center", padding: "3rem", color: "#9ca3af" }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>🏢</div>
        <div style={{ fontSize: 14 }}>Selecione a empresa para ver os registros</div>
      </div>}

      {empresa && Object.values(grouped).length === 0 && <div style={{ textAlign: "center", padding: "3rem", color: "#9ca3af" }}>Nenhum registro encontrado.</div>}

      {empresa && Object.values(grouped).map(g => (
        <div key={g.cliente + g.pep} style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
            🏦 {g.cliente} <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 400 }}>{g.pep}</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {[isAdmin && "Analista","Profissional","Período","Val. Venda","Hrs","Val. Total","Val. Líquido","Status","Atualizado","Ações"].filter(Boolean).map(h =>
                    <th key={h} style={{ padding: "8px 10px", textAlign: "left", borderBottom: "1px solid #e5e7eb", fontWeight: 600, color: "#6b7280", whiteSpace: "nowrap" }}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {g.records.map(r => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    {isAdmin && <td style={{ padding: "8px 10px" }}><Badge label={r.responsavel} color="purple" small /></td>}
                    <td style={{ padding: "8px 10px", fontWeight: 500 }}>{r.profissional}</td>
                    <td style={{ padding: "8px 10px", color: "#6b7280", whiteSpace: "nowrap" }}>{r.inicio} → {r.fim}</td>
                    <td style={{ padding: "8px 10px" }}>{fmtShort(r.valorVenda)}</td>
                    <td style={{ padding: "8px 10px" }}>{r.hrsAprovadas}h</td>
                    <td style={{ padding: "8px 10px", fontWeight: 500 }}>{fmtShort(r.valorTotal)}</td>
                    <td style={{ padding: "8px 10px" }}>{fmtShort(r.valorLiquido)}</td>
                    <td style={{ padding: "8px 10px" }}><Badge label={calcStatus(r.progress)} color={calcStatusColor(r.progress)} small /></td>
                    <td style={{ padding: "8px 10px", color: "#9ca3af", fontSize: 11, whiteSpace: "nowrap" }}>{r.updatedAt ? fmtDT(r.updatedAt) : "—"}</td>
                    <td style={{ padding: "8px 10px" }}><Btn small onClick={() => setOpenRecord(r)}>Timeline</Btn></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

function Dashboard({ records }) {
  const [filterEmpresa, setFE] = useState("todas");
  const [filterComp,    setFC] = useState("todas");
  const competencias = [...new Set(records.map(r => r.competencia))].sort();
  let f = records;
  if (filterEmpresa !== "todas") f = f.filter(r => r.empresa     === filterEmpresa);
  if (filterComp    !== "todas") f = f.filter(r => r.competencia === filterComp);

  const totalValor = f.reduce((a, r) => a + (r.valorTotal || 0), 0);
  const faturados  = f.filter(r => r.progress?.p5_nf);
  const naoFat     = f.filter(r => !r.progress?.p5_nf);
  const valorFat   = faturados.reduce((a, r) => a + (r.valorTotal || 0), 0);
  const valorRep   = naoFat.reduce((a, r) => a + (r.valorTotal || 0), 0);

  const byAnalista = {};
  f.forEach(r => {
    if (!byAnalista[r.responsavel]) byAnalista[r.responsavel] = { total: 0, fat: 0, rep: 0, cnt: 0, fatCnt: 0 };
    byAnalista[r.responsavel].total += r.valorTotal || 0;
    byAnalista[r.responsavel].cnt   += 1;
    if (r.progress?.p5_nf) { byAnalista[r.responsavel].fat    += r.valorTotal || 0; byAnalista[r.responsavel].fatCnt += 1; }
    else                     byAnalista[r.responsavel].rep    += r.valorTotal || 0;
  });

  const byEmpresa = {};
  f.forEach(r => {
    if (!byEmpresa[r.empresa]) byEmpresa[r.empresa] = { total: 0, fat: 0 };
    byEmpresa[r.empresa].total += r.valorTotal || 0;
    if (r.progress?.p5_nf) byEmpresa[r.empresa].fat += r.valorTotal || 0;
  });

  const MetCard = ({ label, value, color, sub }) => (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "14px 16px" }}>
      <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 19, fontWeight: 700, color: color || "#111827" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{sub}</div>}
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <select style={{ ...inp, width: "auto" }} value={filterEmpresa} onChange={e => setFE(e.target.value)}>
          <option value="todas">Todas as empresas</option>
          {EMPRESAS.map(e => <option key={e.cod} value={e.cod}>{e.cod} — {e.nome}</option>)}
        </select>
        <select style={{ ...inp, width: "auto" }} value={filterComp} onChange={e => setFC(e.target.value)}>
          <option value="todas">Todas as competências</option>
          {competencias.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 24 }}>
        <MetCard label="Total registros" value={f.length} />
        <MetCard label="Valor total"     value={fmtShort(totalValor)} color="#1d4ed8" />
        <MetCard label="Faturado"        value={fmtShort(valorFat)} color="#166534" sub={`${faturados.length} registros`} />
        <MetCard label="Represado"       value={fmtShort(valorRep)} color="#854d0e" sub={`${naoFat.length} registros`} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Por analista</div>
          {Object.entries(byAnalista).map(([a, d]) => {
            const pct = d.total > 0 ? Math.round((d.fat / d.total) * 100) : 0;
            const bar = pct === 100 ? "#16a34a" : pct > 50 ? "#2563eb" : "#d97706";
            return (
              <div key={a} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                  <span style={{ fontWeight: 600 }}>{a}</span>
                  <span style={{ color: "#6b7280" }}>{pct}% faturado · {d.cnt} registros</span>
                </div>
                <div style={{ height: 6, background: "#f3f4f6", borderRadius: 3 }}>
                  <div style={{ height: 6, borderRadius: 3, width: `${pct}%`, background: bar }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9ca3af", marginTop: 3 }}>
                  <span>Fat: {fmtShort(d.fat)}</span><span>Rep: {fmtShort(d.rep)}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Por empresa do grupo</div>
          {Object.entries(byEmpresa).map(([cod, d]) => {
            const emp = EMPRESAS.find(e => e.cod === cod);
            const pct = d.total > 0 ? Math.round((d.fat / d.total) * 100) : 0;
            return (
              <div key={cod} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
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

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Não faturados</div>
        {naoFat.length === 0
          ? <div style={{ textAlign: "center", padding: "1rem", color: "#9ca3af", fontSize: 13 }}>🎉 Tudo faturado!</div>
          : <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead><tr style={{ background: "#f8fafc" }}>
                  {["Analista","Empresa","Competência","Cliente","Profissional","Val. Total","Status","Atualizado"].map(h =>
                    <th key={h} style={{ padding: "8px 10px", textAlign: "left", borderBottom: "1px solid #e5e7eb", fontWeight: 600, color: "#6b7280", whiteSpace: "nowrap" }}>{h}</th>
                  )}
                </tr></thead>
                <tbody>
                  {naoFat.slice(0, 100).map(r => (
                    <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "7px 10px" }}>{r.responsavel}</td>
                      <td style={{ padding: "7px 10px" }}>{r.empresa}</td>
                      <td style={{ padding: "7px 10px" }}>{r.competencia}</td>
                      <td style={{ padding: "7px 10px", fontWeight: 500 }}>{r.cliente}</td>
                      <td style={{ padding: "7px 10px", color: "#6b7280" }}>{r.profissional}</td>
                      <td style={{ padding: "7px 10px" }}>{fmtShort(r.valorTotal)}</td>
                      <td style={{ padding: "7px 10px" }}><Badge label={calcStatus(r.progress)} color={calcStatusColor(r.progress)} small /></td>
                      <td style={{ padding: "7px 10px", color: "#9ca3af", fontSize: 11 }}>{fmtDT(r.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {naoFat.length > 100 && <div style={{ fontSize: 11, color: "#9ca3af", padding: "8px 10px" }}>Exibindo 100 de {naoFat.length}. Use exportação para ver todos.</div>}
            </div>
        }
      </div>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────

function App() {
  const [state, setState]       = useState(() => loadState());
  const [view, setView]         = useState("login");
  const [analista, setAnalista] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [activeTab, setTab]     = useState("time");
  const [showImport, setImp]    = useState(false);
  const [showExport, setExp]    = useState(false);
  const [showHistory, setHist]  = useState(false);
  const [showComp, setComp]     = useState(false);

  useEffect(() => saveState(state), [state]);

  const isAdmin = analista === ADMIN_NAME;

  function login(nome) {
    setAnalista(nome);
    setView("app");
    setComp(true);
  }

  function addAndLogin() {
    const n = novoNome.trim();
    if (!n) return;
    setState(s => ({ ...s, analistas: [...new Set([...s.analistas, n])] }));
    login(n);
    setNovoNome("");
  }

  function handleUpdate(updated) {
    setState(s => ({ ...s, records: s.records.map(r => r.id === updated.id ? updated : r) }));
  }

  function handleImport({ records: newRecs, competencia, empresa, tipo, mode, note }) {
    setState(s => {
      let base = s.records;
      if (mode === "replace") {
        base = base.filter(r => !(r.competencia === competencia && r.empresa === empresa && r.tipo === tipo));
      }
      const entry = { id: genId(), date: nowISO(), competencia, empresa, tipo, mode, count: newRecs.length, user: ADMIN_NAME, note };
      return { ...s, records: [...base, ...newRecs], competenciaAtual: competencia, importHistory: [...s.importHistory, entry] };
    });
  }

  function handleCompetencia(val) {
    setState(s => ({ ...s, competenciaAtual: val }));
    setComp(false);
  }

  // ── LOGIN ──
  if (view === "login") {
    const allUsers = [...new Set([ADMIN_NAME, ...state.analistas])];
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 100%)", fontFamily: "system-ui,sans-serif" }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: "36px 40px", width: 420, maxWidth: "92vw", boxShadow: "0 16px 48px rgba(0,0,0,.2)" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📊</div>
            <h1 style={{ fontSize: 19, fontWeight: 800, color: "#1d4ed8", lineHeight: 1.3, margin: 0 }}>Controle de Faturamento<br />Grupo Fcamara</h1>
            <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>{APP_VERSION}</p>
          </div>

          <p style={{ fontSize: 13, color: "#374151", fontWeight: 700, marginBottom: 10 }}>Selecione seu perfil</p>

          {allUsers.map(a => (
            <button key={a} onClick={() => login(a)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "10px 14px", marginBottom: 6, borderRadius: 8, border: `1px solid ${a === ADMIN_NAME ? "#bfdbfe" : "#e5e7eb"}`, background: a === ADMIN_NAME ? "#eff6ff" : "#f8fafc", cursor: "pointer", fontSize: 14, fontWeight: 500, color: "#111827" }}
              onMouseEnter={e => e.currentTarget.style.background = a === ADMIN_NAME ? "#dbeafe" : "#f0f4ff"}
              onMouseLeave={e => e.currentTarget.style.background = a === ADMIN_NAME ? "#eff6ff" : "#f8fafc"}>
              <span style={{ fontSize: 18 }}>{a === ADMIN_NAME ? "👑" : "👤"}</span>
              <span style={{ flex: 1 }}>{a}</span>
              {a === ADMIN_NAME && <Badge label="Admin" color="blue" small />}
            </button>
          ))}

          <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 14, marginTop: 10 }}>
            <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>Novo analista?</p>
            <div style={{ display: "flex", gap: 6 }}>
              <input value={novoNome} onChange={e => setNovoNome(e.target.value)} onKeyDown={e => e.key === "Enter" && addAndLogin()} placeholder="Nome completo" style={{ ...inp, flex: 1 }} />
              <Btn primary onClick={addAndLogin}>Entrar</Btn>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── APP ──
  const tabs = [
    { id: "time", label: isAdmin ? "Visão geral" : "Minha visão" },
    { id: "dash", label: "Dashboard" },
  ];

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,sans-serif", color: "#111827", minHeight: "100vh", background: "#f8fafc" }}>
      {showImport  && <ImportModal onImport={handleImport} onClose={() => setImp(false)} />}
      {showExport  && <ExportModal records={state.records} onClose={() => setExp(false)} />}
      {showHistory && <HistoryModal history={state.importHistory} onClose={() => setHist(false)} />}
      {showComp    && <CompetenciaModal current={state.competenciaAtual} onConfirm={handleCompetencia} onClose={() => setComp(false)} />}

      {/* Topbar */}
      <div style={{ background: "#1d4ed8", color: "#fff", padding: "0 20px", display: "flex", alignItems: "center", gap: 8, height: 52, flexWrap: "wrap" }}>
        <span style={{ fontSize: 14, fontWeight: 800, flex: 1 }}>📊 Faturamento Grupo Fcamara</span>
        <span style={{ fontSize: 11, opacity: .8, marginRight: 4 }}>
          {isAdmin ? "👑 " : "👤 "}{analista} · comp. {state.competenciaAtual}
        </span>
        <button onClick={() => setComp(true)} style={{ background: "rgba(255,255,255,.15)", border: "none", color: "#fff", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>📅 Alterar</button>
        {isAdmin && <>
          <button onClick={() => setImp(true)}  style={{ background: "rgba(255,255,255,.15)", border: "none", color: "#fff", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>⬆ Importar</button>
          <button onClick={() => setExp(true)}  style={{ background: "rgba(255,255,255,.15)", border: "none", color: "#fff", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>⬇ Exportar</button>
          <button onClick={() => setHist(true)} style={{ background: "rgba(255,255,255,.15)", border: "none", color: "#fff", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>🕐 Histórico</button>
        </>}
        <button onClick={() => setView("login")} style={{ background: "rgba(255,255,255,.12)", border: "none", color: "#fff", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>Sair</button>
      </div>

      {/* Admin notice */}
      {isAdmin && <div style={{ background: "#fffbeb", borderBottom: "1px solid #fde68a", padding: "6px 20px", fontSize: 12, color: "#92400e" }}>
        👑 Você está como <strong>Daniela (admin)</strong> — acesso completo a todos os analistas, empresas e competências. Importação e exportação habilitadas.
      </div>}

      {/* Tabs */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 20px", display: "flex", gap: 4 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "14px 18px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: activeTab === t.id ? 700 : 400, color: activeTab === t.id ? "#1d4ed8" : "#6b7280", borderBottom: activeTab === t.id ? "2px solid #1d4ed8" : "2px solid transparent" }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px" }}>
        {activeTab === "time" && <TeamView records={state.records} analista={analista} isAdmin={isAdmin} onUpdate={handleUpdate} competenciaAtual={state.competenciaAtual} onCompetenciaChange={handleCompetencia} />}
        {activeTab === "dash" && <Dashboard records={state.records} />}
      </div>
    </div>
  );
}


export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "FCamara Billing" }] }),
  component: App,
});
