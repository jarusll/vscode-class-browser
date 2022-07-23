import Queue from "./Queue";

const THRESHOLD: number = 20;

export default class ExecutionQueue extends Queue {
    #leftOver: any[];
    constructor(){
        super();
        this.#leftOver = [];
    }
    reset(){
        this.clear();
        this.#leftOver = [];
    }
    async lazyExec(): Promise<any[]> {
        if (this.#leftOver.length > 0){
            const firstChunk = this.#leftOver.slice(0, 20);
            this.#leftOver = this.#leftOver.slice(20);
            return firstChunk;
        }
        let thunk = this.peek();
        if (thunk){
            let value = await thunk.evaluate();
            this.dequeue();
            if (value.length > THRESHOLD){
                this.#leftOver = value.slice(20);
            }
            return value.slice(0, 20);
        }
        return [false];
    }
}