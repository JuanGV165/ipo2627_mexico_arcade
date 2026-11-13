export class InputHandler {
    constructor(canvas) {
        this.canvas = canvas;
        this.keys = {};
        this.previousKeys = {};
        this.touch = {
            isShooting: false,
            joystickActive: false,
            joystickOrigin: { x: 0, y: 0 },
            joystickCurrent: { x: 0, y: 0 },
            joystickVector: { x: 0, y: 0 },
            leftTouchId: null,
            rightTouchId: null
        };

        window.addEventListener('keydown', e => this.keys[e.key] = true);
        window.addEventListener('keyup', e => this.keys[e.key] = false);

        canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
        canvas.addEventListener('touchcancel', this.handleTouchEnd.bind(this));
    }

    isPressed(key) { return !!this.keys[key]; }
    isJustPressed(key) { return !!this.keys[key] && !this.previousKeys[key]; }

    postUpdate() {
        this.previousKeys = { ...this.keys }; 
    }

    getCanvasPos(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const scale = Math.max(rect.width / 1200, rect.height / 800);
        const renderedWidth = 1200 * scale;
        const renderedHeight = 800 * scale;
        const offsetX = (renderedWidth - rect.width) / 2;
        const offsetY = (renderedHeight - rect.height) / 2;
        return {
            x: ((clientX - rect.left) + offsetX) / scale,
            y: ((clientY - rect.top) + offsetY) / scale
        };
    }

    handleTouchStart(e) {
        if (e.cancelable) e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            let t = e.changedTouches[i];
            if (t.clientX < window.innerWidth / 2) {
                this.touch.isShooting = true;
                this.touch.leftTouchId = t.identifier;
            } else {
                let pos = this.getCanvasPos(t.clientX, t.clientY);
                this.touch.joystickActive = true;
                this.touch.rightTouchId = t.identifier;
                this.touch.joystickOrigin = pos;
                this.touch.joystickCurrent = pos;
                this.touch.joystickVector = { x: 0, y: 0 };
            }
        }
    }

    handleTouchMove(e) {
        if (e.cancelable) e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            let t = e.changedTouches[i];
            if (t.identifier === this.touch.rightTouchId) {
                let pos = this.getCanvasPos(t.clientX, t.clientY);
                this.touch.joystickCurrent = pos;
                let dx = pos.x - this.touch.joystickOrigin.x;
                let dy = pos.y - this.touch.joystickOrigin.y;
                let dist = Math.hypot(dx, dy);
                let maxDist = 60; 
                if (dist > maxDist) {
                    dx = (dx / dist) * maxDist;
                    dy = (dy / dist) * maxDist;
                }
                this.touch.joystickVector = { x: dx / maxDist, y: dy / maxDist };
            }
        }
    }

    handleTouchEnd(e) {
        for (let i = 0; i < e.changedTouches.length; i++) {
            let t = e.changedTouches[i];
            if (t.identifier === this.touch.leftTouchId) {
                this.touch.isShooting = false;
                this.touch.leftTouchId = null;
            } else if (t.identifier === this.touch.rightTouchId) {
                this.touch.joystickActive = false;
                this.touch.joystickVector = { x: 0, y: 0 };
                this.touch.rightTouchId = null;
            }
        }
    }
}