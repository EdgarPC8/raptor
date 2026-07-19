import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import ProtectedRoute from "./context/ProtectedRoute.jsx";
import PublicOnlyRoute from "./context/PublicOnlyRoute.jsx";
import GuestExploreRoute from "./context/GuestExploreRoute.jsx";
import NavBar from "./components/NavBar.jsx";
import { SHELL_ONLY } from "./config/deployEnv.js";
import { APP_ID } from "./config/appInfo.js";
import { APP_ROUTES, LEGACY_ROUTE_REDIRECTS } from "./config/appRoutes.js";
// Licencia: GET /subscription en backend (push del gestor). Sin Subify.
// Modo `npm run raptor`: invitado sin backend + exploración de módulos.

const AUTH_ROLES = ["Programador", "Administrador", "Empleado"];

const Login = lazy(() => import("./pages/Login.jsx"));
const HomeLogout = lazy(
  () => import("./pages/eddeli/inventoryControl/HomeLogout.jsx"),
);
const DashBoardPage = lazy(
  () => import("./pages/eddeli/inventoryControl/DashBoardPage.jsx"),
);
const ProductsPage = lazy(
  () => import("./pages/eddeli/inventoryControl/ProductsPage.jsx"),
);
const CategoryPage = lazy(
  () => import("./pages/eddeli/inventoryControl/CategoryPage.jsx"),
);
const TramosPage = lazy(
  () => import("./pages/eddeli/inventoryControl/TramosPage.jsx"),
);
const UnitPage = lazy(
  () => import("./pages/eddeli/inventoryControl/UnitPage.jsx"),
);
const MovementPage = lazy(
  () => import("./pages/eddeli/inventoryControl/MovementPage.jsx"),
);
const RecipePage = lazy(
  () => import("./pages/eddeli/inventoryControl/RecipePage.jsx"),
);
const GenericIngredientsPage = lazy(
  () => import("./pages/eddeli/inventoryControl/GenericIngredientsPage.jsx"),
);
const OrderPage = lazy(
  () => import("./pages/eddeli/inventoryControl/OrderPage.jsx"),
);
const CustomerPage = lazy(
  () => import("./pages/eddeli/inventoryControl/CustomerPage.jsx"),
);
const SupplierPage = lazy(
  () => import("./pages/eddeli/inventoryControl/SupplierPage.jsx"),
);
const FinancePage = lazy(
  () => import("./pages/eddeli/inventoryControl/FinancePage.jsx"),
);
const LoansDebtsPage = lazy(
  () => import("./pages/eddeli/inventoryControl/LoansDebtsPage.jsx"),
);
const RecurringExpensesPage = lazy(
  () => import("./pages/eddeli/inventoryControl/RecurringExpensesPage.jsx"),
);
const CollectionsPage = lazy(
  () => import("./pages/eddeli/inventoryControl/CollectionsPage.jsx"),
);
const ProductionManagerPage = lazy(
  () => import("./pages/eddeli/inventoryControl/ProductionManagerPage.jsx"),
);
const HomeProductPage = lazy(
  () => import("./pages/eddeli/inventoryControl/HomeProduct.jsx"),
);
const StoresManagerPage = lazy(
  () => import("./pages/eddeli/inventoryControl/StoresManagerPage.jsx"),
);
const StoresPublicPage = lazy(
  () => import("./pages/eddeli/inventoryControl/StoresPublicPage.jsx"),
);
const CatalogManagerPage = lazy(
  () => import("./pages/eddeli/inventoryControl/CatalogManagerPage.jsx"),
);
const ProductCompareGroupsPage = lazy(
  () => import("./pages/eddeli/inventoryControl/ProductCompareGroupsPage.jsx"),
);
const CatalogoPage = lazy(() => import("./pages/eddeli/CatalogPage.jsx"));
const EditorPage = lazy(
  () => import("./pages/eddeli/photoshop/EditorPage.jsx"),
);
const ProductTemplateStudio = lazy(
  () => import("./pages/eddeli/photoshop/ProductTemplateStudio.jsx"),
);
const EditorTemplatesView = lazy(
  () => import("./pages/eddeli/photoshop/EditorTemplatesView.jsx"),
);
const CajaPage = lazy(() => import("./pages/eddeli/CajaPage.jsx"));
const TurnoPage = lazy(() => import("./pages/eddeli/TurnoPage.jsx"));
const TurnoSupervisionPage = lazy(
  () => import("./pages/eddeli/TurnoSupervisionPage.jsx"),
);
const TareasPage = lazy(() => import("./pages/eddeli/TareasPage.jsx"));
const FacturacionPage = lazy(
  () => import("./pages/eddeli/FacturacionPage.jsx"),
);
const ProfilePage = lazy(() => import("./pages/ProfilePage.jsx"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage.jsx"));
const InfoPage = lazy(() => import("./pages/InfoPage.jsx"));
const DonacionesPage = lazy(() => import("./pages/DonacionesPage.jsx"));
const PanelControlPage = lazy(() => import("./pages/PanelControlPage.jsx"));
const NotificationProgramsPage = lazy(
  () => import("./pages/NotificationProgramsPage.jsx"),
);
const UsersPage = lazy(() => import("./pages/UsersPage.jsx"));
const CuentasPage = lazy(() => import("./pages/CuentasPage.jsx"));
const RolesPage = lazy(() => import("./pages/RolesPage.jsx"));
const ComandosPage = lazy(() => import("./pages/ComandosPage.jsx"));
const BackupsPage = lazy(() => import("./pages/BackupsPage.jsx"));
const LogsPage = lazy(() => import("./pages/LogsPage.jsx"));
const ImgManagerPage = lazy(() => import("./pages/ImgManagerPage.jsx"));
const FileManagerPage = lazy(() => import("./pages/FileManagerPage.jsx"));
const PublicidadCampaignsPage = lazy(
  () => import("./pages/eddeli/publicidad/PublicidadCampaignsPage.jsx"),
);
const PublicidadCampaignEditorPage = lazy(
  () => import("./pages/eddeli/publicidad/PublicidadCampaignEditorPage.jsx"),
);
const PublicidadPlayerPage = lazy(
  () => import("./pages/eddeli/publicidad/PublicidadPlayerPage.jsx"),
);
const PublicidadTvPlayerPage = lazy(
  () => import("./pages/eddeli/publicidad/PublicidadTvPlayerPage.jsx"),
);
const PublicidadTvDevicePlayerPage = lazy(
  () => import("./pages/eddeli/publicidad/PublicidadTvDevicePlayerPage.jsx"),
);
const PublicidadDevicesPage = lazy(
  () => import("./pages/eddeli/publicidad/PublicidadDevicesPage.jsx"),
);
const AppSettingsPage = lazy(() => import("./pages/AppSettingsPage.jsx"));
const SystemModulesPage = lazy(() => import("./pages/SystemModulesPage.jsx"));
const SystemPlansPage = lazy(() => import("./pages/SystemPlansPage.jsx"));
const ElectronicDocsLayout = lazy(
  () => import("./pages/eddeli/electronicDocs/ElectronicDocsLayout.jsx"),
);
const ElectronicDocsHubPage = lazy(
  () => import("./pages/eddeli/electronicDocs/ElectronicDocsHubPage.jsx"),
);
const ElectronicDocsSectionPage = lazy(
  () => import("./pages/eddeli/electronicDocs/ElectronicDocsSectionPage.jsx"),
);
const SubscriptionExpiredPage = lazy(
  () => import("./pages/SubscriptionExpiredPage.jsx"),
);
const NoSubscriptionPage = lazy(() => import("./pages/NoSubscriptionPage.jsx"));
const MaintenancePage = lazy(() => import("./pages/MaintenancePage.jsx"));
const GuestExplorePage = lazy(() => import("./pages/GuestExplorePage.jsx"));

function PageFallback() {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "40vh",
      }}
    >
      <CircularProgress size={36} />
    </Box>
  );
}

/** Empleado → caja; Admin/Programador → dashboard. */
function RoleHomeRedirect() {
  const { user } = useAuth();
  if (user?.loginRol === "Empleado") {
    return <Navigate to={APP_ROUTES.operation.cash} replace />;
  }
  return <DashBoardPage />;
}

/** Store: /inicio público; si hay sesión → panel (dashboard/caja). */
function StoreInicioRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <PageFallback />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return (
    <LazyPage>
      <HomeLogout />
    </LazyPage>
  );
}

/** Lazy fuera del layout: no desmontar NavBar al cargar chunks. */
function LazyPage({ children }) {
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>;
}

export default function App() {
  if (SHELL_ONLY) {
    return (
      <AuthProvider>
        <Routes>
          <Route
            path="/login"
            element={
              <LazyPage>
                <Login />
              </LazyPage>
            }
          />
          <Route element={<NavBar />}>
            <Route
              path="/home"
              element={
                <LazyPage>
                  <HomeLogout />
                </LazyPage>
              }
            />
            <Route element={<GuestExploreRoute />}>
              {/* Activos con guestData */}
              <Route path={APP_ROUTES.dashboard} element={<LazyPage><DashBoardPage /></LazyPage>} />
              {LEGACY_ROUTE_REDIRECTS.map(([from, to]) => (
                <Route
                  key={`legacy-${from}`}
                  path={from}
                  element={<Navigate to={to} replace />}
                />
              ))}
              <Route path={APP_ROUTES.system.notifications} element={<LazyPage><NotificationsPage /></LazyPage>} />
              <Route path={APP_ROUTES.operation.cash} element={<LazyPage><CajaPage /></LazyPage>} />
              <Route path={APP_ROUTES.operation.shifts} element={<LazyPage><TurnoPage /></LazyPage>} />
              <Route path={APP_ROUTES.operation.tasks} element={<LazyPage><TareasPage /></LazyPage>} />
              <Route path={APP_ROUTES.operation.posReceipts} element={<LazyPage><FacturacionPage /></LazyPage>} />
              <Route path={APP_ROUTES.operation.shiftSupervision} element={<LazyPage><TurnoSupervisionPage /></LazyPage>} />
              <Route path={APP_ROUTES.sales.orders} element={<LazyPage><OrderPage /></LazyPage>} />
              <Route path={APP_ROUTES.sales.customers} element={<LazyPage><CustomerPage /></LazyPage>} />
              <Route path={APP_ROUTES.finance.transactions} element={<LazyPage><FinancePage /></LazyPage>} />
              <Route path={APP_ROUTES.finance.collections} element={<LazyPage><CollectionsPage /></LazyPage>} />
              <Route path={APP_ROUTES.finance.loansDebts} element={<LazyPage><LoansDebtsPage /></LazyPage>} />
              <Route path={APP_ROUTES.inventory.products} element={<LazyPage><ProductsPage /></LazyPage>} />
              <Route path={APP_ROUTES.inventory.movement} element={<LazyPage><MovementPage /></LazyPage>} />
              <Route path={APP_ROUTES.inventory.categories} element={<LazyPage><CategoryPage /></LazyPage>} />
              <Route path={APP_ROUTES.inventory.tierGroups} element={<LazyPage><TramosPage /></LazyPage>} />
              <Route path={APP_ROUTES.inventory.units} element={<LazyPage><UnitPage /></LazyPage>} />
              <Route path={APP_ROUTES.production.ingredients} element={<LazyPage><GenericIngredientsPage /></LazyPage>} />
              <Route path={APP_ROUTES.production.recipes} element={<LazyPage><RecipePage /></LazyPage>} />
              <Route path={APP_ROUTES.production.manufacturing} element={<LazyPage><ProductionManagerPage /></LazyPage>} />
              <Route path={APP_ROUTES.production.suppliers} element={<LazyPage><SupplierPage /></LazyPage>} />
              <Route path={APP_ROUTES.channel.catalog} element={<LazyPage><CatalogManagerPage /></LazyPage>} />
              <Route path={APP_ROUTES.channel.stores} element={<LazyPage><StoresManagerPage /></LazyPage>} />
              <Route path={APP_ROUTES.admin.users} element={<LazyPage><UsersPage /></LazyPage>} />
              <Route path={APP_ROUTES.admin.accounts} element={<LazyPage><CuentasPage /></LazyPage>} />
              <Route path={APP_ROUTES.admin.roles} element={<LazyPage><RolesPage /></LazyPage>} />
              <Route path={APP_ROUTES.admin.controlPanel} element={<LazyPage><PanelControlPage /></LazyPage>} />
              <Route path={APP_ROUTES.system.settings} element={<LazyPage><AppSettingsPage /></LazyPage>} />
              <Route path={APP_ROUTES.system.plans} element={<LazyPage><SystemPlansPage /></LazyPage>} />
              <Route path={APP_ROUTES.system.modules} element={<LazyPage><SystemModulesPage /></LazyPage>} />
              <Route path={APP_ROUTES.system.profile} element={<LazyPage><ProfilePage /></LazyPage>} />
              <Route path={APP_ROUTES.system.donations} element={<LazyPage><DonacionesPage /></LazyPage>} />
              {/* Mantenimiento / próximamente → ficha GuestExplore */}
              <Route path="/inicio" element={<LazyPage><GuestExplorePage /></LazyPage>} />
              <Route path="*" element={<LazyPage><GuestExplorePage /></LazyPage>} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <div id="sale-receipt-print-root" aria-hidden="true" />
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route
            path="/login"
            element={
              <LazyPage>
                <Login />
              </LazyPage>
            }
          />
        </Route>

        <Route
          path="/tv/device/:deviceId"
          element={
            <LazyPage>
              <PublicidadTvDevicePlayerPage />
            </LazyPage>
          }
        />
        <Route
          path="/tv/:campaignId"
          element={
            <LazyPage>
              <PublicidadTvPlayerPage />
            </LazyPage>
          }
        />

        <Route element={<NavBar />}>
          {LEGACY_ROUTE_REDIRECTS.map(([from, to]) => (
            <Route
              key={`legacy-${from}`}
              path={from}
              element={<Navigate to={to} replace />}
            />
          ))}
          {/* Base pública: siempre, con o sin suscripción */}
          <Route path="/home" element={<HomeLogout />} />
          {APP_ID === "store" ? (
            <Route path="/inicio" element={<StoreInicioRoute />} />
          ) : null}
          <Route
            path="/subscription-expired"
            element={<SubscriptionExpiredPage />}
          />
          <Route path="/no-subscription" element={<NoSubscriptionPage />} />
          <Route path="/mantenimiento" element={<MaintenancePage />} />
          <Route path={APP_ROUTES.public.catalog} element={<CatalogoPage />} />
          <Route path={APP_ROUTES.public.stores} element={<StoresPublicPage />} />
          <Route path="/catalogo" element={<Navigate to={APP_ROUTES.public.catalog} replace />} />
          <Route path="/punto_venta" element={<Navigate to={APP_ROUTES.public.stores} replace />} />
          <Route path="/backery" element={<Navigate to={APP_ROUTES.public.catalog} replace />} />

          <Route element={<ProtectedRoute requiredRol={AUTH_ROLES} />}>
            <Route path={APP_ROUTES.dashboard} element={<RoleHomeRedirect />} />
            {APP_ID !== "store" ? (
              <Route path="/inicio" element={<HomeLogout />} />
            ) : null}
            <Route path={APP_ROUTES.system.profile} element={<ProfilePage />} />
            <Route path={APP_ROUTES.system.notifications} element={<NotificationsPage />} />
            <Route path={APP_ROUTES.info} element={<InfoPage />} />
            <Route path={APP_ROUTES.system.donations} element={<DonacionesPage />} />
          </Route>

          <Route element={<ProtectedRoute requiredRol={["Programador"]} />}>
            <Route path={APP_ROUTES.developer.commands} element={<ComandosPage />} />
            <Route path={APP_ROUTES.developer.backups} element={<BackupsPage />} />
            <Route path={APP_ROUTES.developer.logs} element={<LogsPage />} />
            <Route path={APP_ROUTES.developer.images} element={<ImgManagerPage />} />
            <Route path={APP_ROUTES.developer.files} element={<FileManagerPage />} />
          </Route>

          <Route
            element={
              <ProtectedRoute
                requiredRol={["Administrador", "Programador", "Empleado"]}
              />
            }
          >
            <Route path={APP_ROUTES.operation.cash} element={<CajaPage />} />
            <Route path={APP_ROUTES.operation.shifts} element={<TurnoPage />} />
            <Route path={APP_ROUTES.operation.tasks} element={<TareasPage />} />
          </Route>

          <Route
            element={
              <ProtectedRoute requiredRol={["Administrador", "Programador"]} />
            }
            >
            <Route path={APP_ROUTES.operation.posReceipts} element={<FacturacionPage />} />
            <Route
              path={APP_ROUTES.electronicDocs.hub}
              element={<ElectronicDocsLayout />}
            >
              <Route index element={<ElectronicDocsHubPage />} />
              <Route
                path=":sectionId"
                element={<ElectronicDocsSectionPage />}
              />
            </Route>
            <Route
              path={APP_ROUTES.operation.shiftSupervision}
              element={<TurnoSupervisionPage />}
            />
            <Route path={APP_ROUTES.admin.controlPanel} element={<PanelControlPage />} />
            <Route path={APP_ROUTES.system.settings} element={<AppSettingsPage />} />
            <Route path={APP_ROUTES.system.plans} element={<SystemPlansPage />} />
            <Route path={APP_ROUTES.system.modules} element={<SystemModulesPage />} />
            <Route
              path={APP_ROUTES.admin.notificationPrograms}
              element={<NotificationProgramsPage />}
            />
            <Route path={APP_ROUTES.admin.users} element={<UsersPage />} />
            <Route path={APP_ROUTES.admin.accounts} element={<CuentasPage />} />
            <Route path={APP_ROUTES.admin.roles} element={<RolesPage />} />
            <Route path={APP_ROUTES.channel.catalog} element={<CatalogManagerPage />} />
            <Route
              path={APP_ROUTES.channel.compareGroups}
              element={<ProductCompareGroupsPage />}
            />

            <Route path={APP_ROUTES.promoDesign.editor} element={<EditorPage />} />
            <Route path={`${APP_ROUTES.promoDesign.editor}/:id`} element={<EditorPage />} />
            <Route path="/editor/:id" element={<EditorPage />} />
            <Route
              path={APP_ROUTES.promoDesign.preview}
              element={<ProductTemplateStudio />}
            />
            <Route
              path={APP_ROUTES.promoDesign.templates}
              element={<EditorTemplatesView />}
            />

            <Route path={APP_ROUTES.advertising.campaigns} element={<PublicidadCampaignsPage />} />
            <Route
              path={APP_ROUTES.advertising.devices}
              element={<PublicidadDevicesPage />}
            />
            <Route
              path={APP_ROUTES.advertising.campaignNew}
              element={<PublicidadCampaignEditorPage />}
            />
            <Route
              path="/publicidad/campanas/:id"
              element={<PublicidadCampaignEditorPage />}
            />
            <Route
              path={`${APP_ROUTES.advertising.player}/:campaignId?`}
              element={<PublicidadPlayerPage />}
            />

            <Route path={APP_ROUTES.inventory.products} element={<ProductsPage />} />
            <Route path={APP_ROUTES.inventory.categories} element={<CategoryPage />} />
            <Route path={APP_ROUTES.inventory.tierGroups} element={<TramosPage />} />
            <Route path={APP_ROUTES.inventory.units} element={<UnitPage />} />
            <Route path={APP_ROUTES.inventory.movement} element={<MovementPage />} />
            <Route path={APP_ROUTES.production.recipes} element={<RecipePage />} />
            <Route
              path={APP_ROUTES.production.ingredients}
              element={<GenericIngredientsPage />}
            />
            <Route path={APP_ROUTES.sales.orders} element={<OrderPage />} />
            <Route path={APP_ROUTES.sales.customers} element={<CustomerPage />} />
            <Route path={APP_ROUTES.production.suppliers} element={<SupplierPage />} />
            <Route path={APP_ROUTES.finance.transactions} element={<FinancePage />} />
            <Route
              path={APP_ROUTES.finance.collections}
              element={<CollectionsPage />}
            />
            <Route
              path={APP_ROUTES.finance.loansDebts}
              element={<LoansDebtsPage />}
            />
            <Route
              path={APP_ROUTES.finance.recurringExpenses}
              element={<RecurringExpensesPage />}
            />
            <Route
              path={APP_ROUTES.production.manufacturing}
              element={<ProductionManagerPage />}
            />
            <Route
              path={APP_ROUTES.channel.featuredProducts}
              element={<HomeProductPage />}
            />
            <Route
              path={APP_ROUTES.channel.stores}
              element={<StoresManagerPage />}
            />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </AuthProvider>
  );
}

