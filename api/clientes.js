import admin from "firebase-admin";
import crypto from "crypto";

function initFirebase() {
  if (!admin.apps.length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
      : undefined;

    if (!process.env.FIREBASE_PROJECT_ID) {
      throw new Error("Falta FIREBASE_PROJECT_ID");
    }

    if (!process.env.FIREBASE_CLIENT_EMAIL) {
      throw new Error("Falta FIREBASE_CLIENT_EMAIL");
    }

    if (!privateKey) {
      throw new Error("Falta FIREBASE_PRIVATE_KEY");
    }

    if (!process.env.FIREBASE_DATABASE_URL) {
      throw new Error("Falta FIREBASE_DATABASE_URL");
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
  }

  return admin.database();
}

function sendJson(res, status, data) {
  res.status(status);
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const db = initFirebase();
    const ref = db.ref("clientes_joyeria");

    if (req.method === "GET") {
      const snapshot = await ref.get();
      const raw = snapshot.val() || {};

      const clientes = Object.keys(raw).map((id) => ({
        id,
        ...raw[id],
      }));

      clientes.sort((a, b) =>
        String(b.fecha || "").localeCompare(String(a.fecha || ""))
      );

      return sendJson(res, 200, clientes);
    }

    if (req.method === "POST") {
      const body = req.body || {};

      if (!body.nombre || !String(body.nombre).trim()) {
        return sendJson(res, 400, { error: "El nombre es obligatorio." });
      }

      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      await ref.child(id).set({
        nombre: String(body.nombre || "").trim(),
        telefono: String(body.telefono || "").trim(),
        email: String(body.email || "").trim(),
        direccion: String(body.direccion || "").trim(),
        joya: String(body.joya || "").trim(),
        categoria: String(body.categoria || "").trim(),
        precio: Number(body.precio || 0),
        fecha: String(body.fecha || ""),
        notas: String(body.notas || "").trim(),
        createdAt: now,
        updatedAt: now,
      });

      return sendJson(res, 201, { ok: true, id });
    }

    if (req.method === "PUT") {
      const body = req.body || {};
      const id = body.id;

      if (!id) {
        return sendJson(res, 400, { error: "Falta el id." });
      }

      if (!body.nombre || !String(body.nombre).trim()) {
        return sendJson(res, 400, { error: "El nombre es obligatorio." });
      }

      await ref.child(id).update({
        nombre: String(body.nombre || "").trim(),
        telefono: String(body.telefono || "").trim(),
        email: String(body.email || "").trim(),
        direccion: String(body.direccion || "").trim(),
        joya: String(body.joya || "").trim(),
        categoria: String(body.categoria || "").trim(),
        precio: Number(body.precio || 0),
        fecha: String(body.fecha || ""),
        notas: String(body.notas || "").trim(),
        updatedAt: new Date().toISOString(),
      });

      return sendJson(res, 200, { ok: true });
    }

    if (req.method === "DELETE") {
      const body = req.body || {};
      const id = body.id;

      if (!id) {
        return sendJson(res, 400, { error: "Falta el id." });
      }

      await ref.child(id).remove();

      return sendJson(res, 200, { ok: true });
    }

    return sendJson(res, 405, { error: "Método no permitido." });
  } catch (error) {
    console.error("API ERROR:", error);
    return sendJson(res, 500, {
      error: error?.message || "Error interno del servidor.",
    });
  }
}
