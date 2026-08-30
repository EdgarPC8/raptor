import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Container,
  IconButton,
  Stack,
  Typography,
  CircularProgress,
  Alert,
  Tooltip,
} from "@mui/material";
import NewspaperIcon from "@mui/icons-material/Newspaper";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
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
import { getNewsRequest } from "../../../api/newsRequest.js";
import {
  getNewsAutoplayPaused,
  setNewsAutoplayPaused,
  markNewsAsSeen,
} from "../../../utils/newsLocalState.js";

const PAPER = "#ebe9e4";
const PAPER_EDGE = "#d5d1c8";
const BOX = "#f4f2ed";
const BOX_BORDER = "#cfc9bc";
const INK = "#1c1b19";
const INK_MUTED = "#5c5852";
const ACCENT = "#3d4a3a";
const AUTO_MS = 10_000;

const FIGURE_PALETTES = [
  { bg: "#dfe6dc", ink: "#3d4a3a" },
  { bg: "#e4ddd4", ink: "#5a4a3a" },
  { bg: "#d9e0e6", ink: "#3a4654" },
  { bg: "#e6e0d4", ink: "#4a4538" },
  { bg: "#e0dce6", ink: "#463a54" },
];

function pickFigure(item) {
  const text = `${item?.title || ""} ${item?.subtitle || ""} ${item?.kind || ""}`.toLowerCase();
  if (item?.kind === "proximamente" || /pr[oó]xim|dueño|qr|barra/.test(text)) {
    if (/qr|barra|enlace/.test(text)) {
      return { Icon: QrCode2Icon, palette: FIGURE_PALETTES[4] };
    }
    if (/dueño|rol|empleado|admin|programador/.test(text)) {
      return { Icon: BadgeIcon, palette: FIGURE_PALETTES[4] };
    }
    return { Icon: AutoAwesomeIcon, palette: FIGURE_PALETTES[4] };
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

/** Bloque visual que simula una imagen con icono. */
function FigureBlock({ item, size = "md", fullWidth = false }) {
  const { Icon, palette } = pickFigure(item);
  const dims =
    size === "lg"
      ? { h: { xs: 72, md: 96 }, icon: { xs: 36, md: 48 } }
      : size === "sm"
        ? { h: 36, icon: 18 }
        : { h: 64, icon: 32 };

  return (
    <Box
      aria-hidden
      sx={{
        height: dims.h,
        width: fullWidth ? "100%" : undefined,
        minWidth: fullWidth
          ? 0
          : size === "sm"
            ? 52
            : size === "lg"
              ? { xs: 72, md: 110 }
              : 72,
        borderRadius: fullWidth ? 0 : 1,
        bgcolor: palette.bg,
        border: fullWidth ? `none` : `1px solid ${BOX_BORDER}`,
        borderBottom: fullWidth ? `1px solid ${BOX_BORDER}` : undefined,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        backgroundImage: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.45), transparent 55%), linear-gradient(145deg, ${palette.bg} 0%, rgba(255,255,255,0.2) 50%, ${palette.bg} 100%)`,
      }}
    >
      <Icon sx={{ fontSize: dims.icon, color: palette.ink, opacity: 0.88 }} />
    </Box>
  );
}

function formatDate(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString("es-EC", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function PageChrome({ heading, pageNumber, children, noScroll = false }) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        height: "100%",
        bgcolor: PAPER,
        px: { xs: 1.25, md: 1.75 },
        py: { xs: 1, md: 1.25 },
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="baseline"
        sx={{
          mb: 0.75,
          pb: 0.5,
          borderBottom: `2.5px solid ${INK}`,
          flexShrink: 0,
        }}
      >
        <Typography
          sx={{
            fontFamily: '"Source Serif 4", Georgia, serif',
            fontWeight: 800,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            fontSize: "0.7rem",
            color: INK,
          }}
        >
          {heading}
        </Typography>
        <Typography sx={{ fontSize: "0.65rem", color: INK_MUTED }}>
          Pág. {pageNumber}
        </Typography>
      </Stack>
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: noScroll ? "hidden" : "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

function CoverCard({ item }) {
  return (
    <Box
      sx={{
        minHeight: 0,
        height: "100%",
        bgcolor: BOX,
        border: `1px solid ${BOX_BORDER}`,
        borderRadius: 1,
        overflow: "hidden",
        display: "flex",
        gap: 0.75,
        alignItems: "center",
        px: 0.85,
        py: 0.6,
      }}
    >
      <FigureBlock item={item} size="sm" />
      <Box sx={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
        <Typography
          sx={{
            fontFamily: '"Source Serif 4", Georgia, serif',
            fontWeight: 800,
            fontSize: "0.68rem",
            lineHeight: 1.15,
            color: INK,
            mb: 0.1,
            display: "-webkit-box",
            WebkitLineClamp: 1,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {item.title}
        </Typography>
        {item.subtitle ? (
          <Typography
            sx={{
              fontSize: "0.58rem",
              fontWeight: 600,
              color: ACCENT,
              mb: 0.1,
              display: "-webkit-box",
              WebkitLineClamp: 1,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {item.subtitle}
          </Typography>
        ) : null}
        {item.body ? (
          <Typography
            sx={{
              fontSize: "0.58rem",
              lineHeight: 1.25,
              color: INK_MUTED,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {item.body}
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
}

/**
 * Portada sin scroll.
 * - front: titular (2 cols) + grilla 2×2 (4 cards)
 * - grid: grilla 2×3 (6 cards)
 */
function CoverLayout({
  hero,
  summaries,
  lead = "En esta edición · resumen",
  coverVariant = "front",
}) {
  const rows = coverVariant === "grid" ? 3 : 2;

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 0.75,
        overflow: "hidden",
        minHeight: 0,
      }}
    >
      {hero ? (
        <Box
          sx={{
            flexShrink: 0,
            bgcolor: BOX,
            border: `1px solid ${BOX_BORDER}`,
            borderLeft: `4px solid ${ACCENT}`,
            borderRadius: 1,
            px: 1.25,
            py: 1,
            display: "flex",
            gap: 1.1,
            alignItems: "center",
            maxHeight: "38%",
          }}
        >
          <FigureBlock item={hero} size="md" />
          <Box sx={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
            <Typography
              sx={{
                fontSize: "0.58rem",
                fontWeight: 700,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                color: ACCENT,
                mb: 0.25,
              }}
            >
              Titular
              {hero.publishedAt ? ` · ${formatDate(hero.publishedAt)}` : ""}
            </Typography>
            <Typography
              sx={{
                fontFamily: '"Source Serif 4", Georgia, serif',
                fontWeight: 800,
                fontSize: { xs: "0.98rem", md: "1.15rem" },
                lineHeight: 1.15,
                color: INK,
                mb: 0.25,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {hero.title}
            </Typography>
            {hero.subtitle ? (
              <Typography
                sx={{
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  color: INK_MUTED,
                  mb: 0.25,
                  display: "-webkit-box",
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {hero.subtitle}
              </Typography>
            ) : null}
            {hero.body ? (
              <Typography
                sx={{
                  fontSize: "0.7rem",
                  lineHeight: 1.3,
                  color: INK,
                  fontFamily: '"Source Serif 4", Georgia, serif',
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {hero.body}
              </Typography>
            ) : null}
          </Box>
        </Box>
      ) : null}

      {lead ? (
        <Typography
          sx={{
            fontSize: "0.62rem",
            fontWeight: 800,
            letterSpacing: 1.1,
            textTransform: "uppercase",
            color: INK_MUTED,
            flexShrink: 0,
          }}
        >
          {lead}
        </Typography>
      ) : null}

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          gap: 0.75,
        }}
      >
        {summaries.slice(0, rows * 2).map((item) => (
          <CoverCard key={item.id} item={item} />
        ))}
      </Box>
    </Box>
  );
}

function DetailCards({ items }) {
  return (
    <Stack spacing={1}>
      {items.map((item) => (
        <Box
          key={item.id}
          sx={{
            bgcolor: BOX,
            border: `1px solid ${BOX_BORDER}`,
            borderRadius: 1,
            px: 1.25,
            py: 1.1,
            display: "flex",
            gap: 1.1,
            alignItems: "flex-start",
          }}
        >
          <FigureBlock item={item} size="md" />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              sx={{
                fontSize: "0.6rem",
                fontWeight: 700,
                letterSpacing: 1.1,
                textTransform: "uppercase",
                color: ACCENT,
                mb: 0.3,
              }}
            >
              En detalle
              {item.publishedAt ? ` · ${formatDate(item.publishedAt)}` : ""}
            </Typography>
            <Typography
              sx={{
                fontFamily: '"Source Serif 4", Georgia, serif',
                fontWeight: 800,
                fontSize: "0.95rem",
                lineHeight: 1.2,
                color: INK,
                mb: 0.3,
              }}
            >
              {item.title}
            </Typography>
            {item.subtitle ? (
              <Typography
                sx={{
                  fontSize: "0.74rem",
                  fontWeight: 600,
                  color: INK_MUTED,
                  mb: 0.4,
                }}
              >
                {item.subtitle}
              </Typography>
            ) : null}
            {item.body ? (
              <Typography
                sx={{
                  fontSize: "0.74rem",
                  lineHeight: 1.4,
                  color: INK,
                  fontFamily: '"Source Serif 4", Georgia, serif',
                  whiteSpace: "pre-wrap",
                  display: "-webkit-box",
                  WebkitLineClamp: 5,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {item.body}
              </Typography>
            ) : null}
          </Box>
        </Box>
      ))}
    </Stack>
  );
}

function TeaserLayout({ items }) {
  if (!items.length) {
    return (
      <Box
        sx={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography sx={{ color: INK_MUTED, fontStyle: "italic" }}>
          Pronto habrá novedades…
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: "100%",
        display: "grid",
        gridTemplateColumns: items.length > 1 ? "1fr 1fr" : "1fr",
        gap: 1,
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      {items.map((item) => (
        <Box
          key={item.id}
          sx={{
            bgcolor: BOX,
            border: `1px dashed ${BOX_BORDER}`,
            borderRadius: 1.5,
            px: 1.5,
            py: 1.5,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <FigureBlock item={item} size="md" />
          <Typography
            sx={{
              fontSize: "0.6rem",
              fontWeight: 800,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              color: ACCENT,
              mt: 1,
              mb: 0.5,
            }}
          >
            Próximamente
          </Typography>
          <Typography
            sx={{
              fontFamily: '"Source Serif 4", Georgia, serif',
              fontWeight: 800,
              fontSize: "1rem",
              lineHeight: 1.2,
              color: INK,
              mb: 0.5,
            }}
          >
            {item.title}
          </Typography>
          {item.subtitle ? (
            <Typography
              sx={{
                fontSize: "0.75rem",
                fontWeight: 600,
                color: INK_MUTED,
                mb: 0.5,
              }}
            >
              {item.subtitle}
            </Typography>
          ) : null}
          {item.body ? (
            <Typography
              sx={{
                fontSize: "0.75rem",
                lineHeight: 1.4,
                color: INK,
                fontFamily: '"Source Serif 4", Georgia, serif',
                display: "-webkit-box",
                WebkitLineClamp: 6,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {item.body}
            </Typography>
          ) : null}
        </Box>
      ))}
    </Box>
  );
}

function FeaturePage({ item, accentLabel = "En detalle" }) {
  const isLead = item?.kind === "portada";
  const isSoon = item?.kind === "proximamente";

  return (
    <Box
      sx={{
        height: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        bgcolor: BOX,
        border: `1px solid ${BOX_BORDER}`,
        borderLeft: `4px solid ${isSoon ? "#5a4a6a" : ACCENT}`,
        borderRadius: 1,
        p: { xs: 1.25, md: 1.75 },
      }}
    >
      <Box
        sx={{
          display: "flex",
          gap: 1.25,
          alignItems: "flex-start",
          mb: 1.25,
          flexShrink: 0,
        }}
      >
        <FigureBlock item={item} size={isLead ? "lg" : "md"} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              fontSize: "0.6rem",
              fontWeight: 800,
              letterSpacing: 1.3,
              textTransform: "uppercase",
              color: isSoon ? "#5a4a6a" : ACCENT,
              mb: 0.4,
            }}
          >
            {accentLabel}
            {item.publishedAt ? ` · ${formatDate(item.publishedAt)}` : ""}
          </Typography>
          <Typography
            sx={{
              fontFamily: '"Source Serif 4", Georgia, serif',
              fontWeight: 800,
              fontSize: isLead
                ? { xs: "1.25rem", md: "1.55rem" }
                : { xs: "1.1rem", md: "1.3rem" },
              lineHeight: 1.15,
              color: INK,
              mb: 0.4,
            }}
          >
            {item.title}
          </Typography>
          {item.subtitle ? (
            <Typography
              sx={{
                fontSize: isLead ? "0.88rem" : "0.8rem",
                fontWeight: 600,
                color: INK_MUTED,
              }}
            >
              {item.subtitle}
            </Typography>
          ) : null}
        </Box>
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          borderTop: `1px solid ${BOX_BORDER}`,
          pt: 1.25,
        }}
      >
        {item.body ? (
          <Typography
            sx={{
              fontSize: isLead ? "0.9rem" : "0.84rem",
              lineHeight: 1.55,
              color: INK,
              fontFamily: '"Source Serif 4", Georgia, serif',
              whiteSpace: "pre-wrap",
              display: "-webkit-box",
              WebkitLineClamp: isLead ? 14 : 16,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {item.body}
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
}

function PaperPage({ page, pageNumber }) {
  if (!page) {
    return (
      <PageChrome heading="—" pageNumber={pageNumber} noScroll>
        <Box
          sx={{
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography sx={{ color: INK_MUTED, fontStyle: "italic", fontSize: "0.85rem" }}>
            Página en blanco
          </Typography>
        </Box>
      </PageChrome>
    );
  }

  const noScroll = page.layout === "cover" || page.layout === "feature";

  return (
    <PageChrome heading={page.heading} pageNumber={pageNumber} noScroll={noScroll}>
      {page.layout === "cover" ? (
        <CoverLayout
          hero={page.hero}
          summaries={page.summaries || []}
          lead={page.lead}
          coverVariant={page.coverVariant || "front"}
        />
      ) : null}
      {page.layout === "feature" && page.item ? (
        <FeaturePage item={page.item} accentLabel={page.accentLabel} />
      ) : null}
      {page.layout === "cards" ? <DetailCards items={page.items || []} /> : null}
      {page.layout === "teaser" ? <TeaserLayout items={page.items || []} /> : null}
    </PageChrome>
  );
}

function sortKey(item) {
  return Number(item.sortOrder ?? item.sort_order ?? 0);
}

function buildPages(items) {
  const map = {
    portada: [],
    interior: [],
    breve: [],
    editorial: [],
    proximamente: [],
  };
  for (const item of items) {
    const key = map[item.kind] ? item.kind : "interior";
    map[key].push(item);
  }

  const breves = [...map.breve].sort((a, b) => sortKey(a) - sortKey(b));
  const systemCards = breves.filter((b) => sortKey(b) < 20).slice(0, 4);
  const doneCards = breves.filter((b) => sortKey(b) >= 20).slice(0, 4);
  const page1Cards =
    systemCards.length >= 4 ? systemCards : breves.slice(0, 4);
  const page2Done =
    doneCards.length >= 4 ? doneCards : breves.slice(4, 8);
  const page2Soon = [...map.proximamente]
    .sort((a, b) => sortKey(a) - sortKey(b))
    .slice(0, 2);
  const page2Cards = [...page2Done.slice(0, 4), ...page2Soon].slice(0, 6);

  const pages = [];

  pages.push({
    id: "portada-a",
    heading: "Portada",
    layout: "cover",
    coverVariant: "front",
    hero: map.portada[0] || null,
    summaries: page1Cards,
    lead: "En el sistema · lo más útil",
  });

  pages.push({
    id: "portada-b",
    heading: "Portada",
    layout: "cover",
    coverVariant: "grid",
    hero: null,
    summaries: page2Cards,
    lead: "Lo reciente · y lo que se viene",
  });

  // Una página por noticia de portada, en el mismo orden.
  // Tras las 4 del sistema → primera plana (grande) → hechos (sin duplicar Noticias) → próximamente.
  const doneForDetail = page2Done.filter((b) => {
    const s = sortKey(b);
    if (s === 20) return false;
    const t = String(b.title || "").toLowerCase();
    if (/secci[oó]n de noticias|noticias del sistema/.test(t) && map.portada[0]) {
      return false;
    }
    return true;
  });

  const featureSequence = [
    ...page1Cards.map((item) => ({
      item,
      heading: "En detalle",
      accentLabel: "En el sistema",
    })),
    ...(map.portada[0]
      ? [
          {
            item: map.portada[0],
            heading: "Primera plana",
            accentLabel: "Lo que se hizo",
          },
        ]
      : []),
    ...doneForDetail.map((item) => ({
      item,
      heading: "En detalle",
      accentLabel: "Lo que se hizo",
    })),
    ...page2Soon.map((item) => ({
      item,
      heading: "Próximamente",
      accentLabel: "Próximamente",
    })),
  ];

  for (const entry of featureSequence) {
    pages.push({
      id: `feature-${entry.item.id}`,
      heading: entry.heading,
      layout: "feature",
      item: entry.item,
      accentLabel: entry.accentLabel,
    });
  }

  if (pages.length % 2 === 1) {
    pages.push(null);
  }
  return pages;
}

function NewspaperPager({ pages }) {
  const spreads = useMemo(() => {
    const pairs = [];
    for (let i = 0; i < pages.length; i += 2) {
      pairs.push([pages[i] || null, pages[i + 1] || null]);
    }
    return pairs;
  }, [pages]);

  const [spreadIndex, setSpreadIndex] = useState(0);
  const [paused, setPaused] = useState(() => getNewsAutoplayPaused());

  const togglePaused = useCallback(() => {
    setPaused((prev) => {
      const next = !prev;
      setNewsAutoplayPaused(next);
      return next;
    });
  }, []);

  const totalSpreads = spreads.length || 1;
  const safeIndex = Math.min(spreadIndex, totalSpreads - 1);
  const [left, right] = spreads[safeIndex] || [null, null];
  const leftNum = safeIndex * 2 + 1;
  const rightNum = safeIndex * 2 + 2;

  const goPrev = useCallback(() => {
    setSpreadIndex((i) => (i - 1 + totalSpreads) % totalSpreads);
  }, [totalSpreads]);

  const goNext = useCallback(() => {
    setSpreadIndex((i) => (i + 1) % totalSpreads);
  }, [totalSpreads]);

  useEffect(() => {
    setSpreadIndex(0);
  }, [pages]);

  useEffect(() => {
    if (paused || totalSpreads <= 1) return undefined;
    const id = window.setInterval(() => {
      setSpreadIndex((i) => (i + 1) % totalSpreads);
    }, AUTO_MS);
    return () => window.clearInterval(id);
  }, [paused, totalSpreads, safeIndex]);

  return (
    <Box sx={{ width: "100%", display: "flex", flexDirection: "column" }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          width: "100%",
          height: {
            xs: "calc(100dvh - 210px)",
            md: "calc(100dvh - 190px)",
          },
          maxHeight: { xs: 440, md: 540 },
          minHeight: { xs: 280, md: 360 },
          border: `1px solid ${PAPER_EDGE}`,
          borderRadius: 1,
          overflow: "hidden",
          bgcolor: PAPER,
          boxShadow: "0 8px 22px rgba(0,0,0,0.12)",
        }}
      >
        <PaperPage page={left} pageNumber={leftNum} />
        <Box
          sx={{
            width: 2,
            bgcolor: PAPER_EDGE,
            flexShrink: 0,
            boxShadow: "0 0 12px rgba(0,0,0,0.25)",
          }}
        />
        <PaperPage page={right} pageNumber={rightNum} />
      </Box>

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="center"
        spacing={0.75}
        sx={{ mt: 1.25, flexShrink: 0 }}
      >
        <Tooltip title="Página anterior">
          <span>
            <IconButton
              size="small"
              onClick={goPrev}
              disabled={totalSpreads <= 1}
              aria-label="Anterior"
              sx={{
                bgcolor: PAPER,
                border: `1px solid ${PAPER_EDGE}`,
                color: INK,
                "&:hover": { bgcolor: PAPER_EDGE },
              }}
            >
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title={paused ? "Reanudar autoavance" : "Pausar autoavance"}>
          <IconButton
            size="small"
            onClick={togglePaused}
            aria-label={paused ? "Reanudar" : "Pausar"}
            sx={{
              bgcolor: paused ? INK : PAPER,
              color: paused ? PAPER : INK,
              border: `1px solid ${PAPER_EDGE}`,
              "&:hover": {
                bgcolor: paused ? "#2e2c28" : PAPER_EDGE,
              },
            }}
          >
            {paused ? (
              <PlayArrowIcon fontSize="small" />
            ) : (
              <PauseIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>

        <Tooltip title="Página siguiente">
          <span>
            <IconButton
              size="small"
              onClick={goNext}
              disabled={totalSpreads <= 1}
              aria-label="Siguiente"
              sx={{
                bgcolor: PAPER,
                border: `1px solid ${PAPER_EDGE}`,
                color: INK,
                "&:hover": { bgcolor: PAPER_EDGE },
              }}
            >
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      <Typography
        align="center"
        sx={{ mt: 0.5, fontSize: "0.72rem", color: INK_MUTED, flexShrink: 0 }}
      >
        Páginas {leftNum}–{rightNum} de {pages.length}
        {!paused && totalSpreads > 1 ? " · Avanza sola cada 10 s" : ""}
        {paused ? " · Pausado" : ""}
      </Typography>
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

  const pages = useMemo(() => buildPages(items), [items]);

  return (
    <Box
      sx={{
        overflow: "hidden",
        background:
          "linear-gradient(180deg, #d9d6cf 0%, #cfcbc2 50%, #d9d6cf 100%)",
        py: { xs: 1, md: 1.25 },
      }}
    >
      <Container maxWidth={false} sx={{ px: { xs: 1.25, md: 2.5 } }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <NewspaperIcon sx={{ color: INK, fontSize: 22 }} />
          <Box>
            <Typography
              fontWeight={800}
              sx={{
                fontFamily: '"Source Serif 4", Georgia, serif',
                letterSpacing: "-0.02em",
                color: INK,
                fontSize: { xs: "1.05rem", md: "1.2rem" },
                lineHeight: 1.2,
              }}
            >
              El Diario del Sistema
            </Typography>
            <Typography sx={{ color: INK_MUTED, fontSize: "0.7rem" }}>
              Novedades del sistema
            </Typography>
          </Box>
        </Stack>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress size={32} sx={{ color: INK }} />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : !items.length ? (
          <Alert severity="info">
            Todavía no hay noticias publicadas. Cuando Raptor Solutions empuje
            novedades, aparecerán acá automáticamente.
          </Alert>
        ) : (
          <NewspaperPager pages={pages} />
        )}
      </Container>
    </Box>
  );
}
