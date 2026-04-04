export const ArrowUpRight = ({ className }: { className?: string }) => {
    // #E9E9E9 дефолтное значение stroke
    return (
        <svg className={className} width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 5H23M23 5L5 23M23 5V23" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    )
}
