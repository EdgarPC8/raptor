import { Box, TextField } from "@mui/material";
import TablePro from "../../../../components/Tables/TablePro";

const num = (n) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return x.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const slashDate = (iso) => String(iso || "").slice(0, 10).replaceAll("-", "/");

const columns = [
  { id: "sequence", label: "Cuota #", width: 70 },
  {
    id: "capitalReducido",
    label: "Capital reducido",
    render: (row) => num(row.capitalReducido),
    getSearchValue: (row) => num(row.capitalReducido),
  },
  {
    id: "interest",
    label: "Interés",
    render: (row) => num(row.interest),
    getSearchValue: (row) => num(row.interest),
  },
  {
    id: "capitalCuota",
    label: "Capital cuota",
    render: (row) => num(row.capitalCuota),
    getSearchValue: (row) => num(row.capitalCuota),
  },
  {
    id: "seguroDesgravamen",
    label: "Seguro desgravamen",
    render: (row) => num(row.seguroDesgravamen),
    getSearchValue: (row) => num(row.seguroDesgravamen),
  },
  {
    id: "seguroIncendio",
    label: "Seguro incendio/vehículo",
    render: (row) => num(row.seguroIncendio),
    getSearchValue: (row) => num(row.seguroIncendio),
  },
  {
    id: "dividendo",
    label: "Dividendo",
    render: (row) => num(row.dividendo ?? row.amount),
    getSearchValue: (row) => num(row.dividendo ?? row.amount),
  },
  {
    id: "dueDate",
    label: "Vencimiento",
    render: (row) => slashDate(row.dueDate),
    getSearchValue: (row) => slashDate(row.dueDate),
  },
  {
    id: "tasa",
    label: "Tasa",
    render: (row) => (row.tasa == null || row.tasa === "" ? "—" : String(row.tasa)),
    getSearchValue: (row) => String(row.tasa ?? ""),
  },
];

function editor(field, row, edits, onEdit, date) {
  const typed = edits?.[row.sequence]?.[field];
  const fallback = field === "dividendo" ? (row.dividendo ?? row.amount ?? "") : (row[field] ?? "");
  return (
    <TextField
      size="small"
      type={date ? "date" : "number"}
      value={typed != null ? typed : fallback}
      onChange={(e) => onEdit(row.sequence, field, e.target.value)}
      onClick={(e) => e.stopPropagation()}
      inputProps={{
        step: date ? undefined : "0.01",
        style: { padding: "4px 6px", fontSize: 13 },
      }}
      sx={{ minWidth: date ? 140 : 96 }}
    />
  );
}

export default function AmortizationScheduleTable({
  rows,
  paidBySequence,
  editable = false,
  edits,
  onEdit,
  fill = false,
  maxHeight = 420,
}) {
  const data = (rows || []).map((row) => ({
    ...row,
    id: row.sequence,
    estado: row.historical
      ? "Movimiento"
      : paidBySequence?.get(row.sequence)
        ? "Pagado"
        : "",
  }));
  const shown = editable
    ? columns.map((column) => {
        if (column.id === "sequence" || !onEdit) return column;
        const date = column.id === "dueDate";
        return {
          ...column,
          stopRowClick: true,
          minWidth: date ? 150 : 108,
          render: (row) => editor(column.id, row, edits, onEdit, date),
        };
      })
    : columns;
  const withStatus =
    paidBySequence || data.some((row) => row.historical)
      ? [
          ...shown,
          {
            id: "estado",
            label: "Estado",
            render: (row) => row.estado || "Pendiente",
            getSearchValue: (row) => row.estado || "Pendiente",
          },
        ]
      : shown;

  const table = (
    <TablePro
      title="Tabla de amortización"
      rows={data}
      columns={withStatus}
      showSearch
      dense
      defaultRowsPerPage={10}
      rowsPerPageOptions={[10, 20, 60]}
      tableMaxHeight={fill ? "100%" : maxHeight}
    />
  );

  if (!fill) return table;

  return (
    <Box
      sx={{
        height: "100%",
        minHeight: 0,
        "& > .MuiPaper-root": { height: "100%", boxSizing: "border-box" },
        "& .MuiTableContainer-root": { maxHeight: "calc(100% - 118px) !important" },
      }}
    >
      {table}
    </Box>
  );
}
