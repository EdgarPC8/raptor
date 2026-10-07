/**
 * Escucha pedidos peer (socket + evento de NavBar) para refrescar hubs
 * y abrir el modal de aceptación sin recargar la página.
 */
import { useEffect } from "react";
import { socket } from "../api/axios.js";

function parsePeerPayload(payload = {}) {
  const link = String(payload?.link || "");
  const kind = payload?.kind || null;
  let orderId = Number(payload?.orderId);
  if (!Number.isFinite(orderId) || orderId <= 0) orderId = null;

  const supplierMatch = link.match(/peerAcceptOrderId=(\d+)/);
  const customerMatch = link.match(/peerAcceptCustomerOrderId=(\d+)/);

  if (!orderId && supplierMatch) orderId = Number(supplierMatch[1]);
  if (!orderId && customerMatch) orderId = Number(customerMatch[1]);

  let resolvedKind = kind;
  if (!resolvedKind && supplierMatch) resolvedKind = "supplier";
  if (!resolvedKind && customerMatch) resolvedKind = "customer";

  if (!resolvedKind || !orderId) return null;
  return {
    kind: resolvedKind,
    orderId,
    updated: Boolean(payload?.updated),
    link,
  };
}

export function usePeerOrderRealtime({ onSupplierOrder, onCustomerOrder } = {}) {
  useEffect(() => {
    const handle = (payload) => {
      const parsed = parsePeerPayload(payload);
      if (!parsed) return;
      if (parsed.kind === "supplier") onSupplierOrder?.(parsed);
      if (parsed.kind === "customer") onCustomerOrder?.(parsed);
    };

    const onNotif = (n) => handle(n);
    const onPeer = (p) => handle(p);
    const onWin = (e) => handle(e?.detail || {});

    socket.on("newNotification", onNotif);
    socket.on("peerOrderUpdated", onPeer);
    window.addEventListener("raptor:peer-order", onWin);
    return () => {
      socket.off("newNotification", onNotif);
      socket.off("peerOrderUpdated", onPeer);
      window.removeEventListener("raptor:peer-order", onWin);
    };
  }, [onSupplierOrder, onCustomerOrder]);
}
