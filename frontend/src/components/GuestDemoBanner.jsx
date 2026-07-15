import { Alert } from "@mui/material";
import { isGuestDataMode } from "../mocks/guest/guestApi.js";

/** Aviso visible solo cuando la sesión es de invitado con datos demo. */
export default function GuestDemoBanner() {
  if (!isGuestDataMode()) return null;
  return (
    <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
      Demo · modo invitado — los datos son ficticios (~$10k de saldo) y no se guardan.
    </Alert>
  );
}
