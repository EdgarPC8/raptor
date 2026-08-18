import { useEffect, useState } from "react";
import { Chip, Stack, Typography } from "@mui/material";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import { getPromoByCustomer } from "../../../api/marketingPromotionsRequest.js";

function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "$0.00";
  return `$${n.toFixed(2)}`;
}

export default function CustomerPromoHint({ customerId }) {
  const [group, setGroup] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!customerId) {
      setGroup(null);
      return undefined;
    }
    getPromoByCustomer(customerId)
      .then((res) => {
        if (!cancelled) setGroup(res.data || null);
      })
      .catch(() => {
        if (!cancelled) setGroup(null);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  if (!group) return null;

  return (
    <Stack spacing={0.5} sx={{ mt: 0.75 }}>
      <Typography variant="caption" color="text.secondary">
        Promo de {group.name}
      </Typography>
      <Stack direction="row" flexWrap="wrap" gap={0.5}>
        {(group.benefits || []).map((b) => (
          <Chip
            key={`${group.id}-${b.id || b.productId}`}
            size="small"
            color="secondary"
            icon={<LocalOfferIcon sx={{ fontSize: 14 }} />}
            label={`${b.quantity} × ${b.productName} por ${money(b.price)}`}
          />
        ))}
      </Stack>
    </Stack>
  );
}
