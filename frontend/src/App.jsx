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
  if (user?.loginRol === "Empleado") return <Navigate to="/caja" replace />;
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
              <Route path="/" element={<LazyPage><DashBoardPage /></LazyPage>} />
              <Route path="/notifications" element={<LazyPage><NotificationsPage /></LazyPage>} />
              <Route path="/caja" element={<LazyPage><CajaPage /></LazyPage>} />
              <Route path="/turno" element={<LazyPage><TurnoPage /></LazyPage>} />
              <Route path="/tareas" element={<LazyPage><TareasPage /></LazyPage>} />
              <Route path="/facturacion" element={<LazyPage><FacturacionPage /></LazyPage>} />
              <Route path="/turno/supervision" element={<LazyPage><TurnoSupervisionPage /></LazyPage>} />
              <Route path="/inventory/orders" element={<LazyPage><OrderPage /></LazyPage>} />
              <Route path="/inventory/customers" element={<LazyPage><CustomerPage /></LazyPage>} />
              <Route path="/inventory/finance" element={<LazyPage><FinancePage /></LazyPage>} />
              <Route path="/inventory/collections" element={<LazyPage><CollectionsPage /></LazyPage>} />
              <Route path="/inventory/prestamos-deudas" element={<LazyPage><LoansDebtsPage /></LazyPage>} />
              <Route path="/inventory/products" element={<LazyPage><ProductsPage /></LazyPage>} />
              <Route path="/inventory/movement" element={<LazyPage><MovementPage /></LazyPage>} />
              <Route path="/inventory/categories" element={<LazyPage><CategoryPage /></LazyPage>} />
              <Route path="/inventory/tramos" element={<LazyPage><TramosPage /></LazyPage>} />
              <Route path="/inventory/units" element={<LazyPage><UnitPage /></LazyPage>} />
              <Route path="/inventory/insumos" element={<LazyPage><GenericIngredientsPage /></LazyPage>} />
              <Route path="/inventory/recipes" element={<LazyPage><RecipePage /></LazyPage>} />
              <Route path="/inventory/production" element={<LazyPage><ProductionManagerPage /></LazyPage>} />
              <Route path="/inventory/suppliers" element={<LazyPage><SupplierPage /></LazyPage>} />
              <Route path="/catalog_manager" element={<LazyPage><CatalogManagerPage /></LazyPage>} />
              <Route path="/inventory/puntos-venta" element={<LazyPage><StoresManagerPage /></LazyPage>} />
              <Route path="/users" element={<LazyPage><UsersPage /></LazyPage>} />
              <Route path="/cuentas" element={<LazyPage><CuentasPage /></LazyPage>} />
              <Route path="/roles" element={<LazyPage><RolesPage /></LazyPage>} />
              <Route path="/panel_control" element={<LazyPage><PanelControlPage /></LazyPage>} />
              <Route path="/sistema/configuracion" element={<LazyPage><AppSettingsPage /></LazyPage>} />
              <Route path="/sistema/planes" element={<LazyPage><SystemPlansPage /></LazyPage>} />
              <Route path="/sistema/modulos" element={<LazyPage><SystemModulesPage /></LazyPage>} />
              <Route path="/perfil" element={<LazyPage><ProfilePage /></LazyPage>} />
              <Route path="/donaciones" element={<LazyPage><DonacionesPage /></LazyPage>} />
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
          <Route path="/catalogo" element={<CatalogoPage />} />
          <Route path="/punto_venta" element={<StoresPublicPage />} />

          <Route element={<ProtectedRoute requiredRol={AUTH_ROLES} />}>
            <Route path="/" element={<RoleHomeRedirect />} />
            {APP_ID !== "store" ? (
              <Route path="/inicio" element={<HomeLogout />} />
            ) : null}
            <Route path="/perfil" element={<ProfilePage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/info" element={<InfoPage />} />
            <Route path="/donaciones" element={<DonacionesPage />} />
          </Route>

          <Route element={<ProtectedRoute requiredRol={["Programador"]} />}>
            <Route path="/comandos" element={<ComandosPage />} />
            <Route path="/backups" element={<BackupsPage />} />
            <Route path="/logs" element={<LogsPage />} />
            <Route path="/img" element={<ImgManagerPage />} />
            <Route path="/file" element={<FileManagerPage />} />
          </Route>

          <Route
            element={
              <ProtectedRoute
                requiredRol={["Administrador", "Programador", "Empleado"]}
              />
            }
          >
            <Route path="/caja" element={<CajaPage />} />
            <Route path="/turno" element={<TurnoPage />} />
            <Route path="/tareas" element={<TareasPage />} />
          </Route>

          <Route
            element={
              <ProtectedRoute requiredRol={["Administrador", "Programador"]} />
            }
          >
            <Route path="/facturacion" element={<FacturacionPage />} />
            <Route
              path="/comprobantes"
              element={<Navigate to="/facturacion" replace />}
            />
            <Route
              path="/comprobantes-electronicos"
              element={<ElectronicDocsLayout />}
            >
              <Route index element={<ElectronicDocsHubPage />} />
              <Route
                path=":sectionId"
                element={<ElectronicDocsSectionPage />}
              />
            </Route>
            <Route
              path="/turno/supervision"
              element={<TurnoSupervisionPage />}
            />
            <Route path="/panel_control" element={<PanelControlPage />} />
            <Route
              path="/sistema/configuracion"
              element={<AppSettingsPage />}
            />
            <Route path="/sistema/planes" element={<SystemPlansPage />} />
            <Route path="/sistema/modulos" element={<SystemModulesPage />} />
            <Route
              path="/sistema/facturacion-electronica"
              element={<Navigate to="/sistema/configuracion?tab=sri" replace />}
            />
            <Route
              path="/app-settings"
              element={<Navigate to="/sistema/configuracion" replace />}
            />
            <Route
              path="/facturacion/sri"
              element={<Navigate to="/sistema/configuracion?tab=sri" replace />}
            />
            <Route
              path="/notification-programs"
              element={<NotificationProgramsPage />}
            />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/cuentas" element={<CuentasPage />} />
            <Route path="/roles" element={<RolesPage />} />
            <Route path="/backery" element={<CatalogoPage />} />
            <Route path="/catalog_manager" element={<CatalogManagerPage />} />
            <Route
              path="/compare_groups"
              element={<ProductCompareGroupsPage />}
            />

            <Route path="/diseno-promocional/editor" element={<EditorPage />} />
            <Route
              path="/diseno-promocional/editor/:id"
              element={<EditorPage />}
            />
            <Route
              path="/diseno-promocional/vista"
              element={<ProductTemplateStudio />}
            />
            <Route
              path="/diseno-promocional/plantillas"
              element={<EditorTemplatesView />}
            />
            {/* Alias legacy → mismo editor (sin AdTemplateEditor) */}
            <Route path="/editor" element={<EditorPage />} />
            <Route path="/editor/:id" element={<EditorPage />} />
            <Route
              path="/publicity_edit"
              element={<Navigate to="/diseno-promocional/editor" replace />}
            />
            <Route
              path="/editorDefault"
              element={<Navigate to="/diseno-promocional/editor" replace />}
            />
            <Route
              path="/templates"
              element={<Navigate to="/diseno-promocional/plantillas" replace />}
            />

            <Route path="/publicidad" element={<PublicidadCampaignsPage />} />
            <Route
              path="/publicidad/dispositivos"
              element={<PublicidadDevicesPage />}
            />
            <Route
              path="/publicidad/campanas/nueva"
              element={<PublicidadCampaignEditorPage />}
            />
            <Route
              path="/publicidad/campanas/:id"
              element={<PublicidadCampaignEditorPage />}
            />
            <Route
              path="/publicidad/reproductor/:campaignId?"
              element={<PublicidadPlayerPage />}
            />

            <Route path="/inventory/products" element={<ProductsPage />} />
            <Route path="/inventory/categories" element={<CategoryPage />} />
            <Route path="/inventory/tramos" element={<TramosPage />} />
            <Route path="/inventory/units" element={<UnitPage />} />
            <Route path="/inventory/movement" element={<MovementPage />} />
            <Route path="/inventory/recipes" element={<RecipePage />} />
            <Route
              path="/inventory/insumos"
              element={<GenericIngredientsPage />}
            />
            <Route path="/inventory/orders" element={<OrderPage />} />
            <Route path="/inventory/customers" element={<CustomerPage />} />
            <Route path="/inventory/suppliers" element={<SupplierPage />} />
            <Route path="/inventory/finance" element={<FinancePage />} />
            <Route
              path="/inventory/collections"
              element={<CollectionsPage />}
            />
            <Route
              path="/inventory/prestamos-deudas"
              element={<LoansDebtsPage />}
            />
            <Route
              path="/inventory/gastos-recurrentes"
              element={<RecurringExpensesPage />}
            />
            <Route
              path="/inventory/production"
              element={<ProductionManagerPage />}
            />
            <Route
              path="/inventory/productos-destacados"
              element={<HomeProductPage />}
            />
            <Route
              path="/inventory/puntos-venta"
              element={<StoresManagerPage />}
            />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </AuthProvider>
  );
}

