const scores = new Map();

export function getBestScore(boatKey) {
    const sessionBest = scores.get(boatKey) ?? 0;
    try {
        const saved = Number(localStorage.getItem(`rivah-race:best:${boatKey}`));
        return Number.isSafeInteger(saved) ? Math.max(saved, sessionBest) : sessionBest;
    } catch {
        return sessionBest;
    }
}

export function recordScore(boatKey, score) {
    const previousBest = getBestScore(boatKey);
    if (score <= previousBest) return { best: previousBest, isRecord: false };

    scores.set(boatKey, score);
    try {
        localStorage.setItem(`rivah-race:best:${boatKey}`, String(score));
    } catch {
        // Keep the record for this session if the browser blocks storage.
    }
    return { best: score, isRecord: true };
}
