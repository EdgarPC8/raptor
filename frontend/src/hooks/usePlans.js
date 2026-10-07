/**
 * Catálogo fijo de planes comerciales (systemPlansCatalog.js).
 * No depende del gestor Raptor Solutions.
 */
import { useMemo } from "react";
import { SYSTEM_PLANS } from "../config/systemPlansCatalog.js";

export const usePlans = () => {
  const plans = useMemo(() => SYSTEM_PLANS, []);
  return { plans, isLoading: false };
};
