/**
 * Suscripción local (backend de la app). El gestor solo EMPUJA el entitlement;
 * en runtime la app lee su propio backend — el gestor puede estar apagado.
 */
import { useCallback, useEffect, useState } from "react";
import axios from "../api/axios.js";
import { socket } from "../api/axios.js";
import { SHELL_ONLY } from "../config/deployEnv.js";
import { APP_ID } from "../config/appInfo.js";

/**
 * Switch en frontend/.env → `VITE_SUBSCRIPTIONS_ENABLED`:
 *   - "true"  → limitar por entitlement guardado en el backend.
 *   - "false" → acceso total (desarrollo libre).
 *   - sin definir → desactivado en `npm run dev`, activado en build de producción.
 *
 * Comandos:
 *   npm run eddeli / store → usa .env del modo (normalmente true)
 *   npm run dev:eddeli / dev:store → fuerza false (programar libre)
 */
const ENV_OVERRIDE = import.meta.env.VITE_SUBSCRIPTIONS_ENABLED;
export const SUBSCRIPTIONS_ENABLED =
  SHELL_ONLY
    ? false
    : ENV_OVERRIDE === "true"
      ? true
      : ENV_OVERRIDE === "false"
        ? false
        : import.meta.env.PROD;

const BYPASS_SUBSCRIPTION = {
  subscribed: true,
  subscription: { modules: [] },
  features: [],
  maintenance: false,
};

const CACHE_KEY = `${APP_ID}_entitlement_cache_v2`;
const ENTITLEMENT_EVENT = `${APP_ID}:entitlement-refetch`;

function readCachedEntitlement() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedEntitlement(data) {
  try {
    if (data?.subscribed && data?.subscription) {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } else {
      localStorage.removeItem(CACHE_KEY);
    }
  } catch {
    /* ignore quota / private mode */
  }
}

function computeExpired(data) {
  if (!data?.subscription?.expires_at) return false;
  return new Date(data.subscription.expires_at) < new Date();
}

/** Plan usable (mantenimiento de app se maneja aparte con overlay). */
export function hasActiveSubscription(subscription, expired = false) {
  if (!SUBSCRIPTIONS_ENABLED) return true;
  if (!subscription) return false;
  if (expired) return false;
  return Boolean(subscription.subscribed);
}

export const useSubscriptions = () => {
  const cached = SUBSCRIPTIONS_ENABLED ? readCachedEntitlement() : null;
  const [isLoading, setIsLoading] = useState(SUBSCRIPTIONS_ENABLED && !cached);
  const [subscription, setSubscription] = useState(
    SUBSCRIPTIONS_ENABLED ? cached : BYPASS_SUBSCRIPTION,
  );
  const [expired, setExpired] = useState(
    SUBSCRIPTIONS_ENABLED ? computeExpired(cached) : false,
  );

  const fetchSub = useCallback(async () => {
    if (!SUBSCRIPTIONS_ENABLED) return;
    try {
      const { data } = await axios.get("/subscription");
      setSubscription(data);
      setExpired(computeExpired(data));
      writeCachedEntitlement(data);
      setIsLoading(false);
    } catch (err) {
      console.error("Error al cargar suscripción local:", err);
      const fallback = readCachedEntitlement();
      if (fallback) {
        setSubscription(fallback);
        setExpired(computeExpired(fallback));
      } else {
        setSubscription((prev) =>
          prev ?? {
            subscribed: false,
            subscription: null,
            maintenance: false,
          },
        );
      }
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!SUBSCRIPTIONS_ENABLED) return;
    fetchSub();

    const onFocus = () => fetchSub();
    const onRefetch = () => fetchSub();
    const onSocket = () => fetchSub();

    window.addEventListener("focus", onFocus);
    window.addEventListener(ENTITLEMENT_EVENT, onRefetch);
    socket.on("entitlementUpdated", onSocket);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(ENTITLEMENT_EVENT, onRefetch);
      socket.off("entitlementUpdated", onSocket);
    };
  }, [fetchSub]);

  return { isLoading, subscription, expired, refetch: fetchSub };
};

/** Dispara refetch en todos los hooks useSubscriptions de la pestaña. */
export function requestEntitlementRefetch() {
  window.dispatchEvent(new Event(ENTITLEMENT_EVENT));
}
