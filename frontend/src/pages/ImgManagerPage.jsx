/**
 * Control de imágenes del servidor (/img). Solo Programador.
 * Navegación por carpetas hijas + subida masiva de carpeta/subcarpetas/archivos.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  Box,
  Breadcrumbs,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  IconButton,
  LinearProgress,
  Link,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DriveFolderUploadIcon from "@mui/icons-material/DriveFolderUpload";
import DownloadIcon from "@mui/icons-material/Download";
import FolderIcon from "@mui/icons-material/Folder";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import TablePro from "../components/Tables/TablePro.jsx";
import SimpleDialog from "../components/Dialogs/SimpleDialog.jsx";
import UploadImageForm from "../components/Forms/UploadImageForm.jsx";
import {
  checkImagesExistRequest,
  deleteImageRequest,
  downloadFolderZipRequest,
  scanImagesRequest,
  uploadImageRequest,
} from "../api/imgRequest.js";
import { pathImg } from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|svg)$/i;
const CHECK_EXISTS_BATCH = 200;

function formatBytes(n) {
  const v = Number(n) || 0;
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  return `${(v / (1024 * 1024)).toFixed(1)} MB`;
}

/** Normaliza filtro de carpeta (la base ya es src/img). */
function normalizeFolderInput(raw) {
  let s = String(raw || "")
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .trim();
  if (!s || /^img$/i.test(s)) return "";
  if (/^img\//i.test(s)) s = s.replace(/^img\//i, "");
  return s;
}

/**
 * Ruta relativa destino bajo src/img.
 * Con "Subir carpeta", webkitRelativePath trae todo el árbol de subcarpetas.
 */
function toRelPath(file, baseFolder = "") {
  const fromPicker = String(file.webkitRelativePath || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");

  const base = normalizeFolderInput(baseFolder);

  if (fromPicker) {
    let rel = fromPicker;
    // Si eligieron la carpeta raíz "img", quitar solo ese prefijo
    if (/^img\//i.test(rel)) rel = rel.replace(/^img\//i, "");
    else if (/^img$/i.test(rel)) return "";
    const fileName = rel.split("/").pop() || "";
    if (!IMAGE_EXT.test(fileName)) return "";
    // Si hay carpeta actual y el árbol no empieza ahí, anidar debajo
    if (base && rel !== base && !rel.startsWith(`${base}/`)) {
      rel = `${base}/${rel}`;
    }
    return rel.replace(/^\/+/, "");
  }

  const name = String(file.name || "").replace(/^.*[/\\]/, "");
  if (!name || !IMAGE_EXT.test(name)) return "";
  return base ? `${base}/${name}` : name;
}

function splitRelPath(relPath) {
  const parts = String(relPath || "")
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean);
  const name = parts.pop() || "";
  const folder = parts.join("/");
  return { folder, name };
}

function breadcrumbParts(folder) {
  const f = normalizeFolderInput(folder);
  if (!f) return [];
  return f.split("/").filter(Boolean);
}

function buildUploadItems(fileList, baseFolder) {
  const all = Array.from(fileList || []);
  const files = all.filter((f) => {
    const label = f.webkitRelativePath || f.name || "";
    return IMAGE_EXT.test(label) || IMAGE_EXT.test(f.name || "");
  });

  const items = [];
  const seen = new Set();
  const destFolders = new Set();
  let bytes = 0;

  for (const file of files) {
    const relPath = toRelPath(file, baseFolder);
    if (!relPath || seen.has(relPath)) continue;
    seen.add(relPath);
    const { folder: destFolder } = splitRelPath(relPath);
    if (destFolder) destFolders.add(destFolder);
    bytes += Number(file.size) || 0;
    items.push({ file, relPath });
  }

  // Carpetas = rutas únicas de destino (incluye anidadas)
  return {
    items,
    imageCount: items.length,
    folderCount: destFolders.size,
    totalBytes: bytes,
    destFolders: [...destFolders].sort(),
    nonImageSkipped: Math.max(0, all.length - files.length),
  };
}

async function checkExistingPaths(paths) {
  const existing = [];
  for (let i = 0; i < paths.length; i += CHECK_EXISTS_BATCH) {
    const chunk = paths.slice(i, i + CHECK_EXISTS_BATCH);
    const { data } = await checkImagesExistRequest(chunk);
    if (Array.isArray(data?.existing)) existing.push(...data.existing);
  }
  return existing;
}

export default function ImgManagerPage() {
  const { user, toast } = useAuth();
  const [rows, setRows] = useState([]);
  const [folders, setFolders] = useState([]);
  const [totals, setTotals] = useState(null);
  const [folder, setFolder] = useState("");
  const [folderDraft, setFolderDraft] = useState("");
  const [maxDepth, setMaxDepth] = useState(30);
  const [openUpload, setOpenUpload] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [rowToDelete, setRowToDelete] = useState(null);
  const [loading, setLoading] = useState(true);

  const filesInputRef = useRef(null);
  const folderInputRef = useRef(null);

  /** Resumen previo a subir */
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMeta, setPreviewMeta] = useState({
    items: [],
    imageCount: 0,
    folderCount: 0,
    totalBytes: 0,
    destFolders: [],
    nonImageSkipped: 0,
  });

  /** Conflictos (estilo Windows) */
  const [conflictOpen, setConflictOpen] = useState(false);
  const [pendingItems, setPendingItems] = useState([]);
  const [conflictPaths, setConflictPaths] = useState([]);
  const [applyToAll, setApplyToAll] = useState(true);
  /** Índice del conflicto actual cuando applyToAll=false */
  const [conflictIndex, setConflictIndex] = useState(0);
  /** Decisiones por ruta: 'skip' | 'replace' */
  const conflictDecisionsRef = useRef(new Map());

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({
    done: 0,
    total: 0,
    current: "",
    phase: "idle", // idle | preparing | uploading | done
    ok: 0,
    skipped: 0,
    fail: 0,
  });
  const [progressOpen, setProgressOpen] = useState(false);

  const fetchScan = useCallback(
    async (targetFolder = folder) => {
      const normalized = normalizeFolderInput(targetFolder);
      setLoading(true);
      try {
        const { data } = await scanImagesRequest({
          folder: normalized,
          maxDepth,
        });
        setFolder(normalized);
        setFolderDraft(normalized);
        setRows(data?.files || []);
        setFolders(data?.folders || []);
        setTotals(data?.totals || null);
      } catch (error) {
        toast({
          message:
            error?.response?.data?.message || "No se pudo escanear /img",
          variant: "error",
        });
        setRows([]);
        setFolders([]);
        setTotals(null);
      } finally {
        setLoading(false);
      }
    },
    [folder, maxDepth, toast],
  );

  useEffect(() => {
    if (user?.loginRol === "Programador") {
      void fetchScan("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.loginRol]);

  if (user?.loginRol !== "Programador") return <Navigate to="/" replace />;

  const goToFolder = (next) => {
    void fetchScan(normalizeFolderInput(next));
  };

  const crumbs = breadcrumbParts(folder);

  const confirmDelete = async () => {
    if (!rowToDelete?.relPath) return;
    try {
      await toast({ promise: deleteImageRequest(rowToDelete.relPath) });
      setOpenDelete(false);
      setRowToDelete(null);
      await fetchScan(folder);
    } catch {
      /* toast */
    }
  };

  const downloadZip = async () => {
    try {
      const { data } = await downloadFolderZipRequest(folder);
      const blob = new Blob([data], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(folder || "img").replace(/[/\\]/g, "_")}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        message: error?.response?.data?.message || "Error al descargar ZIP",
        variant: "error",
      });
    }
  };

  const resetUploadState = () => {
    setPendingItems([]);
    setConflictPaths([]);
    setConflictIndex(0);
    setApplyToAll(true);
    conflictDecisionsRef.current = new Map();
    setPreviewMeta({
      items: [],
      imageCount: 0,
      folderCount: 0,
      totalBytes: 0,
      destFolders: [],
      nonImageSkipped: 0,
    });
  };

  const runBulkUpload = async (items, decisions) => {
    if (!items.length) return;
    const map =
      decisions instanceof Map
        ? decisions
        : new Map(
            (conflictPaths || []).map((p) => [
              p,
              decisions?.replaceExisting ? "replace" : "skip",
            ]),
          );

    setConflictOpen(false);
    setPreviewOpen(false);
    setUploading(true);
    setProgressOpen(true);
    setUploadProgress({
      done: 0,
      total: items.length,
      current: "",
      phase: "uploading",
      ok: 0,
      skipped: 0,
      fail: 0,
    });

    let ok = 0;
    let fail = 0;
    let skipped = 0;

    try {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const decision = map.get(item.relPath);
        setUploadProgress((prev) => ({
          ...prev,
          done: i,
          current: item.relPath,
          phase: "uploading",
          ok,
          skipped,
          fail,
        }));

        if (decision === "skip") {
          skipped += 1;
          setUploadProgress((prev) => ({
            ...prev,
            done: i + 1,
            skipped,
            ok,
            fail,
          }));
          continue;
        }

        try {
          const { folder: destFolder, name } = splitRelPath(item.relPath);
          await uploadImageRequest({
            file: item.file,
            folder: destFolder,
            name,
            replace: decision === "replace",
          });
          ok += 1;
        } catch {
          fail += 1;
        }
        setUploadProgress((prev) => ({
          ...prev,
          done: i + 1,
          ok,
          skipped,
          fail,
          current: item.relPath,
        }));
      }

      setUploadProgress((prev) => ({
        ...prev,
        phase: "done",
        current: "",
        ok,
        skipped,
        fail,
        done: items.length,
      }));

      toast({
        message: `Subida lista: ${ok} ok, ${skipped} omitidos, ${fail} errores`,
        variant: fail ? "warning" : "success",
      });
      await fetchScan(folder);
    } finally {
      setUploading(false);
      resetUploadState();
    }
  };

  const startConflictFlow = (items, existing) => {
    setPendingItems(items);
    setConflictPaths(existing);
    setConflictIndex(0);
    setApplyToAll(true);
    conflictDecisionsRef.current = new Map();
    setProgressOpen(false);
    setConflictOpen(true);
  };

  const applyConflictDecision = async (action) => {
    // action: 'skip' | 'replace'
    const paths = conflictPaths;
    if (!paths.length) {
      await runBulkUpload(pendingItems, new Map());
      return;
    }

    if (applyToAll) {
      const map = new Map(paths.map((p) => [p, action]));
      await runBulkUpload(pendingItems, map);
      return;
    }

    // Uno por uno
    const current = paths[conflictIndex];
    if (current) conflictDecisionsRef.current.set(current, action);
    const next = conflictIndex + 1;
    if (next >= paths.length) {
      await runBulkUpload(pendingItems, conflictDecisionsRef.current);
    } else {
      setConflictIndex(next);
    }
  };

  const prepareAfterConfirm = async (items) => {
    setPreviewOpen(false);
    setProgressOpen(true);
    setUploadProgress({
      done: 0,
      total: items.length,
      current: `Comprobando ${items.length} archivo(s) en el servidor…`,
      phase: "preparing",
      ok: 0,
      skipped: 0,
      fail: 0,
    });

    try {
      const existing = await checkExistingPaths(items.map((i) => i.relPath));
      if (existing.length > 0) {
        startConflictFlow(items, existing);
      } else {
        await runBulkUpload(items, new Map());
      }
    } catch (error) {
      setProgressOpen(false);
      toast({
        message:
          error?.response?.data?.message ||
          "No se pudo comprobar archivos existentes",
        variant: "error",
      });
      resetUploadState();
    }
  };

  const openPreviewFromFileList = (fileList) => {
    const meta = buildUploadItems(fileList, folder);
    if (!meta.items.length) {
      toast({
        message:
          meta.nonImageSkipped > 0
            ? "La carpeta no tiene imágenes válidas (.png .jpg .webp .gif .svg)"
            : "No hay imágenes válidas para subir",
        variant: "warning",
      });
      return;
    }
    setPreviewMeta(meta);
    setPreviewOpen(true);
  };

  const columns = useMemo(
    () => [
      {
        id: "preview",
        label: "Vista",
        render: (row) => (
          <Box
            component="img"
            src={`${pathImg}${row.relPath}`}
            alt={row.name}
            sx={{ width: 56, height: 56, objectFit: "cover", borderRadius: 1 }}
          />
        ),
      },
      { id: "relPath", label: "Ruta", getSearchValue: (r) => r.relPath },
      { id: "name", label: "Nombre" },
      { id: "sizeHuman", label: "Tamaño" },
      {
        id: "actions",
        label: "Acciones",
        render: (row) => (
          <Tooltip title="Eliminar">
            <IconButton
              size="small"
              onClick={() => {
                setRowToDelete(row);
                setOpenDelete(true);
              }}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    [],
  );

  const progressPct =
    uploadProgress.total > 0
      ? Math.round((uploadProgress.done / uploadProgress.total) * 100)
      : 0;

  const currentConflictPath = conflictPaths[conflictIndex] || "";
  const conflictTitle = applyToAll
    ? "El destino ya tiene archivos con el mismo nombre"
    : `Conflicto ${conflictIndex + 1} de ${conflictPaths.length}`;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Control de imágenes
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Base: <strong>{pathImg}</strong> — navegá carpetas hijas, bajá ZIP o usá{" "}
        <strong>Subir carpeta</strong> para mandar un árbol completo (subcarpetas +
        imágenes). Elegí la carpeta <code>img</code> local o cualquier carpeta con
        subcarpetas.
      </Typography>

      <Breadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        sx={{ mb: 1.5 }}
        aria-label="ruta carpeta img"
      >
        <Link
          component="button"
          type="button"
          underline="hover"
          color={folder ? "inherit" : "text.primary"}
          onClick={() => goToFolder("")}
          disabled={uploading}
          sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}
        >
          <FolderOpenIcon fontSize="small" />
          img
        </Link>
        {crumbs.map((part, idx) => {
          const path = crumbs.slice(0, idx + 1).join("/");
          const isLast = idx === crumbs.length - 1;
          return isLast ? (
            <Typography key={path} color="text.primary" fontWeight={600}>
              {part}
            </Typography>
          ) : (
            <Link
              key={path}
              component="button"
              type="button"
              underline="hover"
              color="inherit"
              onClick={() => goToFolder(path)}
              disabled={uploading}
            >
              {part}
            </Link>
          );
        })}
      </Breadcrumbs>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        sx={{ mb: 2 }}
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
      >
        <TextField
          size="small"
          label="Carpeta (relativa a img)"
          value={folderDraft}
          onChange={(e) => setFolderDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") goToFolder(folderDraft);
          }}
          placeholder="vacío = raíz · ej. sistema/products"
          helperText="No escribas «img»: esa ya es la raíz"
          fullWidth
          sx={{ minWidth: 180, flex: 1 }}
        />
        <TextField
          size="small"
          label="Profundidad"
          type="number"
          value={maxDepth}
          onChange={(e) => setMaxDepth(Number(e.target.value || 30))}
          inputProps={{ min: 0, max: 80 }}
          sx={{ width: 120 }}
        />
        <Tooltip title="Escanear">
          <IconButton
            onClick={() => goToFolder(folderDraft)}
            disabled={uploading}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
        <Button
          startIcon={<UploadFileIcon />}
          onClick={() => setOpenUpload(true)}
          disabled={uploading}
        >
          Subir 1
        </Button>
        <Button
          startIcon={<DriveFolderUploadIcon />}
          variant="outlined"
          disabled={uploading}
          onClick={() => folderInputRef.current?.click()}
        >
          Subir carpeta
        </Button>
        <Button
          startIcon={<UploadFileIcon />}
          variant="outlined"
          disabled={uploading}
          onClick={() => filesInputRef.current?.click()}
        >
          Subir archivos
        </Button>
        <Button
          startIcon={<DownloadIcon />}
          onClick={downloadZip}
          disabled={uploading}
        >
          ZIP
        </Button>
      </Stack>

      <input
        ref={filesInputRef}
        type="file"
        hidden
        multiple
        accept="image/*"
        onChange={(e) => {
          const list = e.target.files;
          e.target.value = "";
          openPreviewFromFileList(list);
        }}
      />
      <input
        ref={(el) => {
          folderInputRef.current = el;
          if (el) {
            el.setAttribute("webkitdirectory", "");
            el.setAttribute("directory", "");
            el.setAttribute("mozdirectory", "");
          }
        }}
        type="file"
        hidden
        multiple
        onChange={(e) => {
          const list = e.target.files;
          e.target.value = "";
          if (!list?.length) return;
          openPreviewFromFileList(list);
        }}
      />

      {uploading ? (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            Subiendo… {uploadProgress.done}/{uploadProgress.total} ({progressPct}
            %)
          </Typography>
          <LinearProgress variant="determinate" value={progressPct} />
        </Box>
      ) : null}

      <Stack direction="row" spacing={1} sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
        <Chip size="small" label={`Carpetas: ${totals?.totalFolders ?? folders.length}`} />
        <Chip size="small" label={`Archivos: ${totals?.totalFiles ?? 0}`} />
        <Chip size="small" label={`Tamaño: ${totals?.totalSizeHuman ?? "0 B"}`} />
        {folder ? (
          <Chip
            size="small"
            color="primary"
            variant="outlined"
            label={`En: ${folder}`}
            onDelete={() => goToFolder("")}
          />
        ) : null}
      </Stack>

      <Box
        sx={{
          mb: 2,
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            px: 1.5,
            py: 1,
            bgcolor: "action.hover",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <FolderIcon fontSize="small" color="primary" />
          <Typography variant="subtitle2">
            Carpetas hijas {folder ? `de «${folder}»` : "(raíz img)"}
          </Typography>
        </Box>
        {loading ? (
          <Box sx={{ p: 2 }}>
            <LinearProgress />
          </Box>
        ) : folders.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
            Sin subcarpetas aquí.
          </Typography>
        ) : (
          <List dense disablePadding>
            {folders.map((dir) => (
              <ListItem key={dir.relPath || dir.name} disablePadding>
                <ListItemButton
                  disabled={uploading}
                  onClick={() => goToFolder(dir.relPath || dir.name)}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <FolderIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={dir.name || dir.relPath}
                    secondary={dir.relPath}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      <TablePro
        title={folder ? `Imágenes en ${folder}` : "Imágenes (todas las visibles)"}
        rows={rows}
        columns={columns}
        showSearch
        showPagination
        defaultRowsPerPage={10}
        rowsPerPageOptions={[10, 25, 50, 100]}
        loading={loading}
      />

      <SimpleDialog
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        title="Subir imagen"
        maxWidth="sm"
        fullWidth
      >
        <UploadImageForm
          defaultFolder={folder}
          onClose={() => setOpenUpload(false)}
          onUploaded={() => {
            setOpenUpload(false);
            void fetchScan(folder);
          }}
        />
      </SimpleDialog>

      <SimpleDialog
        open={openDelete}
        onClose={() => setOpenDelete(false)}
        title="Eliminar imagen"
        message={`¿Eliminar ${rowToDelete?.relPath}?`}
        onClickAccept={confirmDelete}
      />

      {/* 1) Resumen: carpetas + imágenes */}
      <SimpleDialog
        open={previewOpen}
        onClose={() => {
          if (uploading) return;
          setPreviewOpen(false);
          resetUploadState();
        }}
        title="Preparar subida de carpeta"
        maxWidth="sm"
        fullWidth
      >
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          Se va a subir el contenido seleccionado a{" "}
          <strong>{folder ? `img/${folder}` : "img (raíz)"}</strong>.
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
          <Chip color="primary" label={`Carpetas: ${previewMeta.folderCount}`} />
          <Chip color="primary" label={`Imágenes: ${previewMeta.imageCount}`} />
          <Chip label={`Tamaño: ${formatBytes(previewMeta.totalBytes)}`} />
          {previewMeta.nonImageSkipped > 0 ? (
            <Chip
              variant="outlined"
              label={`Ignorados (no imagen): ${previewMeta.nonImageSkipped}`}
            />
          ) : null}
        </Stack>
        {previewMeta.destFolders.length ? (
          <List
            dense
            sx={{
              maxHeight: 180,
              overflow: "auto",
              mb: 2,
              bgcolor: "action.hover",
              borderRadius: 1,
            }}
          >
            {previewMeta.destFolders.slice(0, 30).map((d) => (
              <ListItem key={d} disableGutters sx={{ px: 1 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <FolderIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={d}
                  primaryTypographyProps={{
                    variant: "caption",
                    sx: { wordBreak: "break-all" },
                  }}
                />
              </ListItem>
            ))}
            {previewMeta.destFolders.length > 30 ? (
              <ListItem>
                <ListItemText
                  primary={`… y ${previewMeta.destFolders.length - 30} carpetas más`}
                  primaryTypographyProps={{ variant: "caption" }}
                />
              </ListItem>
            ) : null}
          </List>
        ) : (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
            Los archivos irán directo a la carpeta actual (sin subcarpetas nuevas).
          </Typography>
        )}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button
            variant="contained"
            startIcon={<DriveFolderUploadIcon />}
            onClick={() => void prepareAfterConfirm(previewMeta.items)}
          >
            Subir
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              setPreviewOpen(false);
              resetUploadState();
            }}
          >
            Cancelar
          </Button>
        </Stack>
      </SimpleDialog>

      {/* 2) Conflictos estilo Windows */}
      <SimpleDialog
        open={conflictOpen}
        onClose={() => {
          if (uploading) return;
          setConflictOpen(false);
          resetUploadState();
        }}
        title={conflictTitle}
        maxWidth="sm"
        fullWidth
        disableClose={uploading}
        hideClose={uploading}
      >
        <Typography variant="body2" sx={{ mb: 1 }}>
          {applyToAll ? (
            <>
              Hay <strong>{conflictPaths.length}</strong> archivo(s) que ya existen
              en el servidor (de {pendingItems.length} seleccionados).
            </>
          ) : (
            <>
              Este archivo ya existe en el destino:
              <Box
                component="code"
                sx={{ display: "block", mt: 0.75, wordBreak: "break-all" }}
              >
                {currentConflictPath}
              </Box>
            </>
          )}
        </Typography>

        {applyToAll ? (
          <List
            dense
            sx={{
              maxHeight: 180,
              overflow: "auto",
              mb: 1.5,
              bgcolor: "action.hover",
              borderRadius: 1,
            }}
          >
            {conflictPaths.slice(0, 40).map((p) => (
              <ListItem key={p} disableGutters sx={{ px: 1 }}>
                <ListItemText
                  primary={p}
                  primaryTypographyProps={{
                    variant: "caption",
                    sx: { wordBreak: "break-all" },
                  }}
                />
              </ListItem>
            ))}
            {conflictPaths.length > 40 ? (
              <ListItem>
                <ListItemText
                  primary={`… y ${conflictPaths.length - 40} más`}
                  primaryTypographyProps={{ variant: "caption" }}
                />
              </ListItem>
            ) : null}
          </List>
        ) : null}

        <FormControlLabel
          sx={{ mb: 1.5, display: "flex" }}
          control={
            <Checkbox
              checked={applyToAll}
              onChange={(e) => {
                setApplyToAll(e.target.checked);
                setConflictIndex(0);
                conflictDecisionsRef.current = new Map();
              }}
              disabled={uploading}
            />
          }
          label={`Aplicar a todos los conflictos (${conflictPaths.length})`}
        />

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button
            variant="contained"
            disabled={uploading}
            onClick={() => void applyConflictDecision("skip")}
          >
            Omitir
          </Button>
          <Button
            variant="contained"
            color="warning"
            disabled={uploading}
            onClick={() => void applyConflictDecision("replace")}
          >
            Reemplazar
          </Button>
          <Button
            variant="outlined"
            disabled={uploading}
            onClick={() => {
              setConflictOpen(false);
              resetUploadState();
            }}
          >
            Cancelar
          </Button>
        </Stack>
      </SimpleDialog>

      {/* 3) Progreso */}
      <SimpleDialog
        open={progressOpen}
        onClose={() => {
          if (uploading || uploadProgress.phase === "preparing") return;
          setProgressOpen(false);
          setUploadProgress({
            done: 0,
            total: 0,
            current: "",
            phase: "idle",
            ok: 0,
            skipped: 0,
            fail: 0,
          });
        }}
        title={
          uploadProgress.phase === "preparing"
            ? "Preparando subida…"
            : uploadProgress.phase === "done"
              ? "Subida finalizada"
              : "Subiendo imágenes…"
        }
        maxWidth="sm"
        fullWidth
        disableClose={uploading || uploadProgress.phase === "preparing"}
        hideClose={uploading || uploadProgress.phase === "preparing"}
      >
        {uploadProgress.phase === "preparing" ? (
          <>
            <Typography variant="body2" sx={{ mb: 1.5 }}>
              {uploadProgress.current || "Comprobando archivos en el servidor…"}
            </Typography>
            <LinearProgress />
          </>
        ) : (
          <>
            <Typography variant="body2" sx={{ mb: 0.75 }}>
              {uploadProgress.done}/{uploadProgress.total} ({progressPct}%)
            </Typography>
            <LinearProgress
              variant="determinate"
              value={progressPct}
              sx={{ mb: 1.5, height: 10, borderRadius: 1 }}
            />
            {uploadProgress.current ? (
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                sx={{ mb: 1, wordBreak: "break-all" }}
              >
                {uploadProgress.phase === "done"
                  ? "Listo."
                  : `Actual: ${uploadProgress.current}`}
              </Typography>
            ) : null}
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
              <Chip size="small" color="success" label={`Ok: ${uploadProgress.ok}`} />
              <Chip size="small" label={`Omitidos: ${uploadProgress.skipped}`} />
              <Chip
                size="small"
                color={uploadProgress.fail ? "error" : "default"}
                label={`Errores: ${uploadProgress.fail}`}
              />
            </Stack>
            {uploadProgress.phase === "done" ? (
              <Button
                variant="contained"
                fullWidth
                onClick={() => {
                  setProgressOpen(false);
                  setUploadProgress({
                    done: 0,
                    total: 0,
                    current: "",
                    phase: "idle",
                    ok: 0,
                    skipped: 0,
                    fail: 0,
                  });
                }}
              >
                Cerrar
              </Button>
            ) : null}
          </>
        )}
      </SimpleDialog>
    </Box>
  );
}
