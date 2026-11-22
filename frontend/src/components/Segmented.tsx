interface SegmentedOption<T extends string> {
    value: T;
    label: string;
    /** shorter label under 640px */
    short?: string;
}

interface SegmentedProps<T extends string> {
    value: T;
    onChange: (value: T) => void;
    options: SegmentedOption<T>[];
    label: string;
    className?: string;
}

/**
 * Text-only segmented control: the active option is underlined in the accent,
 * the rest are muted. No pills, no shadows.
 */
function Segmented<T extends string>({ value, onChange, options, label, className = "" }: SegmentedProps<T>) {
    return (
        <div role="group" aria-label={label} className={`flex items-end gap-5 ${className}`}>
            {options.map(option => {
                const active = option.value === value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => onChange(option.value)}
                        className={`touch-target -mb-px border-b-2 pb-1 text-[15px] wdth-87 font-semibold transition-colors ${active
                            ? "border-primary text-foreground"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        {option.short ? (
                            <>
                                <span className="hidden sm:inline">{option.label}</span>
                                <span className="sm:hidden" aria-hidden="true">{option.short}</span>
                            </>
                        ) : option.label}
                    </button>
                );
            })}
        </div>
    );
}

export default Segmented;
