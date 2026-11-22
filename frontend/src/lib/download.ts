import { toast } from "sonner";
import { statsAPI } from "@/lib/api";
import { isPreviewMode } from "@/lib/mockData";
import { toLocalDateString } from "@/lib/period";
import { downloadBlob } from "@/lib/shareCard";

/** Download the full stored history as CSV. Returns true on success. */
export async function exportHistoryCsv(): Promise<boolean> {
    if (isPreviewMode()) {
        toast.info("Eksport działa tylko z prawdziwym backendem");
        return false;
    }
    try {
        const response = await statsAPI.exportHistoryCsv();
        downloadBlob(response.data, `spotistats-historia-${toLocalDateString(new Date())}.csv`);
        toast.success("Pobrano historię jako CSV");
        return true;
    } catch {
        toast.error("Nie udało się pobrać historii. Spróbuj ponownie.");
        return false;
    }
}
