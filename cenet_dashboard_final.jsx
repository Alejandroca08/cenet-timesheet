import { useState, useEffect, useRef } from "react";

const formatCOP = (n) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);

const hoursData = [
  { month: "Ene", hours: 40, amount: 1740000 },
  { month: "Feb", hours: 52, amount: 2262000 },
  { month: "Mar", hours: 38, amount: 1653000 },
  { month: "Abr", hours: 45, amount: 1957500 },
];

const tasks = [
  { id: 1, desc: "Sheets FacturasApp: V115 Ajuste cálculos cargos y descuentos", project: "FacturasApp", date: "2026-04-14", hours: 4 },
  { id: 2, desc: "Bot MCP: Implementación nuevo flujo de respuestas", project: "FacturasApp", date: "2026-04-15", hours: 6 },
  { id: 3, desc: "MiPlanilla: Ajuste módulo de reportes mensuales", project: "MiPlanilla", date: "2026-04-16", hours: 3 },
  { id: 4, desc: "Sheets FacturasApp: V116 Recalculo campos factura", project: "FacturasApp", date: "2026-04-17", hours: 5 },
  { id: 5, desc: "Bot MCP: Testing conexión SSE vs HTTP streaming", project: "FacturasApp", date: "2026-04-18", hours: 4 },
  { id: 6, desc: "MiNomina: Revisión cálculos de nómina Q1", project: "MiNomina", date: "2026-04-21", hours: 5 },
  { id: 7, desc: "Sheets FacturasApp: V117 Arreglo JSON con IRPF", project: "FacturasApp", date: "2026-04-22", hours: 4 },
];

const projectColors = {
  "FacturasApp": { dot: "#c96442", bg: "rgba(201,100,66,0.08)", text: "#c96442" },
  "MiPlanilla":  { dot: "#5b8a72", bg: "rgba(91,138,114,0.08)", text: "#5b8a72" },
  "MiNomina":    { dot: "#8b7355", bg: "rgba(139,115,85,0.08)", text: "#8b7355" },
  "MisFacturas": { dot: "#6b7b8d", bg: "rgba(107,123,141,0.08)", text: "#6b7b8d" },
};

function AnimateIn({ children, delay = 0, style = {} }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t); }, [delay]);
  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(18px)",
      transition: "opacity 0.65s cubic-bezier(0.16,1,0.3,1), transform 0.65s cubic-bezier(0.16,1,0.3,1)",
      ...style,
    }}>
      {children}
    </div>
  );
}

function MiniBarChart({ data, maxH = 80 }) {
  const max = Math.max(...data.map(d => d.hours));
  const [animated, setAnimated] = useState(false);
  useEffect(() => { setTimeout(() => setAnimated(true), 500); }, []);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: maxH + 28 }}>
      {data.map((d, i) => {
        const isLast = i === data.length - 1;
        return (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, flex: 1 }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: isLast ? "#c96442" : "#8b7355", fontWeight: 500, transition: "color 0.3s" }}>
              {d.hours}h
            </span>
            <div style={{ position: "relative", width: "100%", maxWidth: 38 }}>
              <div style={{
                width: "100%", borderRadius: 5,
                backgroundColor: isLast ? "#c96442" : "#e2d5c5",
                height: animated ? (d.hours / max) * maxH : 0,
                transition: `height 0.85s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.1}s`,
              }} />
              {isLast && animated && (
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0,
                  height: (d.hours / max) * maxH,
                  borderRadius: 5,
                  background: "linear-gradient(180deg, rgba(201,100,66,0.3) 0%, rgba(201,100,66,0) 100%)",
                  pointerEvents: "none",
                }} />
              )}
            </div>
            <span style={{ fontSize: 11, color: "#a09484", fontWeight: 500, letterSpacing: 0.3 }}>{d.month}</span>
          </div>
        );
      })}
    </div>
  );
}

function ProjectDonut({ data, size = 120 }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { setTimeout(() => setAnimated(true), 900); }, []);
  const total = data.reduce((s, d) => s + d.hours, 0);
  const strokeW = 10;
  const r = (size - strokeW) / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f0e8dc" strokeWidth={strokeW} />
        {data.map((d, i) => {
          const pct = d.hours / total;
          const dash = circ * pct;
          const gap = circ - dash;
          const thisOffset = offset;
          offset += dash;
          return (
            <circle key={i} cx={size/2} cy={size/2} r={r} fill="none"
              stroke={d.color} strokeWidth={strokeW} strokeLinecap="round"
              strokeDasharray={`${animated ? dash - 3 : 0} ${animated ? gap + 3 : circ}`}
              strokeDashoffset={-thisOffset}
              style={{ transition: `stroke-dasharray 1s cubic-bezier(0.16,1,0.3,1) ${i * 0.15}s` }}
            />
          );
        })}
      </svg>
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)", textAlign: "center",
      }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, fontWeight: 500, color: "#2c2418" }}>{total}</div>
        <div style={{ fontSize: 10, color: "#a09484", fontWeight: 500, letterSpacing: 0.5 }}>HORAS</div>
      </div>
    </div>
  );
}

export default function WarmEditorialFinal() {
  const [hoveredTask, setHoveredTask] = useState(null);
  const [ready, setReady] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const containerRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  const projectDonutData = [
    { name: "FacturasApp", hours: 23, color: "#c96442" },
    { name: "MiPlanilla", hours: 8, color: "#5b8a72" },
    { name: "MiNomina", hours: 9, color: "#8b7355" },
    { name: "MisFacturas", hours: 5, color: "#6b7b8d" },
  ];

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      style={{
        minHeight: "100vh",
        background: `
          radial-gradient(ellipse 500px 400px at ${mousePos.x}% ${mousePos.y}%, rgba(201,100,66,0.06) 0%, transparent 70%),
          radial-gradient(ellipse 400px 300px at 75% 15%, rgba(201,100,66,0.03) 0%, transparent 60%),
          #faf7f2
        `,
        fontFamily: "'Source Serif 4', 'Georgia', serif",
        color: "#2c2418",
        padding: "32px 28px",
        position: "relative",
        transition: "background 0.1s ease",
      }}
    >
      <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400&family=DM+Mono:wght@400;500&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <AnimateIn>
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#a09484", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>
                Abril 2026
              </p>
              <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 34, fontWeight: 300, margin: 0, letterSpacing: -0.5, color: "#2c2418" }}>
                Buenos días, <span style={{ fontWeight: 700 }}>Alejandro</span>
              </h1>
            </div>
            <span style={{
              padding: "5px 14px", borderRadius: 24, fontSize: 12, fontWeight: 600,
              backgroundColor: "#fef3e2", color: "#8b6914", letterSpacing: 0.3,
              fontFamily: "'Outfit', sans-serif",
              border: "1px solid rgba(139,105,20,0.1)",
            }}>
              En progreso
            </span>
          </div>
          <div style={{ width: 52, height: 2.5, backgroundColor: "#c96442", marginTop: 16, borderRadius: 2 }} />
        </div>
      </AnimateIn>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Horas", value: "45", suffix: "h", featured: false },
          { label: "Ingreso bruto", value: formatCOP(1957500), featured: false },
          { label: "Retención (11%)", value: formatCOP(215325), featured: false },
          { label: "Neto estimado", value: formatCOP(1515156), featured: true },
        ].map((stat, i) => (
          <AnimateIn key={i} delay={100 + i * 80}>
            <div
              style={{
                padding: "20px 18px",
                borderRadius: 14,
                backgroundColor: stat.featured ? "#2c2418" : "#fff",
                border: stat.featured ? "none" : "1px solid #e8ddd0",
                cursor: "default",
                transition: "transform 0.25s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s ease",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.boxShadow = stat.featured
                  ? "0 12px 32px rgba(44,36,24,0.25)"
                  : "0 8px 24px rgba(44,36,24,0.07)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <p style={{
                fontFamily: "'Outfit', sans-serif", fontSize: 11, textTransform: "uppercase",
                letterSpacing: 1.5, color: stat.featured ? "#a09484" : "#a09484",
                marginBottom: 10, fontWeight: 500,
              }}>
                {stat.label}
              </p>
              <p style={{
                fontFamily: "'DM Mono', monospace", fontSize: 20, fontWeight: 500, margin: 0,
                color: stat.featured ? "#faf7f2" : "#2c2418",
              }}>
                {stat.value}{stat.suffix || ""}
              </p>
            </div>
          </AnimateIn>
        ))}
      </div>

      {/* Main Content Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 22 }}>

        {/* Tasks List */}
        <AnimateIn delay={500}>
          <div style={{
            backgroundColor: "#fff", borderRadius: 18, border: "1px solid #e8ddd0",
            overflow: "hidden",
          }}>
            <div style={{
              padding: "18px 24px 14px",
              borderBottom: "1px solid #f0e8dc",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 600, margin: 0 }}>
                Tareas registradas
              </h2>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#a09484" }}>
                {tasks.length} tareas · 45h
              </span>
            </div>
            {tasks.map((task, i) => {
              const pc = projectColors[task.project] || { dot: "#999", bg: "rgba(0,0,0,0.04)", text: "#666" };
              return (
                <div key={task.id}
                  onMouseEnter={() => setHoveredTask(task.id)}
                  onMouseLeave={() => setHoveredTask(null)}
                  style={{
                    padding: "14px 24px",
                    borderBottom: i < tasks.length - 1 ? "1px solid #f5efe6" : "none",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    backgroundColor: hoveredTask === task.id ? "#fdf9f4" : "transparent",
                    transition: "background-color 0.15s ease",
                    cursor: "default",
                    opacity: 0,
                    animation: `fadeSlideIn 0.4s ease ${600 + i * 55}ms forwards`,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                      <span style={{
                        display: "inline-block", padding: "1px 8px", borderRadius: 10,
                        fontSize: 10, fontWeight: 600, letterSpacing: 0.3,
                        backgroundColor: pc.bg, color: pc.text,
                        fontFamily: "'Outfit', sans-serif",
                      }}>
                        {task.project}
                      </span>
                    </div>
                    <p style={{
                      fontSize: 14, margin: 0, lineHeight: 1.45, color: "#2c2418",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {task.desc}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginLeft: 16, flexShrink: 0 }}>
                    <span style={{
                      fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 500,
                      color: "#c96442",
                    }}>
                      {task.hours}h
                    </span>
                    <span style={{ fontSize: 12, color: "#bfb5a3" }}>
                      {new Date(task.date).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                </div>
              );
            })}
            <div style={{ padding: "14px 24px", backgroundColor: "#fdf9f4", textAlign: "center", borderTop: "1px solid #f0e8dc" }}>
              <button
                style={{
                  fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 600,
                  color: "#fff", background: "#c96442", border: "none", cursor: "pointer",
                  padding: "8px 24px", borderRadius: 8, letterSpacing: 0.3,
                  transition: "all 0.2s ease",
                  boxShadow: "0 2px 8px rgba(201,100,66,0.2)",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(201,100,66,0.3)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(201,100,66,0.2)"; }}
              >
                + Agregar tarea
              </button>
            </div>
          </div>
        </AnimateIn>

        {/* Right Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Project Donut */}
          <AnimateIn delay={600}>
            <div style={{
              backgroundColor: "#fff", borderRadius: 18, border: "1px solid #e8ddd0",
              padding: 20, display: "flex", flexDirection: "column", alignItems: "center",
            }}>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 600, margin: "0 0 16px", color: "#2c2418", alignSelf: "flex-start" }}>
                Horas por proyecto
              </h3>
              <ProjectDonut data={projectDonutData} />
              <div style={{ marginTop: 16, width: "100%", display: "flex", flexDirection: "column", gap: 6 }}>
                {projectDonutData.map((p, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: p.color, flexShrink: 0 }} />
                      <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, color: "#8b7355" }}>{p.name}</span>
                    </div>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#2c2418", fontWeight: 500 }}>{p.hours}h</span>
                  </div>
                ))}
              </div>
            </div>
          </AnimateIn>

          {/* Monthly trend */}
          <AnimateIn delay={700}>
            <div style={{
              backgroundColor: "#fff", borderRadius: 18, border: "1px solid #e8ddd0",
              padding: 20,
            }}>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 600, margin: "0 0 16px", color: "#2c2418" }}>
                Tendencia mensual
              </h3>
              <MiniBarChart data={hoursData} />
            </div>
          </AnimateIn>

          {/* Aportes Summary */}
          <AnimateIn delay={800}>
            <div style={{
              backgroundColor: "#fff", borderRadius: 18, border: "1px solid #e8ddd0",
              padding: 20,
            }}>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 600, margin: "0 0 14px", color: "#2c2418" }}>
                Seguridad social
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {[
                  { label: "IBC (40%)", value: formatCOP(783000) },
                  { label: "Salud", pct: "12.5%", value: formatCOP(97875), color: "#5b8a72" },
                  { label: "Pensión", pct: "16%", value: formatCOP(125280), color: "#c96442" },
                  { label: "ARL", pct: "0.52%", value: formatCOP(4089), color: "#8b7355" },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {item.color && <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: item.color }} />}
                      <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, color: "#8b7355" }}>
                        {item.label} {item.pct && <span style={{ color: "#bfb5a3" }}>({item.pct})</span>}
                      </span>
                    </div>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#2c2418", fontWeight: 500 }}>{item.value}</span>
                  </div>
                ))}
                <div style={{ height: 1, backgroundColor: "#e8ddd0", margin: "4px 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, color: "#2c2418", fontWeight: 600 }}>Planilla total</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 15, color: "#c96442", fontWeight: 500 }}>{formatCOP(227244)}</span>
                </div>
              </div>

              {/* Planilla warning */}
              <div style={{
                marginTop: 14, padding: "10px 14px", borderRadius: 10,
                backgroundColor: "#fef3e2", border: "1px solid rgba(139,105,20,0.12)",
                display: "flex", alignItems: "flex-start", gap: 10,
              }}>
                <span style={{ fontSize: 13, lineHeight: 1, marginTop: 1, color: "#8b6914" }}>⚠</span>
                <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, color: "#8b6914", lineHeight: 1.5 }}>
                  Tu ingreso supera 1 SMLMV. Recuerda subir tu planilla de seguridad social antes de enviar.
                </span>
              </div>
            </div>
          </AnimateIn>

          {/* Upload Planilla */}
          <AnimateIn delay={870}>
            <div style={{
              borderRadius: 14, border: "2px dashed #e2d5c5", padding: "16px 18px",
              textAlign: "center", cursor: "pointer",
              transition: "all 0.2s ease",
              backgroundColor: "rgba(255,255,255,0.5)",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#c96442"; e.currentTarget.style.backgroundColor = "rgba(201,100,66,0.03)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2d5c5"; e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.5)"; }}
            >
              <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, color: "#a09484", margin: "0 0 4px" }}>
                Subir planilla de seguridad social
              </p>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#c9b99a", margin: 0 }}>
                PDF · Máx 5MB
              </p>
            </div>
          </AnimateIn>

          {/* Ready Button */}
          <AnimateIn delay={940}>
            <button
              onClick={() => setReady(!ready)}
              style={{
                width: "100%", padding: "15px 20px", borderRadius: 14,
                border: "none", cursor: "pointer",
                fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 600,
                letterSpacing: 0.3,
                backgroundColor: ready ? "#5b8a72" : "#2c2418",
                color: "#faf7f2",
                transition: "all 0.35s cubic-bezier(0.16,1,0.3,1)",
                boxShadow: ready
                  ? "0 4px 16px rgba(91,138,114,0.25)"
                  : "0 4px 16px rgba(44,36,24,0.2)",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = ready ? "0 8px 24px rgba(91,138,114,0.3)" : "0 8px 24px rgba(44,36,24,0.25)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = ready ? "0 4px 16px rgba(91,138,114,0.25)" : "0 4px 16px rgba(44,36,24,0.2)"; }}
            >
              {ready ? "✓  Marcado como listo" : "Marcar como listo"}
            </button>
          </AnimateIn>
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
