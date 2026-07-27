import React, { useState, useEffect, useCallback, useRef } from "react";
import { Grid, Paper, Box, Stack } from "@mui/material";
import {
  getFinanceDashboardHeroRequest,
  getFinanceDashboardRestRequest,
} from "../../../api/financeRequest";
import { PanelSkeleton } from "../../../components/ContentSkeleton.jsx";
import CustomersAccordionTable from "./components/CustomersAccordionTable";
import ChartCalendaryInfo from "./components/Charts/ChartCalendaryInfo";
import ProductChartsPanel from "./components/Charts/ProductChartsPanel";
import ExpensePurchaseStats from "./components/Charts/ExpensePurchaseStats";
import CashFlowMirrorChart from "./components/Charts/CashFlowMirrorChart";
import CashFlowCandlestickChart from "./components/Charts/CashFlowCandlestickChart";
import { resolveMirrorFromCandle } from "./components/Charts/cashFlowLinkUtils";
import FinanceSummaryCards from "./components/FinanceSummaryCards";
import DashboardStockPanel from "./components/DashboardStockPanel";
import DashboardBatchesPanel from "./components/DashboardBatchesPanel";
import OrderStatusSummaryPanel from "./components/OrderStatusSummaryPanel";
import IncomeExpenseCategoryChart from "./components/IncomeExpenseCategoryChart";
import ObligationsSummaryPanel from "./components/ObligationsSummaryPanel";
import RecurringExpensesSummaryPanel from "./components/RecurringExpensesSummaryPanel";
import YearFinanceOverviewChart from "./components/Charts/YearFinanceOverviewChart";
import GuestDemoBanner from "../../../components/GuestDemoBanner.jsx";
import { dashboardPanelSx, dashboardPageSx } from "./components/dashboardPanelStyles.js";
import DeferredMount from "./components/DeferredMount.jsx";

const paperSx = {
  ...dashboardPanelSx,
  overflowX: "auto",
};

const defaultProductsStock = { agotados: [], porAgotarse: [] };

const defaultBatchesAlerts = { expired: [], expiring: [], warnDays: 30 };

const defaultObligations = {
  summary: { totalReceivable: 0, totalPayable: 0, openCount: 0 },
  topOpen: [],
};

const defaultRecurring = {
  summary: {
    monthlyBurden: 0,
    pendingThisMonth: 0,
    gapToCover: 0,
    dailySalesTarget: 0,
    daysLeftInMonth: 1,
    isProfitable: false,
    overdueCount: 0,
  },
  upcoming: [],
  overdue: [],
};

export const DashBoardPage = () => {
  const [loadingHero, setLoadingHero] = useState(true);
  const [loadingRest, setLoadingRest] = useState(true);
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0 });
  const [productsStock, setProductsStock] = useState(defaultProductsStock);
  const [batchesAlerts, setBatchesAlerts] = useState(defaultBatchesAlerts);
  const [overView, setOverView] = useState([]);
  const [incomeExpenseBreakdown, setIncomeExpenseBreakdown] = useState({});
  const [obligations, setObligations] = useState(defaultObligations);
  const [recurring, setRecurring] = useState(defaultRecurring);
  const [mirrorFocus, setMirrorFocus] = useState(null);
  const [allowHeavy, setAllowHeavy] = useState(false);
  const [heavyWave, setHeavyWave] = useState(0);
  const calendarSectionRef = useRef(null);
  const [calendarNavigate, setCalendarNavigate] = useState(null);

  const handleYearMonthSelect = useCallback((date) => {
    setCalendarNavigate({ date, requestId: Date.now() });
    window.setTimeout(() => {
      calendarSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }, []);

  const handleCandleSelect = useCallback((candle, candleGranularity) => {
    setMirrorFocus(resolveMirrorFromCandle(candleGranularity, candle));
  }, []);

  const handleClearMirrorFocus = useCallback(() => {
    setMirrorFocus(null);
  }, []);

  const pendingTotal = Number(summary?.futureIncome ?? 0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoadingHero(true);
      setLoadingRest(true);
      setAllowHeavy(false);
      setHeavyWave(0);

      try {
        const { data } = await getFinanceDashboardHeroRequest();
        if (cancelled) return;
        setSummary(data.summary ?? {});
        setObligations(data.obligations ?? defaultObligations);
      } catch (err) {
        console.error("Error al cargar hero del dashboard:", err);
      } finally {
        if (!cancelled) setLoadingHero(false);
      }

      try {
        const { data } = await getFinanceDashboardRestRequest();
        if (cancelled) return;
        setOverView(data.overView ?? []);
        setIncomeExpenseBreakdown(data.incomeExpenseBreakdown ?? {});
        setProductsStock(data.productsStock ?? defaultProductsStock);
        setBatchesAlerts(data.batchesAlerts ?? defaultBatchesAlerts);
        setRecurring(data.recurring ?? defaultRecurring);
      } catch (err) {
        console.error("Error al cargar paneles del dashboard:", err);
      } finally {
        if (!cancelled) {
          setLoadingRest(false);
          setAllowHeavy(true);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!allowHeavy) return undefined;
    setHeavyWave(1);
    const t2 = window.setTimeout(() => setHeavyWave(2), 120);
    const t3 = window.setTimeout(() => setHeavyWave(3), 280);
    return () => {
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [allowHeavy]);

  return (
    <Box sx={dashboardPageSx}>
      <GuestDemoBanner />

      <Box sx={{ mb: { xs: 2, md: 2.5 } }}>
        <FinanceSummaryCards
          summary={summary}
          pendingTotal={pendingTotal}
          obligationsSummary={obligations.summary}
          loading={loadingHero}
        />
      </Box>

      <Grid container spacing={{ xs: 1.5, sm: 2 }}>
        <Grid item xs={12} lg={8}>
          <Grid container spacing={{ xs: 1.5, sm: 2 }} alignItems="flex-start">
            <Grid item xs={12} md={6} sx={{ minWidth: 0 }}>
              {loadingRest ? (
                <PanelSkeleton height={260} />
              ) : (
                <DashboardStockPanel
                  productsStock={productsStock}
                  onStockUpdated={setProductsStock}
                />
              )}
            </Grid>
            <Grid item xs={12} md={6} sx={{ minWidth: 0 }}>
              {loadingRest ? (
                <PanelSkeleton height={260} />
              ) : (
                <DashboardBatchesPanel batchesAlerts={batchesAlerts} />
              )}
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Stack spacing={{ xs: 1.5, sm: 2 }} sx={{ minWidth: 0 }}>
            {loadingRest ? (
              <>
                <PanelSkeleton height={180} />
                <PanelSkeleton height={180} />
              </>
            ) : (
              <>
                <OrderStatusSummaryPanel overView={overView} />
                <RecurringExpensesSummaryPanel recurring={recurring} />
              </>
            )}
            {loadingHero ? (
              <PanelSkeleton height={180} />
            ) : (
              <ObligationsSummaryPanel obligations={obligations} />
            )}
          </Stack>
        </Grid>

        <Grid item xs={12}>
          <Grid container spacing={{ xs: 1.5, sm: 2 }} alignItems="stretch">
            <Grid item xs={12} md={5} lg={4} sx={{ minWidth: 0, display: "flex" }}>
              {loadingRest ? (
                <Box sx={{ width: "100%" }}>
                  <PanelSkeleton height={260} />
                </Box>
              ) : (
                <Box sx={{ width: "100%", display: "flex", "& > *": { flex: 1, width: "100%" } }}>
                  <IncomeExpenseCategoryChart data={incomeExpenseBreakdown} />
                </Box>
              )}
            </Grid>
            <Grid item xs={12} md={7} lg={8} sx={{ minWidth: 0, display: "flex" }}>
              <Paper
                variant="panel"
                sx={{ ...paperSx, overflowX: "auto", width: "100%", height: "100%" }}
              >
                {heavyWave >= 1 ? (
                  <YearFinanceOverviewChart onMonthSelect={handleYearMonthSelect} />
                ) : (
                  <PanelSkeleton height={260} />
                )}
              </Paper>
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper variant="panel" sx={{ ...paperSx, overflowX: "auto", height: "100%" }}>
            {heavyWave >= 2 ? (
              <CashFlowMirrorChart focus={mirrorFocus} onClearFocus={handleClearMirrorFocus} />
            ) : (
              <PanelSkeleton height={280} />
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          {heavyWave >= 2 ? (
            <CashFlowCandlestickChart
              onCandleSelect={handleCandleSelect}
              onDrillReset={handleClearMirrorFocus}
              selectedKey={mirrorFocus?.highlightKey ?? null}
            />
          ) : (
            <PanelSkeleton height={280} />
          )}
        </Grid>

        <Grid item xs={12}>
          <Box ref={calendarSectionRef}>
            <Paper variant="panel" sx={{ ...paperSx, overflowX: "auto" }}>
              {heavyWave >= 3 ? (
                <ChartCalendaryInfo navigateToMonth={calendarNavigate} />
              ) : (
                <PanelSkeleton height={360} />
              )}
            </Paper>
          </Box>
        </Grid>

        <Grid item xs={12}>
          {heavyWave >= 3 ? (
            <DeferredMount height={320} rootMargin="320px">
              <ProductChartsPanel />
            </DeferredMount>
          ) : (
            <PanelSkeleton height={320} />
          )}
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper variant="panel" sx={{ ...paperSx, overflowX: "auto" }}>
            {heavyWave >= 3 ? (
              <DeferredMount height={280} rootMargin="320px">
                <CustomersAccordionTable />
              </DeferredMount>
            ) : (
              <PanelSkeleton height={280} />
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper variant="panel" sx={{ ...paperSx, overflowX: "auto" }}>
            {heavyWave >= 3 ? (
              <DeferredMount height={280} rootMargin="320px">
                <ExpensePurchaseStats />
              </DeferredMount>
            ) : (
              <PanelSkeleton height={280} />
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashBoardPage;
