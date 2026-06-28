import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Controle de faturamento" },
      { name: "description", content: "Controle de faturamento por analista e PEP." },
    ],
  }),
  component: App,
});

// ── Constants ────────────────────────────────────────────────────────────────
const STEPS = [
  { id: "s1", label: "P1", name: "Extrair dados" },
  { id: "s2", label: "P2", name: "Montar racional" },
  { id: "s3", label: "P3", name: "Validação comercial" },
  { id: "s4", label: "P4", name: "Aprovação cliente" },
  { id: "s5", label: "P5", name: "NF emitida" },
];

const STATUS_ORDER = ["wait", "active", "done", "block"] as const;
type StepStatus = (typeof STATUS_ORDER)[number];

interface ClientStep { id: string; status: StepStatus; }
interface Client {
  id: string;
  nome: string;
  pep: string;
  analista: string;
  valor: number;
  dataCorte: string;
  passCom: boolean;
  obs: string;
  steps: ClientStep[];
}

const SAMPLE_CLIENTS = [
  { nome: "Banco ABC Brasil", pep: "BR02CLP00005.1.1", analista: "Fernanda", valor: 296926, dataCorte: "25/07/2025", passCom: true },
  { nome: "Banco BS2", pep: "BR02CLP00100.1.1", analista: "Fernanda", valor: 192397, dataCorte: "25/07/2025", passCom: false },
  { nome: "Banco Digio", pep: "BR02CLP00007.1.1", analista: "Fernanda", valor: 72815, dataCorte: "25/07/2025", passCom: true },
  { nome: "Banco Ourinvest", pep: "BR07CLP00015.0.1", analista: "Fernanda", valor: 431002, dataCorte: "25/07/2025", passCom: false },
  { nome: "Banco Triângulo", pep: "BR02CLP00129.1.1", analista: "Fernanda", valor: 79374, dataCorte: "25/07/2025", passCom: true },
  { nome: "Bulla Instituição", pep: "BR02CLP000092", analista: "Fernanda", valor: 201099, dataCorte: "25/07/2025", passCom: false },
  { nome: "Grani Amici", pep: "BR02CLP00073", analista: "Fernanda", valor: 173362, dataCorte: "25/07/2025", passCom: false },
  { nome: "Too Seguros", pep: "BR02CLP00018.1.1", analista: "Fernanda", valor: 7993, dataCorte: "25/07/2025", passCom: false },
  { nome: "Travelex Banco", pep: "BR02CLP00004.0.1", analista: "Fernanda", valor: 219249, dataCorte: "25/07/2025", passCom: true },
  { nome: "Itsseg Corretora", pep: "BR02CLP00180.1.1", analista: "Fernanda", valor: 80361, dataCorte: "25/07/2025", passCom: false },
  { nome: "VR Benefícios", pep: "BR02CLP00019.1.1", analista: "Fernanda", valor: 105170, dataCorte: "25/07/2025", passCom: true },
  { nome: "Diagnósticos da América", pep: "BR02CLP00041", analista: "Layza Arruda", valor: 1847021, dataCorte: "25/07/2025", passCom: true },
  { nome: "Dr. Consulta", pep: "BR02CLP00022.1.1", analista: "Layza Arruda", valor: 168155, dataCorte: "25/07/2025", passCom: false },
  { nome: "Grupo Casas Bahia", pep: "BR02CLP00042.0.3", analista: "Layza Arruda", valor: 987432, dataCorte: "25/07/2025", passCom: true },
];

function makeClient(raw: Partial<Client> & { nome: string; pep: string; analista: string }): Client {
  return {
    id: "c" + Date.now() + Math.random().toString(36).slice(2),
    nome: raw.nome,
    pep: raw.pep,
    analista: raw.analista,
    valor: raw.valor || 0,
    dataCorte: raw.dataCorte || "—",
    passCom: raw.passCom || false,
    obs: raw.obs || "",
    steps: STEPS.map((s) => ({ id: s.id, status: "wait" as StepStatus })),
  };
}

const fmt = (n: number) =>
  "R$ " + Math.round(n).toLocaleString("pt-BR", { minimumFractionDigits: 0 });

function getClientStatus(client: Client): { label: string; color: string } {
  const steps = client.steps;
  if (steps[4].status === "done") return { label: "Faturado", color: "green" };
  if (steps.some((s) => s.status === "block")) return { label: "Bloqueado", color: "red" };
  const lastDone = [...steps].reverse().findIndex((s) => s.status === "done");
  if (lastDone >= 0) return { label: `P${5 - lastDone} pendente`, color: "yellow" };
  const hasActive = steps.some((s) => s.status === "active");
  if (hasActive) return { label: "Em andamento", color: "blue" };
  return { label: "Aguardando", color: "gray" };
}

function avatarInitials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function cycleStatus(current: StepStatus): StepStatus {
  const idx = STATUS_ORDER.indexOf(current);
  return STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
}

const LS_KEY = "billing_control_v1";

function loadData(): Client[] {
  if (typeof window === "undefined") return SAMPLE_CLIENTS.map(makeClient);
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return SAMPLE_CLIENTS.map(makeClient);
}

function saveData(clients: Client[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(clients)); } catch {}
}

const statusColors: Record<StepStatus, { bg: string; text: string; border: string }> = {
  done:   { bg: "#dcfce7", text: "#166534", border: "#bbf7d0" },
  active: { bg: "#dbeafe", text: "#1e40af", border: "#bfdbfe" },
  block:  { bg: "#fee2e2", text: "#991b1b", border: "#fecaca" },
  wait:   { bg: "#f3f4f6", text: "#6b7280", border: "#e5e7eb" },
};

const tagColors: Record<string, { bg: string; text: string }> = {
  green:  { bg: "#dcfce7", text: "#166534" },
  red:    { bg: "#fee2e2", text: "#991b1b" },
  yellow: { bg: "#fef9c3", text: "#854d0e" },
  blue:   { bg: "#dbeafe", text: "#1e40af" },
  gray:   { bg: "#f3f4f6", text: "#6b7280" },
};

function StepDot({ status, name, label, onCycle }: { stepId: string; status: StepStatus; name: string; label: string; onCycle: () => void }) {
  const colors = statusColors[status];
  const icon = status === "done" ? "✓" : status === "block" ? "✕" : label;
  return (
    <button
      title={`${name} — clique para avançar`}
      onClick={onCycle}
      style={{
        width: 28, height: 28, borderRadius: "50%",
        background: colors.bg, color: colors.text,
        border: `1.5px solid ${colors.border}`,
        fontSize: 11, fontWeight: 600, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "transform .1s", flexShrink: 0,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.12)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {icon}
    </button>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  const c = tagColors[color] || tagColors.gray;
  return (
    <span style={{
      fontSize: 11, padding: "2px 9px", borderRadius: 20,
      background: c.bg, color: c.text, fontWeight: 500, whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  const textColor =
    color === "green" ? "#166534" :
    color === "yellow" ? "#854d0e" :
    color === "red" ? "#991b1b" :
    color === "blue" ? "#1e40af" : "#111827";
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "14px 16px" }}>
      <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600, color: textColor }}>{value}</div>
    </div>
  );
}

function AnalystCard({ analista, clients, onClick }: { analista: string; clients: Client[]; onClick: () => void }) {
  const total = clients.length;
  const faturado = clients.filter((c) => c.steps[4].status === "done").length;
  const bloqueado = clients.filter((c) => c.steps.some((s) => s.status === "block")).length;
  const emAndamento = total - faturado;
  const valFat = clients.filter((c) => c.steps[4].status === "done").reduce((a, c) => a + c.valor, 0);
  const valRep = clients.filter((c) => c.steps[4].status !== "done").reduce((a, c) => a + c.valor, 0);
  const pct = total > 0 ? Math.round((faturado / total) * 100) : 0;
  const barColor = pct === 100 ? "#16a34a" : pct > 50 ? "#2563eb" : "#d97706";
  return (
    <div
      onClick={onClick}
      style={{
        background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12,
        padding: "16px 20px", cursor: "pointer",
        transition: "border-color .15s, box-shadow .15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#93c5fd";
        e.currentTarget.style.boxShadow = "0 1px 8px rgba(37,99,235,.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#e5e7eb";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 38, height: 38, borderRadius: "50%",
          background: "#dbeafe", color: "#1e40af",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 700, flexShrink: 0,
        }}>{avatarInitials(analista)}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{analista}</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>{total} clientes · {fmt(valFat + valRep)} total</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>Progresso</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: barColor }}>{pct}%</div>
        </div>
      </div>
      <div style={{ height: 6, background: "#f3f4f6", borderRadius: 3, marginBottom: 10 }}>
        <div style={{ height: 6, borderRadius: 3, width: `${pct}%`, background: barColor, transition: "width .4s" }} />
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <Badge label={`${faturado} faturados`} color="green" />
        <Badge label={`${emAndamento} em andamento`} color="yellow" />
        {bloqueado > 0 && <Badge label={`${bloqueado} bloqueados`} color="red" />}
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#6b7280" }}>
          Represado: <strong style={{ color: "#111827" }}>{fmt(valRep)}</strong>
        </span>
      </div>
    </div>
  );
}

function ClientRow({ client, onStepCycle, onObsChange }: { client: Client; onStepCycle: (id: string, i: number) => void; onObsChange: (id: string, v: string) => void }) {
  const status = getClientStatus(client);
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "12px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
        <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{client.nome}</span>
        <Badge label={status.label} color={status.color} />
        <span style={{
          fontSize: 11, padding: "2px 8px", borderRadius: 20,
          background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb",
        }}>{client.analista}</span>
      </div>
      <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 8 }}>
        {client.pep} · corte: {client.dataCorte}
        {client.passCom && " · passa pelo comercial"}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 10 }}>
        {STEPS.map((s, i) => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <StepDot
              stepId={s.id}
              status={client.steps[i].status}
              name={s.name}
              label={s.label}
              onCycle={() => onStepCycle(client.id, i)}
            />
            {i < STEPS.length - 1 && (<span style={{ color: "#d1d5db", fontSize: 10 }}>›</span>)}
          </div>
        ))}
        <span style={{ marginLeft: 8, fontSize: 12, color: "#6b7280" }}>{fmt(client.valor)}</span>
      </div>
      <input
        type="text"
        value={client.obs}
        onChange={(e) => onObsChange(client.id, e.target.value)}
        placeholder="Observações livres..."
        style={{
          width: "100%", border: "none", borderBottom: "1px solid #e5e7eb",
          background: "transparent", fontSize: 12, color: "#6b7280",
          padding: "2px 0", outline: "none", fontFamily: "inherit",
        }}
        onFocus={(e) => (e.target.style.borderBottomColor = "#93c5fd")}
        onBlur={(e) => (e.target.style.borderBottomColor = "#e5e7eb")}
      />
    </div>
  );
}

function AddClientModal({ analysts, onSave, onClose }: { analysts: string[]; onSave: (f: { nome: string; pep: string; analista: string; valor: number; dataCorte: string; passCom: boolean }) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    nome: "", pep: "", analista: analysts[0] || "", valor: "",
    dataCorte: "", passCom: false,
  });
  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 10px", borderRadius: 8,
    border: "1px solid #d1d5db", fontSize: 13, fontFamily: "inherit",
    marginTop: 4, boxSizing: "border-box",
  };
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: 14, padding: "24px 28px",
        width: 480, maxWidth: "92vw", boxShadow: "0 8px 32px rgba(0,0,0,.16)",
      }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 18 }}>Novo cliente / PEP</h2>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: "#6b7280" }}>Nome do cliente</label>
          <input style={inputStyle} value={form.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Ex: Banco ABC Brasil S.A." />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: "#6b7280" }}>PEP raiz</label>
            <input style={inputStyle} value={form.pep} onChange={(e) => set("pep", e.target.value)} placeholder="BR02CLP00000.0.0" />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#6b7280" }}>Analista</label>
            <select style={inputStyle} value={form.analista} onChange={(e) => set("analista", e.target.value)}>
              {analysts.map((a) => <option key={a}>{a}</option>)}
              <option value="__new__">+ Novo analista</option>
            </select>
          </div>
        </div>
        {form.analista === "__new__" && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: "#6b7280" }}>Nome do novo analista</label>
            <input style={inputStyle} id="new-analyst" placeholder="Nome completo" />
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: "#6b7280" }}>Valor total (R$)</label>
            <input style={inputStyle} type="number" value={form.valor} onChange={(e) => set("valor", e.target.value)} placeholder="0" />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#6b7280" }}>Data de corte</label>
            <input style={inputStyle} value={form.dataCorte} onChange={(e) => set("dataCorte", e.target.value)} placeholder="25/07/2025" />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <input type="checkbox" id="passCom" checked={form.passCom} onChange={(e) => set("passCom", e.target.checked)} />
          <label htmlFor="passCom" style={{ fontSize: 13, color: "#374151" }}>Passa pela validação comercial</label>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            padding: "8px 16px", borderRadius: 8, border: "1px solid #d1d5db",
            background: "transparent", fontSize: 13, cursor: "pointer",
          }}>Cancelar</button>
          <button onClick={() => {
            if (!form.nome.trim() || !form.pep.trim()) { alert("Informe nome e PEP."); return; }
            const analista = form.analista === "__new__"
              ? ((document.getElementById("new-analyst") as HTMLInputElement | null)?.value?.trim() || "Sem analista")
              : form.analista;
            onSave({ ...form, analista, valor: parseFloat(form.valor) || 0 });
          }} style={{
            padding: "8px 20px", borderRadius: 8, border: "none",
            background: "#2563eb", color: "#fff", fontSize: 13,
            fontWeight: 600, cursor: "pointer",
          }}>Adicionar</button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [clients, setClients] = useState<Client[]>(() => loadData());
  const [activeTab, setActiveTab] = useState("analistas");
  const [filterAnalista, setFilterAnalista] = useState("todos");
  const [mesRef, setMesRef] = useState("07/2025");
  const [showAddModal, setShowAddModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [importMsg, setImportMsg] = useState("");

  useEffect(() => saveData(clients), [clients]);

  const analysts = [...new Set(clients.map((c) => c.analista))];
  const totalValor = clients.reduce((a, c) => a + c.valor, 0);
  const totalFat = clients.filter((c) => c.steps[4].status === "done").reduce((a, c) => a + c.valor, 0);
  const totalRep = clients.filter((c) => c.steps[4].status !== "done").reduce((a, c) => a + c.valor, 0);
  const bloqueados = clients.filter((c) => c.steps.some((s) => s.status === "block")).length;

  function handleStepCycle(clientId: string, stepIdx: number) {
    setClients((prev) =>
      prev.map((c) =>
        c.id !== clientId ? c : {
          ...c,
          steps: c.steps.map((s, i) => i !== stepIdx ? s : { ...s, status: cycleStatus(s.status) }),
        }
      )
    );
  }

  function handleObsChange(clientId: string, value: string) {
    setClients((prev) => prev.map((c) => (c.id !== clientId ? c : { ...c, obs: value })));
  }

  function handleAddClient(form: { nome: string; pep: string; analista: string; valor: number; dataCorte: string; passCom: boolean }) {
    setClients((prev) => [...prev, makeClient(form)]);
    setShowAddModal(false);
  }

  function handleImport() {
    if (!importText.trim()) { setImportMsg("Cole os dados antes de processar."); return; }
    const lines = importText.trim().split("\n").filter((l) => l.trim());
    let added = 0, updated = 0;
    const newClients = [...clients];
    lines.slice(1).forEach((line) => {
      const cols = line.split("\t");
      if (cols.length < 6) return;
      const analista = (cols[0] || "").trim();
      const nome = (cols[4] || "").trim();
      const pep = (cols[5] || "").trim();
      const valor = parseFloat((cols[13] || "0").replace(",", ".")) || 0;
      if (!nome || !pep) return;
      const existing = newClients.find((c) => c.pep === pep && c.analista === analista);
      if (existing) { existing.valor = valor; updated++; }
      else { newClients.push(makeClient({ nome, pep, analista, valor })); added++; }
    });
    setClients(newClients);
    setImportMsg(`✓ ${added} clientes adicionados, ${updated} atualizados.`);
  }

  const filteredClients = filterAnalista === "todos"
    ? clients
    : clients.filter((c) => c.analista === filterAnalista);

  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: "7px 18px", borderRadius: 8, border: "none", fontSize: 13,
    fontWeight: active ? 600 : 400, cursor: "pointer", transition: "background .15s",
    background: active ? "#fff" : "transparent",
    color: active ? "#111827" : "#6b7280",
    boxShadow: active ? "0 1px 4px rgba(0,0,0,.08)" : "none",
  });

  const inputStyle: React.CSSProperties = {
    padding: "7px 10px", borderRadius: 8, border: "1px solid #d1d5db",
    fontSize: 13, fontFamily: "inherit", background: "#fff",
  };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 16px", fontFamily: "system-ui, -apple-system, sans-serif", color: "#111827" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, flex: 1 }}>Controle de faturamento</h1>
        <span style={{ fontSize: 12, color: "#9ca3af" }}>Mês:</span>
        <input style={{ ...inputStyle, width: 90 }} value={mesRef} onChange={(e) => setMesRef(e.target.value)} />
        <button onClick={() => setShowAddModal(true)} style={{
          padding: "7px 16px", borderRadius: 8, border: "none",
          background: "#2563eb", color: "#fff", fontSize: 13,
          fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
        }}>+ Novo cliente</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 24 }}>
        <MetricCard label="Total receitas" value={clients.length} />
        <MetricCard label="Valor total" value={fmt(totalValor)} color="blue" />
        <MetricCard label="Faturado" value={fmt(totalFat)} color="green" />
        <MetricCard label="Represado" value={fmt(totalRep)} color="yellow" />
        <MetricCard label="Bloqueados" value={bloqueados} color={bloqueados > 0 ? "red" : "gray"} />
      </div>

      <div style={{ display: "flex", gap: 2, background: "#f3f4f6", borderRadius: 10, padding: 3, marginBottom: 20 }}>
        {[
          { id: "analistas", label: "Por analista" },
          { id: "clientes", label: "Clientes / PEPs" },
          { id: "importar", label: "Importar base" },
        ].map((t) => (
          <button key={t.id} style={btnStyle(activeTab === t.id)} onClick={() => setActiveTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {activeTab === "analistas" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>
            Analistas — clique para ver os clientes
          </div>
          {analysts.map((a) => (
            <AnalystCard
              key={a}
              analista={a}
              clients={clients.filter((c) => c.analista === a)}
              onClick={() => { setFilterAnalista(a); setActiveTab("clientes"); }}
            />
          ))}
        </div>
      )}

      {activeTab === "clientes" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <select style={inputStyle} value={filterAnalista} onChange={(e) => setFilterAnalista(e.target.value)}>
              <option value="todos">Todos os analistas</option>
              {analysts.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <button onClick={() => setShowAddModal(true)} style={{
              ...inputStyle, background: "transparent", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}>+ Novo cliente</button>
          </div>
          <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#9ca3af", marginBottom: 12, flexWrap: "wrap" }}>
            {([["✓", "#16a34a", "Concluído"], ["›", "#2563eb", "Em andamento"], ["·", "#d97706", "Aguardando"], ["✕", "#991b1b", "Bloqueado"]] as const).map(([sym, col, lbl]) => (
              <span key={lbl} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ color: col, fontWeight: 700 }}>{sym}</span> {lbl}
              </span>
            ))}
            <span style={{ color: "#d1d5db" }}>· Clique nos círculos para avançar o status</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filteredClients.length === 0 && (
              <div style={{ textAlign: "center", padding: "2rem", color: "#9ca3af" }}>Nenhum cliente encontrado.</div>
            )}
            {filteredClients.map((c) => (
              <ClientRow key={c.id} client={c} onStepCycle={handleStepCycle} onObsChange={handleObsChange} />
            ))}
          </div>
        </div>
      )}

      {activeTab === "importar" && (
        <div>
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16, lineHeight: 1.6 }}>
            Cole os dados exportados do sistema (formato TSV/Excel). O processo atualiza os valores sem apagar o progresso de status já registrado. Colunas esperadas: <strong>RESPONSÁVEL, TIPO, EMPRESA, COD CLIENTE, NOME CLIENTE, PEP, INICIO, FIM, ..., VALOR TOTAL</strong>
          </p>
          <div
            style={{
              border: "1.5px dashed #d1d5db", borderRadius: 10, padding: "1.5rem",
              textAlign: "center", color: "#9ca3af", fontSize: 13,
              cursor: "pointer", marginBottom: 16, transition: "border-color .2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#93c5fd")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#d1d5db")}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <div style={{ fontSize: 28, marginBottom: 6 }}>↑</div>
            Clique para selecionar o arquivo Excel / TSV
            <br /><span style={{ fontSize: 11 }}>ou use o campo abaixo para colar diretamente</span>
            <input type="file" id="file-input" accept=".xlsx,.csv,.tsv,.xlsm" style={{ display: "none" }} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Ou cole os dados aqui:</div>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="Cole aqui os dados copiados do Excel..."
            style={{
              width: "100%", minHeight: 140, padding: "10px 12px",
              border: "1px solid #d1d5db", borderRadius: 8, fontSize: 12,
              fontFamily: "monospace", resize: "vertical", boxSizing: "border-box",
              color: "#374151",
            }}
          />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
            <button onClick={handleImport} style={{
              padding: "8px 20px", borderRadius: 8, border: "none",
              background: "#2563eb", color: "#fff", fontSize: 13,
              fontWeight: 600, cursor: "pointer",
            }}>Processar importação</button>
          </div>
          {importMsg && (
            <div style={{
              marginTop: 12, fontSize: 13, padding: "10px 14px",
              borderRadius: 8, background: "#f0fdf4", color: "#166534",
              border: "1px solid #bbf7d0",
            }}>{importMsg}</div>
          )}
        </div>
      )}

      {showAddModal && (
        <AddClientModal
          analysts={analysts.length > 0 ? analysts : ["Fernanda", "Layza Arruda"]}
          onSave={handleAddClient}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
