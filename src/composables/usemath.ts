export function useMath() {

    const getPercentOf = (percent: number, total: number) => {
        if (total === 0) return 0;
        return (total / 100) * percent;
    }
    return {
        getPercentOf
    }
}
