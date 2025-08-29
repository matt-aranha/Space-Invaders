export const updatePlayerAnimation = (playerState, dt, fps) => {
    const interval = 1 / fps;
    const newLastAnimationFrameTime = playerState.lastAnimationFrameTime + dt;

    if (newLastAnimationFrameTime >= interval) {
        const newFrame = (playerState.animationFrame + 1) % 3;
        return {
            animationFrame: newFrame,
            lastAnimationFrameTime: newLastAnimationFrameTime - interval
        };
    }
  
    return {
        animationFrame: playerState.animationFrame,
        lastAnimationFrameTime: newLastAnimationFrameTime
    };
};