class AnimationManager {
    constructor() {
        this.animations = new Set();
        this.isRunning = false;
        this.lastTimeStamp = 0;
    }

    startAnimation(animationFunction, duration = null) {
        const animation = {
            func: animationFunction,
            startTime: performance.now(),
            duration: duration
        };
        this.animations.add(animation);

        if (!this.isRunning) {
            this.isRunning = true;
            this.animate();
        }
    }

    animate(timeStamp = 0) {
        const deltaTime = timeStamp - this.lastTimeStamp;
        this.lastTimeStamp = timeStamp;

        for (const animation in this.animations) {
            const elapsed = timeStamp - animation.startTime;

            if (animation.duration && elapsed >= animation.duration) {
                this.animations.delete(animation);
                continue;
            }

            animation.func(deltaTime, elapsed);
        }

        if (this.animations.size > 0) {
            requestAnimationFrame(this.animate.bind(this));
        } else {
            this.isRunning = false;
        }
    }
}

export default AnimationManager;