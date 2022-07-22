import Thunk from "./Thunk"

export default class Queue {
    #items: Array<Thunk>
    constructor() {
        this.#items = []
    }
    isEmpty() {
        return this.#items.length === 0
    }
    enqueue(element: Thunk) {
        this.#items.push(element)
        this.onEnqueue()
    }
    dequeue() {
        if (this.isEmpty()) {
            return null
        }
        const removed = this.#items.shift()
        this.onDequeue()
        return removed
    }
    peek() {
        if (this.isEmpty()) {
            return null
        }
        return this.#items[0]
    }
    clear() {
        this.#items = []
    }
    onEnqueue(){
        return
    }
    onDequeue(){
        return
    }
}