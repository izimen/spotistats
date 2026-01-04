import { Clock, Repeat, Headphones, ArrowUpRight, ArrowDownRight } from "lucide-react";
import StatsCard from "./StatsCard";

interface StatisticsGridProps {
    totalMinutes: number;
    minutesDiff: number;
    minutesDiffPercent: number;
    mostLooped: { title: string; count: number } | null;
    listeningMode: { emoji: string; name: string; percent: number };
}

const StatisticsGrid = ({ totalMinutes, minutesDiff, minutesDiffPercent, mostLooped, listeningMode }: StatisticsGridProps) => {
    return (
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
            <StatsCard
                title="Czas słuchania"
                value={`${totalMinutes} min`}
                subtitle={
                    <span className={`flex items-center gap-1 ${minutesDiff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {minutesDiff >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(minutesDiffPercent)}% vs wczoraj
                    </span>
                }
                icon={Clock}
                delay={100}
                variant="primary"
                tooltip="Suma czasu wszystkich odtworzeń w wybranym okresie. Obliczana z całej historii (nie tylko widocznych utworów). Dane zbierane automatycznie co ~1h."
            />
            <StatsCard
                title="Zapętlany utwór"
                value={mostLooped ? mostLooped.title : "-"}
                subtitle={mostLooped ? `${mostLooped.count}x powtórzeń` : "Brak powtórzeń"}
                icon={Repeat}
                delay={200}
                tooltip="Utwór z największą liczbą odtworzeń w wybranym okresie. Dla trybu 'Wszystko': analiza całej historii z bazy. Dla innych: bazuje na 100 ostatnich utworach."
            />
            <StatsCard
                title="Tryb słuchania"
                value={`${listeningMode.emoji} ${listeningMode.name}`}
                subtitle={`${listeningMode.percent}% aktywności`}
                icon={Headphones}
                delay={300}
                tooltip="Algorytm punktowy analizujący godziny odtworzeń, powtórzenia i długość utworów. Bazuje na 100 ostatnich utworach z wybranego okresu."
            />
        </section>
    );
};

export default StatisticsGrid;
