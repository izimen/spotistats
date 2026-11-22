/** 216000 -> "3:36" */
export function formatDuration(ms: number): string {
    const total = Math.round(ms / 1000);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** Relative Polish time: "przed chwilą", "12 min temu", "3 godz. temu", "2 dni temu" */
export function timeAgo(date: string | Date | null | undefined): string {
    if (!date) return "";
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "przed chwilą";
    if (mins < 60) return `${mins} min temu`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} godz. temu`;
    const days = Math.floor(hours / 24);
    return days === 1 ? "wczoraj" : `${days} dni temu`;
}
