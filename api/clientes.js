import admin from "firebase-admin";

let db;

function initFirebase() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
  }

  db = admin.database();
}

export default async function handler(req, res) {
  try {
    initFirebase();

    const ref = db.ref("clientes");

    if (req.method === "GET") {
      const snapshot = await ref.once("value");
      const data = snapshot.val() || {};

      const clientes = Object.keys(data).map((id) => ({
        id,
        ...data[id],
      }));

      return res.status(200).json(clientes);
    }

    if (req.method === "POST") {
      const body = req.body || {};
      const newRef = ref.push();

      const cliente = {
        nombre: body.nombre || "",
        telefono: body.telefono || "",
        email: body.email || "",
        direccion: body.direccion || "",
        joya: body.joya || "",
        categoria: body.categoria || "",
        precio: Number(body.precio || 0),
        anticipo: Number(body.anticipo || 0),
        totalPagado: Number(body.totalPagado || 0),
        saldoPendiente: Number(body.saldoPendiente || 0),
        estadoPago: body.estadoPago || "No pagado",
        metodoPago: body.metodoPago || "",
        fecha: body.fecha || "",
        fechaUltimoPago: body.fechaUltimoPago || "",
        notas: body.notas || "",
        historialPagos: Array.isArray(body.historialPagos)
          ? body.historialPagos
          : [],
        creado: Date.now(),
      };

      await newRef.set(cliente);

      return res.status(200).json({
        success: true,
        id: newRef.key,
      });
    }

    if (req.method === "PUT") {
      const body = req.body || {};

      if (!body.id) {
        return res.status(400).json({
          error: "ID requerido",
        });
      }

      const clienteRef = ref.child(body.id);

      const cliente = {
        nombre: body.nombre || "",
        telefono: body.telefono || "",
        email: body.email || "",
        direccion: body.direccion || "",
        joya: body.joya || "",
        categoria: body.categoria || "",
        precio: Number(body.precio || 0),
        anticipo: Number(body.anticipo || 0),
        totalPagado: Number(body.totalPagado || 0),
        saldoPendiente: Number(body.saldoPendiente || 0),
        estadoPago: body.estadoPago || "No pagado",
        metodoPago: body.metodoPago || "",
        fecha: body.fecha || "",
        fechaUltimoPago: body.fechaUltimoPago || "",
        notas: body.notas || "",
        historialPagos: Array.isArray(body.historialPagos)
          ? body.historialPagos
          : [],
        actualizado: Date.now(),
      };

      await clienteRef.update(cliente);

      return res.status(200).json({
        success: true,
      });
    }

    if (req.method === "DELETE") {
      const body = req.body || {};

      if (!body.id) {
        return res.status(400).json({
          error: "ID requerido",
        });
      }

      await ref.child(body.id).remove();

      return res.status(200).json({
        success: true,
      });
    }

    return res.status(405).json({
      error: "Método no permitido",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Error interno del servidor",
      details: error.message,
    });
  }
}
