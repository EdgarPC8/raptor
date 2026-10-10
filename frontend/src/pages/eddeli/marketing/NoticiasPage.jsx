import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Container,
  Stack,
  Typography,
  CircularProgress,
  Alert,
  ButtonBase,
  Collapse,
  Button,
} from "@mui/material";
import CampaignIcon from "@mui/icons-material/Campaign";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import WidgetsIcon from "@mui/icons-material/Widgets";
import PercentIcon from "@mui/icons-material/Percent";
import PaymentsIcon from "@mui/icons-material/Payments";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import SyncAltIcon from "@mui/icons-material/SyncAlt";
import ArticleIcon from "@mui/icons-material/Article";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import BadgeIcon from "@mui/icons-material/Badge";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import NewspaperIcon from "@mui/icons-material/Newspaper";
import { getNewsRequest } from "../../../api/newsRequest.js";
import { markNewsAsSeen } from "../../../utils/newsLocalState.js";
import { BRAND_NAME } from "../../../config/raptorBrand.js";

const FIGURE_PALETTES = [
  { bg: "primary.light", ink: "primary.dark" },
  { bg: "warning.light", ink: "warning.dark" },
  { bg: "success.light", ink: "success.dark" },
  { bg: "info.light", ink: "info.dark" },
  { bg: "secondary.light", ink: "secondary.dark" },
];

function pickFigure(item) {
  const text = `${item?.title || ""} ${item?.subtitle || ""} ${item?.kind || ""}`.toLowerCase();
  if (item?.kind === "proximamente" || /pr[oó]xim|dueño|qr|barra|encuesta|tema|gr[aá]fic/.test(text)) {
    if (/qr|barra|enlace/.test(text)) {
      return { Icon: QrCode2Icon, palette: FIGURE_PALETTES[4] };
    }
    if (/dueño|rol|empleado|admin|programador/.test(text)) {
      return { Icon: BadgeIcon, palette: FIGURE_PALETTES[4] };
    }
    if (/reporte|financ|gr[aá]fic/.test(text)) {
      return { Icon: PaymentsIcon, palette: FIGURE_PALETTES[4] };
    }
    if (/tema|color|oscuro|claro/.test(text)) {
      return { Icon: AutoAwesomeIcon, palette: FIGURE_PALETTES[1] };
    }
    if (/encuesta/.test(text)) {
      return { Icon: CampaignIcon, palette: FIGURE_PALETTES[3] };
    }
    return { Icon: AutoAwesomeIcon, palette: FIGURE_PALETTES[4] };
  }
  if (/mantenim|martillo|yunque|gestor/.test(text)) {
    return { Icon: SyncAltIcon, palette: FIGURE_PALETTES[1] };
  }
  if (/diario|noticia|peri[oó]d/.test(text)) {
    return { Icon: NewspaperIcon, palette: FIGURE_PALETTES[0] };
  }
  if (/descuento|%|porcentaje/.test(text)) {
    return { Icon: PercentIcon, palette: FIGURE_PALETTES[1] };
  }
  if (/turno|inventario/.test(text)) {
    return { Icon: AccessTimeIcon, palette: FIGURE_PALETTES[0] };
  }
  if (/caja|mostrador|venta/.test(text)) {
    return { Icon: PointOfSaleIcon, palette: FIGURE_PALETTES[1] };
  }
  if (/comprobante|recibo|factura/.test(text)) {
    return { Icon: ReceiptLongIcon, palette: FIGURE_PALETTES[2] };
  }
  if (/pedido/.test(text)) {
    return { Icon: ShoppingCartIcon, palette: FIGURE_PALETTES[2] };
  }
  if (/cobranza|pago|saldo|abono/.test(text)) {
    return { Icon: PaymentsIcon, palette: FIGURE_PALETTES[2] };
  }
  if (/colaps/.test(text)) {
    return { Icon: UnfoldLessIcon, palette: FIGURE_PALETTES[3] };
  }
  if (/paca/.test(text)) {
    return { Icon: Inventory2Icon, palette: FIGURE_PALETTES[3] };
  }
  if (/m[oó]dulo|cat[aá]logo|operaci[oó]n/.test(text)) {
    return { Icon: WidgetsIcon, palette: FIGURE_PALETTES[0] };
  }
  if (/sincron|din[aá]mic|push|env[ií]o/.test(text)) {
    return { Icon: SyncAltIcon, palette: FIGURE_PALETTES[2] };
  }
  return { Icon: ArticleIcon, palette: FIGURE_PALETTES[0] };
}

function formatDate(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString("es-EC", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function sortKey(item) {
  return Number(item.sortOrder ?? item.sort_order ?? 0);
}

function sectionDomId(id) {
  return `news-sec-${id}`;
}

function buildNewsBoard(items) {
  const portadas = [];
  const novedades = [];
  const sistema = [];
  const proximamente = [];

  for (const item of items) {
    const kind = String(item.kind || "");
    if (kind === "portada") {
      portadas.push(item);
      continue;
    }
    if (kind === "proximamente") {
      proximamente.push(item);
      continue;
    }
    if (kind === "breve") {
      if (sortKey(item) >= 20) novedades.push(item);
      else sistema.push(item);
      continue;
    }
    sistema.push(item);
  }

  const byOrder = (a, b) => sortKey(a) - sortKey(b);
  portadas.sort(byOrder);
  novedades.sort(byOrder);
  sistema.sort(byOrder);
  proximamente.sort(byOrder);

  return {
    cover: portadas[0] || null,
    sections: [
      {
        id: "novedades",
        eyebrow: "Novedades",
        title: "Lo nuevo",
        description: "Cambios recientes y mejoras que acabamos de sumar.",
        accent: "primary",
        items: novedades,
      },
      {
        id: "sistema",
        eyebrow: "En el sistema",
        title: "Ya funciona",
        description: "Lo que tenés disponible y corre bien día a día.",
        accent: "success",
        items: sistema,
      },
      {
        id: "proximamente",
        eyebrow: "Roadmap",
        title: "Lo que se viene",
        description: "Próximas funciones en preparación.",
        accent: "warning",
        items: proximamente,
      },
    ],
  };
}

function accentColor(accent) {
  if (accent === "success") return "success.main";
  if (accent === "warning") return "warning.main";
  return "primary.main";
}

function CoverHero({ item }) {
  const { Icon } = pickFigure(item);
  return (
    <Box
      id={sectionDomId("portada")}
      sx={{
        scrollMarginTop: 88,
        position: "relative",
        overflow: "hidden",
        borderRadius: 3,
        border: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
        backgroundImage: (theme) =>
          `linear-gradient(145deg, ${theme.palette.primary.main}22 0%, ${theme.palette.background.paper} 48%, ${theme.palette.warning.main}14 100%)`,
        px: { xs: 2.5, md: 4 },
        py: { xs: 3.5, md: 5 },
      }}
    >
      <Box
        sx={{
          position: "absolute",
          right: { xs: 12, md: 28 },
          top: { xs: 12, md: 24 },
          width: { xs: 56, md: 72 },
          height: { xs: 56, md: 72 },
          borderRadius: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "primary.main",
          color: "primary.contrastText",
          opacity: 0.92,
        }}
        aria-hidden
      >
        <Icon sx={{ fontSize: { xs: 28, md: 34 } }} />
      </Box>

      <Typography
        sx={{
          mb: 1.25,
          fontSize: "0.7rem",
          fontWeight: 800,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "text.secondary",
          pr: 8,
        }}
      >
        Primera plana
        {item.publishedAt ? ` · ${formatDate(item.publishedAt)}` : ""}
      </Typography>
      <Typography
        component="h1"
        sx={{
          maxWidth: 720,
          fontWeight: 900,
          letterSpacing: "-0.02em",
          lineHeight: 1.12,
          fontSize: { xs: "1.75rem", md: "2.35rem" },
          color: "text.primary",
          pr: { xs: 7, md: 10 },
        }}
      >
        {item.title}
      </Typography>
      {item.subtitle ? (
        <Typography
          sx={{
            mt: 1.5,
            maxWidth: 640,
            fontWeight: 600,
            fontSize: { xs: "1rem", md: "1.1rem" },
            color: "text.secondary",
          }}
        >
          {item.subtitle}
        </Typography>
      ) : null}
      {item.body ? (
        <Typography
          sx={{
            mt: 2,
            maxWidth: 680,
            whiteSpace: "pre-wrap",
            fontSize: "0.95rem",
            lineHeight: 1.6,
            color: "text.primary",
            opacity: 0.9,
          }}
        >
          {item.body}
        </Typography>
      ) : null}
    </Box>
  );
}

function NewsCard({ item, accent }) {
  const [open, setOpen] = useState(false);
  const hasBody = Boolean(item.body?.trim());
  const { Icon, palette } = pickFigure(item);
  const bar = accentColor(accent);

  return (
    <Box
      id={`news-item-${item.id}`}
      sx={{
        scrollMarginTop: 88,
        position: "relative",
        overflow: "hidden",
        borderRadius: 2,
        border: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: 2,
        },
      }}
    >
      <Box
        sx={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          bgcolor: bar,
        }}
        aria-hidden
      />
      <Stack direction="row" spacing={1.5} sx={{ p: 2, pl: 2.5 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 1.5,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: palette.bg,
            color: palette.ink,
          }}
          aria-hidden
        >
          <Icon fontSize="small" />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <Typography
              sx={{
                fontSize: "0.65rem",
                fontWeight: 800,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: bar,
              }}
            >
              {accent === "warning"
                ? "Próximo"
                : accent === "success"
                  ? "Listo"
                  : "Nuevo"}
            </Typography>
            {item.publishedAt ? (
              <Typography sx={{ fontSize: "0.7rem", color: "text.secondary" }}>
                {formatDate(item.publishedAt)}
              </Typography>
            ) : null}
          </Stack>
          <Typography sx={{ fontWeight: 800, fontSize: "0.98rem", lineHeight: 1.25 }}>
            {item.title}
          </Typography>
          {item.subtitle ? (
            <Typography
              sx={{ mt: 0.5, fontWeight: 600, fontSize: "0.85rem", color: "text.secondary" }}
            >
              {item.subtitle}
            </Typography>
          ) : null}
          {hasBody ? (
            <>
              <Collapse in={open} collapsedSize={48}>
                <Typography
                  sx={{
                    mt: 1,
                    whiteSpace: "pre-wrap",
                    fontSize: "0.85rem",
                    lineHeight: 1.55,
                    color: "text.primary",
                    opacity: 0.85,
                  }}
                >
                  {item.body}
                </Typography>
              </Collapse>
              <Button
                size="small"
                onClick={() => setOpen((v) => !v)}
                sx={{ mt: 0.5, px: 0, minWidth: 0, fontWeight: 700 }}
              >
                {open ? "Ver menos" : "Leer más"}
              </Button>
            </>
          ) : null}
        </Box>
      </Stack>
    </Box>
  );
}

function BoardSection({ section }) {
  if (!section.items.length) return null;
  const bar = accentColor(section.accent);

  return (
    <Box id={sectionDomId(section.id)} sx={{ scrollMarginTop: 88 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-end"
        sx={{ mb: 1.5, pb: 1, borderBottom: 1, borderColor: "divider" }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: "0.68rem",
              fontWeight: 800,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: bar,
            }}
          >
            {section.eyebrow}
          </Typography>
          <Typography
            component="h2"
            sx={{
              fontWeight: 900,
              letterSpacing: "-0.02em",
              fontSize: { xs: "1.35rem", md: "1.6rem" },
            }}
          >
            {section.title}
          </Typography>
          <Typography sx={{ mt: 0.25, fontSize: "0.85rem", color: "text.secondary" }}>
            {section.description}
          </Typography>
        </Box>
        <Box
          sx={{
            px: 1.25,
            py: 0.5,
            borderRadius: 999,
            bgcolor: "action.hover",
            fontSize: "0.75rem",
            fontWeight: 700,
            color: "text.secondary",
          }}
        >
          {section.items.length}
        </Box>
      </Stack>
      <Box
        sx={{
          display: "grid",
          gap: 1.5,
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
        }}
      >
        {section.items.map((item) => (
          <NewsCard key={item.id} item={item} accent={section.accent} />
        ))}
      </Box>
    </Box>
  );
}

function FloatingNotes({ notes, activeId, onJump }) {
  const [open, setOpen] = useState(true);

  return (
    <Box
      sx={{
        pointerEvents: "none",
        position: "fixed",
        right: { xs: 12, md: 20 },
        bottom: { xs: 16, md: 28 },
        zIndex: (theme) => theme.zIndex.snackbar,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 1,
      }}
    >
      {open ? (
        <Box
          component="nav"
          aria-label="Secciones de noticias"
          sx={{
            pointerEvents: "auto",
            width: { xs: 168, sm: 188 },
            p: 1,
            borderRadius: 3,
            border: 1,
            borderColor: "divider",
            bgcolor: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(20,20,20,0.88)"
                : "rgba(255,255,255,0.9)",
            backdropFilter: "blur(10px)",
            boxShadow: 6,
            display: "flex",
            flexDirection: "column",
            gap: 0.75,
          }}
        >
          <Typography
            sx={{
              px: 0.75,
              fontSize: "0.62rem",
              fontWeight: 800,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "text.secondary",
            }}
          >
            Ir a
          </Typography>
          {notes.map((note) => {
            const active = activeId === note.id;
            const bar = accentColor(note.accent);
            return (
              <ButtonBase
                key={note.id}
                onClick={() => onJump(note.id)}
                sx={{
                  display: "block",
                  textAlign: "left",
                  borderRadius: 2,
                  border: 1,
                  borderColor: active ? bar : "divider",
                  bgcolor: active ? "action.selected" : "background.paper",
                  px: 1.25,
                  py: 1,
                  borderLeft: 3,
                  borderLeftColor: active ? bar : "transparent",
                  transition: "transform 0.15s ease",
                  "&:hover": { transform: "translateY(-1px)" },
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography
                    sx={{
                      fontSize: "0.7rem",
                      fontWeight: 800,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      color: bar,
                    }}
                  >
                    {note.title}
                  </Typography>
                  <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: "text.secondary" }}>
                    {note.count}
                  </Typography>
                </Stack>
                <Typography
                  sx={{
                    mt: 0.25,
                    fontSize: "0.7rem",
                    color: "text.secondary",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {note.hint}
                </Typography>
              </ButtonBase>
            );
          })}
        </Box>
      ) : null}

      <Button
        variant="contained"
        size="small"
        onClick={() => setOpen((v) => !v)}
        sx={{
          pointerEvents: "auto",
          borderRadius: 999,
          px: 2,
          fontWeight: 800,
          boxShadow: 4,
        }}
      >
        {open ? "Ocultar" : "Secciones"}
      </Button>
    </Box>
  );
}

function NewsBoard({ items }) {
  const board = useMemo(() => buildNewsBoard(items), [items]);
  const [activeId, setActiveId] = useState("portada");

  const notes = useMemo(() => {
    const list = [
      {
        id: "portada",
        title: "Portada",
        hint: board.cover?.title || "Primera plana",
        count: board.cover ? 1 : 0,
        accent: "primary",
      },
    ];
    for (const section of board.sections) {
      if (!section.items.length) continue;
      list.push({
        id: section.id,
        title: section.title,
        hint: section.eyebrow,
        count: section.items.length,
        accent: section.accent,
      });
    }
    return list;
  }, [board]);

  const onJump = useCallback((id) => {
    setActiveId(id);
    const el = document.getElementById(sectionDomId(id));
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    const nodes = notes
      .map((n) => document.getElementById(sectionDomId(n.id)))
      .filter(Boolean);
    if (!nodes.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0]?.target?.id?.replace(/^news-sec-/, "");
        if (top) setActiveId(top);
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0.15, 0.35, 0.6] },
    );

    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, [notes]);

  const hasAnySection = board.sections.some((s) => s.items.length > 0);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 4, pb: 10 }}>
      {board.cover ? (
        <CoverHero item={board.cover} />
      ) : (
        <Box
          id={sectionDomId("portada")}
          sx={{
            scrollMarginTop: 88,
            borderRadius: 3,
            border: "1px dashed",
            borderColor: "divider",
            bgcolor: "action.hover",
            px: 2.5,
            py: 4,
            textAlign: "center",
          }}
        >
          <Typography
            sx={{
              fontSize: "0.7rem",
              fontWeight: 800,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "text.secondary",
            }}
          >
            Primera plana
          </Typography>
          <Typography sx={{ mt: 1, color: "text.secondary", fontSize: "0.9rem" }}>
            Pronto habrá un titular principal acá.
          </Typography>
        </Box>
      )}

      {hasAnySection ? (
        board.sections.map((section) => (
          <BoardSection key={section.id} section={section} />
        ))
      ) : (
        <Typography align="center" color="text.secondary" sx={{ fontSize: "0.9rem" }}>
          Solo hay portada por ahora.
        </Typography>
      )}

      <FloatingNotes notes={notes} activeId={activeId} onJump={onJump} />
    </Box>
  );
}

/** Tablero de novedades (copia local empujada desde Raptor Solutions). */
export default function NoticiasPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const { data } = await getNewsRequest();
        if (!cancelled) {
          const list = Array.isArray(data) ? data : [];
          setItems(list);
          markNewsAsSeen(list);
          window.dispatchEvent(new CustomEvent("raptor:news-seen"));
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e?.response?.data?.message ||
              e?.response?.data?.error ||
              "No se pudieron cargar las noticias",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Box
      sx={{
        py: { xs: 1.5, md: 2 },
        background: (theme) =>
          `linear-gradient(180deg, ${theme.palette.background.default} 0%, ${theme.palette.action.hover} 42%, ${theme.palette.background.default} 100%)`,
        minHeight: "100%",
      }}
    >
      <Container maxWidth="lg" sx={{ px: { xs: 1.5, md: 3 } }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <CampaignIcon color="primary" />
          <Box>
            <Typography
              fontWeight={900}
              sx={{
                letterSpacing: "-0.02em",
                fontSize: { xs: "1.15rem", md: "1.35rem" },
                lineHeight: 1.2,
              }}
            >
              Novedades del sistema
            </Typography>
            <Typography sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
              Portada · lo nuevo · lo que ya funciona · próximos
            </Typography>
          </Box>
        </Stack>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress size={32} />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : !items.length ? (
          <Alert severity="info">
            Todavía no hay noticias publicadas. Cuando {BRAND_NAME} empuje
            novedades, aparecerán acá automáticamente.
          </Alert>
        ) : (
          <NewsBoard items={items} />
        )}
      </Container>
    </Box>
  );
}
