import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Download,
  Trash2,
  Save,
  X,
  Gem,
  Pencil,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  BadgeDollarSign,
  Package,
  Tags,
  RefreshCw,
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

const initialForm = () => ({
  nombre: "",
  telefono: "",
  email: "",
  direccion: "",
  joya: "",
  categoria: "",
  precio: "",
  fecha: new Date().toISOString().slice(0, 10),
  notas: "",
});

function money(value) {
  const n = Number(value || 0);
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

function downloadCSV(rows) {
  const headers = [
    "nombre",
    "telefono",
    "email",
    "direccion",
    "joya",
    "categoria",
    "precio",
    "fecha",
    "notas",
  ];

  const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "clientes_joyeria.csv";
  a.click();

  URL.revokeObjectURL(url);
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
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

export default function App() {
  const [clientes, setClientes] = useState([]);
  const [form, setForm] = useState(initialForm());
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [mensaje, setMensaje] = useState("Listo.");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();

    const rows = [...clientes].sort((a, b) =>
      String(b.fecha || "").localeCompare(String(a.fecha || ""))
    );

    if (!q) return rows;

    return rows.filter((c) =>
      [
        c.nombre,
        c.telefono,
        c.email,
        c.direccion,
        c.joya,
        c.categoria,
        c.fecha,
        c.notas,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [clientes, search]);

  const stats = useMemo(() => {
    const total = clientes.reduce(
      (acc, c) => acc + Number(c.precio || 0),
      0
    );
    const promedio = clientes.length ? total / clientes.length : 0;
    const ultima = clientes.length
      ? [...clientes]
          .filter((c) => c.fecha)
          .sort((a, b) =>
            String(b.fecha || "").localeCompare(String(a.fecha || ""))
          )[0]?.fecha || "—"
      : "—";

    return {
      clientes: clientes.length,
      total,
      promedio,
      ultima,
    };
  }, [clientes]);

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
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

    const precio = Number(String(form.precio).replace(/[$,\s]/g, ""));
    if (form.precio && Number.isNaN(precio)) {
      alert("El precio debe ser un número válido.");
      return;
    }

    const payload = {
      nombre: form.nombre.trim(),
      telefono: form.telefono.trim(),
      email: form.email.trim(),
      direccion: form.direccion.trim(),
      joya: form.joya.trim(),
      categoria: form.categoria,
      precio: Number.isFinite(precio) ? precio : 0,
      fecha: form.fecha,
      notas: form.notas.trim(),
    };

    try {
      setSaving(true);
      setMensaje(editingId ? "Actualizando cliente..." : "Guardando cliente...");

      let res;

      if (editingId) {
        res = await fetchWithTimeout("/api/clientes", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, ...payload }),
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
      fecha: cliente.fecha || new Date().toISOString().slice(0, 10),
      notas: cliente.notas || "",
    });

    setMensaje(`Editando a ${cliente.nombre}.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id) {
    const cliente = clientes.find((c) => c.id === id);
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

  return (
    <div className="app-shell">
      <div className="background-overlay"></div>

      <div className="layout">
        <aside className="sidebar">
          <div className="brand-card">
            <div className="brand-icon">
              <Gem size={34} />
            </div>

            <div className="logo-wrap">
              <img
                src="/logo_eduardos.png"
                alt="Logo Eduardo's Joyería"
                className="brand-logo"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>

            <h1 className="brand-title">EDUARDO'S</h1>
            <p className="brand-subtitle">LUXURY CRM</p>
            <p className="brand-text">
              Sistema web para controlar clientes y ventas de joyería conectado
              a Firebase Realtime Database desde el backend.
            </p>
          </div>

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

            <div className="section-title">Detalle de compra</div>

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
              label="Precio"
              placeholder="Ej. 1200"
              value={form.precio}
              onChange={(e) => handleChange("precio", e.target.value)}
            />

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
          <div className="topbar">
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, joya, categoría, correo..."
                className="search-input"
              />
            </div>

            <div className="topbar-actions">
              <button
                className="btn btn-secondary"
                onClick={() => downloadCSV(clientes)}
              >
                <Download size={16} />
                Exportar CSV
              </button>

              <button
                className="btn btn-secondary"
                onClick={cargarClientes}
                disabled={loading}
              >
                <RefreshCw size={16} />
                {loading ? "Cargando..." : "Recargar"}
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => setSearch("")}
              >
                Limpiar filtro
              </button>
            </div>
          </div>

          <div className="stats-grid">
            <StatCard
              label="Clientes"
              value={stats.clientes}
              subtitle="Registros totales"
            />
            <StatCard
              label="Ventas totales"
              value={money(stats.total)}
              subtitle="Suma acumulada"
            />
            <StatCard
              label="Ticket promedio"
              value={money(stats.promedio)}
              subtitle="Promedio por cliente"
            />
            <StatCard
              label="Última venta"
              value={stats.ultima}
              subtitle="Fecha más reciente"
            />
          </div>

          <div className="table-card">
            <div className="table-header">
              <div>
                <h2>Clientes registrados</h2>
                <p>
                  {loading
                    ? "Cargando..."
                    : `${filtrados.length} resultado(s) mostrados`}
                </p>
              </div>
              <div className="table-badge">REALTIME + VERCEL</div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Teléfono</th>
                    <th>Email</th>
                    <th>Dirección</th>
                    <th>Joya</th>
                    <th>Categoría</th>
                    <th>Precio</th>
                    <th>Fecha</th>
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
                        <td>{c.nombre || "—"}</td>
                        <td>{c.telefono || "—"}</td>
                        <td>{c.email || "—"}</td>
                        <td>{c.direccion || "—"}</td>
                        <td>{c.joya || "—"}</td>
                        <td>
                          <span className="category-pill">
                            {c.categoria || "—"}
                          </span>
                        </td>
                        <td className="price-cell">{money(c.precio)}</td>
                        <td>{c.fecha || "—"}</td>
                        <td>
                          <div className="row-actions">
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
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="status-bar">{mensaje}</div>

          <div className="footer-note">
            Esta versión usa Firebase Admin únicamente en el backend de Vercel.
            Las credenciales no se exponen al navegador.
          </div>
        </main>
      </div>
    </div>
  );
}
