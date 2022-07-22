import * as vscode from "vscode";

export default class Thunk {
    #thunk
    constructor(fn: Function){
        this.#thunk = fn
    }

    evaluate(){
        return this.#thunk()
    }
}