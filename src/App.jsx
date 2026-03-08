import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Trash2,
  Save,
  X,
  Pencil,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  BadgeDollarSign,
  Package,
  Tags,
  Wallet,
  Receipt,
} from "lucide-react";

const CATEGORIAS = [
  "Anillo",
  "Collar",
  "Pulsera",
  "Aretes",
  "Broche",
  "Reloj",
  "Otro",
];

const METODOS_PAGO = [
  "Efectivo",
  "Transferencia",
  "Tarjeta",
  "Depósito",
  "Otro",
];

const FILTROS_PAGO = ["Todos", "No pagados", "Abonados", "Pagados"];

const initialForm = () => ({
  nombre: "",
  telefono: "",
  email: "",
  direccion: "",
  joya: "",
  categoria: "",
  precio: "",
  anticipo: "",
  metodoPago: "",
  fecha: new Date().toISOString().slice(0, 10),
  notas: "",
});

const initialPagoForm = () => ({
  monto: "",
  metodo: "",
  fecha: new Date().toISOString().slice(0, 10),
  nota: "",
});

function money(value) {
  const n = Number(value || 0);
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

function num(value) {
  const n = Number(String(value ?? "").replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function calcularPago(precio, totalPagado) {
  const total = Number(precio || 0);
  const pagado = Number(totalPagado || 0);
  const saldo = Math.max(total - pagado, 0);

  let estado = "No pagado";
  if (pagado > 0 && saldo > 0) estado = "Abonado";
  if (total > 0 && saldo <= 0) estado = "Pagado";

  return {
    total,
    pagado,
    saldo,
    estado,
  };
}

function StatCard({ label, value, subtitle }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {subtitle ? <div className="stat-subtitle">{subtitle}</div> : null}
    </div>
  );
}

function Input({ icon: Icon, label, ...props }) {
  return (
    <label className="field">
      <div className="field-label">
        {Icon ? <Icon size={14} /> : null}
        <span>{label}</span>
      </div>
      <input {...props} className="input" />
    </label>
  );
}

function Select({ icon: Icon, label, children, ...props }) {
  return (
    <label className="field">
      <div className="field-label">
        {Icon ? <Icon size={14} /> : null}
        <span>{label}</span>
      </div>
      <select {...props} className="input">
        {children}
      </select>
    </label>
  );
}

function TextArea({ label, ...props }) {
  return (
    <label className="field">
      <div className="field-label">
        <span>{label}</span>
      </div>
      <textarea {...props} className="textarea" />
    </label>
  );
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export default function App() {
  const [clientes, setClientes] = useState([]);
  const [form, setForm] = useState(initialForm());
  const [search, setSearch] = useState("");
  const [filtroPago, setFiltroPago] = useState("Todos");
  const [editingId, setEditingId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [mensaje, setMensaje] = useState("Listo.");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [pagoModalOpen, setPagoModalOpen] = useState(false);
  const [clientePago, setClientePago] = useState(null);
  const [pagoForm, setPagoForm] = useState(initialPagoForm());
  const [guardandoPago, setGuardandoPago] = useState(false);

  async function cargarClientes() {
    try {
      setLoading(true);
      setMensaje("Cargando clientes...");

      const res = await fetchWithTimeout("/api/clientes", {
        method: "GET",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al cargar clientes");
      }

      const rows = Array.isArray(data) ? data : [];
      rows.sort((a, b) =>
        String(b.fecha || "").localeCompare(String(a.fecha || ""))
      );

      setClientes(rows);
      setMensaje("Clientes cargados correctamente.");
    } catch (error) {
      console.error("Error al cargar clientes:", error);

      if (error.name === "AbortError") {
        setMensaje("La carga tardó demasiado. Revisa Vercel o Firebase.");
      } else {
        setMensaje("No se pudieron cargar los clientes.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarClientes();
  }, []);

  const clientesConPago = useMemo(() => {
    return clientes.map((c) => {
      const precio = Number(c.precio || 0);
      const historialPagos = Array.isArray(c.historialPagos) ? c.historialPagos : [];
      const totalHistorial = historialPagos.reduce(
        (acc, p) => acc + Number(p.monto || 0),
        0
      );

      const anticipo =
        c.anticipo !== undefined ? Number(c.anticipo || 0) : 0;

      const totalPagado =
        c.totalPagado !== undefined
          ? Number(c.totalPagado || 0)
          : Math.max(anticipo, totalHistorial);

      const pago = calcularPago(precio, totalPagado);

      return {
        ...c,
        precio,
        anticipo,
        historialPagos,
        totalPagado,
        saldoPendiente: pago.saldo,
        estadoPago: pago.estado,
      };
    });
  }, [clientes]);

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();

    let rows = [...clientesConPago].sort((a, b) =>
      String(b.fecha || "").localeCompare(String(a.fecha || ""))
    );

    if (q) {
      rows = rows.filter((c) =>
        [
          c.nombre,
          c.telefono,
          c.email,
          c.direccion,
          c.joya,
          c.categoria,
          c.fecha,
          c.notas,
          c.estadoPago,
          c.metodoPago,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }

    if (filtroPago === "No pagados") {
      rows = rows.filter((c) => Number(c.totalPagado || 0) <= 0);
    }

    if (filtroPago === "Abonados") {
      rows = rows.filter(
        (c) =>
          Number(c.totalPagado || 0) > 0 && Number(c.saldoPendiente || 0) > 0
      );
    }

    if (filtroPago === "Pagados") {
      rows = rows.filter((c) => Number(c.saldoPendiente || 0) <= 0);
    }

    return rows;
  }, [clientesConPago, search, filtroPago]);

  const stats = useMemo(() => {
    const totalVentas = clientesConPago.reduce(
      (acc, c) => acc + Number(c.precio || 0),
      0
    );
    const totalCobrado = clientesConPago.reduce(
      (acc, c) => acc + Number(c.totalPagado || 0),
      0
    );
    const totalPendiente = clientesConPago.reduce(
      (acc, c) => acc + Number(c.saldoPendiente || 0),
      0
    );
    const noPagados = clientesConPago.filter(
      (c) => Number(c.totalPagado || 0) <= 0
    ).length;

    return {
      clientes: clientesConPago.length,
      totalVentas,
      totalCobrado,
      totalPendiente,
      noPagados,
    };
  }, [clientesConPago]);

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handlePagoChange(field, value) {
    setPagoForm((prev) => ({ ...prev, [field]: value }));
  }

  function resetForm() {
    setForm(initialForm());
    setEditingId(null);
  }

  async function handleSave(e) {
    e.preventDefault();

    if (!form.nombre.trim()) {
      alert("El nombre del cliente es obligatorio.");
      return;
    }

    const precio = num(form.precio);
    const anticipo = num(form.anticipo);

    if (form.precio && !Number.isFinite(precio)) {
      alert("El precio debe ser un número válido.");
      return;
    }

    if (form.anticipo && !Number.isFinite(anticipo)) {
      alert("El anticipo debe ser un número válido.");
      return;
    }

    const pago = calcularPago(precio, anticipo);

    const payload = {
      nombre: form.nombre.trim(),
      telefono: form.telefono.trim(),
      email: form.email.trim(),
      direccion: form.direccion.trim(),
      joya: form.joya.trim(),
      categoria: form.categoria,
      precio,
      anticipo,
      totalPagado: anticipo,
      saldoPendiente: pago.saldo,
      estadoPago: pago.estado,
      metodoPago: form.metodoPago,
      fecha: form.fecha,
      notas: form.notas.trim(),
      historialPagos:
        anticipo > 0
          ? [
              {
                fecha: form.fecha,
                monto: anticipo,
                metodo: form.metodoPago || "Otro",
                nota: "Pago inicial / anticipo",
              },
            ]
          : [],
    };

    try {
      setSaving(true);
      setMensaje(editingId ? "Actualizando cliente..." : "Guardando cliente...");

      let res;

      if (editingId) {
        const existente = clientesConPago.find((c) => c.id === editingId);
        const historialExistente = Array.isArray(existente?.historialPagos)
          ? existente.historialPagos
          : [];

        const totalHistorial = historialExistente.reduce(
          (acc, p) => acc + Number(p.monto || 0),
          0
        );

        const pagoEditado = calcularPago(precio, totalHistorial);

        res = await fetchWithTimeout("/api/clientes", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingId,
            ...payload,
            anticipo: existente?.anticipo ?? anticipo,
            totalPagado: totalHistorial,
            saldoPendiente: pagoEditado.saldo,
            estadoPago: pagoEditado.estado,
            historialPagos: historialExistente,
          }),
        });
      } else {
        res = await fetchWithTimeout("/api/clientes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al guardar");
      }

      setMensaje(
        editingId
          ? `Cliente actualizado: ${payload.nombre}`
          : `Cliente guardado: ${payload.nombre}`
      );

      resetForm();
      setSelectedId(null);
      await cargarClientes();
    } catch (error) {
      console.error("Error al guardar:", error);

      if (error.name === "AbortError") {
        alert("La operación tardó demasiado. Revisa Vercel o Firebase.");
      } else {
        alert(error.message || "Ocurrió un error.");
      }
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(cliente) {
    setEditingId(cliente.id);
    setSelectedId(cliente.id);

    setForm({
      nombre: cliente.nombre || "",
      telefono: cliente.telefono || "",
      email: cliente.email || "",
      direccion: cliente.direccion || "",
      joya: cliente.joya || "",
      categoria: cliente.categoria || "",
      precio: String(cliente.precio ?? ""),
      anticipo: String(cliente.anticipo ?? ""),
      metodoPago: cliente.metodoPago || "",
      fecha: cliente.fecha || new Date().toISOString().slice(0, 10),
      notas: cliente.notas || "",
    });

    setMensaje(`Editando a ${cliente.nombre}.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id) {
    const cliente = clientesConPago.find((c) => c.id === id);
    if (!cliente) return;

    const ok = window.confirm(
      `¿Eliminar a ${cliente.nombre}? Esta acción no se puede deshacer.`
    );
    if (!ok) return;

    try {
      setMensaje(`Eliminando a ${cliente.nombre}...`);

      const res = await fetchWithTimeout("/api/clientes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al eliminar");
      }

      if (selectedId === id) setSelectedId(null);
      if (editingId === id) resetForm();

      setMensaje(`Cliente eliminado: ${cliente.nombre}`);
      await cargarClientes();
    } catch (error) {
      console.error("Error al eliminar:", error);

      if (error.name === "AbortError") {
        alert("La eliminación tardó demasiado. Revisa Vercel o Firebase.");
      } else {
        alert(error.message || "No se pudo eliminar.");
      }
    }
  }

  function deleteSelected() {
    if (!selectedId) {
      alert("Selecciona un cliente primero.");
      return;
    }
    handleDelete(selectedId);
  }

  function estadoClass(estado) {
    if (estado === "Pagado") return "estado-pill estado-pagado";
    if (estado === "Abonado") return "estado-pill estado-abonado";
    return "estado-pill estado-no-pagado";
  }

  function abrirModalPago(cliente) {
    setClientePago(cliente);
    setPagoForm(initialPagoForm());
    setPagoModalOpen(true);
  }

  function cerrarModalPago() {
    setPagoModalOpen(false);
    setClientePago(null);
    setPagoForm(initialPagoForm());
  }

  async function registrarPago() {
    if (!clientePago) return;

    const monto = num(pagoForm.monto);
    if (monto <= 0) {
      alert("El monto del pago debe ser mayor que 0.");
      return;
    }

    const historialActual = Array.isArray(clientePago.historialPagos)
      ? clientePago.historialPagos
      : [];

    const nuevoPago = {
      fecha: pagoForm.fecha,
      monto,
      metodo: pagoForm.metodo || "Otro",
      nota: pagoForm.nota || "Abono",
    };

    const nuevoHistorial = [...historialActual, nuevoPago];
    const nuevoTotalPagado = nuevoHistorial.reduce(
      (acc, p) => acc + Number(p.monto || 0),
      0
    );
    const pago = calcularPago(clientePago.precio, nuevoTotalPagado);

    try {
      setGuardandoPago(true);
      setMensaje(`Registrando pago para ${clientePago.nombre}...`);

      const res = await fetchWithTimeout("/api/clientes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: clientePago.id,
          nombre: clientePago.nombre || "",
          telefono: clientePago.telefono || "",
          email: clientePago.email || "",
          direccion: clientePago.direccion || "",
          joya: clientePago.joya || "",
          categoria: clientePago.categoria || "",
          precio: Number(clientePago.precio || 0),
          anticipo: Number(clientePago.anticipo || 0),
          totalPagado: nuevoTotalPagado,
          saldoPendiente: pago.saldo,
          estadoPago: pago.estado,
          metodoPago: clientePago.metodoPago || pagoForm.metodo || "",
          fecha: clientePago.fecha || "",
          notas: clientePago.notas || "",
          historialPagos: nuevoHistorial,
          fechaUltimoPago: pagoForm.fecha,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo registrar el pago.");
      }

      setMensaje(`Pago registrado para ${clientePago.nombre}.`);
      cerrarModalPago();
      await cargarClientes();
    } catch (error) {
      console.error("Error al registrar pago:", error);
      alert(error.message || "No se pudo registrar el pago.");
    } finally {
      setGuardandoPago(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="background-overlay"></div>
      <div className="gold-glow gold-glow-1"></div>
      <div className="gold-glow gold-glow-2"></div>

      <div className="layout">
        <aside className="sidebar">
          <form onSubmit={handleSave} className="form-panel">
            <div className="section-title">Datos del cliente</div>

            <Input
              icon={User}
              label="Nombre"
              placeholder="Nombre completo"
              value={form.nombre}
              onChange={(e) => handleChange("nombre", e.target.value)}
            />

            <Input
              icon={Phone}
              label="Teléfono"
              placeholder="Teléfono"
              value={form.telefono}
              onChange={(e) => handleChange("telefono", e.target.value)}
            />

            <Input
              icon={Mail}
              label="Correo"
              placeholder="Correo electrónico"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
            />

            <Input
              icon={MapPin}
              label="Dirección"
              placeholder="Dirección"
              value={form.direccion}
              onChange={(e) => handleChange("direccion", e.target.value)}
            />

            <div className="section-title">Detalle de venta</div>

            <Input
              icon={Package}
              label="Joya"
              placeholder="Descripción de la joya"
              value={form.joya}
              onChange={(e) => handleChange("joya", e.target.value)}
            />

            <Select
              icon={Tags}
              label="Categoría"
              value={form.categoria}
              onChange={(e) => handleChange("categoria", e.target.value)}
            >
              <option value="">Selecciona una categoría</option>
              {CATEGORIAS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </Select>

            <Input
              icon={BadgeDollarSign}
              label="Precio total"
              placeholder="Ej. 1200"
              value={form.precio}
              onChange={(e) => handleChange("precio", e.target.value)}
            />

            <Input
              icon={Wallet}
              label="Pago inicial / anticipo"
              placeholder="Ej. 500"
              value={form.anticipo}
              onChange={(e) => handleChange("anticipo", e.target.value)}
            />

            <Select
              icon={Receipt}
              label="Método de pago"
              value={form.metodoPago}
              onChange={(e) => handleChange("metodoPago", e.target.value)}
            >
              <option value="">Selecciona un método</option>
              {METODOS_PAGO.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>

            <Input
              icon={Calendar}
              label="Fecha"
              type="date"
              value={form.fecha}
              onChange={(e) => handleChange("fecha", e.target.value)}
            />

            <TextArea
              label="Notas adicionales"
              placeholder="Observaciones, talla, material, detalles del pedido..."
              value={form.notas}
              onChange={(e) => handleChange("notas", e.target.value)}
            />

            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={16} />
              {saving
                ? "Procesando..."
                : editingId
                ? "Actualizar cliente"
                : "Guardar cliente"}
            </button>

            {editingId ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  resetForm();
                  setMensaje("Edición cancelada.");
                }}
              >
                <X size={16} />
                Cancelar edición
              </button>
            ) : null}

            <button
              type="button"
              className="btn btn-danger"
              onClick={deleteSelected}
              disabled={saving}
            >
              <Trash2 size={16} />
              Eliminar seleccionado
            </button>
          </form>
        </aside>

        <main className="content">
          <div className="topbar minimal-topbar">
            <div className="search-box search-box-wide">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, joya, categoría, correo..."
                className="search-input"
              />
            </div>
          </div>

          <div className="filtros-pago">
            {FILTROS_PAGO.map((f) => (
              <button
                key={f}
                type="button"
                className={`filtro-btn ${
                  filtroPago === f ? "filtro-btn-activo" : ""
                }`}
                onClick={() => setFiltroPago(f)}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="stats-grid">
            <StatCard
              label="Clientes"
              value={stats.clientes}
              subtitle="Registros totales"
            />
            <StatCard
              label="Ventas"
              value={money(stats.totalVentas)}
              subtitle="Monto total vendido"
            />
            <StatCard
              label="Cobrado"
              value={money(stats.totalCobrado)}
              subtitle="Total recibido"
            />
            <StatCard
              label="Pendiente"
              value={money(stats.totalPendiente)}
              subtitle={`${stats.noPagados} cliente(s) sin pagar`}
            />
          </div>

          <div className="table-card">
            <div className="table-header">
              <div>
                <h2>Clientes registrados</h2>
                <p>
                  {loading
                    ? "Cargando..."
                    : `${filtrados.length} resultado(s) mostrados • Filtro: ${filtroPago}`}
                </p>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Joya</th>
                    <th>Total</th>
                    <th>Pagado</th>
                    <th>Saldo</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                    <th>Pagos</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading && filtrados.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="empty-row">
                        No hay clientes para mostrar.
                      </td>
                    </tr>
                  ) : (
                    filtrados.map((c) => (
                      <tr
                        key={c.id}
                        className={c.id === selectedId ? "active-row" : ""}
                        onClick={() => setSelectedId(c.id)}
                      >
                        <td>
                          <div>{c.nombre || "—"}</div>
                          <div className="subdato">{c.telefono || "—"}</div>
                        </td>
                        <td>
                          <div>{c.joya || "—"}</div>
                          <div className="subdato">{c.categoria || "—"}</div>
                        </td>
                        <td className="price-cell">{money(c.precio)}</td>
                        <td>{money(c.totalPagado)}</td>
                        <td>{money(c.saldoPendiente)}</td>
                        <td>
                          <span className={estadoClass(c.estadoPago)}>
                            {c.estadoPago}
                          </span>
                        </td>
                        <td>{c.fecha || "—"}</td>
                        <td>
                          <div className="subdato">
                            {Array.isArray(c.historialPagos)
                              ? `${c.historialPagos.length} movimiento(s)`
                              : "0 movimiento(s)"}
                          </div>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              className="mini-btn pay-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                abrirModalPago(c);
                              }}
                            >
                              <Wallet size={14} />
                              Registrar pago
                            </button>
                            <button
                              className="mini-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(c);
                              }}
                            >
                              <Pencil size={14} />
                              Editar
                            </button>
                            <button
                              className="mini-btn danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(c.id);
                              }}
                            >
                              <Trash2 size={14} />
                              Eliminar
                            </button>
                          </div>

                          {Array.isArray(c.historialPagos) &&
                          c.historialPagos.length > 0 ? (
                            <details className="historial-detalle">
                              <summary>Ver historial</summary>
                              <div className="historial-lista">
                                {c.historialPagos.map((p, idx) => (
                                  <div key={idx} className="historial-item">
                                    <div>
                                      {p.fecha || "—"} • {money(p.monto)}
                                    </div>
                                    <div className="subdato">
                                      {p.metodo || "—"} • {p.nota || "Sin nota"}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </details>
                          ) : null}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="status-bar">{mensaje}</div>
        </main>
      </div>

      {pagoModalOpen && clientePago ? (
        <div className="modal-backdrop" onClick={cerrarModalPago}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Registrar pago</h3>
              <button className="modal-close" onClick={cerrarModalPago}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-cliente">
                <strong>{clientePago.nombre}</strong>
                <div className="subdato">{clientePago.joya || "—"}</div>
                <div className="subdato">
                  Total: {money(clientePago.precio)} • Pagado:{" "}
                  {money(clientePago.totalPagado)} • Saldo:{" "}
                  {money(clientePago.saldoPendiente)}
                </div>
              </div>

              <Input
                icon={BadgeDollarSign}
                label="Monto del pago"
                placeholder="Ej. 500"
                value={pagoForm.monto}
                onChange={(e) => handlePagoChange("monto", e.target.value)}
              />

              <Select
                icon={Receipt}
                label="Método"
                value={pagoForm.metodo}
                onChange={(e) => handlePagoChange("metodo", e.target.value)}
              >
                <option value="">Selecciona un método</option>
                {METODOS_PAGO.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>

              <Input
                icon={Calendar}
                label="Fecha del pago"
                type="date"
                value={pagoForm.fecha}
                onChange={(e) => handlePagoChange("fecha", e.target.value)}
              />

              <TextArea
                label="Nota"
                placeholder="Ej. Abono semanal"
                value={pagoForm.nota}
                onChange={(e) => handlePagoChange("nota", e.target.value)}
              />
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={cerrarModalPago}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={registrarPago}
                disabled={guardandoPago}
              >
                <Wallet size={16} />
                {guardandoPago ? "Guardando..." : "Guardar pago"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
