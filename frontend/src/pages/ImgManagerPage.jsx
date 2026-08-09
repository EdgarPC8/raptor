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
  Chip,
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

  const folderInputRef = useRef(null);
  const filesInputRef = useRef(null);

  const [conflictOpen, setConflictOpen] = useState(false);
  const [pendingItems, setPendingItems] = useState([]);
  const [conflictPaths, setConflictPaths] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });

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

  // Asegurar selección recursiva de carpeta (Chrome/Edge/Firefox)
  useEffect(() => {
    const el = folderInputRef.current;
    if (!el) return;
    el.setAttribute("webkitdirectory", "");
    el.setAttribute("directory", "");
    el.setAttribute("mozdirectory", "");
  }, []);

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

  const runBulkUpload = async (items, { replaceExisting }) => {
    if (!items.length) return;
    setUploading(true);
    setUploadProgress({ done: 0, total: items.length });
    let ok = 0;
    let fail = 0;
    let skipped = 0;

    try {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const isConflict = conflictPaths.includes(item.relPath);
        if (isConflict && !replaceExisting) {
          skipped += 1;
          setUploadProgress({ done: i + 1, total: items.length });
          continue;
        }
        try {
          const { folder: destFolder, name } = splitRelPath(item.relPath);
          await uploadImageRequest({
            file: item.file,
            folder: destFolder,
            name,
            replace: isConflict ? true : false,
          });
          ok += 1;
        } catch {
          fail += 1;
        }
        setUploadProgress({ done: i + 1, total: items.length });
      }

      toast({
        message: `Subida lista: ${ok} ok, ${skipped} omitidos, ${fail} errores`,
        variant: fail ? "warning" : "success",
      });
      await fetchScan(folder);
    } finally {
      setUploading(false);
      setConflictOpen(false);
      setPendingItems([]);
      setConflictPaths([]);
      setUploadProgress({ done: 0, total: 0 });
    }
  };

  const prepareBulkFromFileList = async (fileList) => {
    const all = Array.from(fileList || []);
    const files = all.filter((f) => {
      const label = f.webkitRelativePath || f.name || "";
      return IMAGE_EXT.test(label) || IMAGE_EXT.test(f.name || "");
    });
    if (!files.length) {
      toast({
        message: "No hay imágenes válidas (.png .jpg .webp .gif .svg)",
        variant: "warning",
      });
      return;
    }

    const items = [];
    const seen = new Set();
    const destFolders = new Set();
    for (const file of files) {
      const relPath = toRelPath(file, folder);
      if (!relPath || seen.has(relPath)) continue;
      seen.add(relPath);
      const { folder: destFolder } = splitRelPath(relPath);
      if (destFolder) destFolders.add(destFolder);
      items.push({ file, relPath });
    }

    if (!items.length) {
      toast({ message: "Sin rutas válidas para subir", variant: "warning" });
      return;
    }

    toast({
      message: `Preparando ${items.length} imagen(es) en ${destFolders.size || 1} carpeta(s)…`,
      variant: "info",
    });

    try {
      const { data } = await checkImagesExistRequest(items.map((i) => i.relPath));
      const existing = data?.existing || [];
      setPendingItems(items);
      setConflictPaths(existing);

      if (existing.length > 0) {
        setConflictOpen(true);
      } else {
        await runBulkUpload(items, { replaceExisting: false });
      }
    } catch (error) {
      toast({
        message:
          error?.response?.data?.message ||
          "No se pudo comprobar archivos existentes",
        variant: "error",
      });
    }
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

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Control de imágenes
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Base: <strong>{pathImg}</strong> — navegá carpetas hijas, bajá ZIP o subí
        una carpeta local (con subcarpetas y archivos).
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
          onClick={() => {
            const el = folderInputRef.current;
            if (!el) return;
            el.setAttribute("webkitdirectory", "");
            el.setAttribute("directory", "");
            el.setAttribute("mozdirectory", "");
            el.click();
          }}
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
        ref={folderInputRef}
        type="file"
        hidden
        multiple
        {...{ webkitdirectory: "", directory: "", mozdirectory: "" }}
        onChange={(e) => {
          const list = e.target.files;
          e.target.value = "";
          void prepareBulkFromFileList(list);
        }}
      />
      <input
        ref={filesInputRef}
        type="file"
        hidden
        multiple
        accept="image/*"
        onChange={(e) => {
          const list = e.target.files;
          e.target.value = "";
          void prepareBulkFromFileList(list);
        }}
      />

      {uploading ? (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            Subiendo {uploadProgress.done}/{uploadProgress.total} ({progressPct}
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
          <Typography variant="subtitle2" fontWeight={700}>
            Carpetas hijas {folder ? `de «${folder}»` : "(raíz img)"}
          </Typography>
        </Box>
        {loading ? (
          <Box sx={{ p: 2 }}>
            <LinearProgress />
          </Box>
        ) : folders.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
            No hay subcarpetas aquí. Usá «Subir carpeta» para crear el árbol con
            archivos.
          </Typography>
        ) : (
          <List dense disablePadding>
            {folders.map((dir) => (
              <ListItem key={dir.relPath} disablePadding divider>
                <ListItemButton
                  onClick={() => goToFolder(dir.relPath)}
                  disabled={uploading}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <FolderIcon color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary={dir.name}
                    secondary={dir.relPath}
                    primaryTypographyProps={{ fontWeight: 600 }}
                    secondaryTypographyProps={{ variant: "caption" }}
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

      <SimpleDialog
        open={conflictOpen}
        onClose={() => {
          if (uploading) return;
          setConflictOpen(false);
          setPendingItems([]);
          setConflictPaths([]);
        }}
        title="Archivos que ya existen"
        maxWidth="sm"
        fullWidth
        disableClose={uploading}
        hideClose={uploading}
      >
        <Typography variant="body2" sx={{ mb: 1 }}>
          Hay <strong>{conflictPaths.length}</strong> archivo(s) que ya están en
          el backend. ¿Qué querés hacer con ellos?
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
          Total a subir: {pendingItems.length} · Nuevos:{" "}
          {pendingItems.length - conflictPaths.length} · Conflictos:{" "}
          {conflictPaths.length}
        </Typography>
        <List dense sx={{ maxHeight: 220, overflow: "auto", mb: 2, bgcolor: "action.hover", borderRadius: 1 }}>
          {conflictPaths.slice(0, 40).map((p) => (
            <ListItem key={p} disableGutters sx={{ px: 1 }}>
              <ListItemText
                primary={p}
                primaryTypographyProps={{ variant: "caption", sx: { wordBreak: "break-all" } }}
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
        {uploading ? (
          <Box sx={{ mb: 1 }}>
            <LinearProgress variant="determinate" value={progressPct} />
            <Typography variant="caption">
              {uploadProgress.done}/{uploadProgress.total}
            </Typography>
          </Box>
        ) : (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button
              variant="contained"
              color="warning"
              onClick={() => void runBulkUpload(pendingItems, { replaceExisting: true })}
            >
              Reemplazar existentes
            </Button>
            <Button
              variant="contained"
              onClick={() => void runBulkUpload(pendingItems, { replaceExisting: false })}
            >
              Omitir existentes
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                setConflictOpen(false);
                setPendingItems([]);
                setConflictPaths([]);
              }}
            >
              Cancelar
            </Button>
          </Stack>
        )}
      </SimpleDialog>
    </Box>
  );
}
